import { Router } from "express";
import multer from "multer";
import { PrismaClient } from "@prisma/client";
import { NodemailerService } from "../services/nodemailer.service";
import { MockEmailService } from "../services/mock-email.service";
import { ReprocessFailedNotificationsUseCase } from "../../application/use-cases/reprocess-failed-notifications.use-case";

export const router = Router();
const prisma = new PrismaClient();
const emailService = process.env.SMTP_HOST ? new NodemailerService() : new MockEmailService();

// Health
router.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Unidades
router.get("/v1/unidades", async (_req, res) => {
  const unidades = await prisma.colaborador.findMany({
    distinct: ["unidade"],
    select: { unidade: true },
    orderBy: { unidade: "asc" },
  });
  res.json(unidades.map((u) => u.unidade));
});

// Colaboradores
router.get("/v1/colaboradores", async (_req, res) => {
  const colabs = await prisma.colaborador.findMany({
    select: { id: true, nome: true, email: true, unidade: true, createdAt: true },
    orderBy: { unidade: "asc" },
  });
  res.json(colabs);
});

// Notificações (simples criar/listar)
router.post("/v1/notifications", async (req, res) => {
  try {
    const { to, subject, body, scheduledAt, unidade } = req.body;
    if (!to) return res.status(400).json({ error: "Campo 'to' obrigatório" });
    const created = await prisma.notification.create({
      data: {
        to,
        subject,
        body,
        unidade,
        status: scheduledAt ? "pending" : "pending", // sempre pending para worker
        scheduledAt: scheduledAt ? new Date(scheduledAt) : new Date(),
      },
    });
    res.status(201).json(created);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.get("/v1/notifications", async (_req, res) => {
  const items = await prisma.notification.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  res.json({ total: items.length, items });
});

// Falhas
router.get("/v1/notifications/failed", async (req, res) => {
  try {
    const { unidade, limit = "100" } = req.query as Record<string, string>;
    const where: any = { status: "failed" };
    if (unidade) where.unidade = unidade;

    const items = await prisma.notification.findMany({
      where,
      take: Math.min(Number(limit) || 100, 1000),
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        to: true,
        subject: true,
        unidade: true,
        scheduledAt: true,
        sentAt: true,
        updatedAt: true,
        errorMessage: true,
        retryCount: true,
      },
    });

    res.json({ total: items.length, items });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Erro interno" });
  }
});

router.post("/v1/notifications/reprocess", async (req, res) => {
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
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === "application/pdf") cb(null, true);
    else cb(new Error("Apenas PDF é permitido"), false);
  },
});

function renderTemplate(tpl: string, ctx: { nome: string; unidade: string }) {
  return (tpl || "")
    .replace(/{{\s*nome\s*}}/gi, ctx.nome ?? "")
    .replace(/{{\s*unidade\s*}}/gi, ctx.unidade ?? "");
}

router.post("/v1/payslips/process", upload.single("pdfFile"), async (req, res) => {
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
            await emailService.sendWithAttachments({
              to: c.email,
              subject,
              html: renderTemplate(message, { nome: c.nome, unidade: c.unidade }),
              attachments: [{ filename, content: buffer }],
            });
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
          unidade: unidade || "Teste",
          subject,
          message,
          totalRecipients: total,
          processed,
          failed,
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
router.get("/v1/payslips/history", async (req, res) => {
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

export default router;
