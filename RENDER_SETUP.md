# Setup PostgreSQL no Render

## 📦 Configurar Banco de Dados PostgreSQL

### Passo 1: Criar o Banco de Dados

1. **Acesse o Dashboard do Render:** https://dashboard.render.com

2. **Clique em "New +" no topo → "PostgreSQL"**

3. **Configure o banco:**
   - **Name:** `notification-service-db` (ou outro nome)
   - **Database:** `notifications`
   - **User:** (gerado automaticamente)
   - **Region:** Escolha a mesma região do seu web service
   - **PostgreSQL Version:** 16 (ou mais recente)
   - **Plan:** Free (para testes) ou Starter

4. **Clique em "Create Database"**

5. **Aguarde a criação** (pode levar alguns minutos)

6. **Anote as informações de conexão:**
   - Vá na aba "Info"
   - Você verá: **Internal Database URL** e **External Database URL**

### Passo 2: Conectar ao Web Service

1. **Vá no seu Web Service** (notification-service)

2. **Vá em "Environment" no menu lateral**

3. **Adicione a variável de ambiente:**
   - **Key:** `DATABASE_URL`
   - **Value:** Cole a **Internal Database URL** do PostgreSQL
   - Exemplo: `postgresql://user:password@dpg-xxxxx.oregon-postgres.render.com/notifications`

4. **Adicione também a variável do frontend (se ainda não tiver):**
   - **Key:** `FRONTEND_URL`
   - **Value:** URL do seu frontend na Vercel

5. **Clique em "Save Changes"**

### Passo 3: Rodar as Migrations

O Render vai fazer o deploy automaticamente. As migrations serão executadas com o comando:

```bash
npm run prisma:migrate
```

Isso já está configurado no build command:
```
npm install && npx prisma generate && npm run build
```

E o Render executará automaticamente:
```
npx prisma migrate deploy
```

### Passo 4: Verificar

1. **Verifique os logs** do deploy
2. **Procure por:**
   ```
   ✔ Generated Prisma Client
   ```
3. **O servidor deve iniciar sem erros de database**

## 🔧 Comandos Úteis

### Ver logs do serviço
```bash
# No dashboard do Render, vá em "Logs"
```

### Executar migrations manualmente (se necessário)
```bash
# No Shell do Render (aba "Shell" no dashboard)
npx prisma migrate deploy
```

### Resetar o banco (CUIDADO - apaga todos os dados!)
```bash
# Não recomendado em produção
npx prisma migrate reset
```

## 📋 Checklist de Deploy

- [ ] PostgreSQL criado no Render
- [ ] `DATABASE_URL` configurada no Web Service
- [ ] `FRONTEND_URL` configurada no Web Service
- [ ] Deploy realizado com sucesso
- [ ] Migrations executadas (ver logs)
- [ ] Serviço iniciado sem erros
- [ ] API respondendo corretamente

## 🐛 Troubleshooting

### Erro: "Can't reach database server"
**Causa:** DATABASE_URL incorreta ou banco não acessível
**Solução:** Verifique se usou a **Internal Database URL** (não a External)

### Erro: "Environment variable not found: DATABASE_URL"
**Causa:** Variável não configurada
**Solução:** Adicione DATABASE_URL nas Environment Variables

### Erro: "Error validating datasource"
**Causa:** URL do banco está mal formatada
**Solução:** Copie novamente do dashboard do PostgreSQL

### Migrations não executam
**Causa:** Pasta migrations não está no repositório
**Solução:** Verifique se a pasta `prisma/migrations/` foi commitada

## 📚 Recursos

- [Render PostgreSQL Docs](https://render.com/docs/databases)
- [Prisma Migrate Docs](https://www.prisma.io/docs/concepts/components/prisma-migrate)
- [Render Environment Variables](https://render.com/docs/environment-variables)

