"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PayslipController = void 0;
class PayslipController {
    processPayslipUseCase;
    constructor(processPayslipUseCase) {
        this.processPayslipUseCase = processPayslipUseCase;
    }
    async process(req, res) {
        try {
            const { unidade, subject, message } = req.body;
            const file = req.file;
            if (!file) {
                res.status(400).json({ error: 'Arquivo não enviado' });
                return;
            }
            if (!unidade) {
                res.status(400).json({ error: 'Unidade não especificada' });
                return;
            }
            const result = await this.processPayslipUseCase.execute(unidade, {
                filename: file.originalname,
                buffer: file.buffer,
            }, subject, message);
            res.json({
                success: true,
                message: 'Holerites processados',
                ...result,
                unidade,
            });
        }
        catch (error) {
            res.status(500).json({ error: error.message || 'Erro ao processar holerites' });
        }
    }
}
exports.PayslipController = PayslipController;
