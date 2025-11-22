import { Router } from "express";
import multer from "multer";
import { PrismaClient } from "@prisma/client";
import { NodemailerService } from "../services/nodemailer.service";
import { MockEmailService } from "../services/mock-email.service";
import { BrevoApiService } from "../../application/services/brevo-api-email.service";
import { PdfPayslipSplitterService } from '../../application/services/pdf-payslip-splitter.service';

export const router = Router();
const prisma = new PrismaClient();
const emailService = process.env.BREVO_API_KEY
  ? new BrevoApiService(
      process.env.BREVO_API_KEY!,
      process.env.BREVO_SENDER || 'carolinezolet@gmail.com'
    )
  : (process.env.SMTP_HOST
      ? new NodemailerService()
      : new MockEmailService());

// Fallback/simple implementation for ReprocessFailedNotificationsUseCase when the real use case isn't available.
// Replace this with an import of the real implementation when it exists.
class ReprocessFailedNotificationsUseCase {
  private prisma: any;
  private emailService: any;

  constructor(prismaClient: any, emailSvc: any) {
    this.prisma = prismaClient;
    this.emailService = emailSvc;
  }

  async execute(opts: any) {
    const { limit } = opts || {};
    // find failed notifications (basic)
    const items = await this.prisma.notification.findMany({
      where: { status: "failed" },
      take: Number(limit) || 100,
      orderBy: { createdAt: "desc" },
    });

    const results = await Promise.all(items.map(async (n: any) => {
      try {
        // try a basic send; adapt to your emailService API (send or sendWithAttachments)
        let sendResult: any = undefined;
        if (typeof this.emailService.send === "function") {
          sendResult = await this.emailService.send(n.email, n.subject, n.message);
        } else if (typeof this.emailService.sendWithAttachments === "function") {
          sendResult = await this.emailService.sendWithAttachments(n.email, n.subject, n.message, []);
        } else {
          throw new Error("emailService has no send method");
        }

        const accepted = sendResult && (sendResult.accepted || sendResult.accepted === 0 ? sendResult.accepted : undefined);
        const ok = (accepted === undefined) || (Array.isArray(accepted) && accepted.length > 0);

        if (!ok) {
          console.error(` Reprocess: SMTP did not accept recipients for ${n.id}:`, { sendResult });
          await this.prisma.notification.update({ where: { id: n.id }, data: { status: "failed", retryCount: n.retryCount + 1 } });
          return { id: n.id, ok: false, error: 'SMTP did not accept recipients' };
        }

        await this.prisma.notification.update({ where: { id: n.id }, data: { status: "sent", sentAt: new Date() } });

        return { id: n.id, ok: true };
      } catch (e: any) {
        return { id: n.id, ok: false, error: e?.message || String(e) };
      }
    }));

    return { total: items.length, results };
  }
}

// Health
router.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Unidades

// Listar todas as unidades
router.get("/unidades", async (_req, res) => {
  const unidades = await prisma.colaborador.findMany({
    distinct: ["unidade"],
    select: { unidade: true },
    orderBy: { unidade: "asc" },
  });
  res.json(unidades.map((u) => u.unidade));
});

// Criar unidade
router.post("/unidades", async (req, res) => {
  const { unidade } = req.body;
  if (!unidade) return res.status(400).json({ error: "Campo 'unidade' obrigatório" });
  // Cria uma unidade fictícia (sem colaborador)
  try {
    // Verifica se já existe
    const existe = await prisma.colaborador.findFirst({ where: { unidade } });
    if (existe) return res.status(409).json({ error: "Unidade já existe" });
    // Cria registro fictício
    const nova = await prisma.colaborador.create({
      data: { nome: "Unidade", email: `${unidade.toLowerCase().replace(/\s/g,'')}@fake.com`, unidade }
    });
    res.status(201).json({ unidade: nova.unidade });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Erro ao criar unidade" });
  }
});

