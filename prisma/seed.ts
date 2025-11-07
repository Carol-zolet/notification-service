import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

type Registro = { nome: string; unidade: string; email: string; };

function normalizeContent(text: string): string {
  let t = text.replace(/\uFEFF/g, '');
  t = t.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  t = t.replace(/\t/g, ',');
  const firstLine = t.split('\n')[0] || '';
  if (firstLine.includes(';')) t = t.replace(/;/g, ',');
  return t;
}

function splitLine(line: string): string[] {
  return line.split(',').map(v => v.replace(/^"(.*)"$/, '$1').trim());
}

function findIndexInsensitive(headers: string[], candidates: string[]): number {
  const lower = headers.map(h => h.toLowerCase());
  for (const c of candidates) {
    const i = lower.indexOf(c.toLowerCase());
    if (i !== -1) return i;
  }
  return -1;
}

async function seedColaboradores() {
  const csvPath = path.resolve('prisma', 'colaboradores.csv');
  if (!fs.existsSync(csvPath)) {
    console.warn(`⚠️  ${csvPath} não encontrado. Pulando import.`);
    return;
  }

  const raw = fs.readFileSync(csvPath, 'utf8');
  const text = normalizeContent(raw);
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  if (lines.length < 2) {
    console.warn('  CSV vazio.');
    return;
  }

  const headers = splitLine(lines[0]);
  const idxNome = findIndexInsensitive(headers, ['Colaborador', 'Nome', 'Nome do Colaborador']);
  const idxUnidade = findIndexInsensitive(headers, ['Unidade', 'Filial']);
  const idxEmail = findIndexInsensitive(headers, ['Email Pessoal', 'E-mail Pessoal', 'Email', 'E-mail']);

  if (idxNome === -1 || idxUnidade === -1 || idxEmail === -1) {
    console.error(' Cabeçalho não reconhecido:', headers);
    return;
  }

  const registros: Registro[] = [];
  const erros: Array<{ line: number; motivo: string; conteudo: string[] }> = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = splitLine(lines[i]);
    const nome = (cols[idxNome] || '').trim();
    const unidade = (cols[idxUnidade] || '').trim();
    const email = (cols[idxEmail] || '').trim();
    if (!nome || !unidade || !email) {
      erros.push({ line: i + 1, motivo: 'Campos vazios', conteudo: cols });
      continue;
    }
    registros.push({ nome, unidade, email });
  }

  const seen = new Set<string>();
  const dedup = registros.filter(r => {
    const key = r.email.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  console.log(`  Válidos: ${dedup.length} | Erros: ${erros.length}`);

  if (dedup.length === 0) {
    console.warn('⚠️  Sem registros válidos.');
    return;
  }

  let inseridos = 0, duplicados = 0;
  for (const r of dedup) {
    try {
      await prisma.colaborador.create({ data: r });
      inseridos++;
    } catch (e: any) {
      if (e?.code === 'P2002') duplicados++;
      else console.error('   Erro:', r.email, e?.message);
    }
  }

  console.log(` Novos: ${inseridos} | Duplicados: ${duplicados}`);

  const unidades = await prisma.colaborador.findMany({
    select: { unidade: true },
    distinct: ['unidade'],
    orderBy: { unidade: 'asc' }
  });
  console.log(` Unidades: ${unidades.length}`);
  unidades.slice(0, 5).forEach(u => console.log('   -', u.unidade));
  if (unidades.length > 5) console.log(`   ... (+${unidades.length - 5})`);
}

async function main() {
  console.log(' Seed iniciado...');
  await seedColaboradores();
  console.log(' Seed concluído.');
}

main()
  .catch(e => { console.error('', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
