# Sistema de Notificações - Relatório Técnico

**Disciplina:** Desenvolvimento de Sistemas Backend  
**Aluno:** [Seu Nome]  
**Data:** 03 de Novembro de 2025

---

## 1. Visão Geral do Sistema

O Sistema de Notificações é um microsserviço responsável por gerenciar e enviar notificações agendadas por email. O sistema permite que aplicações externas agendem notificações que serão processadas e enviadas automaticamente no momento especificado.

### 1.1 Funcionalidades Principais

- Agendamento de notificações por email
- Envio automático de notificações no horário agendado (via worker)
- Gerenciamento de status (pendente, enviado, falha)
- Persistência de dados com SQLite via Prisma ORM
- API REST para integração
- Simulação de envio de emails (MockEmailService)

---

## 2. Arquitetura do Sistema

### 2.1 Arquitetura Limpa (Clean Architecture)

O projeto foi desenvolvido seguindo os princípios da **Arquitetura Limpa** proposta por Robert C. Martin (Uncle Bob). A organização do código em camadas garante:

- **Independência de frameworks**
- **Testabilidade**
- **Independência de UI**
- **Independência de banco de dados**
- **Independência de agentes externos**

#### Camadas da Arquitetura

\\\

                       DOMAIN                            
  (Entities, Repository Interfaces)                      
  - Regras de negócio puras                             
  - Independente de qualquer framework                   

                          
                          

                    APPLICATION                          
  (Use Cases, DTOs, Service Interfaces)                  
  - Lógica de aplicação                                 
  - Orquestração de fluxos                              

                          
                          

                  INFRASTRUCTURE                         
  (Repositories, Controllers, Services, Workers)         
  - Detalhes técnicos                                   
  - Frameworks e bibliotecas                            

\\\

### 2.2 Diagrama de Classes UML

\\\

          <<interface>>                
      NotificationRepository           

 + create(n: Notification): Promise    
 + findById(id: string): Promise       
 + findPending(): Promise              
 + update(n: Notification): Promise    

                            
                            
                            
  
InMemoryNotification  PrismaNotification         
Repository            Repository                 
  
- items: []           - prisma: PrismaClient     
+ create()            + create()                 
+ findById()          + findById()               
+ findPending()       + findPending()            
+ update()            + update()                 
  


   ScheduleNotificationUseCase         

- repository: NotificationRepository   

+ execute(dto: ScheduleNotificationDTO)
  : Promise<Notification>              



   SendDueNotificationsUseCase         

- repository: NotificationRepository   
- emailService: IEmailService          

+ execute(): Promise<void>             



     NotificationController            

- scheduleUseCase: ScheduleNotification
                   UseCase             

+ schedule(req, res): Promise<Response>



          <<interface>>                
         IEmailService                 

+ sendEmail(to, subject, body): Promise

            
            

      MockEmailService                  

+ sendEmail(to, subject, body): Promise 
  (simula envio com logs)               



      NotificationWorker               

- useCase: SendDueNotificationsUseCase 

+ executeJob(): Promise<void>          
+ start(interval): void                

\\\

---

## 3. Princípios SOLID

### 3.1 Single Responsibility Principle (SRP)

Cada classe tem uma única responsabilidade:

- \ScheduleNotificationUseCase\: Apenas agenda notificações
- \SendDueNotificationsUseCase\: Apenas processa notificações pendentes
- \NotificationController\: Apenas recebe requisições HTTP
- \PrismaNotificationRepository\: Apenas acessa o banco de dados
- \MockEmailService\: Apenas simula envio de emails
- \NotificationWorker\: Apenas orquestra o processamento periódico

**Exemplo:**
\\\	ypescript
//  BOM: Classe com responsabilidade única
export class ScheduleNotificationUseCase {
  constructor(private readonly repository: NotificationRepository) {}
  
  async execute(input: ScheduleNotificationDTO): Promise<Notification> {
    // Apenas cria e persiste a notificação
    const notification = { /* ... */ };
    return await this.repository.create(notification);
  }
}
\\\

### 3.2 Open/Closed Principle (OCP)

O sistema é aberto para extensão mas fechado para modificação:

- Novos repositórios podem ser criados (ex: \MongoNotificationRepository\) sem alterar os use cases
- Novos serviços de email podem ser implementados (ex: \NodemailerService\, \SendGridService\) sem alterar a lógica de negócio

**Exemplo:**
\\\	ypescript
//  Fácil adicionar novo serviço de email sem modificar use case
class SendGridService implements IEmailService {
  async sendEmail(to: string, subject: string, body: string) {
    // Nova implementação com SendGrid
  }
}
\\\

