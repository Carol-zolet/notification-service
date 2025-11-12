import { Colaborador } from '../../domain/entities/colaborador.entity';
import { ColaboradorRepository, ColaboradorDTO } from '../../domain/repositories/IColaborador.repository';

export class CreateColaboradorUseCase {
  constructor(private repository: ColaboradorRepository) {}

  async execute(data: ColaboradorDTO): Promise<Colaborador> {
    const existing = await this.repository.findByEmail(data.email);
    if (existing) {
      throw new Error('Colaborador com este email já existe');
    }
    return this.repository.create(data);
  }
}