// Editar unidade (renomear)
router.put("/unidades/:nomeAntigo", async (req, res) => {
  const { nomeAntigo } = req.params;
  const { unidade: novoNome } = req.body;
  if (!novoNome) return res.status(400).json({ error: "Campo 'unidade' obrigatório" });
  try {
    const atualizados = await prisma.colaborador.updateMany({
      where: { unidade: nomeAntigo },
      data: { unidade: novoNome }
    });
    if (atualizados.count === 0) return res.status(404).json({ error: "Unidade não encontrada" });
    res.json({ unidade: novoNome, atualizados: atualizados.count });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Erro ao atualizar unidade" });
  }
});

// Excluir unidade
router.delete("/unidades/:nome", async (req, res) => {
  const { nome } = req.params;
  try {
    const excluidos = await prisma.colaborador.deleteMany({ where: { unidade: nome } });
    if (excluidos.count === 0) return res.status(404).json({ error: "Unidade não encontrada" });
    res.json({ message: "Unidade excluída com sucesso", excluidos: excluidos.count });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Erro ao excluir unidade" });
  }
});

// Colaboradores

// Listar todos
router.get("/colaboradores", async (req, res) => {
  const { unidade } = req.query;
  try {
    const colabs = await prisma.colaborador.findMany({
      where: unidade ? { unidade: unidade as string } : undefined,
      select: { id: true, nome: true, email: true, unidade: true, createdAt: true },
      orderBy: { nome: "asc" },
    });
    res.json(colabs);
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Erro ao buscar colaboradores" });
  }
});

// Criar colaborador
router.post("/colaboradores", async (req, res) => {
  const { nome, email, unidade } = req.body;
  if (!nome || !email || !unidade) {
    return res.status(400).json({ error: "Campos obrigatórios: nome, email, unidade" });
  }
  try {
    const novo = await prisma.colaborador.create({
      data: { nome, email, unidade }
    });
    res.status(201).json(novo);
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(409).json({ error: "Email já cadastrado" });
    }
    res.status(500).json({ error: error.message || "Erro ao criar colaborador" });
  }
});

// Editar colaborador
router.put("/colaboradores/:id", async (req, res) => {
  const { id } = req.params;
  const { nome, email, unidade } = req.body;
  try {
    const atualizado = await prisma.colaborador.update({
      where: { id },
      data: { nome, email, unidade }
    });
    res.json(atualizado);
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: "Colaborador não encontrado" });
    }
    res.status(500).json({ error: error.message || "Erro ao editar colaborador" });
  }
});

// Excluir colaborador
router.delete("/colaboradores/:id", async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.colaborador.delete({ where: { id } });
    res.status(204).send();
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: "Colaborador não encontrado" });
    }
    res.status(500).json({ error: error.message || "Erro ao excluir colaborador" });
  }
});

// Notificações (simples criar/listar)
router.post("/notifications", async (req, res) => {
  try {
    const { email, subject, message, scheduledAt, unidade } = req.body;
    if (!email) return res.status(400).json({ error: "Campo 'email' obrigatório" });
    const created = await prisma.notification.create({
      data: {
        email,        // ← em vez de 'to'
        subject,
        message,
        scheduledFor: scheduledAt ? new Date(scheduledAt) : new Date(), // ← campo correto
        status: "pending",
      },
    });
    res.status(201).json(created);
  } catch (e: any) {
    console.error("Erro ao agendar notificação:", e);
    res.status(500).json({ error: e.message, stack: e.stack });
  }
});

router.get("/notifications", async (_req, res) => {
  const items = await prisma.notification.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  res.json({ total: items.length, items });
});

// Falhas
router.get("/notifications/failed", async (req, res) => {
  try {
    const { unidade, limit = "100" } = req.query as Record<string, string>;
    const where: any = { status: "failed" };
    if (unidade) where.unidade = unidade;

    const items = await prisma.notification.findMany({
      where,
      take: Math.min(Number(limit) || 100, 1000),
      orderBy: { createdAt: "desc" },  // ← em vez de updatedAt
      select: {
        id: true,
        email: true,     // ← em vez de 'to'
        subject: true,
        message: true,   // ← em vez de 'body'
        status: true,
        createdAt: true,
        sentAt: true,
      },
    });

    res.json({ total: items.length, items });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Erro interno" });
  }
});