### 3.3 Liskov Substitution Principle (LSP)

Qualquer implementação de \NotificationRepository\ pode substituir outra:

\\\	ypescript
//  Ambas as implementações são intercambiáveis
const repository1 = new InMemoryNotificationRepository();
const repository2 = new PrismaNotificationRepository();
const useCase1 = new ScheduleNotificationUseCase(repository1);
const useCase2 = new ScheduleNotificationUseCase(repository2);
// Ambos funcionam exatamente da mesma forma
\\\

### 3.4 Interface Segregation Principle (ISP)

Interfaces pequenas e específicas:

\\\	ypescript
//  Interface específica para email
export interface IEmailService {
  sendEmail(to: string, subject: string, body: string): Promise<void>;
}

//  Interface específica para repositório
export interface NotificationRepository {
  create(notification: Notification): Promise<Notification>;
  findById(id: string): Promise<Notification | null>;
  findPending(): Promise<Notification[]>;
  update(notification: Notification): Promise<void>;
}
\\\

### 3.5 Dependency Inversion Principle (DIP)

Módulos de alto nível não dependem de módulos de baixo nível. Ambos dependem de abstrações:

\\\	ypescript
//  Use case depende da INTERFACE, não da implementação
export class ScheduleNotificationUseCase {
  constructor(
    private readonly repository: NotificationRepository // Interface
  ) {}
}

//  Controller depende do Use Case
export class NotificationController {
  constructor(
    private readonly scheduleUseCase: ScheduleNotificationUseCase
  ) {}
}
\\\

---

## 4. Padrões de Projeto Utilizados

### 4.1 Repository Pattern

**Problema:** Desacoplar a lógica de negócio da lógica de acesso a dados.

**Solução:** Criar uma interface que define operações de persistência, permitindo múltiplas implementações.

**Implementação:**
\\\	ypescript
// Interface no domínio
export interface NotificationRepository {
  create(notification: Notification): Promise<Notification>;
  findPending(): Promise<Notification[]>;
  // ...
}

// Implementações na infraestrutura
export class PrismaNotificationRepository implements NotificationRepository {
  // Implementação com Prisma + SQLite
}

export class InMemoryNotificationRepository implements NotificationRepository {
  // Implementação em memória para testes
}
\\\

**Benefícios:**
- Facilita testes (mock do repositório)
- Permite trocar banco de dados sem alterar casos de uso
- Isola regras de negócio

### 4.2 Use Case Pattern (Interactor)

**Problema:** Organizar a lógica de aplicação de forma clara e testável.

**Solução:** Cada funcionalidade é encapsulada em um caso de uso independente.

**Implementação:**
\\\	ypescript
export class ScheduleNotificationUseCase {
  async execute(input: ScheduleNotificationDTO): Promise<Notification> {
    // Lógica de negócio aqui
  }
}
\\\

**Benefícios:**
- Código organizado e fácil de entender
- Facilita testes unitários
- Reutilização de lógica

### 4.3 Dependency Injection

**Problema:** Acoplamento forte entre classes.

**Solução:** Injetar dependências via construtor.

**Implementação:**
\\\	ypescript
//  Dependências injetadas
const repository = new PrismaNotificationRepository();
const useCase = new ScheduleNotificationUseCase(repository);
const controller = new NotificationController(useCase);
\\\

**Benefícios:**
- Fácil substituição de implementações
- Facilita testes (injeção de mocks)
- Baixo acoplamento

### 4.4 Data Transfer Object (DTO)

**Problema:** Expor entidades de domínio diretamente na camada de apresentação.

**Solução:** Criar objetos específicos para transferência de dados entre camadas.

**Implementação:**
\\\	ypescript
export interface ScheduleNotificationDTO {
  email: string;
  subject: string;
  message: string;
  scheduledFor: Date;
}
\\\

**Benefícios:**
- Protege entidades de domínio
- Valida dados de entrada
- Desacopla camadas

### 4.5 Worker Pattern

**Problema:** Processar tarefas em background sem bloquear a API.

**Solução:** Criar um worker que executa periodicamente.

**Implementação:**
\\\	ypescript
// Worker executa a cada 60 segundos
export class NotificationWorker {
  start(intervalMs = 60000) {
    this.executeJob();
    setInterval(() => this.executeJob(), intervalMs);
  }
}
\\\

**Benefícios:**
- Não bloqueia requisições HTTP
- Escalável
- Tolerante a falhas

---

## 5. Tecnologias e Ferramentas

### 5.1 ORM - Prisma

Escolhemos o **Prisma** como ORM pelos seguintes motivos:

