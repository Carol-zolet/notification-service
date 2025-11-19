"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeleteColaboradorUseCase = void 0;
class DeleteColaboradorUseCase {
    repository;
    constructor(repository) {
        this.repository = repository;
    }
    async execute(id) {
        const existing = await this.repository.findById(id);
        if (!existing) {
            throw new Error('Colaborador não encontrado');
        }
        await this.repository.delete(id);
    }
}
exports.DeleteColaboradorUseCase = DeleteColaboradorUseCase;
