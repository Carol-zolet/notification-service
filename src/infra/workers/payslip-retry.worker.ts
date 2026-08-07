import cron from 'node-cron';
import { PrismaClient } from '@prisma/client';
import { classificarErro } from '../../application/services/classificar-erro-envio';
import { emailService } from '../http/routes';

const prisma = new PrismaClient();

// Depois desse número de tentativas, sai da fila automática e vira alerta
// manual (log crítico) — evita ficar tentando pra sempre algo que nunca
// vai se resolver sozinho.
const LIMITE_TENTATIVAS = 5;
// Configurável porque o volume normal já passa de 300/dia — se a fila
// acumular vários dias sem resolver, um valor fixo baixo pode nunca dar
// conta do backlog. Default 250 mantém a margem de segurança original
// (não gasta a cota inteira de 300/dia de uma vez).
const LOTE_MAXIMO = Number(process.env.PAYSLIP_RETRY_LOTE_MAXIMO) || 250;
const DELAY_ENTRE_ENVIOS_MS = 3000; // mesmo intervalo usado no disparo original

// O Neon "dorme" depois de um tempo sem uso (scale to zero) e a primeira
// query do dia pode falhar com P1001 (conexão recusada) enquanto ele
// acorda — visto várias vezes durante os testes manuais desse worker.
// Sem retry aqui, a execução das 8h falharia silenciosamente (só um log
// de erro) e a fila inteira ficaria parada até o cron do dia seguinte.
const RETRY_DB_TENTATIVAS = 3;
const RETRY_DB_DELAY_MS = 8000;

