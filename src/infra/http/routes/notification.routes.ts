import { Router } from "express";
import multer from "multer";
import { PrismaClient } from "@prisma/client";
import { NodemailerService } from "../../services/nodemailer.service";
import { MockEmailService } from "../../services/mock-email.service";

export const router = Router();
// ...código das rotas (copiado do antigo routes.ts)

export default router;
