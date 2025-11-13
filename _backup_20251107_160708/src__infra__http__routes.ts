import { Router } from 'express';
import multer from 'multer';
import { PrismaClient } from '@prisma/client';
import { ReprocessFailedNotificationsUseCase } from '../../application/use-cases/reprocess-failed-notifications.use-case';
import { NodemailerService } from '../services/nodemailer.service';
import { MockEmailService } from '../services/mock-email.service';
import type { IEmailService } from '../../application/services/IEmail.service';
import { worker } from '../main'; // se exportar worker de lá

// (se o projeto não der require('dotenv').config() no bootstrap, adicione em main.ts)
const prisma = new PrismaClient();

// Usa Nodemailer se SMTP_HOST existir; senão, Mock
const emailService: IEmailService = process.env.SMTP_HOST
  ? new NodemailerService()
  : new MockEmailService();

// Multer memória, aceita só PDF (10MB)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'application/pdf') cb(null, true);
    else cb(new Error('Apenas PDF é permitido'), false);
  },
});

function renderTemplate(tpl: string, ctx: { nome: string; unidade: string }) {
  return (tpl || '')
    .replace(/{{\s*nome\s*}}/gi, ctx.nome ?? '')
    .replace(/{{\s*unidade\s*}}/gi, ctx.unidade ?? '');
}

const router = Router();

router.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Criar colaborador
router.post('/v1/colaboradores', async (req, res) => {
  try {
    const { nome, email, unidade } = req.body;
    
    if (!nome || !email || !unidade) {
      return res.status(400).json({ error: 'Campos obrigat?rios: nome, email, unidade' });
    }

    const colaborador = await prisma.colaborador.create({
      data: { nome, email, unidade }
    });

    res.status(201).json(colaborador);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Erro ao criar colaborador' });
  }
});

