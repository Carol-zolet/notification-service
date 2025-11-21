import { Router } from 'express';
import multer from 'multer';
import { PayslipController } from '../controllers/payslip.controller';
import { ProcessPayslipUseCase } from '../../../application/use-cases/process-payslip.use-case';
import { NodemailerService } from '../../services/nodemailer.service';
import { PrismaColaboradorRepository } from '../../database/repositories/prisma-colaborador.repository';
import { prisma } from '../../database/prisma';

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

const emailService = new NodemailerService();
const colaboradorRepository = new PrismaColaboradorRepository(prisma);

const processPayslipUseCase = new ProcessPayslipUseCase(
  colaboradorRepository,
  emailService
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

router.post(
  '/process-split',
  upload.single('file'),
  (req, res) => {
    payslipController.processSplit(req, res);
  }
);

export default router;