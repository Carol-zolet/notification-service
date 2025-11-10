from prisma import PrismaClient
prisma = PrismaClient()

async def clean():
    await prisma.connect()
    # Deletar os 3 registros com nome contendo "generator" ou "datasource"
    deleted = await prisma.colaborador.delete_many(
        where={"OR": [
            {"nome": {"contains": "generator"}},
            {"nome": {"contains": "datasource"}},
            {"nome": {"contains": "model"}},
        ]}
    )
    print(f" {deleted} registros corrompidos removidos")
    await prisma.disconnect()

import asyncio
asyncio.run(clean())
