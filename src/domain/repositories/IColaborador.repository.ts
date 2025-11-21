import { Colaborador } from '../entities/colaborador.entity';

export type ColaboradorDTO = Omit<Colaborador, 'id' | 'createdAt'>;

export interface ColaboradorRepository {
  create(colaborador: ColaboradorDTO): Promise<Colaborador>;
  findById(id: string): Promise<Colaborador | null>;
  findByEmail(email: string): Promise<Colaborador | null>;
  findByNome(nome: string, unidade: string): Promise<Colaborador | null>; // ← NOVO
  findByUnidade(unidade: string): Promise<Colaborador[]>;
  findAll(): Promise<Colaborador[]>;
  update(id: string, data: Partial<Colaborador>): Promise<Colaborador>;
  delete(id: string): Promise<void>;
  listUnidades(): Promise<string[]>;
}