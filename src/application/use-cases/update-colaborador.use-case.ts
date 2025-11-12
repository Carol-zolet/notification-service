import { Colaborador } from '../../domain/entities/colaborador.entity';
import { ColaboradorRepository, ColaboradorDTO } from '../../domain/repositories/IColaborador.repository';

export class UpdateColaboradorUseCase {
  constructor(private repository: ColaboradorRepository) {}

  async execute(id: string, data: Partial<ColaboradorDTO>): Promise<Colaborador> {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new Error('Colaborador não encontrado');
    }
    return this.repository.update(id, data);
  }
}
