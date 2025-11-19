"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GetColaboradorByIdUseCase = void 0;
class GetColaboradorByIdUseCase {
    repository;
    constructor(repository) {
        this.repository = repository;
    }
    async execute(id) {
        return this.repository.findById(id);
    }
}
exports.GetColaboradorByIdUseCase = GetColaboradorByIdUseCase;
