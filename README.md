# 📧 Notification Service - Processador de Holerites

Sistema para processar PDFs de holerites, separar por funcionário e enviar por email automaticamente.

## 🚀 Funcionalidades

- ✅ Upload de PDF com múltiplos holerites
- ✅ Separação automática por CPF
- ✅ Detecção de holerites duplicados (superior/inferior da página)
- ✅ Envio automático por email
- ✅ Busca de funcionários por unidade
- ✅ Validação de CPF
- ✅ Relatório de processamento

## 📋 Pré-requisitos

- Node.js 16+
- npm ou yarn
- Conta de email SMTP (Gmail, Outlook, etc.)

## 🔧 Instalação

```bash
# Clone o repositório
git clone <url-do-repositorio>
cd notification-service

# Instale as dependências
npm install

# Configure as variáveis de ambiente
cp .env.example .env
# Edite o arquivo .env com suas configurações

# Execute em desenvolvimento
npm run dev

# Ou compile e execute em produção
npm run build
npm start
```

## ⚙️ Configuração do Email (Gmail)

1. Ative a verificação em duas etapas na sua conta Google
2. Gere uma senha de aplicativo:
   - Acesse: https://myaccount.google.com/apppasswords
   - Selecione "Email" e "Outros"
   - Copie a senha gerada
3. Configure no `.env`:
   ```
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_USER=seu-email@gmail.com
   EMAIL_PASSWORD=senha-de-aplicativo-gerada
   ```

## 📡 Endpoints da API

### POST /api/payslips/process

Processa um arquivo PDF de holerites.

**Body (multipart/form-data):**
- `file` (obrigatório): Arquivo PDF
- `unidade` (obrigatório): Código da unidade (ex: "UNIDADE1")
- `subject` (opcional): Assunto do email
- `message` (opcional): Mensagem adicional no corpo do email

**Exemplo com cURL:**
```bash
curl -X POST http://localhost:3000/api/payslips/process \
  -F "file=@holerites.pdf" \
  -F "unidade=UNIDADE1" \
  -F "subject=Seu Holerite de Janeiro/2025" \
  -F "message=Segue em anexo seu holerite"
```

**Resposta de sucesso:**
```json
{
  "success": true,
  "message": "Holerites processados",
  "processed": 10,
  "sent": 10,
  "failed": 0,
  "unidade": "UNIDADE1",
  "details": [
    {
      "cpf": "123.456.789-00",
      "nome": "João Silva",
      "status": "sent"
    }
  ]
}
```

### GET /api/payslips/health

Verifica o status do serviço.

**Resposta:**
```json
{
  "status": "ok",
  "service": "payslip-processor",
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

## 📂 Estrutura do Projeto

```
notification-service/
├── src/
│   ├── application/
│   │   ├── services/
│   │   │   ├── pdf-splitter.service.ts
│   │   │   └── email.service.ts
│   │   └── use-cases/
│   │       └── process-payslip.use-case.ts
│   ├── domain/
│   │   └── entities/
│   │       └── employee.entity.ts
│   ├── infra/
│   │   ├── database/
│   │   │   └── repositories/
│   │   │       └── employee.repository.ts
│   │   └── http/
│   │       ├── controllers/
│   │       │   └── payslip.controller.ts
│   │       └── routes/
│   │           └── payslip.routes.ts
│   └── app.ts
├── .env.example
├── package.json
└── tsconfig.json
```

## 🔍 Formato do PDF

O sistema suporta PDFs com:
- 1 holerite por página
- 2 holerites por página (superior e inferior)

**Requisitos:**
- Cada holerite deve conter um CPF válido
- O CPF pode estar em qualquer formato (com ou sem pontuação)

## 🛠️ Scripts Disponíveis

```bash
npm run dev        # Executa em modo desenvolvimento
npm run build      # Compila TypeScript para JavaScript
npm start          # Executa versão compilada
npm test           # Executa testes
npm run lint       # Verifica código com ESLint
```

## ⚠️ Troubleshooting

### Erro: "Arquivo não enviado"
- Verifique se está enviando o campo `file` no multipart/form-data
- Certifique-se de que o arquivo é um PDF válido

### Erro de email: "Invalid login"
- Verifique se as credenciais SMTP estão corretas
- Para Gmail, use uma senha de aplicativo, não sua senha normal
- Verifique se a verificação em duas etapas está ativada

### Nenhum holerite encontrado
- Verifique se o PDF contém CPFs válidos
- O sistema busca padrões como: 123.456.789-00 ou 12345678900

## 📝 Licença

MIT

## 👥 Contribuindo

Pull requests são bem-vindos! Para mudanças maiores, abra uma issue primeiro.
