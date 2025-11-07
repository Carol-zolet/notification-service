<# 
apply-patches.ps1
Script automatizado para aplicar:
- Use-case de reprocessamento
- Endpoints /notifications/failed e /notifications/reprocess
- Rota /payslips/process segura (dryRun, testRecipient, confirm, batchSize)
- Worker com batch, intervalo e fallback Nodemailer/Mock
- Scripts CLI (Prisma & REST) de reprocessamento
- Migration retryCount
- Atualização de package.json (scripts)
- Instala dependências e roda migração + build

Execute: 
  powershell.exe -ExecutionPolicy Bypass -File .\apply-patches.ps1
#>

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Write-Info($msg) { Write-Host "[INFO] $msg" -ForegroundColor Cyan }
function Write-Ok($msg) { Write-Host "[OK] $msg" -ForegroundColor Green }
function Write-Warn($msg) { Write-Host "[WARN] $msg" -ForegroundColor Yellow }
function Write-Err($msg) { Write-Host "[ERR] $msg" -ForegroundColor Red }

$Root = (Get-Location).Path
Write-Info "Raiz: $Root"

# 1. Backups
$BackupDir = Join-Path $Root "_backup_$(Get-Date -Format 'yyyyMMdd_HHmmss')"
New-Item -ItemType Directory -Path $BackupDir | Out-Null
Write-Info "Backup em $BackupDir"

$FilesToBackup = @(
  "package.json",
  "prisma\schema.prisma",
  "src\infra\http\routes.ts",
  "src\infra\workers\notification.worker.ts"
)

foreach ($f in $FilesToBackup) {
  $src = Join-Path $Root $f
  if (Test-Path $src) {
    Copy-Item $src (Join-Path $BackupDir ($f -replace '[\\\/]', '__')) -Force
    Write-Ok "Backup: $f"
  } else {
    Write-Warn "Arquivo não encontrado para backup: $f"
  }
}

# 2. Prisma schema (retryCount)
$SchemaPath = Join-Path $Root "prisma\schema.prisma"
if (-not (Test-Path $SchemaPath)) {
  Write-Err "schema.prisma não encontrado em prisma\schema.prisma. Abortando."
  exit 1
}

$SchemaContent = Get-Content $SchemaPath -Raw
if ($SchemaContent -match "retryCount") {
  Write-Warn "Campo retryCount já existe; mantendo."
} else {
  # Inserir retryCount dentro do model Notification
  $NewSchema = $SchemaContent -replace '(model\s+Notification\s*{)', '$1`r`n  retryCount   Int      @default(0)'
  Set-Content -Path $SchemaPath -Value $NewSchema -Encoding UTF8
  Write-Ok "Campo retryCount adicionado ao model Notification."
}

# 3. Use-case reprocess-failed
$UseCasePath = Join-Path $Root "src\application\use-cases\reprocess-failed-notifications.use-case.ts"
New-Item -ItemType Directory -Force -Path (Split-Path $UseCasePath) | Out-Null

@'
import { PrismaClient } from "@prisma/client";
import type { IEmailService } from "../services/IEmail.service";

export interface ReprocessParams {
  limit?: number;
  unidade?: string;
  ids?: string[];
  batchSize?: number;
  maxRetries?: number;
  incrementalRetry?: boolean;
  dryRun?: boolean;
}

export class ReprocessFailedNotificationsUseCase {
  constructor(
    private prisma: PrismaClient,
    private emailService: IEmailService
  ) {}

  private wait(ms: number) {
    return new Promise((res) => setTimeout(res, ms));
  }

