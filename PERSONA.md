Aqui está o documento completo da arquitetura formatado em Markdown, pronto para ser copiado para um README.md ou documentação interna.Microsserviço de Alerta - Arquitetura Completa 🎯Com base nas suas respostas, esta é uma proposta de arquitetura evolutiva: começamos simples (atende o volume atual) mas preparada para escalar conforme a adoção crescer.🏛️ Arquitetura Proposta (Hybrid Approach)Fase 1: MVP com Escalabilidade PlanejadaPlaintext┌──────────────────┐     REST API      ┌─────────────────────────┐
│   React + Vite   │ ─────────────────> │   Alert Service API     │
│   (Dashboard)    │     (HTTP/JWT)    │   (Node.js + TypeScript)│
└──────────────────┘                   └───────────┬─────────────┘
                                                   │
                                     ┌─────────────┴──────────────┐
                                     │                            │
                                     v                            v
                            ┌─────────────────┐      ┌──────────────────┐
                            │   PostgreSQL    │      │   Redis (Cache)  │
                            │   - Alerts      │      │   - Rate Limiting│
                            │   - Users       │      │   - Job Queue    │
                            │   - Templates   │      │   (BullMQ)       │
                            │   - Audit Log   │      └────────┬─────────┘
                            └─────────────────┘               │
                                                              │
                                                              v
                                                     ┌─────────────────┐
                                                     │   Workers       │
                                                     │   - Email Worker│
                                                     │   - SMS Worker  │
                                                     │   (Future: Push)│
                                                     └─────────────────┘
Por que essa arquitetura?✅ Atende o volume atual (centenas/milhares por dia)✅ Usa sua stack existente (Node.js + Prisma + PostgreSQL)✅ Redis + BullMQ = fila assíncrona leve (mais simples que RabbitMQ para começar)✅ Preparada para escalar (workers podem virar containers independentes)✅ Frontend React para gerenciamento visual📐 Arquitetura de Software (DDD + Clean Architecture)Estrutura de Pastas (Backend)Plaintextalert-service/
├── src/
│   ├── domain/                  # 🧠 Regras de Negócio Puras
│   │   ├── entities/
│   │   │   ├── Alert.ts         # Entidade principal
│   │   │   ├── AlertTemplate.ts # Templates reutilizáveis
│   │   │   └── User.ts
│   │   ├── value-objects/
│   │   │   ├── Email.ts         # Validação de email
│   │   │   ├── ScheduleTime.ts  # Lógica de agendamento
│   │   │   └── AlertPriority.ts # Enum: LOW, MEDIUM, HIGH, CRITICAL
│   │   └── repositories/        # Contratos (Interfaces)
│   │       ├── IAlertRepository.ts
│   │       └── IUserRepository.ts
│   │
│   ├── application/             # 🎯 Casos de Uso (Use Cases)
│   │   ├── use-cases/
│   │   │   ├── CreateAlertUseCase.ts
│   │   │   ├── ScheduleAlertUseCase.ts
│   │   │   ├── CancelAlertUseCase.ts
│   │   │   ├── ListAlertsUseCase.ts
│   │   │   └── ProcessAlertQueueUseCase.ts
│   │   ├── dtos/
│   │   │   ├── CreateAlertDTO.ts
│   │   │   └── AlertResponseDTO.ts
│   │   └── services/
│   │       ├── AlertScheduler.ts    # Lógica de agendamento
│   │       └── AlertValidator.ts    # Validações complexas
│   │
│   ├── infrastructure/            # 🔧 Implementações Técnicas
│   │   ├── database/
│   │   │   ├── prisma/
│   │   │   │   ├── schema.prisma
│   │   │   │   └── migrations/
│   │   │   └── repositories/
│   │   │       ├── PrismaAlertRepository.ts
│   │   │       └── PrismaUserRepository.ts
│   │   ├── queue/
│   │   │   ├── BullMQAdapter.ts     # Abstração do BullMQ
│   │   │   └── workers/
│   │   │       ├── EmailWorker.ts
│   │   │       └── SMSWorker.ts
│   │   ├── providers/
│   │   │   ├── EmailProvider.ts     # Nodemailer
│   │   │   ├── SMSProvider.ts       # Twilio/SNS (futuro)
│   │   │   └── PushProvider.ts      # Firebase (futuro)
│   │   └── cache/
│   │       └── RedisCache.ts
│   │
│   ├── presentation/              # 🌐 Camada HTTP (API)
│   │   ├── routes/
│   │   │   ├── alert.routes.ts
│   │   │   ├── template.routes.ts
│   │   │   └── health.routes.ts
│   │   ├── controllers/
│   │   │   ├── AlertController.ts
│   │   │   └── TemplateController.ts
│   │   ├── middlewares/
│   │   │   ├── auth.middleware.ts     # JWT validation
│   │   │   ├── rateLimit.middleware.ts
│   │   │   └── errorHandler.middleware.ts
│   │   └── validators/
│   │       └── alert.validator.ts   # Zod/Joi schemas
│   │
│   ├── shared/                    # 🛠️ Utilitários
│   │   ├── errors/
│   │   │   ├── AppError.ts
│   │   │   └── errorCodes.ts
│   │   ├── logger/
│   │   │   └── Logger.ts          # Winston/Pino
│   │   └── utils/
│   │       ├── dateUtils.ts
│   │       └── cryptoUtils.ts
│   │
│   └── main/                      # 🚀 Entry Point
│       ├── server.ts
│       ├── config/
│       │   ├── env.ts             # Variáveis de ambiente
│       │   └── dependencies.ts    # Dependency Injection
│       └── app.ts                 # Express setup
│
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── prisma/
├── docker-compose.yml
└── package.json
🗄️ Modelagem do Banco de Dados (Prisma Schema)Snippet de código// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ============================================
// DOMAIN ENTITIES
// ============================================

model User {
  id        String   @id @default(uuid())
  email     String   @unique
  name      String
  phone     String?
  
  // Preferências de notificação
  preferences UserPreferences?
  
  // Alertas recebidos
  alerts    Alert[]
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@map("users")
}

model UserPreferences {
  id              String  @id @default(uuid())
  userId          String  @unique
  user            User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  // Canais habilitados
  emailEnabled    Boolean @default(true)
  smsEnabled      Boolean @default(false)
  pushEnabled     Boolean @default(false)
  
  // Quiet hours (não enviar alertas)
  quietHoursStart String? // "22:00"
  quietHoursEnd   String? // "08:00"
  timezone        String  @default("America/Sao_Paulo")
  
  @@map("user_preferences")
}

enum AlertStatus {
  PENDING    // Agendado, aguardando processamento
  PROCESSING // Sendo enviado
  SENT       // Enviado com sucesso
  FAILED     // Falha no envio
  CANCELLED  // Cancelado pelo usuário/sistema
  RETRYING   // Em nova tentativa após falha
}

enum AlertPriority {
  LOW
  MEDIUM
  HIGH
  CRITICAL // Ignora quiet hours
}

enum AlertChannel {
  EMAIL
  SMS
  PUSH
  WEBHOOK
}

model Alert {
  id        String   @id @default(uuid())
  
  // Relacionamentos
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  templateId String?
  template   AlertTemplate? @relation(fields: [templateId], references: [id], onDelete: SetNull)
  
  // Dados do alerta
  title       String
  message     String       @db.Text
  channel     AlertChannel @default(EMAIL)
  priority    AlertPriority @default(MEDIUM)
  
  // Agendamento
  scheduledFor DateTime // Quando deve ser enviado
  sentAt       DateTime?  // Quando foi efetivamente enviado
  
  // Status e controle
  status      AlertStatus  @default(PENDING)
  retryCount  Int          @default(0)
  maxRetries  Int          @default(3)
  
  // Metadata e rastreamento
  metadata    Json?        // Dados adicionais flexíveis
  externalId  String?      // ID do sistema que originou o alerta
  
  // Auditoria
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt
  
  // Logs de tentativas
  deliveryLogs DeliveryLog[]

  @@index([userId])
  @@index([status])
  @@index([scheduledFor])
  @@index([externalId])
  @@map("alerts")
}

