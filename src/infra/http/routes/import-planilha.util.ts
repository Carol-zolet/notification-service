import * as XLSX from "xlsx";

export interface RegistroPlanilha {
  nome: string;
  email: string;
  unidade: string;
}

export interface ColaboradorExistente {
  id: string;
  nome: string;
  email: string;
  unidade: string;
}

export interface Removido {
  id: string;
  nome: string;
  email: string;
  unidade: string;
}

export interface MudancaUnidade {
  nome: string;
  email: string;
  unidadeAntiga: string;
  unidadeNova: string;
}

export interface AtualizacaoNome {
  email: string;
  nomeAntigo: string;
  nomeNovo: string;
  unidade: string;
}

export interface PreviewResult {
  totalNaPlanilha: number;
  novos: RegistroPlanilha[];
  removidos: Removido[];
  mudancasUnidade: MudancaUnidade[];
  atualizacoesNome: AtualizacaoNome[];
  novasUnidades: string[];
  semMudanca: number;
  registros: RegistroPlanilha[];
}

export const isFake = (email: string) => email.toLowerCase().endsWith("@fake.com");

export function normalizarLinha(row: Record<string, any>): RegistroPlanilha | null {
  const get = (...chaves: string[]) => {
    for (const chave of chaves) {
      const key = Object.keys(row).find((k) => k.trim().toLowerCase() === chave);
      if (key && row[key] !== undefined && row[key] !== null && String(row[key]).trim() !== "") {
        return String(row[key]).trim();
      }
    }
    return "";
  };

  const nome = get("nome", "colaborador", "funcionário", "funcionario");
  const email = get("email", "email pessoal", "e-mail");
  const unidade = get("unidade", "filial", "unidade/filial");

  if (!nome || !email || !unidade) return null;

  return {
    nome: nome.toUpperCase(),
    email: email.toLowerCase(),
    unidade,
  };
}

export function lerPlanilha(buffer: Buffer): RegistroPlanilha[] {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const registros: RegistroPlanilha[] = [];

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const rows: Record<string, any>[] = XLSX.utils.sheet_to_json(sheet, { defval: "" });
    for (const row of rows) {
      const registro = normalizarLinha(row);
      if (registro) registros.push(registro);
    }
  }

  const porEmail = new Map<string, RegistroPlanilha>();
  for (const r of registros) porEmail.set(r.email, r);
  return Array.from(porEmail.values());
}

export function computeDiff(
  existentes: ColaboradorExistente[],
  registros: RegistroPlanilha[]
): PreviewResult {
  const existentesReais = existentes.filter((c) => !isFake(c.email));
  const existentesPorEmail = new Map(existentesReais.map((c) => [c.email, c]));
  const emailsNaPlanilha = new Set(registros.map((r) => r.email));
  // Unidades "existentes" consideram TODOS os colaboradores, incluindo os placeholders
  // fake (@fake.com) criados pela tela "+ Adicionar Unidade" — senão uma unidade vazia
  // apareceria como "nova" na primeira planilha importada.
  const unidadesExistentes = new Set(existentes.map((c) => c.unidade));

  const novos: RegistroPlanilha[] = [];
  const removidos: Removido[] = [];
  const mudancasUnidade: MudancaUnidade[] = [];
  const atualizacoesNome: AtualizacaoNome[] = [];
  const novasUnidades = new Set<string>();

  for (const registro of registros) {
    const atual = existentesPorEmail.get(registro.email);
    if (!atual) {
      novos.push(registro);
    } else {
      if (atual.unidade !== registro.unidade) {
        mudancasUnidade.push({
          nome: registro.nome,
          email: registro.email,
          unidadeAntiga: atual.unidade,
          unidadeNova: registro.unidade,
        });
      } else if (atual.nome !== registro.nome) {
        atualizacoesNome.push({
          email: registro.email,
          nomeAntigo: atual.nome,
          nomeNovo: registro.nome,
          unidade: registro.unidade,
        });
      }
    }
    if (!unidadesExistentes.has(registro.unidade)) {
      novasUnidades.add(registro.unidade);
    }
  }

  for (const existente of existentesReais) {
    if (!emailsNaPlanilha.has(existente.email)) {
      removidos.push({
        id: existente.id,
        nome: existente.nome,
        email: existente.email,
        unidade: existente.unidade,
      });
    }
  }

  return {
    totalNaPlanilha: registros.length,
    novos,
    removidos,
    mudancasUnidade,
    atualizacoesNome,
    novasUnidades: Array.from(novasUnidades),
    semMudanca: registros.length - novos.length - mudancasUnidade.length - atualizacoesNome.length,
    registros,
  };
}