async function comRetry<T>(fn: () => Promise<T>, tentativas: number, delayMs: number): Promise<T> {
  let ultimoErro: any;
  for (let i = 1; i <= tentativas; i++) {
    try {
      return await fn();
    } catch (err: any) {
      ultimoErro = err;
      const pareceColdStart = err?.code === 'P1001' || String(err?.message || '').includes("Can't reach database server");
      if (i < tentativas) {
        console.warn(`[PAYSLIP RETRY] ⏳ Falha ao acessar o banco (tentativa ${i}/${tentativas}${pareceColdStart ? ', provável cold start do Neon' : ''}), tentando de novo em ${delayMs}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }
  throw ultimoErro;
}

async function processarFilaPendentes() {
  const pendentes = await prisma.payslipPending.findMany({
    where: { tentativas: { lt: LIMITE_TENTATIVAS } },
    orderBy: { criadoEm: 'asc' },
    take: LOTE_MAXIMO,
  });

  if (pendentes.length === 0) {
    console.log('[PAYSLIP RETRY] Fila vazia, nada pra reenviar');
    return;
  }

  console.log(`[PAYSLIP RETRY] ${pendentes.length} holerite(s) pendente(s) de rate limit`);

  for (const pendente of pendentes) {
    const colaborador = await prisma.colaborador.findUnique({ where: { id: pendente.colaboradorId } });
    if (!colaborador) {
      console.error(`[PAYSLIP RETRY] Colaborador ${pendente.colaboradorId} não existe mais — removendo da fila`);
      await prisma.payslipPending.delete({ where: { id: pendente.id } }).catch(() => {});
      continue;
    }

    try {
      await emailService.sendWithAttachments(
        colaborador.email,
        'Holerite',
        `Olá ${colaborador.nome}, segue seu holerite de ${colaborador.unidade}.`,
        [{ filename: `holerite_${colaborador.nome.replace(/\s+/g, '_')}.pdf`, content: pendente.pdfBuffer as Buffer }]
      );

      // Mesma lógica de recibo do envio normal — impede reenvio duplicado depois.
      await prisma.payslipReceipt.upsert({
        where: {
          unidade_periodo_colaboradorId: {
            unidade: pendente.unidade,
            periodo: pendente.periodo,
            colaboradorId: pendente.colaboradorId,
          },
        },
        update: { enviadoEm: new Date() },
        create: { unidade: pendente.unidade, periodo: pendente.periodo, colaboradorId: pendente.colaboradorId },
      });

      await prisma.payslipPending.delete({ where: { id: pendente.id } });
      console.log(`[PAYSLIP RETRY] ✅ Reenviado com sucesso: ${colaborador.nome} (${colaborador.email})`);
    } catch (err: any) {
      const tipoErro = classificarErro(err);
      const novasTentativas = pendente.tentativas + 1;

      if (tipoErro === 'rate_limit' && novasTentativas < LIMITE_TENTATIVAS) {
        // Ainda sem cota — deixa na fila, tenta de novo amanhã.
        await prisma.payslipPending.update({
          where: { id: pendente.id },
          data: { tentativas: { increment: 1 }, ultimaTentativa: new Date() },
        });
        console.warn(`[PAYSLIP RETRY] ⏳ Ainda rate limited: ${colaborador.email} (tentativa ${novasTentativas}/${LIMITE_TENTATIVAS})`);
      } else if (tipoErro === 'rate_limit') {
        // Esgotou as tentativas — sai da fila automática, precisa de ação manual.
        console.error(`[PAYSLIP RETRY] 🚨 ESGOTOU ${LIMITE_TENTATIVAS} TENTATIVAS, PRECISA DE AÇÃO MANUAL: ${colaborador.nome} (${colaborador.email}) — unidade "${pendente.unidade}", período "${pendente.periodo}"`);
        await prisma.payslipPending.delete({ where: { id: pendente.id } }).catch(() => {});
      } else {
        // Erro definitivo durante o reenvio (ex: email passou a ser inválido) — não adianta retentar.
        console.error(`[PAYSLIP RETRY] ❌ Erro definitivo no reenvio, removendo da fila: ${colaborador.nome} (${colaborador.email}) —`, err.message);
        await prisma.payslipPending.delete({ where: { id: pendente.id } }).catch(() => {});
      }
    }

    await new Promise((resolve) => setTimeout(resolve, DELAY_ENTRE_ENVIOS_MS));
  }
}

// No plano free/starter do Render o serviço hiberna sem tráfego, e o
// node-cron só dispara se o processo estiver de pé bem no minuto agendado
// — sem catch-up. Por isso existe um segundo caminho pra rodar a fila: um
// endpoint HTTP (ver /internal/payslip-retry/run em routes.ts) chamado por
// um agendador externo, que acorda o serviço via requisição real. Os dois
// caminhos passam por aqui pra nunca rodar em paralelo — evita o mesmo tipo
// de duplicidade que a fila inteira existe pra prevenir.
let emExecucao = false;

async function executarFilaComGuarda(): Promise<{ executado: boolean }> {
  if (emExecucao) {
    console.warn('[PAYSLIP RETRY] ⚠ Execução da fila já em andamento — ignorando disparo concorrente');
    return { executado: false };
  }
  emExecucao = true;
  try {
    await comRetry(() => processarFilaPendentes(), RETRY_DB_TENTATIVAS, RETRY_DB_DELAY_MS);
    return { executado: true };
  } finally {
    emExecucao = false;
  }
}

export function iniciarPayslipRetryWorker() {
  // Todo dia às 8h — mesmo fuso do servidor (configurar TZ no ambiente se precisar de horário local específico).
  // Fica como fallback: se o serviço já estiver acordado às 8h por algum
  // motivo (tráfego real, ou o agendador externo caiu bem nesse minuto),
  // roda por aqui também. A guarda em executarFilaComGuarda impede duplicar
  // com o disparo via /internal/payslip-retry/run.
  cron.schedule('0 8 * * *', () => {
    executarFilaComGuarda().catch((err) => {
      console.error(`[PAYSLIP RETRY] Erro ao processar a fila mesmo após ${RETRY_DB_TENTATIVAS} tentativas:`, err);
    });
  });
  console.log('[PAYSLIP RETRY] Worker de reenvio automático agendado (todo dia às 8h, + fallback via /internal/payslip-retry/run)');
}

// Exportado só pra permitir teste manual/disparo avulso sem esperar o cron.
export { processarFilaPendentes, comRetry, executarFilaComGuarda };
