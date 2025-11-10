# ==========================================
# SCRIPT: diagnose-csv.ps1
# Diagnostica problemas no CSV
# ==========================================

Write-Host "Diagnosticando arquivo CSV..." -ForegroundColor Yellow

$diagScript = @'
import * as fs from 'fs';

const csv = fs.readFileSync('prisma/colaboradores.csv', 'utf-8');

// Remover BOM
let content = csv;
if (content.charCodeAt(0) === 0xFEFF) {
  content = content.slice(1);
}

const lines = content.split('\n');

console.log('Total de linhas:', lines.length);
console.log('Primeiras 3 linhas:');

for (let i = 0; i < 3; i++) {
  const line = lines[i];
  console.log(`\nLinha ${i}:`);
  console.log(`  Raw: ${JSON.stringify(line)}`);
  console.log(`  Length: ${line.length}`);
  console.log(`  Chars: ${Array.from(line).map(c => `${c.charCodeAt(0)}`).join(',')}`);
  
  const tabSplit = line.split('\t');
  const commaSplit = line.split(',');
  
  console.log(`  Split por TAB: ${tabSplit.length} partes`);
  console.log(`  Split por comma: ${commaSplit.length} partes`);
}

console.log('\n\nAnalisando delimitador mais comum:');
let tabCount = 0;
let commaCount = 0;

lines.slice(1, 20).forEach(line => {
  tabCount += (line.match(/\t/g) || []).length;
  commaCount += (line.match(/,/g) || []).length;
});

console.log(`  TABs encontrados: ${tabCount}`);
console.log(`  Commas encontradas: ${commaCount}`);
'@

$diagScript | Out-File "src\scripts\diagnose.mts" -Encoding UTF8 -NoNewline

Write-Host ""
Write-Host "Analisando CSV..." -ForegroundColor Yellow
npx tsx src/scripts/diagnose.mts