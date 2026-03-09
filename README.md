# 📧 Notification Service - Processador de Holerites (Automated HR)

Sistema robusto desenvolvido para automação de fluxos de RH, focado no processamento inteligente de documentos fiscais e holerites com envio automatizado.

## 🚀 O que este sistema faz?
- **Separação Inteligente:** Processa PDFs de página única ou dupla (superior/inferior), identificando funcionários automaticamente via CPF.
- **Automação de Envio:** Integração com serviços SMTP para envio individualizado por e-mail com logs de confirmação.
- **Segurança e Validação:** Implementa lógica de detecção de duplicatas e proteção de dados sensíveis via variáveis de ambiente.
- **Escalabilidade:** Arquitetura preparada para processar centenas de documentos em segundos.

## 🛠️ Stack Técnica
- **Backend:** Node.js & TypeScript
- **Banco de Dados:** PostgreSQL (via Prisma ORM)
- **Processamento de PDF:** PDF.js (pdfjs-dist)
- **Comunicação:** Nodemailer (SMTP Integration)
- **Qualidade:** Jest (Testes unitários e de integração)

---

## 🏗️ Arquitetura do Projeto
O projeto segue princípios de **Clean Architecture**, facilitando a manutenção e testes:
- `src/application`: Casos de uso e serviços de domínio (Envio de e-mail e Split de PDF).
- `src/domain`: Entidades de negócio (Employee).
- `src/infra`: Implementações técnicas (Controllers, Repositories e Rotas).

---

## 🔒 Segurança em Primeiro Lugar
Este projeto utiliza **Variáveis de Ambiente (`.env`)** para gerenciar credenciais sensíveis. 
*As chaves SMTP e URLs de conexão com banco de dados nunca são expostas no código fonte, seguindo as melhores práticas de segurança da LGPD.*

---

## ⚙️ Como configurar (Desenvolvimento)
1. Clone o repositório.
2. Instale as dependências: `npm install`
3. Configure o arquivo `.env` baseado no `.env.example`.
4. Execute as migrations do Prisma: `npx prisma migrate dev`
5. Inicie o servidor: `npm run dev`

---

## 👩‍💻 Autora
**Caroline Zolet** Estudante de Análise e Desenvolvimento de Sistemas (PUCRS)  
[LinkedIn] https://www.linkedin.com/in/carolinezolet0516/
