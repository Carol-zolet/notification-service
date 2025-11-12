import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Adicionar colaboradores de teste
  const colaboradores = [
    { nome: 'João Silva', email: 'joao@empresa.com', unidade: 'São Paulo' },
    { nome: 'Maria Santos', email: 'maria@empresa.com', unidade: 'Rio de Janeiro' },
    { nome: 'Pedro Costa', email: 'pedro@empresa.com', unidade: 'São Paulo' },
    { nome: 'Ana Lima', email: 'ana@empresa.com', unidade: 'Belo Horizonte' },
    { nome: 'Carlos Souza', email: 'carlos@empresa.com', unidade: 'Rio de Janeiro' },
  ];

  for (const colab of colaboradores) {
    await prisma.colaborador.create({ data: colab });
    console.log(`✓ Criado: ${colab.nome} - ${colab.unidade}`);
  }

  console.log('\n✓ Dados de teste inseridos com sucesso!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