// Templates reutilizáveis (DRY principle)
model AlertTemplate {
  id          String   @id @default(uuid())
  name        String   @unique
  description String?
  
  // Template content (usa placeholders: {{userName}}, {{date}})
  titleTemplate   String
  messageTemplate String   @db.Text
  
  // Configurações padrão
  defaultChannel  AlertChannel  @default(EMAIL)
  defaultPriority AlertPriority @default(MEDIUM)
  
  // Relacionamentos
  alerts      Alert[]
  
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@map("alert_templates")
}

// Log de tentativas de entrega (observabilidade)
model DeliveryLog {
  id          String   @id @default(uuid())
  alertId     String
  alert       Alert    @relation(fields: [alertId], references: [id], onDelete: Cascade)
  
  attemptNumber Int
  status        String   // "success", "failed", "retrying"
  errorMessage  String?  @db.Text
  
  // Dados do provider (ex: messageId do Nodemailer)
  providerResponse Json?
  
  createdAt   DateTime @default(now())

  @@index([alertId])
  @@map("delivery_logs")
}

// Auditoria geral do sistema
model AuditLog {
  id         String   @id @default(uuid())
  
  action     String   // "alert.created", "alert.cancelled", etc
  entityType String   // "Alert", "User", etc
  entityId   String
  
  userId     String?  // Quem executou a ação
  metadata   Json?    // Dados adicionais
  
  ipAddress  String?
  userAgent  String?
  
  createdAt  DateTime @default(now())

  @@index([entityType, entityId])
  @@index([action])
  @@index([createdAt])
  @@map("audit_logs")
}
💻 Implementação Core (Exemplos de Código)1. Domain Entity - Alert.tsTypeScript// src/domain/entities/Alert.ts

import { AlertPriority, AlertChannel, AlertStatus } from '@prisma/client';

export interface AlertProps {
  id: string;
  userId: string;
  title: string;
  message: string;
  channel: AlertChannel;
  priority: AlertPriority;
  scheduledFor: Date;
  status: AlertStatus;
  retryCount: number;
  maxRetries: number;
  templateId?: string;
  metadata?: Record<string, any>;
  externalId?: string;
  sentAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export class Alert {
  private props: AlertProps;

  private constructor(props: AlertProps) {
    this.props = props;
  }

  // Factory method (SOLID: Single Responsibility)
  static create(data: Omit<AlertProps, 'id' | 'status' | 'retryCount' | 'createdAt' | 'updatedAt'>): Alert {
    const now = new Date();
    
    return new Alert({
      ...data,
      id: data.id || crypto.randomUUID(),
      status: AlertStatus.PENDING,
      retryCount: 0,
      createdAt: now,
      updatedAt: now,
    });
  }

  // Getters (encapsulamento)
  get id(): string { return this.props.id; }
  get userId(): string { return this.props.userId; }
  get title(): string { return this.props.title; }
  get message(): string { return this.props.message; }
  get scheduledFor(): Date { return this.props.scheduledFor; }
  get status(): AlertStatus { return this.props.status; }
  get priority(): AlertPriority { return this.props.priority; }
  get channel(): AlertChannel { return this.props.channel; }
  get retryCount(): number { return this.props.retryCount; }
  get maxRetries(): number { return this.props.maxRetries; }

  // Business rules (Domain Logic)
  canBeSent(): boolean {
    return this.props.status === AlertStatus.PENDING  
      && this.props.scheduledFor <= new Date();
  }

  canBeRetried(): boolean {
    return this.props.retryCount < this.props.maxRetries 
      && this.props.status === AlertStatus.FAILED;
  }

  isCritical(): boolean {
    return this.props.priority === AlertPriority.CRITICAL;
  }

  // State transitions (garantem consistência)
  markAsProcessing(): void {
    if (this.props.status !== AlertStatus.PENDING && this.props.status !== AlertStatus.RETRYING) {
      throw new Error('Only PENDING or RETRYING alerts can be marked as PROCESSING');
    }
    this.props.status = AlertStatus.PROCESSING;
    this.props.updatedAt = new Date();
  }

  markAsSent(): void {
    if (this.props.status !== AlertStatus.PROCESSING) {
      throw new Error('Only PROCESSING alerts can be marked as SENT');
    }
    this.props.status = AlertStatus.SENT;
    this.props.sentAt = new Date();
    this.props.updatedAt = new Date();
  }

  markAsFailed(errorMessage: string): void {
    this.props.status = AlertStatus.FAILED;
    this.props.updatedAt = new Date();
  }

  incrementRetry(): void {
    if (!this.canBeRetried()) {
      throw new Error('Alert cannot be retried');
    }
    this.props.retryCount++;
    this.props.status = AlertStatus.RETRYING;
    this.props.updatedAt = new Date();
  }

  cancel(): void {
    if (this.props.status === AlertStatus.SENT) {
      throw new Error('Cannot cancel an already sent alert');
    }
    this.props.status = AlertStatus.CANCELLED;
    this.props.updatedAt = new Date();
  }

  // Para persistência
  toObject(): AlertProps {
    return { ...this.props };
  }
}
2. Use Case - ScheduleAlertUseCase.tsTypeScript// src/application/use-cases/ScheduleAlertUseCase.ts

import { Alert } from '@/domain/entities/Alert';
import { IAlertRepository } from '@/domain/repositories/IAlertRepository';
import { IUserRepository } from '@/domain/repositories/IUserRepository';
import { IQueueService } from '@/domain/services/IQueueService';
import { AppError } from '@/shared/errors/AppError';
import { Logger } from '@/shared/logger/Logger';

interface ScheduleAlertInput {
  userId: string;
  title: string;
  message: string;
  scheduledFor: Date;
  channel?: 'EMAIL' | 'SMS' | 'PUSH';
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  templateId?: string;
  metadata?: Record<string, any>;
  externalId?: string;
}

export class ScheduleAlertUseCase {
  constructor(
    private alertRepository: IAlertRepository,
    private userRepository: IUserRepository,
    private queueService: IQueueService,
    private logger: Logger
  ) {}

  async execute(input: ScheduleAlertInput): Promise<Alert> {
    // 1. Validação: usuário existe?
    const user = await this.userRepository.findById(input.userId);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    // 2. Validação: data é futura?
    if (input.scheduledFor < new Date()) {
      throw new AppError('Scheduled time must be in the future', 400);
    }

    // 3. Validação: usuário tem o canal habilitado?
    const channel = input.channel || 'EMAIL';
    if (channel === 'SMS' && !user.preferences?.smsEnabled) {
      throw new AppError('SMS channel is not enabled for this user', 400);
    }

    // 4. Criar entidade Alert (Domain)
    const alert = Alert.create({
      userId: input.userId,
      title: input.title,
      message: input.message,
      scheduledFor: input.scheduledFor,
      channel,
      priority: input.priority || 'MEDIUM',
      maxRetries: 3,
      templateId: input.templateId,
      metadata: input.metadata,
      externalId: input.externalId,
    });

    // 5. Persistir no banco
    const savedAlert = await this.alertRepository.save(alert);

    // 6. Agendar na fila (BullMQ)
    const delayMs = input.scheduledFor.getTime() - Date.now();
    await this.queueService.addJob('send-alert', {
      alertId: savedAlert.id,
    }, {
      delay: delayMs,
      priority: this.getPriorityWeight(alert.priority),
    });

    this.logger.info('Alert scheduled', {
      alertId: savedAlert.id,
      userId: input.userId,
      scheduledFor: input.scheduledFor,
    });

    return savedAlert;
  }

  private getPriorityWeight(priority: string): number {
    const weights = { LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 4 };
    return weights[priority] || 2;
  }
}
3. Infrastructure - EmailWorker.tsTypeScript// src/infrastructure/queue/workers/EmailWorker.ts

import { Worker, Job } from 'bullmq';
import { IAlertRepository } from '@/domain/repositories/IAlertRepository';
import { IUserRepository } from '@/domain/repositories/IUserRepository';
import { EmailProvider } from '@/infrastructure/providers/EmailProvider';
import { Logger } from '@/shared/logger/Logger';
import { Alert } from '@/domain/entities/Alert';

interface SendAlertJob {
  alertId: string;
}

export class EmailWorker {
  private worker: Worker;

  constructor(
    private alertRepository: IAlertRepository,
    private userRepository: IUserRepository,
    private emailProvider: EmailProvider,
    private logger: Logger,
    private redisConnection: any
  ) {
    this.worker = new Worker(
      'send-alert',
      this.processJob.bind(this),
      {
        connection: redisConnection,
        concurrency: 10, // Processa 10 jobs simultâneos
        limiter: {
          max: 100, // 100 emails
          duration: 60000, // por minuto (rate limiting)
        },
      }
    );

    this.setupEventHandlers();
  }

