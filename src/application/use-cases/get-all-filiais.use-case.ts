import { ColaboradorRepository } from '../../domain/repositories/IColaborador.repository';

export class GetAllFiliaisUseCase {
  constructor(private repository: ColaboradorRepository) {}

  async execute(): Promise<string[]> {
    return this.repository.listUnidades();
  }
}
