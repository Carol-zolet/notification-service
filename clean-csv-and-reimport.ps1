# ==========================================
# SCRIPT: clean-csv-and-reimport.ps1
# Limpa CSV de linhas invalidas e reimporta
# ==========================================

Write-Host "Limpando CSV e reimportando..." -ForegroundColor Cyan

# 1. Limpar banco
Write-Host "1. Limpando banco..." -ForegroundColor Yellow
npx ts-node -e @'
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
(async () => {
  const deleted = await prisma.colaborador.deleteMany({});
  console.log(`Removidos ${deleted.count} registros`);
  process.exit(0);
})();
'@

Start-Sleep -Seconds 2

# 2. Limpar CSV
Write-Host ""
Write-Host "2. Limpando arquivo CSV..." -ForegroundColor Yellow

$csvPath = "prisma\colaboradores.csv"
$content = Get-Content -Path $csvPath -Raw

# Remover BOM
if ($content.StartsWith([char]0xFEFF)) {
  $content = $content.Substring(1)
}

# Dividir em linhas
$lines = $content -split "`n"

# Manter header e linhas validas
$validLines = @()
$validLines += $lines[0] # Header: Colaborador,Unidade,Email Pessoal

foreach ($line in $lines[1..($lines.Length-1)]) {
  if ([string]::IsNullOrWhiteSpace($line)) { continue }
  
  # Verificar se é uma linha valida (tem 3 campos separados por comma)
  $parts = $line -split ","
  if ($parts.Count -eq 3 -and $parts[0] -match "^[a-zA-Z]") {
    # Verificar se nao é linha do schema
    if ($parts[0] -notmatch "datasource|generator|model") {
      $validLines += $line
    }
  }
}

# Salvar CSV limpo
$cleanedCsv = $validLines -join "`n"
[System.IO.File]::WriteAllText($csvPath, $cleanedCsv, [System.Text.Encoding]::UTF8)

Write-Host "  Linhas validas: $($validLines.Count - 1)" -ForegroundColor Green

# 3. Reimportar
Write-Host ""
Write-Host "3. Reimportando colaboradores..." -ForegroundColor Yellow

npx ts-node -e @'
import { PrismaClient } from "@prisma/client";
import * as fs from "fs";

const prisma = new PrismaClient();

(async () => {
  let csv = fs.readFileSync("prisma/colaboradores.csv", "utf-8");
  
  if (csv.charCodeAt(0) === 0xFEFF) {
    csv = csv.slice(1);
  }

  const lines = csv.split("\n").slice(1);
  let inserted = 0;
  let duplicated = 0;

  for (const line of lines) {
    if (!line.trim()) continue;

    const [nome, unidade, email] = line.split(",").map(s => s?.trim());

    if (!nome || !email || !unidade) continue;

    try {
      const existe = await prisma.colaborador.findUnique({ where: { email } });
      if (!existe) {
        await prisma.colaborador.create({
          data: { nome, email, unidade },
        });
        inserted++;
      } else {
        duplicated++;
      }
    } catch (error) {
      console.error(`Erro: ${email}`, error);
    }
  }

  const total = await prisma.colaborador.count();
  console.log(`Inseridos: ${inserted}`);
  console.log(`Duplicados: ${duplicated}`);
  console.log(`Total: ${total}`);
  
  process.exit(0);
})();
'@

Write-Host ""
Write-Host "4. Verificando resultado..." -ForegroundColor Yellow

npx ts-node -e @'
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

(async () => {
  const total = await prisma.colaborador.count();
  
  const unidades = await prisma.colaborador.groupBy({
    by: ["unidade"],
    _count: { id: true },
    orderBy: { unidade: "asc" },
  });

  console.log(`Total de colaboradores: ${total}`);
  console.log(`Total de unidades: ${unidades.length}`);
  
  process.exit(0);
})();
'@

Write-Host ""
Write-Host "Concluido!" -ForegroundColor Green