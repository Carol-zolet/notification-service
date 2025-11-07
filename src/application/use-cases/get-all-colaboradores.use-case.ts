import { Colaborador } from '../../domain/entities/colaborador.entity';
import { ColaboradorRepository } from '../../domain/repositories/IColaborador.repository';

export class GetAllColaboradoresUseCase {
  constructor(private repository: ColaboradorRepository) {}

  async execute(): Promise<Colaborador[]> {
    return this.repository.findAll();
  }
}
