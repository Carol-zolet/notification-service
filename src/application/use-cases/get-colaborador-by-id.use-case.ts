import { Colaborador } from '../../domain/entities/colaborador.entity';
import { ColaboradorRepository } from '../../domain/repositories/IColaborador.repository';

export class GetColaboradorByIdUseCase {
  constructor(private repository: ColaboradorRepository) {}

  async execute(id: string): Promise<Colaborador | null> {
    return this.repository.findById(id);
  }
}