router.post("/notifications/reprocess", async (req, res) => {
  try {
    const {
      limit,
      unidade,
      ids,
      batchSize,
      maxRetries,
      incrementalRetry,
      dryRun,
    } = req.body as any;

    let parsedIds: string[] | undefined;
    if (Array.isArray(ids)) parsedIds = ids;
    else if (typeof ids === "string") parsedIds = ids.split(",").map((s) => s.trim()).filter(Boolean);

    const useCase = new ReprocessFailedNotificationsUseCase(prisma, emailService);

    const result = await useCase.execute({
      limit: limit ? Number(limit) : undefined,
      unidade,
      ids: parsedIds,
      batchSize: batchSize ? Number(batchSize) : undefined,
      maxRetries: maxRetries ? Number(maxRetries) : undefined,
      incrementalRetry: typeof incrementalRetry === "string"
        ? ["1", "true", "yes", "on"].includes(incrementalRetry.toLowerCase())
        : incrementalRetry,
      dryRun: typeof dryRun === "string"
        ? ["1", "true", "yes", "on"].includes(dryRun.toLowerCase())
        : dryRun,
    });

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Erro interno" });
  }
});

// Holerites (payslips) seguro
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req: any, file: any, cb: any) => {
    if (file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("Apenas PDF é permitido"));
    }
  },
});

function renderTemplate(tpl: string, ctx: { nome: string; unidade: string }) {
  return (tpl || "")
    .replace(/{{\s*nome\s*}}/gi, ctx.nome ?? "")
    .replace(/{{\s*unidade\s*}}/gi, ctx.unidade ?? "");
}


