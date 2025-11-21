import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function testConnection() {
  try {
    console.log('🔄 Testando conexão com o banco de dados...')
    await prisma.$connect()
    console.log('✅ Conexão estabelecida com sucesso!')

    // Verifica quantos colaboradores existem
    const count = await prisma.colaborador.count()
    console.log(`📊 Total de colaboradores no banco: ${count}`)

    // Verifica quantas unidades existem
    const unidadesCount = await prisma.unidade.count()
    console.log(`🏢 Total de unidades no banco: ${unidadesCount}`)
  } catch (error) {
    console.error('❌ Erro ao conectar com o banco:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testConnection()
