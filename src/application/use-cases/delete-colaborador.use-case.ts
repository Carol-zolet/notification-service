import { ColaboradorRepository } from '../../domain/repositories/IColaborador.repository';

export class DeleteColaboradorUseCase {
  constructor(private repository: ColaboradorRepository) {}

  async execute(id: string): Promise<void> {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new Error('Colaborador não encontrado');
    }
    await this.repository.delete(id);
  }
}
