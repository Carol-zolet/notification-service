import * as XLSX from "xlsx";
import * as fs from "fs";
import { lerPlanilha, computeDiff, ColaboradorExistente } from "../src/infra/http/routes/import-planilha.util";

console.log("=== 1. Gerando planilha de exemplo ===\n");

// Simula uma planilha do RH com: 1 header estranho (Colaborador/Email Pessoal),
// 1 pessoa nova, 1 que mudou de unidade, 1 com nome corrigido, 1 que ficou igual,
// e 1 que existe no banco mas NÃO está na planilha (saiu).
const linhas = [
  { Unidade: "Alegrete", Colaborador: "joão da silva", "Email Pessoal": "joao.silva@empresa.com" }, // já existe, sem mudança
  { Unidade: "Bagé", Colaborador: "MARIA SOUZA", "Email Pessoal": "maria.souza@empresa.com" },       // mudou de unidade (estava em Alvorada)
  { Unidade: "Alegrete", Colaborador: "Carlos Pereira Silva", "Email Pessoal": "carlos.pereira@empresa.com" }, // nome corrigido
  { Unidade: "Cachoeirinha", Colaborador: "Ana Nova", "Email Pessoal": "ana.nova@empresa.com" },     // entrou agora
  { Unidade: "Bento Gonçalves", Colaborador: "Rafael Teste", "Email Pessoal": "rafael.teste@empresa.com" }, // unidade totalmente nova
  { Unidade: "", Colaborador: "Linha Quebrada", "Email Pessoal": "quebrada@empresa.com" },           // linha inválida, deve ser ignorada
];

const worksheet = XLSX.utils.json_to_sheet(linhas);
const workbook = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(workbook, worksheet, "Colaboradores");
XLSX.writeFile(workbook, "/home/claude/planilha-teste.xlsx");
console.log("Planilha gerada em /home/claude/planilha-teste.xlsx\n");

console.log("=== 2. Lendo e normalizando a planilha ===\n");
const buffer = fs.readFileSync("/home/claude/planilha-teste.xlsx");
const registros = lerPlanilha(buffer);
console.log(JSON.stringify(registros, null, 2));

console.log("\n=== 3. Simulando estado atual do banco (mock) ===\n");
const existentesMock: ColaboradorExistente[] = [
  { id: "1", nome: "JOÃO DA SILVA", email: "joao.silva@empresa.com", unidade: "Alegrete" },
  { id: "2", nome: "MARIA SOUZA", email: "maria.souza@empresa.com", unidade: "Alvorada" }, // vai "mudar" pra Bagé
  { id: "3", nome: "CARLOS PEREIRA", email: "carlos.pereira@empresa.com", unidade: "Alegrete" }, // nome vai mudar
  { id: "4", nome: "FUNCIONÁRIO ANTIGO", email: "antigo@empresa.com", unidade: "Alegrete" }, // não está na planilha -> "saiu"
  { id: "5", nome: "UNIDADE", email: "cachoeirinha@fake.com", unidade: "Cachoeirinha" }, // placeholder fake, não deve contar como "saiu"
];
console.log(JSON.stringify(existentesMock, null, 2));

console.log("\n=== 4. Calculando diff ===\n");
const preview = computeDiff(existentesMock, registros);
console.log(JSON.stringify(preview, null, 2));

console.log("\n=== 5. Verificações automáticas ===\n");
const checks: { nome: string; ok: boolean }[] = [
  { nome: "Detectou 2 novos (Ana Nova + Rafael Teste)", ok: preview.novos.length === 2 && preview.novos.some(n => n.email === "ana.nova@empresa.com") && preview.novos.some(n => n.email === "rafael.teste@empresa.com") },
  { nome: "Detectou 1 mudança de unidade (Maria: Alvorada -> Bagé)", ok: preview.mudancasUnidade.length === 1 && preview.mudancasUnidade[0].unidadeAntiga === "Alvorada" && preview.mudancasUnidade[0].unidadeNova === "Bagé" },
  { nome: "Detectou 1 atualização de nome (Carlos Pereira -> Carlos Pereira Silva)", ok: preview.atualizacoesNome.length === 1 && preview.atualizacoesNome[0].nomeNovo === "CARLOS PEREIRA SILVA" },
  { nome: "Detectou 1 removido (Funcionário Antigo)", ok: preview.removidos.length === 1 && preview.removidos[0].email === "antigo@empresa.com" },
  { nome: "NÃO considerou o placeholder @fake.com como removido", ok: !preview.removidos.some(r => r.email.endsWith("@fake.com")) },
  { nome: "NÃO considerou Cachoeirinha unidade nova (já existia via placeholder fake)", ok: !preview.novasUnidades.includes("Cachoeirinha") },
  { nome: "Detectou Bagé e Bento Gonçalves como unidades novas de verdade", ok: preview.novasUnidades.includes("Bagé") && preview.novasUnidades.includes("Bento Gonçalves") && preview.novasUnidades.length === 2 },
  { nome: "Ignorou a linha sem unidade (Linha Quebrada)", ok: !registros.some(r => r.email === "quebrada@empresa.com") },
  { nome: "João da Silva ficou sem mudança", ok: preview.semMudanca === 1 },
];

let falhas = 0;
for (const c of checks) {
  console.log(`${c.ok ? "✅" : "❌"} ${c.nome}`);
  if (!c.ok) falhas++;
}

console.log(`\n${checks.length - falhas}/${checks.length} testes passaram.`);
if (falhas > 0) process.exit(1);
