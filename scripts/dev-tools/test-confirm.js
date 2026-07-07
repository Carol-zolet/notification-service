// Testa o /import/colaboradores/confirm com os 4 registros fictícios da planilha de teste.
// Não exclui ninguém (emailsParaExcluir vazio) — só cria/atualiza os registros fictícios.

async function main() {
  const baseUrl = process.argv[2] || 'http://localhost:3000';

  const registros = [
    { nome: "FULANO TESTE DA SILVA", email: "fulano.teste@exemplo.com", unidade: "Unidade Teste 1" },
    { nome: "CICLANA TESTE SOUZA", email: "ciclana.teste@exemplo.com", unidade: "Unidade Teste 1" },
    { nome: "BELTRANO TESTE OLIVEIRA", email: "beltrano.teste@exemplo.com", unidade: "Unidade Teste 2" },
    { nome: "SICRANO TESTE PEREIRA", email: "sicrano.teste@exemplo.com", unidade: "Unidade Teste 2 Nova" },
  ];

  console.log(`Enviando confirm para ${baseUrl}/import/colaboradores/confirm ...`);
  console.log(`Registros: ${registros.length}, exclusões: 0`);

  try {
    const res = await fetch(`${baseUrl}/import/colaboradores/confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ registros, emailsParaExcluir: [] }),
    });
    const data = await res.json();
    console.log(`Status: ${res.status}`);
    console.log(JSON.stringify(data, null, 2));

    if (res.ok) {
      console.log('\n✅ Confirm aplicado. LEMBRETE: esses 4 registros fictícios agora estão');
      console.log('   no banco real — não esqueça de excluí-los depois (aba Colaboradores');
      console.log('   do painel, ou pela query abaixo direto no Neon SQL Editor):');
      console.log(`
DELETE FROM "Colaborador" WHERE email IN (
  'fulano.teste@exemplo.com',
  'ciclana.teste@exemplo.com',
  'beltrano.teste@exemplo.com',
  'sicrano.teste@exemplo.com'
);`);
    }
  } catch (err) {
    console.error('Erro:', err.message);
  }
}

main();