  async execute(params: ReprocessParams) {
    const {
      limit = 200,
      unidade,
      ids,
      batchSize = 50,
      maxRetries = 1,
      incrementalRetry = true,
      dryRun = false,
    } = params;

    const where: any = { status: "failed" };
    if (unidade) where.unidade = unidade;
    if (ids?.length) where.id = { in: ids };

    const failed = await this.prisma.notification.findMany({
      where,
      take: limit,
      orderBy: { updatedAt: "asc" },
    });

    if (!failed.length) {
      return {
        processed: 0,
        failedAgain: 0,
        totalSelected: 0,
        items: [],
        message: "Nenhuma notificação failed encontrada",
      };
    }

    if (dryRun) {
      return {
        processed: 0,
        failedAgain: 0,
        totalSelected: failed.length,
        items: failed.slice(0, 20).map((n) => ({
          id: n.id,
            to: n.to,
            subject: n.subject,
            error: n.errorMessage,
        })),
        message: "Dry-run concluído",
      };
    }

    let processed = 0;
    let failedAgain = 0;
    const results: Array<{ id: string; to: string; subject: string | null; ok: boolean; attempts: number; error?: string }> = [];

    for (let i = 0; i < failed.length; i += batchSize) {
      const lote = failed.slice(i, i + batchSize);
      for (const n of lote) {
        let attempts = 0;
        let success = false;
        let lastError: string | undefined;

        while (attempts < maxRetries && !success) {
          attempts++;
          try {
            await this.emailService.send({
              to: n.to,
              subject: n.subject || "Notificação",
              html: n.body || "",
            });

            await this.prisma.notification.update({
              where: { id: n.id },
              data: {
                status: "sent",
                sentAt: new Date(),
                errorMessage: null,
                retryCount: { increment: 1 },
              },
            });

            success = true;
            processed++;
          } catch (e: any) {
            lastError = e?.message || "Erro";
            if (attempts >= maxRetries) {
              failedAgain++;
              await this.prisma.notification.update({
                where: { id: n.id },
                data: {
                  status: "failed",
                  errorMessage: lastError,
                  retryCount: { increment: 1 },
                },
              });
            } else if (incrementalRetry) {
              await this.wait(attempts * 500);
            }
          }
        }

        results.push({
          id: n.id,
          to: n.to,
          subject: n.subject,
          ok: success,
          attempts,
          error: lastError,
        });
      }
    }

    return {
      processed,
      failedAgain,
      totalSelected: failed.length,
      items: results.slice(0, 20),
      message: "Reprocessamento concluído",
    };
  }
}
'@ | Set-Content -Path $UseCasePath -Encoding UTF8
Write-Ok "Use-case criado: $UseCasePath"

# 4. Rotas
$RoutesPath = Join-Path $Root "src\infra\http\routes.ts"

@'
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
'@ | Set-Content -Path $RoutesPath -Encoding UTF8
Write-Ok "Rotas atualizadas."

# 5. Worker
$WorkerPath = Join-Path $Root "src\infra\workers\notification.worker.ts"

@'
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { NodemailerService } from "../services/nodemailer.service";
import { MockEmailService } from "../services/mock-email.service";

export class NotificationWorker {
  private intervalId: NodeJS.Timeout | null = null;
  private readonly prisma: PrismaClient;
  private readonly emailService: any;
  private readonly intervalMs: number;
  private readonly batchSize: number;
  private readonly enabled: boolean;

  constructor() {
    this.enabled = (process.env.NOTIFICATION_WORKER_ENABLED || "true").toLowerCase() === "true";
    this.intervalMs = Number(process.env.NOTIFICATION_WORKER_INTERVAL_MS || 60000);
    this.batchSize = Math.max(1, Number(process.env.NOTIFICATION_WORKER_BATCH_SIZE || 50));
    this.prisma = new PrismaClient();
    this.emailService = process.env.SMTP_HOST ? new NodemailerService() : new MockEmailService();
  }

  start() {
    if (!this.enabled) {
      console.log("⚙️ Worker desativado (NOTIFICATION_WORKER_ENABLED=false)");
      return;
    }
    if (this.intervalId) return;
    console.log(`📨 Worker iniciado | intervalo=${this.intervalMs}ms batchSize=${this.batchSize} service=${this.emailService.constructor.name}`);
    this.runCycle();
    this.intervalId = setInterval(() => this.runCycle(), this.intervalMs);
  }