  private async processJob(job: Job<SendAlertJob>): Promise<void> {
    const { alertId } = job.data;

    try {
      // 1. Buscar o alerta
      const alert = await this.alertRepository.findById(alertId);
      if (!alert) {
        throw new Error(`Alert ${alertId} not found`);
      }

      // 2. Verificar se pode ser enviado (business rule)
      if (!alert.canBeSent()) {
        this.logger.warn('Alert cannot be sent', { alertId, status: alert.status });
        return;
      }

      // 3. Buscar dados do usuário
      const user = await this.userRepository.findById(alert.userId);
      if (!user) {
        throw new Error(`User ${alert.userId} not found`);
      }

      // 4. Verificar quiet hours (se não for crítico)
      if (!alert.isCritical() && this.isInQuietHours(user.preferences)) {
        // Reagendar para depois do quiet hours
        await this.rescheduleAfterQuietHours(alert, user.preferences);
        return;
      }

      // 5. Marcar como processando
      alert.markAsProcessing();
      await this.alertRepository.update(alert);

      // 6. Enviar email
      const result = await this.emailProvider.send({
        to: user.email,
        subject: alert.title,
        body: alert.message,
        metadata: { alertId: alert.id },
      });

      // 7. Marcar como enviado
      alert.markAsSent();
      await this.alertRepository.update(alert);

      // 8. Log de sucesso
      await this.alertRepository.addDeliveryLog({
        alertId: alert.id,
        attemptNumber: alert.retryCount + 1,
        status: 'success',
        providerResponse: result,
      });

      this.logger.info('Alert sent successfully', { alertId, userId: user.id });

    } catch (error) {
      await this.handleFailure(alertId, error);
    }
  }

  private async handleFailure(alertId: string, error: any): Promise<void> {
    const alert = await this.alertRepository.findById(alertId);
    if (!alert) return;

    this.logger.error('Failed to send alert', { alertId, error: error.message });

    // Log da falha
    await this.alertRepository.addDeliveryLog({
      alertId: alert.id,
      attemptNumber: alert.retryCount + 1,
      status: 'failed',
      errorMessage: error.message,
    });

    // Retry logic
    if (alert.canBeRetried()) {
      alert.incrementRetry();
      await this.alertRepository.update(alert);

      // Retry exponencial: 2^retryCount * 60 segundos
      const delaySeconds = Math.pow(2, alert.retryCount) * 60;
      throw new Error(`Retrying in ${delaySeconds}s`); // BullMQ vai fazer retry automático
    } else {
      alert.markAsFailed(error.message);
      await this.alertRepository.update(alert);
    }
  }

  private isInQuietHours(preferences: any): boolean {
    // Implementar lógica de quiet hours
    return false; // Placeholder
  }

  private async rescheduleAfterQuietHours(alert: Alert, preferences: any): Promise<void> {
    // Implementar lógica de reagendamento
  }

  private setupEventHandlers(): void {
    this.worker.on('completed', (job) => {
      this.logger.debug('Job completed', { jobId: job.id });
    });

    this.worker.on('failed', (job, error) => {
      this.logger.error('Job failed', { jobId: job?.id, error: error.message });
    });
  }

  async close(): Promise<void> {
    await this.worker.close();
  }
}
🎨 Frontend (React + Vite) - DashboardEstrutura do FrontendPlaintextalert-dashboard/
├── src/
│   ├── components/
│   │   ├── AlertForm/
│   │   │   ├── AlertForm.tsx
│   │   │   └── SchedulePicker.tsx
│   │   ├── AlertList/
│   │   │   ├── AlertList.tsx
│   │   │   ├── AlertCard.tsx
│   │   │   └── AlertFilters.tsx
│   │   └── shared/
│   │       ├── Button.tsx
│   │       └── LoadingSpinner.tsx
│   ├── pages/
│   │   ├── Dashboard.tsx
│   │   ├── CreateAlert.tsx
│   │   └── AlertDetails.tsx
│   ├── services/
│   │   └── api.ts             # Axios instance
│   ├── hooks/
│   │   ├── useAlerts.ts
│   │   └── useAuth.ts
│   ├── types/
│   │   └── alert.types.ts
│   └── App.tsx
Exemplo: Hook useAlerts.tsTypeScript// src/hooks/useAlerts.ts

import { useState, useEffect } from 'react';
import { api } from '@/services/api';
import { Alert, AlertStatus } from '@/types/alert.types';

export function useAlerts(userId?: string) {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAlerts();
  }, [userId]);

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      const response = await api.get('/alerts', {
        params: { userId },
      });
      setAlerts(response.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch alerts');
    } finally {
      setLoading(false);
    }
  };

  const createAlert = async (data: {
    title: string;
    message: string;
    scheduledFor: Date;
    priority?: string;
  }) => {
    try {
      const response = await api.post('/alerts', data);
      setAlerts((prev) => [response.data, ...prev]);
      return response.data;
    } catch (err: any) {
      throw new Error(err.response?.data?.message || 'Failed to create alert');
    }
  };

  const cancelAlert = async (alertId: string) => {
    try {
      await api.patch(`/alerts/${alertId}/cancel`);
      setAlerts((prev) =>
        prev.map((alert) =>
          alert.id === alertId ? { ...alert, status: AlertStatus.CANCELLED } : alert
        )
      );
    } catch (err: any) {
      throw new Error(err.response?.data?.message || 'Failed to cancel alert');
    }
  };

  return {
    alerts,
    loading,
    error,
    createAlert,
    cancelAlert,
    refetch: fetchAlerts,
  };
}
🧪 Estratégia de Testes1. Testes Unitários (Domain + Use Cases)TypeScript// tests/unit/domain/entities/Alert.spec.ts

import { Alert } from '@/domain/entities/Alert';
import { AlertStatus, AlertPriority, AlertChannel } from '@prisma/client';

describe('Alert Entity', () => {
  it('should create a new alert with PENDING status', () => {
    const alert = Alert.create({
      userId: 'user-123',
      title: 'Test Alert',
      message: 'Test message',
      channel: AlertChannel.EMAIL,
      priority: AlertPriority.MEDIUM,
      scheduledFor: new Date(Date.now() + 3600000), // 1 hour from now
      maxRetries: 3,
    });

    expect(alert.status).toBe(AlertStatus.PENDING);
    expect(alert.retryCount).toBe(0);
  });

  it('should allow sending if status is PENDING and time has come', () => {
    const alert = Alert.create({
      userId: 'user-123',
      title: 'Test',
      message: 'Test',
      channel: AlertChannel.EMAIL,
      priority: AlertPriority.MEDIUM,
      scheduledFor: new Date(Date.now() - 1000), // 1 second ago
      maxRetries: 3,
    });

    expect(alert.canBeSent()).toBe(true);
  });

  it('should not allow sending if scheduled time is in the future', () => {
    const alert = Alert.create({
      userId: 'user-123',
      title: 'Test',
      message: 'Test',
      channel: AlertChannel.EMAIL,
      priority: AlertPriority.MEDIUM,
      scheduledFor: new Date(Date.now() + 3600000),
      maxRetries: 3,
    });

    expect(alert.canBeSent()).toBe(false);
  });

  it('should throw error when trying to mark SENT alert as PROCESSING', () => {
    const alert = Alert.create({
      userId: 'user-123',
      title: 'Test',
      message: 'Test',
      channel: AlertChannel.EMAIL,
      priority: AlertPriority.MEDIUM,
      scheduledFor: new Date(),
      maxRetries: 3,
    });

    alert.markAsProcessing();
    alert.markAsSent();

    expect(() => alert.markAsProcessing()).toThrow();
  });
});
2. Testes de Integração (API + Database)TypeScript// tests/integration/api/alerts.spec.ts

import request from 'supertest';
import { app } from '@/main/app';
import { prisma } from '@/infrastructure/database/prisma/client';

