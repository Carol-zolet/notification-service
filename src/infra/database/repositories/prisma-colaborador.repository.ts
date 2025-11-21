import { PrismaClient } from '@prisma/client';
import { Colaborador } from '../../../domain/entities/colaborador.entity';
import { ColaboradorRepository } from '../../../domain/repositories/IColaborador.repository';

export class PrismaColaboradorRepository implements ColaboradorRepository {
  constructor(private prisma: PrismaClient) {}

  async create(data: Omit<Colaborador, 'id' | 'createdAt'>): Promise<Colaborador> {
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

  async findById(id: string): Promise<Colaborador | null> {
    const found = await this.prisma.colaborador.findUnique({ where: { id } });
    if (!found) return null;
    return { id: found.id, email: found.email, nome: found.nome, unidade: found.unidade, createdAt: found.createdAt };
  }

  async findByEmail(email: string): Promise<Colaborador | null> {
    const found = await this.prisma.colaborador.findUnique({ where: { email } });
    if (!found) return null;
    return { id: found.id, email: found.email, nome: found.nome, unidade: found.unidade, createdAt: found.createdAt };
  }

  async findByNome(nome: string, unidade: string): Promise<Colaborador | null> {
    // Busca exata por nome (case-insensitive) dentro da unidade
    const found = await this.prisma.colaborador.findFirst({
      where: {
        nome: {
          equals: nome,
          mode: 'insensitive' // Case-insensitive
        },
        unidade: unidade
      }
    });
    
    if (!found) return null;
    
    return {
      id: found.id,
      email: found.email,
      nome: found.nome,
      unidade: found.unidade,
      createdAt: found.createdAt
    };
  }

  async findByUnidade(unidade: string): Promise<Colaborador[]> {
    const results = await this.prisma.colaborador.findMany({
      where: { unidade },
      orderBy: { nome: 'asc' },
    });
    return results.map(r => ({ id: r.id, email: r.email, nome: r.nome, unidade: r.unidade, createdAt: r.createdAt }));
  }

  async findAll(): Promise<Colaborador[]> {
    const results = await this.prisma.colaborador.findMany({ orderBy: [{ unidade: 'asc' }, { nome: 'asc' }] });
    return results.map(r => ({ id: r.id, email: r.email, nome: r.nome, unidade: r.unidade, createdAt: r.createdAt }));
  }

  async update(id: string, data: Partial<Colaborador>): Promise<Colaborador> {
    const updated = await this.prisma.colaborador.update({ where: { id }, data });
    return { id: updated.id, email: updated.email, nome: updated.nome, unidade: updated.unidade, createdAt: updated.createdAt };
  }

  async delete(id: string): Promise<void> {
    await this.prisma.colaborador.delete({ where: { id } });
  }

  async listUnidades(): Promise<string[]> {
    const unidades = await this.prisma.colaborador.findMany({
      distinct: ['unidade'],
      select: { unidade: true },
      orderBy: { unidade: 'asc' },
    });
    return unidades.map((u) => u.unidade);
  }
}