  async stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    await this.prisma.$disconnect();
    console.log("🛑 Worker parado.");
  }

  private async runCycle() {
    const start = Date.now();
    try {
      const now = new Date();
      const pending = await this.prisma.notification.findMany({
        where: {
          status: "pending",
          scheduledAt: { lte: now },
        },
        orderBy: { scheduledAt: "asc" },
        take: 1000,
      });

      if (!pending.length) {
        console.log("🔁 Worker: nada pendente.");
        return;
      }

      let processed = 0;
      let failed = 0;

      for (let i = 0; i < pending.length; i += this.batchSize) {
        const lote = pending.slice(i, i + this.batchSize);
        const results = await Promise.all(
          lote.map(async (n) => {
            try {
              await this.emailService.send({
                to: n.to,
                subject: n.subject || "Notificação",
                html: n.body || "",
              });
              await this.prisma.notification.update({
                where: { id: n.id },
                data: {
                  status: "sent",
                  sentAt: new Date(),
                  errorMessage: null,
                },
              });
              return { ok: true };
            } catch (e: any) {
              await this.prisma.notification.update({
                where: { id: n.id },
                data: {
                  status: "failed",
                  errorMessage: e.message,
                  retryCount: { increment: 1 },
                },
              });
              return { ok: false, error: e.message };
            }
          })
        );
        processed += results.filter((r) => r.ok).length;
        failed += results.filter((r) => !r.ok).length;
      }

      console.log(`🔁 Worker ciclo: processed=${processed} failed=${failed} duration=${Date.now()-start}ms`);
    } catch (e: any) {
      console.error("❌ Erro no worker:", e.message);
    }
  }
}
'@ | Set-Content -Path $WorkerPath -Encoding UTF8
Write-Ok "Worker atualizado."

# 6. Scripts CLI
$ScriptDir = Join-Path $Root "src\scripts"
New-Item -ItemType Directory -Force -Path $ScriptDir | Out-Null

# Prisma script
@'
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { NodemailerService } from "../infra/services/nodemailer.service";
import { MockEmailService } from "../infra/services/mock-email.service";
import { ReprocessFailedNotificationsUseCase } from "../application/use-cases/reprocess-failed-notifications.use-case";

function boolEnv(v: string | undefined, def: boolean) {
  if (v == null) return def;
  return ["1","true","yes","on"].includes(v.toLowerCase());
}

async function main() {
  const prisma = new PrismaClient();
  const emailService = process.env.SMTP_HOST ? new NodemailerService() : new MockEmailService();

  const limit = process.env.RP_LIMIT ? Number(process.env.RP_LIMIT) : 200;
  const unidade = process.env.RP_UNIDADE;
  const ids = process.env.RP_IDS ? process.env.RP_IDS.split(",").map(s => s.trim()).filter(Boolean) : undefined;
  const batchSize = process.env.RP_BATCH ? Number(process.env.RP_BATCH) : 50;
  const maxRetries = process.env.RP_MAX_RETRIES ? Number(process.env.RP_MAX_RETRIES) : 1;
  const incrementalRetry = boolEnv(process.env.RP_INCREMENTAL_RETRY, true);
  const dryRun = boolEnv(process.env.RP_DRY_RUN, false);

  console.log("▶ Reprocess-failed (Prisma):", { limit, unidade, ids: ids?.length||0, batchSize, maxRetries, incrementalRetry, dryRun, service: emailService.constructor.name });

  const useCase = new ReprocessFailedNotificationsUseCase(prisma, emailService);
  const result = await useCase.execute({ limit, unidade, ids, batchSize, maxRetries, incrementalRetry, dryRun });

  console.log(JSON.stringify(result, null, 2));
  await prisma.$disconnect();
}

main().catch(e => { console.error("Erro fatal:", e); process.exit(1); });
'@ | Set-Content -Path (Join-Path $ScriptDir "reprocess-failed.ts") -Encoding UTF8

# REST script
@'
import "dotenv/config";
import axios from "axios";

const API_BASE = process.env.API_BASE || "http://localhost:3001/api";
const LIMIT = Number(process.env.RP_LIMIT || 100);
const UNIDADE = process.env.RP_UNIDADE || "";
const BATCH = Number(process.env.RP_BATCH || 50);
const MAX_RETRIES = Number(process.env.RP_MAX_RETRIES || 1);
const INCR = (process.env.RP_INCREMENTAL_RETRY || "true").toLowerCase();
const DRY_RUN = (process.env.RP_DRY_RUN || "false").toLowerCase();

function asBool(s: string) {
  return ["1","true","yes","on"].includes(s.toLowerCase());
}