describe('POST /api/alerts', () => {
  beforeAll(async () => {
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.alert.deleteMany();
    await prisma.user.deleteMany();
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Limpar dados antes de cada teste
    await prisma.alert.deleteMany();
  });

  it('should create a new alert successfully', async () => {
    // Arrange: criar usuário de teste
    const user = await prisma.user.create({
      data: {
        email: 'test@example.com',
        name: 'Test User',
        preferences: {
          create: {
            emailEnabled: true,
          },
        },
      },
    });

    const alertData = {
      userId: user.id,
      title: 'Test Alert',
      message: 'This is a test alert',
      scheduledFor: new Date(Date.now() + 3600000).toISOString(),
      channel: 'EMAIL',
      priority: 'HIGH',
    };

    // Act
    const response = await request(app)
      .post('/api/alerts')
      .send(alertData)
      .expect(201);

    // Assert
    expect(response.body).toMatchObject({
      id: expect.any(String),
      userId: user.id,
      title: alertData.title,
      status: 'PENDING',
    });

    // Verificar se foi salvo no banco
    const savedAlert = await prisma.alert.findUnique({
      where: { id: response.body.id },
    });
    expect(savedAlert).toBeTruthy();
  });

  it('should return 404 if user does not exist', async () => {
    const alertData = {
      userId: 'non-existent-user',
      title: 'Test Alert',
      message: 'This is a test alert',
      scheduledFor: new Date(Date.now() + 3600000).toISOString(),
    };

    const response = await request(app)
      .post('/api/alerts')
      .send(alertData)
      .expect(404);

    expect(response.body.message).toContain('User not found');
  });

  it('should return 400 if scheduled time is in the past', async () => {
    const user = await prisma.user.create({
      data: {
        email: 'test@example.com',
        name: 'Test User',
      },
    });

    const alertData = {
      userId: user.id,
      title: 'Test Alert',
      message: 'This is a test alert',
      scheduledFor: new Date(Date.now() - 3600000).toISOString(), // 1 hora atrás
    };

    const response = await request(app)
      .post('/api/alerts')
      .send(alertData)
      .expect(400);

    expect(response.body.message).toContain('must be in the future');
  });

  it('should enforce rate limiting', async () => {
    const user = await prisma.user.create({
      data: {
        email: 'test@example.com',
        name: 'Test User',
      },
    });

    const alertData = {
      userId: user.id,
      title: 'Test Alert',
      message: 'Test',
      scheduledFor: new Date(Date.now() + 3600000).toISOString(),
    };

    // Fazer 101 requisições (assumindo limite de 100/min)
    const promises = Array.from({ length: 101 }, () =>
      request(app).post('/api/alerts').send(alertData)
    );

    const responses = await Promise.all(promises);
    const rateLimited = responses.filter(r => r.status === 429);

    expect(rateLimited.length).toBeGreaterThan(0);
  });
});
3. Testes E2E (Fluxo Completo)TypeScript// tests/e2e/alert-workflow.spec.ts

import request from 'supertest';
import { app } from '@/main/app';
import { prisma } from '@/infrastructure/database/prisma/client';
import { EmailProvider } from '@/infrastructure/providers/EmailProvider';

// Mock do EmailProvider
jest.mock('@/infrastructure/providers/EmailProvider');

