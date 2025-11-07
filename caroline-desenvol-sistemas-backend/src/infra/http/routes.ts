import { Router } from 'express';
import { NotificationController } from './controllers/notification.controller';
import { ScheduleNotificationUseCase } from '../../application/use-cases/schedule-notification.use-case';
import { InMemoryNotificationRepository } from '../database/repositories/in-memory-notification.repository';

const router = Router();

// Repositório
const notificationRepo = new InMemoryNotificationRepository();

// Use cases
const scheduleUseCase = new ScheduleNotificationUseCase(notificationRepo);

// Controllers
const notificationController = new NotificationController(scheduleUseCase);

// Rotas
router.post('/notifications/schedule', (req, res) => notificationController.schedule(req, res));

router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Enviar holerite para TODOS os colaboradores de UMA unidade
router.post('/v1/payslips/send-unit', upload.single('pdfFile'), async (req, res) => {
  try {
    const file = req.file;
    const { unidade, subject, message } = req.body;

    if (!file) {
      return res.status(400).json({ error: 'Arquivo não enviado (campo: pdfFile)' });
    }
    if (!unidade || typeof unidade !== 'string') {
      return res.status(400).json({ error: 'Informe a unidade (campo: unidade)' });
    }

    // Busca colaboradores daquela unidade (case exato)
    const colaboradores = await prisma.colaborador.findMany({
      where: { unidade },
      orderBy: [{ nome: 'asc' }]
    });

    if (colaboradores.length === 0) {
      return res.status(404).json({ error: 'Nenhum colaborador encontrado nesta unidade' });
    }

    const finalSubject = subject?.trim() || `Holerite - ${unidade}`;
    const template = (message?.trim() ||
      'Olá {{nome}}, segue seu holerite referente à unidade {{unidade}}.');

    let enviados = 0;
    let falhas = 0;
    const preview: Array<{ nome: string; email: string }> = [];

    for (const colab of colaboradores) {
      const corpo = template
        .replace(/\{\{nome\}\}/gi, colab.nome)
        .replace(/\{\{unidade\}\}/gi, colab.unidade);

      try {
        await emailService.sendWithAttachments(
          colab.email,
          finalSubject,
          corpo,
          [{ filename: file.originalname, content: file.buffer, contentType: file.mimetype }]
        );
        enviados++;
        if (preview.length < 10) preview.push({ nome: colab.nome, email: colab.email });
      } catch (err) {
        console.error('Falha ao enviar para', colab.email, err);
        falhas++;
      }
    }

    res.json({
      success: true,
      unidade,
      totalColaboradores: colaboradores.length,
      enviados,
      falhas,
      subject: finalSubject,
      preview
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
