import { Router } from 'express';
import * as multer from 'multer';
import { PayslipController } from '../controllers/payslip.controller';
import { ProcessPayslipUseCase } from '../../../application/use-cases/process-payslip.use-case';
import { PdfSplitterService } from '../../../application/services/pdf-splitter.service';
import { NodemailerService } from '../../services/nodemailer.service';
import { EmployeeRepository } from '../../database/repositories/employee.repository';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Apenas arquivos PDF são permitidos'));
    }
  },
});

const pdfSplitterService = new PdfSplitterService();
const emailService = new NodemailerService();
const employeeRepository = new EmployeeRepository();

const processPayslipUseCase = new ProcessPayslipUseCase(
  pdfSplitterService,
  emailService,
  employeeRepository
);

const payslipController = new PayslipController(processPayslipUseCase);

const router = Router();


router.post(
  '/process',
  upload.single('file'),
  (req, res) => {
    payslipController.process(req, res);
  }
);

// Nova rota: processamento individualizado por nome
router.post(
  '/process/split',
  upload.single('file'),
  async (req, res) => {
    try {
      await payslipController.process(req, res);
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Erro ao processar holerites individualizados' });
    }
  }
);

router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'payslip-processor',
    timestamp: new Date().toISOString(),
  });
});

export default router;