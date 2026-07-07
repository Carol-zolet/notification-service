import { Router } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Rotas de introspecção usadas só em desenvolvimento local.
// NUNCA montar esse router quando NODE_ENV === 'production' — ver src/infra/main.ts.
export const debugRouter = Router();

debugRouter.get("/debug/total", async (_req, res) => {
  try {
    const total = await prisma.colaborador.count();
    res.json({ total, timestamp: new Date().toISOString() });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

debugRouter.get("/debug/unidades", async (_req, res) => {
  try {
    const unidades = await prisma.colaborador.groupBy({
      by: ["unidade"],
      _count: { id: true },
      orderBy: { unidade: "asc" },
    });
    res.json(unidades.map((u) => ({ unidade: u.unidade, count: u._count.id })));
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

debugRouter.get("/debug/colaboradores-por-unidade", async (_req, res) => {
  try {
    const colaboradores = await prisma.colaborador.findMany({ select: { unidade: true } });
    const grouped: Record<string, number> = {};
    colaboradores.forEach((c) => {
      const key = String(c.unidade ?? "");
      grouped[key] = (grouped[key] || 0) + 1;
    });
    res.json(grouped);
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

export default debugRouter;