async function main() {
  console.log(`REST reprocess start (dryRun=${DRY_RUN})`);
  const params = new URLSearchParams({ limit: String(LIMIT) });
  if (UNIDADE) params.append("unidade", UNIDADE);

  const failedUrl = `${API_BASE}/v1/notifications/failed?${params.toString()}`;
  const list = await axios.get(failedUrl).then(r => r.data);
  console.log(`Selecionadas: ${list.total}`);

  if (!list.total) return;

  if (asBool(DRY_RUN)) {
    console.table(list.items.slice(0,10).map((x: any) => ({
      id: x.id, to: x.to, error: (x.errorMessage||"").slice(0,80)
    })));
    return;
  }

  const body = {
    limit: LIMIT,
    unidade: UNIDADE || undefined,
    batchSize: BATCH,
    maxRetries: MAX_RETRIES,
    incrementalRetry: asBool(INCR),
  };
  const resp = await axios.post(`${API_BASE}/v1/notifications/reprocess`, body).then(r => r.data);
  console.log("Resultado:", JSON.stringify(resp, null, 2));
}

main().catch(e => { console.error("Erro:", e.message); process.exit(1); });
'@ | Set-Content -Path (Join-Path $ScriptDir "reprocess-failed-rest.ts") -Encoding UTF8
Write-Ok "Scripts CLI criados."

# 7. Atualizar package.json (adiciona scripts)
$PkgPath = Join-Path $Root "package.json"
$Pkg = Get-Content $PkgPath -Raw | ConvertFrom-Json

# Garante scripts:
$Pkg.scripts."reprocess:failed" = "ts-node src/scripts/reprocess-failed.ts"
$Pkg.scripts."reprocess:failed:rest" = "ts-node src/scripts/reprocess-failed-rest.ts"
if (-not $Pkg.scripts.build) { $Pkg.scripts.build = "tsc" }
if (-not $Pkg.scripts.start) { $Pkg.scripts.start = "node dist/infra/main.js" }

# Garante deps axios
if (-not $Pkg.dependencies."axios") {
  $Pkg.dependencies."axios" = "^1.7.3"
}

# Escreve de volta
$Pkg | ConvertTo-Json -Depth 100 | Set-Content -Path $PkgPath -Encoding UTF8
Write-Ok "package.json atualizado."

# 8. .env recomendações
$EnvPath = Join-Path $Root ".env"
if (-not (Test-Path $EnvPath)) {
  @'
# SMTP
SMTP_HOST=smtp.seuprovedor.com
SMTP_PORT=587
SMTP_USER=usuario
SMTP_PASS=senha
SMTP_SECURE=false
SMTP_FROM="Alertas <alertas@empresa.com>"

# Worker
NOTIFICATION_WORKER_ENABLED=true
NOTIFICATION_WORKER_INTERVAL_MS=60000
NOTIFICATION_WORKER_BATCH_SIZE=50

# Reprocess default
RP_LIMIT=200
RP_BATCH=50
RP_MAX_RETRIES=2
RP_INCREMENTAL_RETRY=true
RP_DRY_RUN=false

# Backend
PORT=3001

'@ | Set-Content -Path $EnvPath -Encoding UTF8
  Write-Ok ".env criado (ajuste credenciais reais)."
} else {
  Write-Warn ".env já existe — verifique se variáveis novas estão presentes."
}

# 9. Instalar dependências
Write-Info "Instalando dependências..."
npm install | Out-Null
Write-Ok "Dependências instaladas."

# 10. Migrar Prisma
Write-Info "Rodando migrate dev (add_retry_count)..."
npx prisma migrate dev --name add_retry_count | Out-Null
npx prisma generate | Out-Null
Write-Ok "Migration + generate concluídos."

# 11. Build / Type-check
Write-Info "Verificando TypeScript..."
npx tsc --noEmit
Write-Ok "TypeScript OK."

Write-Info "Script finalizado. Próximos passos:"
Write-Host "  - Iniciar servidor local: npm run dev (ou build + start para produção)" -ForegroundColor Cyan
Write-Host "  - Testar endpoints: /api/v1/notifications/failed, /api/v1/notifications/reprocess" -ForegroundColor Cyan
Write-Host "  - Reprocessar via script: `npm run reprocess:failed`" -ForegroundColor Cyan
Write-Host "  - Holerites seguro: POST /api/v1/payslips/process" -ForegroundColor Cyan
Write-Ok "Tudo aplicado."
