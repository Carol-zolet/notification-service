const { Client } = require('pg');

const url = process.argv[2];
if (!url) {
  console.error('Uso: node test-conn.js "postgresql://..."');
  process.exit(1);
}

async function testar(tentativa) {
  const client = new Client({ connectionString: url });
  const inicio = Date.now();
  try {
    await client.connect();
    const res = await client.query('SELECT 1 as ok');
    console.log(`✅ Tentativa ${tentativa}: conectou em ${Date.now() - inicio}ms`, res.rows);
  } catch (err) {
    console.log(`❌ Tentativa ${tentativa}: falhou em ${Date.now() - inicio}ms —`, err.message);
  } finally {
    await client.end().catch(() => {});
  }
}

(async () => {
  await testar(1);
  console.log('Esperando 15s antes da segunda tentativa (dar tempo do Neon acordar)...');
  await new Promise(r => setTimeout(r, 15000));
  await testar(2);
})();