describe('Alert Workflow E2E', () => {
  let userId: string;
  let authToken: string;

  beforeAll(async () => {
    await prisma.$connect();

    // Criar usuário e obter token JWT
    const user = await prisma.user.create({
      data: {
        email: 'e2e@example.com',
        name: 'E2E User',
        preferences: {
          create: {
            emailEnabled: true,
            smsEnabled: false,
          },
        },
      },
    });
    userId = user.id;

    // Simular autenticação (você precisará implementar isso)
    const authResponse = await request(app)
      .post('/api/auth/login')
      .send({ email: 'e2e@example.com', password: 'test123' });
    
    authToken = authResponse.body.token;
  });

  afterAll(async () => {
    await prisma.alert.deleteMany();
    await prisma.user.deleteMany();
    await prisma.$disconnect();
  });

  it('should complete full alert lifecycle: create → schedule → send → verify', async () => {
    // 1. Criar alerta agendado para daqui a 2 segundos
    const createResponse = await request(app)
      .post('/api/alerts')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        userId,
        title: 'E2E Test Alert',
        message: 'This alert will be sent automatically',
        scheduledFor: new Date(Date.now() + 2000).toISOString(),
        priority: 'HIGH',
      })
      .expect(201);

    const alertId = createResponse.body.id;
    expect(createResponse.body.status).toBe('PENDING');

    // 2. Verificar que alerta está na fila
    const queueResponse = await request(app)
      .get(`/api/alerts/${alertId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(queueResponse.body.status).toBe('PENDING');

    // 3. Aguardar processamento (worker deve pegar da fila)
    await new Promise(resolve => setTimeout(resolve, 3000));

    // 4. Verificar que alerta foi enviado
    const sentResponse = await request(app)
      .get(`/api/alerts/${alertId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(sentResponse.body.status).toBe('SENT');
    expect(sentResponse.body.sentAt).toBeTruthy();

    // 5. Verificar logs de entrega
    const logsResponse = await request(app)
      .get(`/api/alerts/${alertId}/logs`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(logsResponse.body).toHaveLength(1);
    expect(logsResponse.body[0].status).toBe('success');

    // 6. Verificar que o EmailProvider foi chamado
    expect(EmailProvider.prototype.send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'e2e@example.com',
        subject: 'E2E Test Alert',
      })
    );
  });

  it('should handle alert cancellation', async () => {
    // Criar alerta agendado para o futuro
    const createResponse = await request(app)
      .post('/api/alerts')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        userId,
        title: 'To Be Cancelled',
        message: 'This alert will be cancelled',
        scheduledFor: new Date(Date.now() + 3600000).toISOString(),
      })
      .expect(201);

    const alertId = createResponse.body.id;

    // Cancelar alerta
    await request(app)
      .patch(`/api/alerts/${alertId}/cancel`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    // Verificar status
    const statusResponse = await request(app)
      .get(`/api/alerts/${alertId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(statusResponse.body.status).toBe('CANCELLED');
  });

  it('should retry failed alerts with exponential backoff', async () => {
    // Mock EmailProvider para falhar
    (EmailProvider.prototype.send as jest.Mock).mockRejectedValueOnce(
      new Error('SMTP connection failed')
    );

    // Criar alerta com envio imediato
    const createResponse = await request(app)
      .post('/api/alerts')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        userId,
        title: 'Will Fail and Retry',
        message: 'Testing retry logic',
        scheduledFor: new Date(Date.now() + 1000).toISOString(),
        priority: 'CRITICAL',
      })
      .expect(201);

    const alertId = createResponse.body.id;

    // Aguardar primeira tentativa (deve falhar)
    await new Promise(resolve => setTimeout(resolve, 2000));

    const failedResponse = await request(app)
      .get(`/api/alerts/${alertId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(failedResponse.body.status).toBe('RETRYING');
    expect(failedResponse.body.retryCount).toBe(1);

    // Verificar logs (deve ter 1 tentativa falhada)
    const logsResponse = await request(app)
      .get(`/api/alerts/${alertId}/logs`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(logsResponse.body).toHaveLength(1);
    expect(logsResponse.body[0].status).toBe('failed');
  });
});
🚀 Deploy e Configuração (DevOps)1. Docker Compose (Desenvolvimento Local)YAML# docker-compose.yml

version: '3.8'

services:
  # PostgreSQL Database
  postgres:
    image: postgres:15-alpine
    container_name: alert-service-db
    environment:
      POSTGRES_USER: alert_user
      POSTGRES_PASSWORD: alert_pass
      POSTGRES_DB: alert_service
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U alert_user"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Redis (Cache + Queue)
  redis:
    image: redis:7-alpine
    container_name: alert-service-redis
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    command: redis-server --appendonly yes
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 3s
      retries: 5

  # API Service
  api:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: alert-service-api
    environment:
      NODE_ENV: development
      PORT: 3000
      DATABASE_URL: postgresql://alert_user:alert_pass@postgres:5432/alert_service
      REDIS_URL: redis://redis:6379
      JWT_SECRET: your-secret-key-change-in-production
      SMTP_HOST: ${SMTP_HOST}
      SMTP_PORT: ${SMTP_PORT}
      SMTP_USER: ${SMTP_USER}
      SMTP_PASS: ${SMTP_PASS}
    ports:
      - "3000:3000"
    volumes:
      - ./backend:/app
      - /app/node_modules
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    command: npm run dev

  # Worker Service (processa a fila)
  worker:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: alert-service-worker
    environment:
      NODE_ENV: development
      DATABASE_URL: postgresql://alert_user:alert_pass@postgres:5432/alert_service
      REDIS_URL: redis://redis:6379
      SMTP_HOST: ${SMTP_HOST}
      SMTP_PORT: ${SMTP_PORT}
      SMTP_USER: ${SMTP_USER}
      SMTP_PASS: ${SMTP_PASS}
    volumes:
      - ./backend:/app
      - /app/node_modules
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    command: npm run worker

  # Frontend (React + Vite)
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile.dev
    container_name: alert-service-frontend
    environment:
      VITE_API_URL: http://localhost:3000/api
    ports:
      - "5173:5173"
    volumes:
      - ./frontend:/app
      - /app/node_modules
    command: npm run dev

  # Mailhog (Mock SMTP para testes locais)
  mailhog:
    image: mailhog/mailhog:latest
    container_name: alert-service-mailhog
    ports:
      - "1025:1025"  # SMTP
      - "8025:8025"  # Web UI
    logging:
      driver: none

volumes:
  postgres_data:
  redis_data:
2. Dockerfile (Backend)Dockerfile# backend/Dockerfile

FROM node:20-alpine AS base

WORKDIR /app

# Instalar dependências
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Copiar código
COPY . .

# Gerar Prisma Client
RUN npx prisma generate

# Build da aplicação
RUN npm run build

# Estágio de produção
FROM node:20-alpine AS production

WORKDIR /app

# Copiar apenas o necessário
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/dist ./dist
COPY --from=base /app/prisma ./prisma
COPY --from=base /app/package.json ./

# Usuário não-root (segurança)
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001
USER nodejs

EXPOSE 3000

CMD ["node", "dist/main/server.js"]
3. Environment Variables (.env.example)Bash# .env.example

# Application
NODE_ENV=development
PORT=3000
API_BASE_URL=http://localhost:3000

# Database
DATABASE_URL=postgresql://alert_user:alert_pass@localhost:5432/alert_service

# Redis
REDIS_URL=redis://localhost:6379

# JWT Authentication
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRATION=7d

# Email Provider (Nodemailer)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM_NAME=Alert Service
SMTP_FROM_EMAIL=noreply@alertservice.com

# SMS Provider (Twilio - opcional)
TWILIO_ACCOUNT_SID=your-twilio-sid
TWILIO_AUTH_TOKEN=your-twilio-token
TWILIO_PHONE_NUMBER=+1234567890

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100

# Worker Configuration
WORKER_CONCURRENCY=10
WORKER_MAX_RETRIES=3
WORKER_RETRY_DELAY_BASE=60000

# Monitoring (opcional)
SENTRY_DSN=your-sentry-dsn
LOG_LEVEL=info

# Frontend
VITE_API_URL=http://localhost:3000/api
4. Scripts de Deploy (package.json)JSON// backend/package.json
{
  "name": "alert-service",
  "version": "1.0.0",
  "scripts": {
    "dev": "tsx watch src/main/server.ts",
    "build": "tsc -p tsconfig.build.json",
    "start": "node dist/main/server.js",
    "worker": "tsx src/main/worker.ts",
    "worker:prod": "node dist/main/worker.js",
    
    "prisma:generate": "prisma generate",
    "prisma:migrate": "prisma migrate dev",
    "prisma:migrate:prod": "prisma migrate deploy",
    "prisma:studio": "prisma studio",
    "prisma:seed": "tsx prisma/seed.ts",
    
    "test": "jest --passWithNoTests",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:e2e": "jest --config jest.e2e.config.js",
    
    "lint": "eslint src --ext .ts",
    "lint:fix": "eslint src --ext .ts --fix",
    "format": "prettier --write \"src/**/*.ts\"",
    
    "docker:up": "docker-compose up -d",
    "docker:down": "docker-compose down",
    "docker:logs": "docker-compose logs -f",
    "docker:clean": "docker-compose down -v"
  },
  "dependencies": {
    "@prisma/client": "^5.7.0",
    "express": "^4.18.2",
    "bullmq": "^5.0.0",
    "ioredis": "^5.3.2",
    "nodemailer": "^6.9.7",
    "jsonwebtoken": "^9.0.2",
    "bcryptjs": "^2.4.3",
    "zod": "^3.22.4",
    "express-rate-limit": "^7.1.5",
    "winston": "^3.11.0",
    "dotenv": "^16.3.1",
    "cors": "^2.8.5"
  },
  "devDependencies": {
    "@types/node": "^20.10.5",
    "@types/express": "^4.17.21",
    "@types/jest": "^29.5.11",
    "@types/supertest": "^6.0.2",
    "typescript": "^5.3.3",
    "tsx": "^4.7.0",
    "jest": "^29.7.0",
    "ts-jest": "^29.1.1",
    "supertest": "^6.3.3",
    "prisma": "^5.7.0",
    "eslint": "^8.56.0",
    "prettier": "^3.1.1"
  }
}
📊 Monitoramento e Observabilidade1. Health Check EndpointTypeScript// src/presentation/routes/health.routes.ts

import { Router, Request, Response } from 'express';
import { prisma } from '@/infrastructure/database/prisma/client';
import { redisClient } from '@/infrastructure/cache/RedisCache';

const router = Router();

router.get('/health', async (req: Request, res: Response) => {
  try {
    // Verificar banco de dados
    await prisma.$queryRaw`SELECT 1`;
    
    // Verificar Redis
    await redisClient.ping();
    
    // Verificar fila
    const queueHealth = await checkQueueHealth();
    
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        database: 'up',
        redis: 'up',
        queue: queueHealth,
      },
      version: process.env.npm_package_version,
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error.message,
    });
  }
});

router.get('/health/ready', async (req: Request, res: Response) => {
  // Readiness probe (para Kubernetes)
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).send('OK');
  } catch (error) {
    res.status(503).send('Not Ready');
  }
});

router.get('/health/live', (req: Request, res: Response) => {
  // Liveness probe (para Kubernetes)
  res.status(200).send('OK');
});

async function checkQueueHealth() {
  // Implementar verificação da fila BullMQ
  return 'up';
}

export default router;
2. Métricas (Prometheus Format)TypeScript// src/presentation/routes/metrics.routes.ts

import { Router, Request, Response } from 'express';
import { prisma } from '@/infrastructure/database/prisma/client';
import { AlertStatus } from '@prisma/client';

const router = Router();

router.get('/metrics', async (req: Request, res: Response) => {
  try {
    // Contar alertas por status
    const alertsByStatus = await prisma.alert.groupBy({
      by: ['status'],
      _count: true,
    });

    // Contar alertas nas últimas 24h
    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentAlerts = await prisma.alert.count({
      where: {
        createdAt: {
          gte: last24h,
        },
      },
    });

    // Taxa de sucesso (últimas 24h)
    const sentAlerts = await prisma.alert.count({
      where: {
        status: AlertStatus.SENT,
        sentAt: {
          gte: last24h,
        },
      },
    });

    const successRate = recentAlerts > 0 
      ? ((sentAlerts / recentAlerts) * 100).toFixed(2) 
      : 0;

    // Formato Prometheus
    const metrics = `
# HELP alert_total Total number of alerts by status
# TYPE alert_total gauge
${alertsByStatus.map(s => `alert_total{status="${s.status}"} ${s._count}`).join('\n')}

# HELP alert_created_24h Alerts created in last 24 hours
# TYPE alert_created_24h gauge
alert_created_24h ${recentAlerts}

# HELP alert_success_rate Success rate percentage (last 24h)
# TYPE alert_success_rate gauge
alert_success_rate ${successRate}
    `.trim();

    res.set('Content-Type', 'text/plain');
    res.send(metrics);
  } catch (error) {
    res.status(500).send('# Error generating metrics');
  }
});

export default router;
3. Logging Estruturado (Winston)TypeScript// src/shared/logger/Logger.ts

import winston from 'winston';

const logLevel = process.env.LOG_LEVEL || 'info';

export const Logger = winston.createLogger({
  level: logLevel,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: {
    service: 'alert-service',
    environment: process.env.NODE_ENV,
  },
  transports: [
    // Console (desenvolvimento)
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
          return `${timestamp} [${level}]: ${message} ${
            Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ''
          }`;
        })
      ),
    }),
    
    // Arquivo (produção)
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    new winston.transports.File({
      filename: 'logs/combined.log',
      maxsize: 5242880,
      maxFiles: 5,
    }),
  ],
});