- **Type-safe**: Totalmente tipado com TypeScript
- **Migrations**: Gerenciamento automático de schema
- **Query Builder**: API intuitiva
- **Performance**: Queries otimizadas
- **Múltiplos bancos**: Suporta PostgreSQL, MySQL, SQLite, etc.

**Exemplo de Schema:**
\\\prisma
model Notification {
  id           String   @id @default(uuid())
  email        String
  subject      String
  message      String
  scheduledFor DateTime
  status       String   @default("pending")
  sentAt       DateTime?
  createdAt    DateTime @default(now())
}
\\\

### 5.2 Banco de Dados - SQLite

Para facilitar o desenvolvimento e demonstração:

- **Sem instalação**: Banco em arquivo local
- **Leve**: Ideal para desenvolvimento
- **ACID**: Transações confiáveis
- **Portátil**: Fácil compartilhamento

*Nota: Em produção, recomenda-se PostgreSQL ou MySQL.*

### 5.3 Framework HTTP - Express

- **Simples**: API minimalista
- **Middleware**: Extensível
- **Maduro**: Amplamente testado
- **Comunidade**: Grande ecossistema

---

## 6. Testes

### 6.1 Testes End-to-End (E2E)

Testamos o fluxo completo da API:

\\\	ypescript
describe('Notificações - API', () => {
  it('deve agendar uma notificação com sucesso', async () => {
    const response = await request(app)
      .post('/api/notifications/schedule')
      .send({
        email: 'teste@exemplo.com',
        subject: 'Assunto de Teste',
        message: 'Corpo da notificação',
        scheduledFor: new Date(Date.now() + 60000).toISOString()
      });
    
    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('id');
    expect(response.body).toHaveProperty('status', 'pending');
  });
});
\\\

### 6.2 Cobertura de Testes

-  Casos de uso
-  Controladores HTTP
-  Repositórios
-  Fluxos end-to-end

---

## 7. Conclusão

### 7.1 Desenvolvimento do Projeto

O desenvolvimento do sistema de notificações apresentou desafios importantes relacionados à organização da arquitetura e aplicação dos princípios SOLID. Principais aprendizados:

#### Desafios Encontrados

1. **Separação de Camadas**: Garantir que as dependências apontassem sempre para o domínio
2. **Injeção de Dependências**: Configurar corretamente as dependências sem usar frameworks de DI
3. **Testes**: Criar testes que não dependessem de infraestrutura externa
4. **Escolha de SGBD**: Decisão entre PostgreSQL, MySQL ou SQLite para desenvolvimento

#### Soluções Implementadas

1. **Interfaces no Domínio**: Todas as abstrações ficam na camada de domínio
2. **Factory Pattern**: Criação manual de objetos com dependências
3. **Repository In-Memory**: Implementação em memória para testes rápidos
4. **SQLite**: Banco leve sem necessidade de instalação para desenvolvimento
5. **MockEmailService**: Simulação de envio sem necessidade de SMTP configurado

#### Decisões Técnicas

**Uso de SQLite em vez de PostgreSQL:**
- **Justificativa**: Facilita desenvolvimento e demonstração sem necessidade de instalação
- **Trade-off**: Em produção, recomenda-se migrar para PostgreSQL
- **Vantagem**: Prisma ORM permite mudança transparente de banco

**MockEmailService em vez de SMTP real:**
- **Justificativa**: Demonstra funcionalidade sem dependências externas
- **Trade-off**: Não valida integração real com provedores de email
- **Vantagem**: Facilita testes e demonstrações

#### Referências Utilizadas

- **Clean Architecture** - Robert C. Martin
- **Prisma Documentation** - https://www.prisma.io/docs
- **Express.js Guide** - https://expressjs.com/
- **Jest Documentation** - https://jestjs.io/
- **SOLID Principles** - Uncle Bob

### 7.2 Conformidade com Arquitetura Limpa

O sistema atende completamente aos requisitos da Arquitetura Limpa:

 **Camadas bem definidas** (Domain, Application, Infrastructure)  
 **Regra de dependência** respeitada (dependências apontam para dentro)  
 **Testabilidade** (testes sem dependências externas)  
 **Independência de frameworks** (lógica de negócio isolada)  
 **SOLID** aplicado em todas as classes  
 **Padrões de projeto** documentados e implementados  
 **ORM (Prisma)** para mapeamento objeto-relacional  

### 7.3 Resultados Alcançados

-  Sistema completamente funcional
-  API REST implementada
-  Worker processando notificações automaticamente
-  Testes automatizados com 100% de aprovação
-  Documentação completa (README, UML, SOLID)
-  Postman Collection para testes
-  Banco de dados com Prisma ORM

---

**Fim do Relatório**
