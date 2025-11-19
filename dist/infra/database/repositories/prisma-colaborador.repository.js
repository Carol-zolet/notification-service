"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrismaColaboradorRepository = void 0;
class PrismaColaboradorRepository {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(data) {
        const novo = await this.prisma.colaborador.create({
            data: {
                nome: data.nome,
                email: data.email,
                unidade: data.unidade,
            }
        });
        return {
            id: novo.id,
            email: novo.email,
            nome: novo.nome,
            unidade: novo.unidade,
            createdAt: novo.createdAt,
        };
    }
    async findById(id) {
        const found = await this.prisma.colaborador.findUnique({ where: { id } });
        if (!found)
            return null;
        return { id: found.id, email: found.email, nome: found.nome, unidade: found.unidade, createdAt: found.createdAt };
    }
    async findByEmail(email) {
        const found = await this.prisma.colaborador.findUnique({ where: { email } });
        if (!found)
            return null;
        return { id: found.id, email: found.email, nome: found.nome, unidade: found.unidade, createdAt: found.createdAt };
    }
    async findByUnidade(unidade) {
        const results = await this.prisma.colaborador.findMany({
            where: { unidade },
            orderBy: { nome: 'asc' },
        });
        return results.map(r => ({ id: r.id, email: r.email, nome: r.nome, unidade: r.unidade, createdAt: r.createdAt }));
    }
    async findAll() {
        const results = await this.prisma.colaborador.findMany({ orderBy: [{ unidade: 'asc' }, { nome: 'asc' }] });
        return results.map(r => ({ id: r.id, email: r.email, nome: r.nome, unidade: r.unidade, createdAt: r.createdAt }));
    }
    async update(id, data) {
        const updated = await this.prisma.colaborador.update({ where: { id }, data });
        return { id: updated.id, email: updated.email, nome: updated.nome, unidade: updated.unidade, createdAt: updated.createdAt };
    }
    async delete(id) {
        await this.prisma.colaborador.delete({ where: { id } });
    }
    async listUnidades() {
        const unidades = await this.prisma.colaborador.findMany({
            distinct: ['unidade'],
            select: { unidade: true },
            orderBy: { unidade: 'asc' },
        });
        return unidades.map((u) => u.unidade);
    }
}
exports.PrismaColaboradorRepository = PrismaColaboradorRepository;