// Stream para Morgan (HTTP logs)
export const httpLogStream = {
  write: (message: string) => {
    Logger.http(message.trim());
  },
};
🔐 Segurança (Security Best Practices)1. Middleware de Autenticação (JWT)TypeScript// src/presentation/middlewares/auth.middleware.ts

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppError } from '@/shared/errors/AppError';

interface JwtPayload {
  userId: string;
  email: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    throw new AppError('No token provided', 401);
  }

  const [scheme, token] = authHeader.split(' ');

  if (scheme !== 'Bearer') {
    throw new AppError('Invalid token format', 401);
  }

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET as string
    ) as JwtPayload;

    req.user = decoded;
    next();
  } catch (error) {
    throw new AppError('Invalid or expired token', 401);
  }
}
2. Rate Limiting (Proteção contra DDoS)TypeScript// src/presentation/middlewares/rateLimit.middleware.ts

import rateLimit from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import { redisClient } from '@/infrastructure/cache/RedisCache';

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // 100 requests por janela
  message: 'Too many requests from this IP, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisStore({
    client: redisClient,
    prefix: 'rl:api:',
  }),
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, // Apenas 5 tentativas de login
  skipSuccessfulRequests: true,
  message: 'Too many login attempts, please try again later',
  store: new RedisStore({
    client: redisClient,
    prefix: 'rl:auth:',
  }),
});

export const alertCreationLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 20, // 20 alertas por minuto por usuário
  keyGenerator: (req) => req.user?.userId || req.ip,
  message: 'Alert creation rate limit exceeded',
  store: new RedisStore({
    client: redisClient,
    prefix: 'rl:alerts:',
  }),
});
3. Validação de Entrada (Zod)TypeScript// src/presentation/validators/alert.validator.ts

import { z } from 'zod';
import { AlertChannel, AlertPriority } from '@prisma/client';

export const createAlertSchema = z.object({
  body: z.object({
    userId: z.string().uuid('Invalid user ID format'),
    
    title: z
      .string()
      .min(3, 'Title must be at least 3 characters')
      .max(200, 'Title must not exceed 200 characters')
      .trim(),
    
    message: z
      .string()
      .min(10, 'Message must be at least 10 characters')
      .max(5000, 'Message must not exceed 5000 characters')
      .trim(),
    
    scheduledFor: z
      .string()
      .datetime('Invalid datetime format')
      .transform((str) => new Date(str))
      .refine(
        (date) => date > new Date(),
        'Scheduled time must be in the future'
      ),
    
    channel: z.nativeEnum(AlertChannel).default(AlertChannel.EMAIL),
    
    priority: z.nativeEnum(AlertPriority).default(AlertPriority.MEDIUM),
    
    templateId: z.string().uuid().optional(),
    
    metadata: z.record(z.any()).optional(),
    
    externalId: z.string().max(100).optional(),
  }),
});

export const cancelAlertSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid alert ID format'),
  }),
});

// Middleware para aplicar validação
import { Request, Response, NextFunction } from 'express';
import { AnyZodObject, ZodError } from 'zod';
import { AppError } from '@/shared/errors/AppError';

export function validate(schema: AnyZodObject) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const messages = error.errors.map(e => `${e.path.join('.')}: ${e.message}`);
        throw new AppError(`Validation failed: ${messages.join(', ')}`, 400);
      }
      next(error);
    }
  };
}
📈 Performance e Otimizações1. Database Indexing StrategySnippet de código// prisma/schema.prisma (complemento com índices otimizados)

model Alert {
  // ... campos existentes ...

  @@index([userId, status]) // Buscar alertas de um usuário por status
  @@index([status, scheduledFor]) // Worker busca alertas PENDING para enviar
  @@index([createdAt(sort: Desc)]) // Listagens ordenadas por data
  @@index([externalId], where: { externalId: { not: null } }) // Partial index
  @@map("alerts")
}
2. Caching Strategy (Redis)TypeScript// src/infrastructure/cache/CacheService.ts

import { Redis } from 'ioredis';

export class CacheService {
  constructor(private redis: Redis) {}

  async get<T>(key: string): Promise<T | null> {
    const cached = await this.redis.get(key);
    return cached ? JSON.parse(cached) : null;
  }

  async set(key: string, value: any, ttlSeconds: number = 3600): Promise<void> {
    await this.redis.setex(key, ttlSeconds, JSON.stringify(value));
  }

  async delete(key: string): Promise<void> {
    await this.redis.del(key);
  }

  async invalidatePattern(pattern: string): Promise<void> {
    const keys = await this.redis.keys(pattern);
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }

  // Cache para listas de alertas (com paginação)
  async cacheAlertList(
    userId: string,
    page: number,
    alerts: any[]
  ): Promise<void> {
    const key = `alerts:user:${userId}:page:${page}`;
    await this.set(key, alerts, 300); // 5 minutos
  }

  async getCachedAlertList(userId: string, page: number): Promise<any[] | null> {
    const key = `alerts:user:${userId}:page:${page}`;
    return this.get(key);
  }

  // Invalidar cache quando alertas mudam
  async invalidateUserAlerts(userId: string): Promise<void> {
    await this.invalidatePattern(`alerts:user:${userId}:*`);
  }

  // Cache para templates (raramente mudam)
  async cacheTemplate(templateId: string, template: any): Promise<void> {
    const key = `template:${templateId}`;
    await this.set(key, template, 86400); // 24 horas
  }

  async getCachedTemplate(templateId: string): Promise<any | null> {
    const key = `template:${templateId}`;
    return this.get(key);
  }
}
3. Query Optimization (Repository Pattern)TypeScript// src/infrastructure/database/repositories/PrismaAlertRepository.ts

import { Alert } from '@/domain/entities/Alert';
import { IAlertRepository } from '@/domain/repositories/IAlertRepository';
import { prisma } from '@/infrastructure/database/prisma/client';
import { AlertStatus } from '@prisma/client';

export class PrismaAlertRepository implements IAlertRepository {
  async save(alert: Alert): Promise<Alert> {
    const data = alert.toObject();
    
    const saved = await prisma.alert.create({
      data: {
        id: data.id,
        userId: data.userId,
        title: data.title,
        message: data.message,
        channel: data.channel,
        priority: data.priority,
        scheduledFor: data.scheduledFor,
        status: data.status,
        retryCount: data.retryCount,
        maxRetries: data.maxRetries,
        templateId: data.templateId,
        metadata: data.metadata,
        externalId: data.externalId,
      },
    });

    return Alert.create(saved as any);
  }

  async update(alert: Alert): Promise<Alert> {
    const data = alert.toObject();
    
    const updated = await prisma.alert.update({
      where: { id: data.id },
      data: {
        status: data.status,
        retryCount: data.retryCount,
        sentAt: data.sentAt,
        updatedAt: new Date(),
      },
    });

    return Alert.create(updated as any);
  }

