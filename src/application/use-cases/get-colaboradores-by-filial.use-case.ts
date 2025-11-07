import { Colaborador } from '../../domain/entities/colaborador.entity';
import { ColaboradorRepository } from '../../domain/repositories/IColaborador.repository';

export class GetColaboradoresByFilialUseCase {
  constructor(private repository: ColaboradorRepository) {}

  async execute(unidade: string): Promise<Colaborador[]> {
    return this.repository.findByUnidade(unidade);
  }
}
