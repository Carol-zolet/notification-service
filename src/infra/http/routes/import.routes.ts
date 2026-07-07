import { Router } from "express";
import multer from "multer";
import { PrismaClient } from "@prisma/client";
import { lerPlanilha, computeDiff } from "./import-planilha.util";

const prisma = new PrismaClient();
const upload = multer({ storage: multer.memoryStorage() });

export const importRouter = Router();

// ============= PREVIEW (não altera nada no banco) =============
importRouter.post("/colaboradores/preview", upload.single("planilha"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Envie o arquivo no campo 'planilha'" });
    }

    const registros = lerPlanilha(req.file.buffer);
    if (registros.length === 0) {
      return res.status(400).json({
        error:
          "Nenhum registro válido encontrado. Verifique se a planilha tem colunas de nome, email e unidade.",
      });
    }

    const existentes = await prisma.colaborador.findMany();
    const preview = computeDiff(existentes, registros);

    res.json(preview);
  } catch (error: any) {
    console.error("[IMPORT] Erro no preview:", error);
    res.status(500).json({ error: error.message || "Erro ao ler planilha" });
  }
});

// ============= CONFIRM (aplica as mudanças) =============
importRouter.post("/colaboradores/confirm", async (req, res) => {
  try {
    const registros = req.body.registros || [];
    const emailsParaExcluir: string[] = req.body.emailsParaExcluir || [];

    if (registros.length === 0) {
      return res.status(400).json({ error: "Nenhum registro para importar" });
    }

    const resultado = await prisma.$transaction(async (tx) => {
      for (const registro of registros) {
        await tx.colaborador.upsert({
          where: { email: registro.email },
          update: { nome: registro.nome, unidade: registro.unidade },
          create: { nome: registro.nome, email: registro.email, unidade: registro.unidade },
        });
      }

      let excluidos = 0;
      if (emailsParaExcluir.length > 0) {
        const del = await tx.colaborador.deleteMany({
          where: { email: { in: emailsParaExcluir } },
        });
        excluidos = del.count;
      }

      return { processados: registros.length, excluidos };
    });

    res.json({ success: true, ...resultado });
  } catch (error: any) {
    console.error("[IMPORT] Erro ao confirmar importação:", error);
    res.status(500).json({ error: error.message || "Erro ao aplicar importação" });
  }
});

export default importRouter;