// Listar colaboradores (com filtro por unidade)
router.get('/v1/colaboradores', async (req, res) => {
  try {
    const { unidade } = req.query;
    
    const colaboradores = await prisma.colaborador.findMany({
      where: unidade ? { unidade: unidade as string } : undefined,
      orderBy: [{ unidade: 'asc' }, { nome: 'asc' }]
    });

    res.json(colaboradores);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Buscar por ID
router.get('/v1/colaboradores/:id', async (req, res) => {
  try {
    const colaborador = await prisma.colaborador.findUnique({
      where: { id: req.params.id }
    });

    if (!colaborador) {
      return res.status(404).json({ error: 'Colaborador n?o encontrado' });
    }

    res.json(colaborador);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Atualizar
router.put('/v1/colaboradores/:id', async (req, res) => {
  try {
    const { nome, email, unidade } = req.body;

    const colaborador = await prisma.colaborador.update({
      where: { id: req.params.id },
      data: { 
        ...(nome && { nome }),
        ...(email && { email }),
        ...(unidade && { unidade })
      }
    });

    res.json(colaborador);
  } catch (error: any) {
    res.status(404).json({ error: 'Colaborador n?o encontrado' });
  }
});

// Deletar
router.delete('/v1/colaboradores/:id', async (req, res) => {
  try {
    await prisma.colaborador.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (error: any) {
    res.status(404).json({ error: 'Colaborador n?o encontrado' });
  }
});

// Listar unidades
router.get('/v1/unidades', async (req, res) => {
  try {
    const unidades = await prisma.colaborador.findMany({
      select: { unidade: true },
      distinct: ['unidade'],
      orderBy: { unidade: 'asc' }
    });

    res.json(unidades.map(u => u.unidade));
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Processar holerites (envio em massa com 1 PDF)
router.post('/v1/payslips/process', upload.single('pdfFile'), async (req, res) => {
  try {
    const {
      unidade,
      subject = 'Holerite',
      message = 'Olá {{nome}}, segue holerite de {{unidade}}.',
      dryRun,
      confirm,
      batchSize,
      testRecipient,
    } = req.body as Record<string, string>;

    if (!unidade && !testRecipient) {
      return res.status(400).json({ error: 'Parâmetro "unidade" é obrigatório (exceto em testRecipient)' });
    }

    // Busca colaboradores (ou usa testRecipient)
    let colaboradores: Array<{ nome: string; email: string; unidade: string }> = [];

    if (testRecipient) {
      colaboradores = [{ nome: 'Teste', email: testRecipient, unidade: unidade || 'Teste' }];
    } else {
      colaboradores = await prisma.colaborador.findMany({
        where: { unidade },
        select: { nome: true, email: true, unidade: true },
      });
    }

    const total = colaboradores.length;
    if (total === 0) {
      return res.status(404).json({ error: 'Nenhum colaborador encontrado para a unidade solicitada' });
    }

    // Limiar de segurança
    const THRESHOLD = 50;
    const mustConfirm = !dryRun && !testRecipient && total > THRESHOLD;
    if (mustConfirm && confirm !== 'YES') {
      return res.status(400).json({
        error: `Serão enviados ${total} e-mails. Para confirmar, envie confirm=YES`,
        total,
        unidade,
      });
    }

    // Dry run: não requer arquivo, só prévia
    if (String(dryRun).toLowerCase() === 'true') {
      return res.json({
        success: true,
        dryRun: true,
        total,
        unidade: unidade || 'Teste',
        sample: colaboradores.slice(0, 5).map((c) => c.email),
      });
    }

    // A partir daqui, envio real: exige arquivo
    if (!req.file?.buffer) {
      return res.status(400).json({ error: 'Arquivo não enviado' });
    }

    const buffer = req.file.buffer;
    const filename = req.file.originalname || 'holerite.pdf';
    const bs = Math.max(1, Math.min(+(batchSize || 20), 100)); // 1..100
    let processed = 0;
    let failed = 0;

    // Envia em lotes simples
    for (let i = 0; i < colaboradores.length; i += bs) {
      const lote = colaboradores.slice(i, i + bs);
      const results = await Promise.all(
        lote.map(async (c) => {
          try {
            await emailService.sendWithAttachments({
              to: c.email,
              subject,
              html: renderTemplate(message, { nome: c.nome, unidade: c.unidade }),
              attachments: [{ filename, content: buffer }],
            });
            return { ok: true };
          } catch (e) {
            return { ok: false, error: (e as Error).message };
          }
        })
      );
      processed += results.filter((r) => r.ok).length;
      failed += results.filter((r) => !r.ok).length;
    }

    // Opcional: gravar histórico (se existir a tabela SendHistory)
    try {
      // Ajuste o model se o nome/tabela diferir no seu schema
      await prisma.sendHistory.create({
        data: {
          unidade: unidade || 'Teste',
          subject,
          message,
          totalRecipients: total,
          processed,
          failed,
        },
      });
    } catch {
      // ignora se o model não existir
    }

    return res.json({
      success: true,
      message: 'Holerites processados',
      processed,
      failed,
      total,
      unidade: unidade || 'Teste',
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Erro interno' });
  }
});

// Criar notificaÃ§Ã£o
router.post('/v1/notifications', async (req, res) => {
  try {
    const { email, subject, message, scheduledFor } = req.body;
    if (!email || !subject || !message || !scheduledFor) {
      return res.status(400).json({ error: 'Campos obrigatÃ³rios: email, subject, message, scheduledFor' });
    }
    const n = await prisma.notification.create({
      data: {
        email,
        subject,
        message,
        scheduledFor: new Date(scheduledFor),
        status: 'pending',
      }
    });
    res.status(201).json(n);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// Listar notificaÃ§Ãµes (opcional: ?status=pending|sent|failed)
router.get('/v1/notifications', async (req, res) => {
  const { status } = req.query;
  const where = status ? { status: status as string } : undefined;
  const list = await prisma.notification.findMany({
    where,
    orderBy: [{ status: 'asc' }, { scheduledFor: 'asc' }, { createdAt: 'desc' }],
  });
  res.json(list);
});

// HistÃ³rico de envios - listagem com filtros e paginaÃ§Ã£o
router.get('/v1/payslips/history', async (req, res) => {
  try {
    const { unidade, email, status, from, to, page = '1', limit = '50' } = req.query;
    const where: any = {};
    if (unidade) where.unidade = unidade as string;
    if (email) where.email = email as string;
    if (status) where.status = status as string;

    if (from || to) {
      const createdAt: any = {};
      if (from) createdAt.gte = new Date(from as string);
      if (to) createdAt.lte = new Date(to as string);
      where.createdAt = createdAt;
    }

    const pageNum = Math.max(parseInt(page as string, 10) || 1, 1);
    const take = Math.min(Math.max(parseInt(limit as string, 10) || 50, 1), 200);
    const skip = (pageNum - 1) * take;

    const [items, total] = await Promise.all([
      prisma.sendHistory.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take }),
      prisma.sendHistory.count({ where }),
    ]);

    res.json({ total, page: pageNum, limit: take, items });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Erro ao consultar histÃ³rico' });
  }
});

// HistÃ³rico de envios - detalhe
router.get('/v1/payslips/history/:id', async (req, res) => {
  try {
    const item = await prisma.sendHistory.findUnique({ where: { id: req.params.id } });
    if (!item) return res.status(404).json({ error: 'Registro nÃ£o encontrado' });
    res.json(item);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Erro ao consultar histÃ³rico' });
  }
});

// Status do worker
router.get('/v1/worker/status', (_req, res) => {
  res.json(worker.getStats());
});

export default router;