  async findById(id: string): Promise<Alert | null> {
    const alert = await prisma.alert.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            preferences: true,
          },
        },
        template: true,
      },
    });

    return alert ? Alert.create(alert as any) : null;
  }

  // Query otimizada para buscar alertas pendentes (usado pelo worker)
  async findPendingAlerts(limit: number = 100): Promise<Alert[]> {
    const alerts = await prisma.alert.findMany({
      where: {
        status: {
          in: [AlertStatus.PENDING, AlertStatus.RETRYING],
        },
        scheduledFor: {
          lte: new Date(),
        },
      },
      orderBy: [
        { priority: 'desc' }, // CRITICAL primeiro
        { scheduledFor: 'asc' }, // Mais antigos primeiro
      ],
      take: limit,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            phone: true,
            preferences: true,
          },
        },
      },
    });

    return alerts.map(a => Alert.create(a as any));
  }

  // Paginação eficiente (cursor-based)
  async findByUserId(
    userId: string,
    options: {
      cursor?: string;
      limit?: number;
      status?: AlertStatus;
    }
  ): Promise<{ alerts: Alert[]; nextCursor: string | null }> {
    const limit = options.limit || 20;

    const alerts = await prisma.alert.findMany({
      where: {
        userId,
        ...(options.status && { status: options.status }),
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit + 1, // Pegar um a mais para saber se tem próxima página
      ...(options.cursor && {
        cursor: { id: options.cursor },
        skip: 1, // Pular o cursor
      }),
    });

    const hasNextPage = alerts.length > limit;
    const items = hasNextPage ? alerts.slice(0, -1) : alerts;
    const nextCursor = hasNextPage ? items[items.length - 1].id : null;

    return {
      alerts: items.map(a => Alert.create(a as any)),
      nextCursor,
    };
  }

  async addDeliveryLog(log: {
    alertId: string;
    attemptNumber: number;
    status: string;
    errorMessage?: string;
    providerResponse?: any;
  }): Promise<void> {
    await prisma.deliveryLog.create({
      data: log,
    });
  }

  // Estatísticas agregadas (cache-friendly)
  async getStatsByUserId(userId: string): Promise<{
    total: number;
    sent: number;
    pending: number;
    failed: number;
  }> {
    const stats = await prisma.alert.groupBy({
      by: ['status'],
      where: { userId },
      _count: true,
    });

    const result = {
      total: 0,
      sent: 0,
      pending: 0,
      failed: 0,
    };

    stats.forEach(stat => {
      result.total += stat._count;
      if (stat.status === AlertStatus.SENT) result.sent = stat._count;
      if (stat.status === AlertStatus.PENDING) result.pending = stat._count;
      if (stat.status === AlertStatus.FAILED) result.failed = stat._count;
    });

    return result;
  }

  // Bulk operations para performance
  async bulkUpdateStatus(
    alertIds: string[],
    status: AlertStatus
  ): Promise<number> {
    const result = await prisma.alert.updateMany({
      where: {
        id: {
          in: alertIds,
        },
      },
      data: {
        status,
        updatedAt: new Date(),
      },
    });

    return result.count;
  }
}
🎨 Frontend React - Componentes Principais1. Hook useAlerts com CacheTypeScript// frontend/src/hooks/useAlerts.ts

import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import { Alert, AlertStatus, CreateAlertInput } from '@/types/alert.types';

export function useAlerts(userId?: string) {
  const queryClient = useQueryClient();

  // Buscar lista de alertas (com cache do React Query)
  const {
    data: alerts,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['alerts', userId],
    queryFn: async () => {
      const response = await api.get<Alert[]>('/alerts', {
        params: { userId },
      });
      return response.data;
    },
    staleTime: 30000, // Cache válido por 30 segundos
    refetchInterval: 60000, // Atualiza a cada minuto
  });

  // Criar alerta
  const createMutation = useMutation({
    mutationFn: async (data: CreateAlertInput) => {
      const response = await api.post<Alert>('/alerts', data);
      return response.data;
    },
    onSuccess: () => {
      // Invalidar cache para buscar novos dados
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
    },
  });

  // Cancelar alerta
  const cancelMutation = useMutation({
    mutationFn: async (alertId: string) => {
      await api.patch(`/alerts/${alertId}/cancel`);
    },
    onSuccess: (_, alertId) => {
      // Atualização otimista do cache
      queryClient.setQueryData(['alerts', userId], (old: Alert[] = []) =>
        old.map((alert) =>
          alert.id === alertId
            ? { ...alert, status: AlertStatus.CANCELLED }
            : alert
        )
      );
    },
  });

  return {
    alerts: alerts || [],
    isLoading,
    error,
    createAlert: createMutation.mutateAsync,
    cancelAlert: cancelMutation.mutateAsync,
    refetch,
  };
}
2. Componente AlertFormTypeScript// frontend/src/components/AlertForm/AlertForm.tsx

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAlerts } from '@/hooks/useAlerts';
import { AlertPriority, AlertChannel } from '@/types/alert.types';

const alertSchema = z.object({
  title: z.string().min(3, 'Título deve ter no mínimo 3 caracteres'),
  message: z.string().min(10, 'Mensagem deve ter no mínimo 10 caracteres'),
  scheduledFor: z.string().refine((date) => {
    return new Date(date) > new Date();
  }, 'A data deve ser no futuro'),
  priority: z.nativeEnum(AlertPriority),
  channel: z.nativeEnum(AlertChannel),
});

type AlertFormData = z.infer<typeof alertSchema>;

interface AlertFormProps {
  userId: string;
  onSuccess?: () => void;
}

export function AlertForm({ userId, onSuccess }: AlertFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { createAlert } = useAlerts(userId);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<AlertFormData>({
    resolver: zodResolver(alertSchema),
    defaultValues: {
      priority: AlertPriority.MEDIUM,
      channel: AlertChannel.EMAIL,
    },
  });

  const onSubmit = async (data: AlertFormData) => {
    try {
      setIsSubmitting(true);
      
      await createAlert({
        userId,
        title: data.title,
        message: data.message,
        scheduledFor: new Date(data.scheduledFor),
        priority: data.priority,
        channel: data.channel,
      });

      reset();
      onSuccess?.();
      
      // Toast de sucesso
      alert('Alerta agendado com sucesso!');
    } catch (error: any) {
      alert(error.response?.data?.message || 'Erro ao criar alerta');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Título */}
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Título
        </label>
        <input
          type="text"
          {...register('title')}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          placeholder="Ex: Lembrete de reunião"
        />
        {errors.title && (
          <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>
        )}
      </div>

      {/* Mensagem */}
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Mensagem
        </label>
        <textarea
          {...register('message')}
          rows={4}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          placeholder="Digite a mensagem do alerta..."
        />
        {errors.message && (
          <p className="mt-1 text-sm text-red-600">{errors.message.message}</p>
        )}
      </div>

      {/* Data/Hora */}
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Agendar para
        </label>
        <input
          type="datetime-local"
          {...register('scheduledFor')}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
        />
        {errors.scheduledFor && (
          <p className="mt-1 text-sm text-red-600">
            {errors.scheduledFor.message}
          </p>
        )}
      </div>

      {/* Prioridade */}
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Prioridade
        </label>
        <select
          {...register('priority')}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
        >
          <option value={AlertPriority.LOW}>Baixa</option>
          <option value={AlertPriority.MEDIUM}>Média</option>
          <option value={AlertPriority.HIGH}>Alta</option>
          <option value={AlertPriority.CRITICAL}>Crítica</option>
        </select>
      </div>

      {/* Canal */}
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Canal de envio
        </label>
        <select
          {...register('channel')}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
        >
          <option value={AlertChannel.EMAIL}>Email</option>
          <option value={AlertChannel.SMS}>SMS</option>
          <option value={AlertChannel.PUSH}>Push Notification</option>
        </select>
      </div>

      {/* Botão Submit */}
      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400"
      >
        {isSubmitting ? 'Agendando...' : 'Agendar Alerta'}
      </button>
    </form>
  );
}
3. Componente AlertList com FiltrosTypeScript// frontend/src/components/AlertList/AlertList.tsx

import { useState } from 'react';
import { useAlerts } from '@/hooks/useAlerts';
import { AlertCard } from './AlertCard';
import { AlertStatus } from '@/types/alert.types';

interface AlertListProps {
  userId: string;
}