router.post("/payslips/process", upload.single("pdfFile"), async (req, res) => {
  try {
    const {
      unidade,
      subject = "Holerite",
      message = "Olá {{nome}}, segue holerite de {{unidade}}.",
      dryRun,
      confirm,
      batchSize,
      testRecipient,
    } = req.body as Record<string, string>;

    if (!unidade && !testRecipient) {
      return res.status(400).json({ error: "Parâmetro 'unidade' obrigatório (exceto testRecipient)" });
    }

    if (!req.file?.buffer) {
      return res.status(400).json({ error: "Arquivo não enviado" });
    }

    let colaboradores: Array<{ nome: string; email: string; unidade: string }> = [];
    if (testRecipient) {
      colaboradores = [{ nome: "Teste", email: testRecipient, unidade: unidade || "Teste" }];
    } else {
      colaboradores = await prisma.colaborador.findMany({
        where: { unidade },
        select: { nome: true, email: true, unidade: true },
      });
    }

    const total = colaboradores.length;
    if (total === 0) {
      return res.status(404).json({ error: "Nenhum colaborador encontrado" });
    }

    const THRESHOLD = 50;
    const mustConfirm = !dryRun && !testRecipient && total > THRESHOLD;
    if (mustConfirm && confirm !== "YES") {
      return res.status(400).json({
        error: `Serão enviados ${total} e-mails. Para confirmar envie confirm=YES`,
        total,
        unidade,
      });
    }

    if (String(dryRun).toLowerCase() === "true") {
      return res.json({
        success: true,
        dryRun: true,
        total,
        unidade: unidade || "Teste",
        sample: colaboradores.slice(0, 5).map((c) => c.email),
      });
    }

    const buffer = req.file.buffer;

    // Dividir o PDF por colaborador
    const splitterService = new PdfPayslipSplitterService();
    const splitPdfs = await splitterService.splitPayslipPdf(buffer, colaboradores);

    if (splitPdfs.size === 0) {
      return res.status(400).json({ error: "Não foi possível extrair holerites individuais do PDF" });
    }

    const bs = Math.max(1, Math.min(Number(batchSize || 2), 2));
    let processed = 0;
    let failed = 0;

    for (let i = 0; i < colaboradores.length; i += bs) {
      const lote = colaboradores.slice(i, i + bs);
      const results = await Promise.all(
        lote.map(async (c) => {
          try {
            // Pega o PDF específico do colaborador
            const employeePdf = splitPdfs.get(c.nome);
            if (!employeePdf) {
              console.warn(`[PAYSLIP] Holerite não encontrado para ${c.nome}`);
              return { ok: false, error: "PDF não encontrado" };
            }

            const subjectRendered = renderTemplate(subject, { nome: c.nome, unidade: c.unidade });
            const messageRendered = renderTemplate(message, { nome: c.nome, unidade: c.unidade });

            await emailService.sendWithAttachments(
              c.email,
              subjectRendered,
              messageRendered,
              [{ filename: `holerite_${c.nome}.pdf`, content: employeePdf }]
            );
            return { ok: true };
          } catch (e: any) {
            console.error(`[PAYSLIP] Erro ao enviar para ${c.email}:`, e.message);
            return { ok: false, error: e.message };
          }
        })
      );
      processed += results.filter((r) => r.ok).length;
      failed += results.filter((r) => !r.ok).length;
      if (i + bs < colaboradores.length) {
        console.log(`[PAYSLIP] Aguardando 3000ms antes do próximo lote...`);
        await new Promise((resolve) => setTimeout(resolve, 3000));
      }
    }

    // Histórico
    try {
      await prisma.sendHistory.create({
        data: {
          unidade,
          subject,
          total,
          dryRun: String(dryRun).toLowerCase() === "true",
          testRecipient: testRecipient ?? null,
        },
      });
    } catch { /* ignora */ }

    res.json({
      success: true,
      message: "Holerites processados",
      processed,
      failed,
      total,
      unidade: unidade || "Teste",
    });
  } catch (err: any) {
    console.error("[PAYSLIP] Erro:", err);
    res.status(500).json({ error: err.message || "Erro interno" });
  }
});

// Histórico de holerites
router.get("/payslips/history", async (req, res) => {
  const { unidade, page = "1", limit = "20" } = req.query as Record<string, string>;
  const take = Math.min(Number(limit) || 20, 100);
  const skip = (Number(page) - 1) * take;
  const where: any = {};
  if (unidade) where.unidade = unidade;

  const [items, total] = await Promise.all([
    prisma.sendHistory.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take,
    }),
    prisma.sendHistory.count({ where }),
  ]);

  res.json({ total, page: Number(page), limit: take, items });
});



// ==========================================
// DEBUG ENDPOINTS
// ==========================================

