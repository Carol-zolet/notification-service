"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GetAllColaboradoresUseCase = void 0;
class GetAllColaboradoresUseCase {
    repository;
    constructor(repository) {
        this.repository = repository;
    }
    async execute() {
        return this.repository.findAll();
    }
}
exports.GetAllColaboradoresUseCase = GetAllColaboradoresUseCase;
