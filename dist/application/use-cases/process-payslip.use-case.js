"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProcessPayslipUseCase = void 0;
class ProcessPayslipUseCase {
    colaboradorRepository;
    emailService;
    constructor(colaboradorRepository, emailService) {
        this.colaboradorRepository = colaboradorRepository;
        this.emailService = emailService;
    }
    async execute(unidade, file, subject = 'Holerite', messageTemplate = 'Olá {{nome}}, segue seu holerite da {{unidade}}.') {
        const colaboradores = await this.colaboradorRepository.findByUnidade(unidade);
        if (colaboradores.length === 0) {
            throw new Error(`Nenhum colaborador encontrado na unidade "${unidade}"`);
        }
        let processed = 0;
        let failed = 0;
        for (const colab of colaboradores) {
            const personalizedMessage = messageTemplate
                .replace(/\{\{\s*nome\s*\}\}/gi, colab.nome)
                .replace(/\{\{\s*unidade\s*\}\}/gi, colab.unidade);
            try {
                await this.emailService.sendWithAttachments(colab.email, subject, personalizedMessage, [
                    {
                        filename: file.filename,
                        content: file.buffer,
                    },
                ]);
                processed++;
            }
            catch (error) {
                console.error(`Erro ao enviar para ${colab.email}:`, error);
                failed++;
            }
        }
        return { processed, failed, total: colaboradores.length };
    }
}
exports.ProcessPayslipUseCase = ProcessPayslipUseCase;
