"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GetColaboradoresByFilialUseCase = void 0;
class GetColaboradoresByFilialUseCase {
    repository;
    constructor(repository) {
        this.repository = repository;
    }
    async execute(unidade) {
        return this.repository.findByUnidade(unidade);
    }
}
exports.GetColaboradoresByFilialUseCase = GetColaboradoresByFilialUseCase;
