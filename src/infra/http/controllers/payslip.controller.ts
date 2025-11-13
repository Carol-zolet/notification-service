import { Request, Response } from 'express';
import { ProcessPayslipUseCase } from '../../../application/use-cases/process-payslip.use-case';

export class PayslipController {
  constructor(private processPayslipUseCase: ProcessPayslipUseCase) {}

  async process(req: Request, res: Response): Promise<void> {
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

      const result = await this.processPayslipUseCase.execute(
        unidade,
        {
          filename: file.originalname,
          buffer: file.buffer,
        },
        subject,
        message
      );

      res.json({
        success: true,
        message: 'Holerites processados',
        ...result,
        unidade,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Erro ao processar holerites' });
    }
  }
}