// DEBUG - Total de colaboradores
router.get('/debug/total', async (req, res) => {
  try {
    const total = await prisma.colaborador.count();
    res.json({ total, timestamp: new Date().toISOString() });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

// DEBUG - Listar todas as unidades com contagem
router.get('/debug/unidades', async (req, res) => {
  try {
    const unidades = await prisma.colaborador.groupBy({
      by: ['unidade'],
      _count: { id: true },
      orderBy: { unidade: 'asc' },
    });
    
    res.json(unidades.map(u => ({ unidade: u.unidade, count: u._count.id })));
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

// DEBUG - Colaboradores por unidade
router.get('/debug/colaboradores-por-unidade', async (req, res) => {
  try {
    const colaboradores = await prisma.colaborador.findMany({
      select: { unidade: true },
    });
    
    const grouped: Record<string, number> = {};
    colaboradores.forEach(c => {
      const key = String(c.unidade ?? '');
      grouped[key] = (grouped[key] || 0) + 1;
    });
    
    res.json(grouped);
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});


// ==========================================
// ADMIN ENDPOINTS
// ==========================================

// GET /api/v1/admin/colaboradores - Listar com filtro por unidade
router.get('/admin/colaboradores', async (req, res) => {
  try {
    const { unidade, skip = 0, take = 100 } = req.query;
    
    const where = unidade ? { unidade: String(unidade) } : {};
    
    const colaboradores = await prisma.colaborador.findMany({
      where,
      skip: Number(skip),
      take: Math.min(Number(take), 100),
      orderBy: { nome: 'asc' },
    });
    
    res.json(colaboradores);
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

// GET /api/v1/admin/unidades - Listar todas as unidades
router.get('/admin/unidades', async (req, res) => {
  try {
    const unidades = await prisma.colaborador.groupBy({
      by: ['unidade'],
      _count: { id: true },
      orderBy: { unidade: 'asc' },
    });
    
    res.json(unidades.map(u => ({ 
      filial: u.unidade, 
      unidade: u.unidade,
      count: u._count.id 
    })));
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

// POST /api/v1/admin/colaboradores - Criar colaborador
router.post('/admin/colaboradores', async (req, res) => {
  try {
    const { nome, email, unidade } = req.body;
    
    if (!nome || !email || !unidade) {
      return res.status(400).json({ error: 'Nome, email e unidade sao obrigatorios' });
    }
    
    const existe = await prisma.colaborador.findUnique({
      where: { email },
    });
    
    if (existe) {
      return res.status(400).json({ error: 'Email ja existe' });
    }
    
    const colaborador = await prisma.colaborador.create({
      data: { nome, email, unidade },
    });
    
    res.status(201).json(colaborador);
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

// PUT /api/v1/admin/colaboradores/:id - Atualizar colaborador
router.put('/admin/colaboradores/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { nome, email, unidade } = req.body;
    
    const colaborador = await prisma.colaborador.update({
      where: { id },
      data: {
        ...(nome && { nome }),
        ...(email && { email }),
        ...(unidade && { unidade }),
      },
    });
    
    res.json(colaborador);
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

// DELETE /api/v1/admin/colaboradores/:id - Deletar colaborador
router.delete('/admin/colaboradores/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    await prisma.colaborador.delete({
      where: { id },
    });
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});


// ==========================================
// PAYSLIPS ENDPOINT
// ==========================================

// POST /api/v1/payslips/distribuir - COM DIVISÃO AUTOMÁTICA
router.post('/payslips/distribuir', upload.single('pdfFile'), async (req, res) => {
  try {
    const { 
      unidade, 
      subject = 'Holerite', 
      message = 'Olá {{nome}}, segue seu holerite de {{unidade}}.', 
      batchSize = '2', 
      delayMs = '3000',
      testEmail // Email de teste (envia apenas para este email)
    } = req.body;

    const pdfBuffer = req.file?.buffer;

    if (!pdfBuffer || !unidade) {
      return res.status(400).json({
        success: false,
        message: 'PDF e unidade são obrigatórios',
      });
    }

    console.log(`[PAYSLIP] Iniciando processamento para unidade: ${unidade}`);

    // Buscar colaboradores da unidade
    const colaboradores = await prisma.colaborador.findMany({
      where: { unidade },
      select: { id: true, nome: true, email: true, unidade: true },
    });

    if (colaboradores.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Nenhum colaborador encontrado para ${unidade}`,
      });
    }

    console.log(`[PAYSLIP] ${colaboradores.length} colaboradores encontrados`);

    // Dividir PDF em holerites individuais

    const splitter = new PdfPayslipSplitterService();
    let splitResultsMap: Map<string, Buffer>;

    try {
      splitResultsMap = await splitter.splitPayslipPdf(pdfBuffer, colaboradores);
      console.log(`[PAYSLIP] PDF dividido em ${splitResultsMap.size} holerites individuais`);
    } catch (error: any) {
      console.error('[PAYSLIP] Erro ao dividir PDF:', error);
      return res.status(500).json({
        success: false,
        message: 'Erro ao processar PDF',
        error: error.message,
      });
    }

    if (splitResultsMap.size === 0) {
      return res.status(400).json({
        success: false,
        message: 'Nenhum holerite pôde ser extraído do PDF. Verifique se os nomes dos colaboradores estão corretos.',
      });
    }

    // Converter Map para Array de objetos
    interface SplitResult {
      colaborador: { id: string; nome: string; email: string; unidade: string };
      pdfBuffer: Buffer;
    }

    const splitResults: SplitResult[] = Array.from(splitResultsMap.entries())
      .map(([nome, pdfBuf]) => {
        const colaborador = colaboradores.find(c => c.nome === nome);
        if (!colaborador) return null;
        return { colaborador, pdfBuffer: pdfBuf };
      })
      .filter((item): item is SplitResult => item !== null);

    console.log(`[PAYSLIP] ${splitResults.length} holerites serão enviados`);

    // Se testEmail foi fornecido, enviar todos para esse email
    if (testEmail) {
      console.log(`[PAYSLIP] MODO TESTE: Enviando todos os holerites para ${testEmail}`);
    }

    let processed = 0;
    let failed = 0;
    const errors: Array<{ nome: string; email: string; error: string }> = [];

    // Configurações de lote
    const batch = Math.max(1, Math.min(Number(batchSize), 5));
    const delay = Math.max(1000, Math.min(Number(delayMs), 5000));

    // Processar em lotes
    for (let i = 0; i < splitResults.length; i += batch) {
      const lote = splitResults.slice(i, i + batch);
      const loteNum = Math.floor(i / batch) + 1;
      const totalLotes = Math.ceil(splitResults.length / batch);

      console.log(`[PAYSLIP] Processando lote ${loteNum}/${totalLotes} (${lote.length} emails)`);

      // Enviar lote em paralelo
      const results = await Promise.allSettled(
        lote.map(async ({ colaborador, pdfBuffer }) => {
          try {
            const emailSubject = subject.replace(/{{nome}}/gi, colaborador.nome).replace(/{{unidade}}/gi, colaborador.unidade);
            const emailMessage = message.replace(/{{nome}}/gi, colaborador.nome).replace(/{{unidade}}/gi, colaborador.unidade);

            await emailService.sendWithAttachments(
              colaborador.email,
              emailSubject,
              emailMessage,
              [{ filename: `holerite_${colaborador.nome.replace(/\s+/g, '_')}.pdf`, content: pdfBuffer }]
            );

            console.log(`[PAYSLIP] ✅ SUCESSO: ${colaborador.nome} (${colaborador.email})`);
            return { success: true, email: colaborador.email };
          } catch (error: any) {
            console.error(`[PAYSLIP] ❌ ERRO: ${colaborador.email} - ${error.message}`);
            throw error;
          }
        })
      );

      // Contar sucessos e falhas
      results.forEach((result, idx) => {
        if (result.status === 'fulfilled') {
          processed++;
        } else {
          failed++;
          errors.push({
            nome: lote[idx].colaborador.nome,
            email: lote[idx].colaborador.email,
            error: result.reason?.message || 'Erro desconhecido'
          });
        }
      });

      // Aguardar antes do próximo lote (exceto no último)
      if (i + batch < splitResults.length) {
        console.log(`[PAYSLIP] Aguardando ${delay}ms antes do próximo lote...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    console.log(`[PAYSLIP] Concluído: ${processed} sucessos, ${failed} falhas de ${splitResults.length} total`);

    // Salvar no histórico
    try {
      await prisma.sendHistory.create({
        data: {
          unidade,
          subject,
          total: splitResults.length,
          dryRun: false,
          testRecipient: testEmail || null,
        },
      });
    } catch (err) {
      console.error('[PAYSLIP] Erro ao salvar histórico:', err);
    }

    return res.status(200).json({
      success: true,
      message: 'Holerites processados e enviados individualmente',
      processed,
      failed,
      total: splitResults.length,
      unidade,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error: any) {
    console.error('[PAYSLIP] ERRO CRÍTICO:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro ao distribuir holerites',
      error: error.message,
    });
  }
});

export default router;