export function AlertList({ userId }: AlertListProps) {
  const { alerts, isLoading, cancelAlert } = useAlerts(userId);
  const [filter, setFilter] = useState<AlertStatus | 'ALL'>('ALL');

  const filteredAlerts = alerts.filter((alert) => {
    if (filter === 'ALL') return true;
    return alert.status === filter;
  });

  const statusCounts = {
    all: alerts.length,
    pending: alerts.filter((a) => a.status === AlertStatus.PENDING).length,
    sent: alerts.filter((a) => a.status === AlertStatus.SENT).length,
    failed: alerts.filter((a) => a.status === AlertStatus.FAILED).length,
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="flex space-x-2 border-b border-gray-200 pb-2">
        <FilterButton
          active={filter === 'ALL'}
          onClick={() => setFilter('ALL')}
          count={statusCounts.all}
        >
          Todos
        </FilterButton>
        <FilterButton
          active={filter === AlertStatus.PENDING}
          onClick={() => setFilter(AlertStatus.PENDING)}
          count={statusCounts.pending}
        >
          Pendentes
        </FilterButton>
        <FilterButton
          active={filter === AlertStatus.SENT}
          onClick={() => setFilter(AlertStatus.SENT)}
          count={statusCounts.sent}
        >
          Enviados
        </FilterButton>
        <FilterButton
          active={filter === AlertStatus.FAILED}
          onClick={() => setFilter(AlertStatus.FAILED)}
          count={statusCounts.failed}
        >
          Falhados
        </FilterButton>
      </div>

      {/* Lista de alertas */}
      {filteredAlerts.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          Nenhum alerta encontrado
        </div>
      ) : (
        <div className="space-y-3">
          {filteredAlerts.map((alert) => (
            <AlertCard
              key={alert.id}
              alert={alert}
              onCancel={cancelAlert}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Componente auxiliar de filtro
function FilterButton({
  children,
  active,
  onClick,
  count,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
  count: number;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
        active
          ? 'bg-blue-600 text-white'
          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
      }`}
    >
      {children} ({count})
    </button>
  );
}
4. Componente AlertCardTypeScript// frontend/src/components/AlertList/AlertCard.tsx

import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Alert, AlertStatus, AlertPriority } from '@/types/alert.types';

interface AlertCardProps {
  alert: Alert;
  onCancel: (alertId: string) => Promise<void>;
}

export function AlertCard({ alert, onCancel }: AlertCardProps) {
  const handleCancel = async () => {
    if (confirm('Deseja cancelar este alerta?')) {
      try {
        await onCancel(alert.id);
      } catch (error) {
        alert('Erro ao cancelar alerta');
      }
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          {/* Cabeçalho */}
          <div className="flex items-center space-x-2 mb-2">
            <h3 className="font-semibold text-gray-900">{alert.title}</h3>
            <StatusBadge status={alert.status} />
            <PriorityBadge priority={alert.priority} />
          </div>

          {/* Mensagem */}
          <p className="text-sm text-gray-600 mb-3">{alert.message}</p>

          {/* Metadados */}
          <div className="flex items-center space-x-4 text-xs text-gray-500">
            <span>
              📅 Agendado para:{' '}
              {formatDistanceToNow(new Date(alert.scheduledFor), {
                addSuffix: true,
                locale: ptBR,
              })}
            </span>
            {alert.sentAt && (
              <span>
                ✅ Enviado:{' '}
                {formatDistanceToNow(new Date(alert.sentAt), {
                  addSuffix: true,
                  locale: ptBR,
                })}
              </span>
            )}
            <span>📧 {alert.channel}</span>
          </div>
        </div>

        {/* Ações */}
        <div className="ml-4">
          {alert.status === AlertStatus.PENDING && (
            <button
              onClick={handleCancel}
              className="text-red-600 hover:text-red-800 text-sm font-medium"
            >
              Cancelar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// Badge de status
function StatusBadge({ status }: { status: AlertStatus }) {
  const styles = {
    [AlertStatus.PENDING]: 'bg-yellow-100 text-yellow-800',
    [AlertStatus.PROCESSING]: 'bg-blue-100 text-blue-800',
    [AlertStatus.SENT]: 'bg-green-100 text-green-800',
    [AlertStatus.FAILED]: 'bg-red-100 text-red-800',
    [AlertStatus.CANCELLED]: 'bg-gray-100 text-gray-800',
    [AlertStatus.RETRYING]: 'bg-orange-100 text-orange-800',
  };

  const labels = {
    [AlertStatus.PENDING]: 'Pendente',
    [AlertStatus.PROCESSING]: 'Processando',
    [AlertStatus.SENT]: 'Enviado',
    [AlertStatus.FAILED]: 'Falhou',
    [AlertStatus.CANCELLED]: 'Cancelado',
    [AlertStatus.RETRYING]: 'Tentando novamente',
  };

  return (
    <span
      className={`px-2 py-1 text-xs font-medium rounded-full ${styles[status]}`}
    >
      {labels[status]}
    </span>
  );
}

// Badge de prioridade
function PriorityBadge({ priority }: { priority: AlertPriority }) {
  const styles = {
    [AlertPriority.LOW]: 'bg-gray-100 text-gray-700',
    [AlertPriority.MEDIUM]: 'bg-blue-100 text-blue-700',
    [AlertPriority.HIGH]: 'bg-orange-100 text-orange-700',
    [AlertPriority.CRITICAL]: 'bg-red-100 text-red-700',
  };

  const icons = {
    [AlertPriority.LOW]: '⬇️',
    [AlertPriority.MEDIUM]: '➡️',
    [AlertPriority.HIGH]: '⬆️',
    [AlertPriority.CRITICAL]: '🔥',
  };

  return (
    <span
      className={`px-2 py-1 text-xs font-medium rounded-full ${styles[priority]}`}
    >
      {icons[priority]} {priority}
    </span>
  );
}
📋 Migration Plan (Plano de Evolução)Fase 1: MVP (Semana 1-2) ✅✅ Setup básico (Node.js + Prisma + PostgreSQL)✅ Entidades de domínio (Alert, User)✅ API REST básica (CRUD de alertas)✅ Worker com BullMQ + Redis✅ Envio de email (Nodemailer)✅ Frontend React básico✅ Autenticação JWT✅ Testes unitários principaisFase 2: Produção (Semana 3-4)🔄 Rate limiting e segurança🔄 Logging estruturado (Winston)🔄 Health checks e métricas🔄 Docker Compose completo🔄 CI/CD pipeline (GitHub Actions)🔄 Documentação API (Swagger)🔄 Testes E2E completosFase 3: Escalabilidade (Mês 2)📅 Templates de alertas reutilizáveis📅 Múltiplos canais (SMS via Twilio)📅 Push notifications (Firebase)📅 Webhooks para sistemas externos📅 Dashboard de métricas (Grafana)📅 Alertas recorrentes (cron-like)Fase 4: Features Avançadas (Mês 3+)📅 Machine Learning para otimizar horários de envio📅 A/B testing de templates📅 Multi-tenancy (SaaS)📅 API GraphQL📅 Real-time updates (WebSockets)📅 Internacionalização (i18n)🚀 Comandos Rápidos (Quick Start)Bash# 1. Clone e setup
git clone <repo>
cd alert-service

# 2. Backend setup
cd backend
npm install
cp .env.example .env
# Edite .env com suas configurações

# 3. Database setup
npx prisma generate
npx prisma migrate dev
npx prisma db seed

# 4. Subir infraestrutura
docker-compose up -d postgres redis mailhog

# 5. Rodar aplicação (em terminais separados)
npm run dev      # API
npm run worker   # Worker

# 6. Frontend setup (novo terminal)
cd ../frontend
npm install
npm run dev

# 7. Acessar
# - Frontend: http://localhost:5173
# - API: http://localhost:3000
# - MailHog UI: http://localhost:8025
# - API Docs: http://localhost:3000/api-docs
📊 Checklist de QualidadeAntes de Deploy em Produção:[ ] Todos os testes passando (unit + integration + e2e)[ ] Coverage > 80%[ ] Variáveis de ambiente documentadas[ ] Secrets não commitadas no Git[ ] Rate limiting configurado[ ] Logs estruturados implementados[ ] Health checks funcionando[ ] Migrations testadas em staging[ ] Backup automatizado configurado[ ] Monitoramento (Sentry/New Relic) ativo[ ] Documentação API atualizada[ ] Rollback plan definido🎓 Resumo ExecutivoO que construímos:Um microsserviço de alertas robusto, escalável e manutenível que resolve o problema de agendamento e envio de notificações automáticas.Diferenciais da arquitetura:Clean Architecture + DDD: Código organizado, testável e que reflete o negócio.Arquitetura Híbrida: Começa simples, escala quando necessário.Observabilidade First: Logs, métricas e health checks desde o dia 1.Developer Experience: Testes automatizados, hot reload, Docker.Production Ready: Segurança, rate limiting, retry logic, error handling.Trade-offs conscientes:DecisãoAlternativaPor que escolhemosBullMQ + RedisRabbitMQ / KafkaMais simples, atende o volume, infraestrutura menorPrisma ORMTypeORM / KnexDX superior, type-safety, migrations automáticasNodemailerSendGrid APIFlexibilidade (funciona com qualquer SMTP)MonorepoRepos separadosFacilita compartilhamento de tipos e deploy conjunto💬 Próximos PassosOnde você gostaria de focar agora?🎨 Implementar o Frontend completo (Dashboard + formulários)🧪 Escrever a suíte de testes (garantir qualidade)🚀 Setup de CI/CD (automatizar deploy)📱 Adicionar canal SMS (Twilio integration)📊 Dashboard de métricas (Grafana + Prometheus)📚 Documentação técnica (arquitetura + decisões)