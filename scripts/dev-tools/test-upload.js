const fs = require('fs');
const path = require('path');

async function main() {
  const url = process.argv[2] || 'http://localhost:3002/import/colaboradores/preview';
  const filePath = process.argv[3] || 'prisma/colaboradores (4).xls';

  if (!fs.existsSync(filePath)) {
    console.error(`Arquivo não encontrado: ${filePath}`);
    process.exit(1);
  }

  const fileBuffer = fs.readFileSync(filePath);
  const fileName = path.basename(filePath);

  const formData = new FormData();
  const blob = new Blob([fileBuffer]);
  formData.append('planilha', blob, fileName);

  console.log(`Enviando ${fileName} para ${url}...`);
  try {
    const res = await fetch(url, { method: 'POST', body: formData });
    const data = await res.json();
    console.log(`Status: ${res.status}`);
    console.log(JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Erro:', err.message);
  }
}

main();
