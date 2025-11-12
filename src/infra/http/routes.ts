import { Router } from "express";
import multer from "multer";
import { PrismaClient } from "@prisma/client";
import { NodemailerService } from "../services/nodemailer.service";
import { MockEmailService } from "../services/mock-email.service";

export const router = Router();
const prisma = new PrismaClient();
const emailService = process.env.SMTP_HOST ? new NodemailerService() : new MockEmailService();

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
        if (typeof this.emailService.send === "function") {
          await this.emailService.send(n.email, n.subject, n.message);
        } else if (typeof this.emailService.sendWithAttachments === "function") {
          await this.emailService.sendWithAttachments(n.email, n.subject, n.message, []);
        } else {
          throw new Error("emailService has no send method");
        }

        await this.prisma.notification.update({
          where: { id: n.id },
          data: { status: "sent", sentAt: new Date() },
        });

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

// Root do API v1: resposta simples para facilitar checagens e evitar 404 em GET /api/v1/
router.get('/', (_req, res) => {
  res.json({ service: 'notification-service', api: 'v1', status: 'ok', timestamp: new Date().toISOString() });
});

// Unidades
router.get("/unidades", async (_req, res) => {
  const unidades = await prisma.colaborador.findMany({
    distinct: ["unidade"],
    select: { unidade: true },
    orderBy: { unidade: "asc" },
  });
  res.json(unidades.map((u) => u.unidade));
});

// Colaboradores
router.get("/colaboradores", async (_req, res) => {
  const colabs = await prisma.colaborador.findMany({
    select: { id: true, nome: true, email: true, unidade: true, createdAt: true },
    orderBy: { unidade: "asc" },
  });
  res.json(colabs);
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
    res.status(500).json({ error: e.message });
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

    if (!req.file?.buffer) {
      return res.status(400).json({ error: "Arquivo não enviado" });
    }

    const buffer = req.file.buffer;
    const filename = req.file.originalname || "holerite.pdf";
    const bs = Math.max(1, Math.min(Number(batchSize || 20), 100));
    let processed = 0;
    let failed = 0;

    for (let i = 0; i < colaboradores.length; i += bs) {
      const lote = colaboradores.slice(i, i + bs);
      const results = await Promise.all(
        lote.map(async (c) => {
          try {
            const subjectRendered = renderTemplate(subject, { nome: c.nome, unidade: c.unidade });
            const messageRendered = renderTemplate(message, { nome: c.nome, unidade: c.unidade });
            await emailService.sendWithAttachments(
              c.email,  // to
              subjectRendered,    // subject
              messageRendered,    // body
              [{ filename, content: buffer }]  // attachments
            );
            return { ok: true };
          } catch (e: any) {
            return { ok: false, error: e.message };
          }
        })
      );
      processed += results.filter((r) => r.ok).length;
      failed += results.filter((r) => !r.ok).length;
    }

    // Histórico (tabela SendHistory se existir)
    try {
      await prisma.sendHistory.create({
        data: {
          unidade,
          subject,
          total,             // ← em vez de totalRecipients
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

// POST /api/v1/payslips/distribuir
router.post('/payslips/distribuir', upload.single('pdfFile'), async (req, res) => {
  try {
    const { unidade, subject, message } = req.body;
    const pdfBuffer = req.file?.buffer;

    if (!pdfBuffer || !unidade) {
      return res.status(400).json({
        success: false,
        message: 'PDF e unidade sao obrigatorios',
      });
    }

    // Buscar colaboradores da unidade
    const colaboradores = await prisma.colaborador.findMany({
      where: { unidade: unidade },
      select: { id: true, nome: true, email: true, unidade: true },
    });

    if (colaboradores.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Nenhum colaborador encontrado para ${unidade}`,
      });
    }

    let processed = 0;
    let failed = 0;

    // Processar cada colaborador
    for (const col of colaboradores) {
      try {
        // TODO: Aqui vocÃª pode adicionar logica de envio de email
        // Por enquanto, apenas simulamos o envio
        console.log(`[PAYSLIP] Enviando para ${col.nome} (${col.email})`);
        processed++;
      } catch (error) {
        console.error(`Erro ao enviar para ${col.email}:`, error);
        failed++;
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Holerites processados',
      processed,
      failed,
      total: colaboradores.length,
      unidade: unidade,
    });
  } catch (error) {
    console.error('Erro ao distribuir holerites:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro ao distribuir holerites',
    });
  }
});

export default router;
