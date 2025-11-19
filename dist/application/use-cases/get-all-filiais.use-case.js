"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GetAllFiliaisUseCase = void 0;
class GetAllFiliaisUseCase {
    repository;
    constructor(repository) {
        this.repository = repository;
    }
    async execute() {
        return this.repository.listUnidades();
    }
}
exports.GetAllFiliaisUseCase = GetAllFiliaisUseCase;
