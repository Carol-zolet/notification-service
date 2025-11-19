"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateColaboradorUseCase = void 0;
class UpdateColaboradorUseCase {
    repository;
    constructor(repository) {
        this.repository = repository;
    }
    async execute(id, data) {
        const existing = await this.repository.findById(id);
        if (!existing) {
            throw new Error('Colaborador não encontrado');
        }
        return this.repository.update(id, data);
    }
}
exports.UpdateColaboradorUseCase = UpdateColaboradorUseCase;
