"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateColaboradorUseCase = void 0;
class CreateColaboradorUseCase {
    repository;
    constructor(repository) {
        this.repository = repository;
    }
    async execute(data) {
        const existing = await this.repository.findByEmail(data.email);
        if (existing) {
            throw new Error('Colaborador com este email já existe');
        }
        return this.repository.create(data);
    }
}
exports.CreateColaboradorUseCase = CreateColaboradorUseCase;
