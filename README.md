# Sistema de Notificações - Microsserviço

Sistema de gerenciamento e agendamento de notificações por email, desenvolvido com Arquitetura Limpa e princípios SOLID.

##  Tecnologias Utilizadas

- **Node.js 18+** - Runtime JavaScript
- **TypeScript** - Linguagem tipada
- **Express** - Framework web
- **Prisma ORM** - Mapeamento objeto-relacional
- **SQLite** - Banco de dados relacional leve
- **Jest** - Framework de testes
- **Mock Email Service** - Simulação de envio de emails

##  Pré-requisitos

- Node.js 18 ou superior
- npm ou yarn

##  Instalação e Execução

### 1. Instalar dependências

\\\powershell
npm install
\\\

### 2. Configurar variáveis de ambiente

O arquivo \.env\ já está configurado para SQLite:

\\\env
DATABASE_URL="file:./dev.db"
PORT=3001
\\\

### 3. Inicializar o banco de dados

\\\powershell
# Gerar Prisma Client
npx prisma generate

# Criar/migrar schema
npx prisma migrate dev --name init
\\\

### 4. Iniciar o servidor

\\\powershell
npm run dev
\\\

O servidor estará disponível em: \http://localhost:3001\

##  Testes

\\\powershell
# Rodar todos os testes
npm test

# Testes com coverage
npm test -- --coverage
\\\

##  Endpoints da API

### Health Check

\\\http
GET /api/health
\\\

**Resposta de sucesso (200):**
\\\json
{
  "status": "ok",
  "timestamp": "2025-11-03T18:00:00.000Z"
}
\\\

### Agendar Notificação

\\\http
POST /api/notifications/schedule
Content-Type: application/json

{
  "email": "usuario@exemplo.com",
  "subject": "Assunto da Notificação",
  "message": "Corpo da mensagem",
  "scheduledFor": "2025-11-04T10:00:00Z"
}
\\\

**Resposta de sucesso (201):**
\\\json
{
  "id": "uuid-da-notificacao",
  "email": "usuario@exemplo.com",
  "subject": "Assunto da Notificação",
  "message": "Corpo da mensagem",
  "scheduledFor": "2025-11-04T10:00:00.000Z",
  "status": "pending",
  "sentAt": null,
  "createdAt": "2025-11-03T18:00:00.000Z"
}
\\\

##  Worker de Notificações

O worker executa automaticamente a cada 60 segundos, verificando notificações pendentes e processando aquelas cujo horário agendado já passou.

**Como funciona:**
1. Notificações são criadas com status \pending\
2. O worker verifica periodicamente (60s) por notificações pendentes
3. Quando encontra, simula o envio via \MockEmailService\
4. O status muda para \sent\ e \sentAt\ é preenchido

**Logs do Worker:**
\\\
[Worker] Verificando notificações pendentes...
============================================================
[MOCK EMAIL] Email enviado com sucesso! 
   Para: usuario@exemplo.com
   Assunto: Teste
   Mensagem: Mensagem de teste
   Horário: 2025-11-03T...
============================================================
[Worker] Ciclo concluído com sucesso.
\\\

##  Visualizar Banco de Dados

Para visualizar os dados no SQLite:

\\\powershell
npx prisma studio
\\\

Acesse \http://localhost:5555\ e navegue pela tabela \Notification\.

##  Estrutura do Projeto

\\\
notification-service/
 src/
    domain/                 # Camada de Domínio
       entities/           # Entidades de negócio
       repositories/       # Interfaces de repositórios
    application/            # Camada de Aplicação
       dtos/              # Data Transfer Objects
       services/          # Interfaces de serviços
       use-cases/         # Casos de uso
    infra/                 # Camada de Infraestrutura
        database/          # Implementações de repositórios
        http/              # Controladores e rotas HTTP
        services/          # Implementações de serviços
        workers/           # Workers em background
 prisma/
    schema.prisma          # Schema do banco de dados
 dev.db                     # Arquivo SQLite (criado após migração)
 .env                       # Variáveis de ambiente
 package.json
 tsconfig.json
 jest.config.js
\\\

##  Arquitetura

### Arquitetura Limpa (Clean Architecture)

O projeto segue os princípios da **Arquitetura Limpa** proposta por Robert C. Martin:

**Camadas:**
- **Domain**: Entidades e regras de negócio puras (independente de frameworks)
- **Application**: Casos de uso e lógica de aplicação
- **Infrastructure**: Detalhes técnicos (banco, HTTP, workers)

**Fluxo de Dependências:**
\\\
Infrastructure  Application  Domain
\\\

### Princípios SOLID Aplicados

#### **S - Single Responsibility Principle**
Cada classe tem uma única responsabilidade:
- \ScheduleNotificationUseCase\: Apenas agenda notificações
- \SendDueNotificationsUseCase\: Apenas processa notificações pendentes
- \NotificationController\: Apenas recebe requisições HTTP
- \PrismaNotificationRepository\: Apenas acessa o banco de dados
- \MockEmailService\: Apenas simula envio de emails

#### **O - Open/Closed Principle**
O sistema é aberto para extensão mas fechado para modificação:
- Novos repositórios podem ser criados (ex: \MongoNotificationRepository\) sem alterar os use cases
- Novos serviços de email podem ser implementados (ex: \NodemailerService\) sem alterar a lógica de negócio

#### **L - Liskov Substitution Principle**
Qualquer implementação de \NotificationRepository\ pode substituir outra:
- \InMemoryNotificationRepository\ (para testes)
- \PrismaNotificationRepository\ (para produção)
- Ambas implementam a mesma interface e são intercambiáveis

#### **I - Interface Segregation Principle**
Interfaces pequenas e específicas:
- \IEmailService\: apenas \sendEmail()\
- \NotificationRepository\: apenas operações CRUD necessárias

#### **D - Dependency Inversion Principle**
Módulos de alto nível não dependem de módulos de baixo nível. Ambos dependem de abstrações:
- Use cases dependem de **interfaces**, não de implementações
- Repositórios e serviços são injetados via construtor

### Padrões de Projeto

#### **Repository Pattern**
Abstração de acesso a dados, permitindo múltiplas implementações sem alterar a lógica de negócio.

#### **Use Case Pattern (Interactor)**
Cada funcionalidade é encapsulada em um caso de uso independente.

#### **Dependency Injection**
Dependências são injetadas via construtor, facilitando testes e baixo acoplamento.

#### **Data Transfer Object (DTO)**
Objetos específicos para transferência de dados entre camadas.

#### **Worker Pattern**
Processamento de tarefas em background sem bloquear a API.

##  Notas Importantes

- O banco de dados é **SQLite** (arquivo \dev.db\), não requer instalação de PostgreSQL
- O envio de emails é **simulado** via \MockEmailService\ (logs no console)
- O worker está **habilitado por padrão** e executa a cada 60 segundos
- Para produção, troque \MockEmailService\ por \NodemailerService\ e configure SMTP real

##  Desenvolvimento

Este é um projeto acadêmico desenvolvido para a disciplina de Desenvolvimento de Sistemas Backend, seguindo os princípios de Arquitetura Limpa e SOLID.

##  Licença

MIT
