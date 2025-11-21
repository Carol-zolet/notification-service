import { Request, Response } from 'express';
import { ProcessPayslipUseCase } from '../../../application/use-cases/process-payslip.use-case';

export class PayslipController {
  constructor(private processPayslipUseCase: ProcessPayslipUseCase) {}

  /**
   * POST /payslips/process
   * Envia o MESMO PDF para todos os colaboradores da unidade
   */
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
        message: 'Holerites processados com sucesso',
        ...result,
        unidade,
      });
    } catch (error: any) {
      console.error('Erro no controller process:', error);
      res.status(500).json({ 
        error: error.message || 'Erro ao processar holerites' 
      });
    }
  }

  /**
   * POST /payslips/process-split
   * Divide o PDF automaticamente e envia individualizado por NOME
   */
  async processSplit(req: Request, res: Response): Promise<void> {
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

      console.log(`\n🚀 Iniciando processamento individualizado para unidade: ${unidade}`);

      const result = await this.processPayslipUseCase.executeWithSplit(
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
        message: 'Holerites individualizados processados com sucesso',
        unidade,
        processed: result.processed,
        failed: result.failed,
        notFound: result.notFound,
        total: result.total,
        details: result.details,
      });
    } catch (error: any) {
      console.error('Erro no controller processSplit:', error);
      res.status(500).json({ 
        error: error.message || 'Erro ao processar holerites individualizados' 
      });
    }
  }
}