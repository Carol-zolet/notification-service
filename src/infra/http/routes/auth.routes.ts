import { Router } from "express";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";
import { NodemailerService } from "../../services/nodemailer.service";
import { MockEmailService } from "../../services/mock-email.service";
import { BrevoApiService } from "../../../application/services/brevo-api-email.service";

const prisma = new PrismaClient();

// Mesma lógica de escolha de serviço de e-mail usada em routes.ts
const emailService = process.env.BREVO_API_KEY
  ? new BrevoApiService(
      process.env.BREVO_API_KEY!,
      process.env.BREVO_SENDER || "carolinezolet@gmail.com"
    )
  : process.env.SMTP_HOST
  ? new NodemailerService()
  : new MockEmailService();

export const authRouter = Router();

const CODE_TTL_MS = 10 * 60 * 1000; // 10 minutos
const RATE_LIMIT_MS = 60 * 1000; // 1 pedido de código por minuto por e-mail
const JWT_TTL = "8h";

function getAllowedEmails(): string[] {
  return (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

function hashCode(code: string): string {
  const secret = process.env.JWT_SECRET || "";
  return crypto.createHash("sha256").update(`${code}:${secret}`).digest("hex");
}

function gerarCodigo(): string {
  // 6 dígitos, de 000000 a 999999
  return crypto.randomInt(0, 1000000).toString().padStart(6, "0");
}

authRouter.post("/request-code", async (req, res) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    if (!email) {
      return res.status(400).json({ error: "E-mail é obrigatório" });
    }

    const allowed = getAllowedEmails();
    if (!allowed.includes(email)) {
      // Não revela se o e-mail existe ou não na lista — mensagem genérica
      return res.status(200).json({
        message: "Se este e-mail estiver autorizado, um código foi enviado.",
      });
    }

    // Rate limit: bloqueia pedido novo se já existe um código recente não usado
    const recente = await prisma.loginCode.findFirst({
      where: {
        email,
        used: false,
        createdAt: { gt: new Date(Date.now() - RATE_LIMIT_MS) },
      },
      orderBy: { createdAt: "desc" },
    });
    if (recente) {
      return res.status(429).json({
        error: "Aguarde um momento antes de pedir um novo código.",
      });
    }

    const codigo = gerarCodigo();
    const codeHash = hashCode(codigo);
    const expiresAt = new Date(Date.now() + CODE_TTL_MS);

    await prisma.loginCode.create({
      data: { email, codeHash, expiresAt },
    });

    await emailService.send(
      email,
      "Seu código de acesso — Sistema de Holerites 26fit",
      `<p>Seu código de acesso é:</p><h2 style="letter-spacing: 4px;">${codigo}</h2><p>Válido por 10 minutos. Se você não pediu esse código, ignore este e-mail.</p>`
    );

    res.status(200).json({
      message: "Se este e-mail estiver autorizado, um código foi enviado.",
    });
  } catch (error: any) {
    console.error("[AUTH] Erro ao gerar código:", error);
    res.status(500).json({ error: "Erro ao processar solicitação" });
  }
});

authRouter.post("/verify-code", async (req, res) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    const codigo = String(req.body.code || "").trim();

    if (!email || !codigo) {
      return res.status(400).json({ error: "E-mail e código são obrigatórios" });
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      console.error("[AUTH] JWT_SECRET não configurado");
      return res.status(500).json({ error: "Configuração de autenticação ausente no servidor" });
    }

    const codeHash = hashCode(codigo);
    const registro = await prisma.loginCode.findFirst({
      where: {
        email,
        codeHash,
        used: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
    });

    if (!registro) {
      return res.status(401).json({ error: "Código inválido ou expirado" });
    }

    await prisma.loginCode.update({
      where: { id: registro.id },
      data: { used: true },
    });

    const token = jwt.sign({ email }, secret, { expiresIn: JWT_TTL });
    res.json({ token, email });
  } catch (error: any) {
    console.error("[AUTH] Erro ao verificar código:", error);
    res.status(500).json({ error: "Erro ao processar solicitação" });
  }
});

export default authRouter;
