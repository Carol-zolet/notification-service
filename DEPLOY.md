# Guia Rapido de Deploy

## 1. GitHub (Local -> Remoto)

Execute o script automatizado:
```powershell
powershell.exe -ExecutionPolicy Bypass -File .\git-deploy.ps1
```

Ou manualmente:
```powershell
git init
git add .
git commit -m "feat: sistema completo"
git branch -M main
git remote add origin https://github.com/Carol-zolet/notification-service.git
git push -u origin main
```

**Token de acesso**: https://github.com/settings/tokens (scope: repo)

---

## 2. Backend (Render)

### Database (Postgres)
1. Render Dashboard -> New -> PostgreSQL
2. Nome: `notification-db`
3. Copie **Internal Database URL**

### Web Service
1. New -> Web Service
2. Repositorio: `Carol-zolet/notification-service`
3. Build: `npm install && npx prisma generate && npm run build`
4. Start: `npm run start`
5. Environment Variables:

```
DATABASE_URL=<INTERNAL_DB_URL>
PORT=3001
NODE_ENV=production

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=seu-email@gmail.com
SMTP_PASS=sua-senha-app
SMTP_SECURE=false
SMTP_FROM="RH <seu-email@gmail.com>"

NOTIFICATION_WORKER_ENABLED=true
NOTIFICATION_WORKER_INTERVAL_MS=60000
NOTIFICATION_WORKER_BATCH_SIZE=50
```

6. Deploy -> aguardar
7. Shell -> `npx prisma migrate deploy && npx prisma db seed`

**URL**: https://<seu-servico>.onrender.com

---

## 3. Frontend (Vercel)

### Via CLI
```powershell
cd frontend
npm i -g vercel
vercel login
vercel --prod
```

### Via Web
1. https://vercel.com/new
2. Import: `Carol-zolet/notification-service`
3. Root Directory: `frontend`
4. Framework: Vite
5. Environment:
   ```
   VITE_API_BASE=https://<seu-servico>.onrender.com/api
   ```

**URL**: https://<seu-app>.vercel.app

---

## 4. CORS (Importante!)

Edite `src/infra/main.ts`:

```typescript
app.use(cors({
  origin: [
    'http://localhost:5173',
    'https://<seu-app>.vercel.app'
  ]
}));
```

Push:
```powershell
git add .
git commit -m "fix: CORS vercel"
git push
```

---

## 5. Testes

```powershell
# Backend
$API = "https://<seu-servico>.onrender.com/api"
Invoke-RestMethod -Uri "$API/health"
Invoke-RestMethod -Uri "$API/v1/unidades"

# Frontend
# Abrir no navegador e verificar unidades no select
```

---

## URLs Finais

- Repo: https://github.com/Carol-zolet/notification-service
- API: https://<seu-servico>.onrender.com
- App: https://<seu-app>.vercel.app
- DB: Render Postgres (interno)

---

## Checklist

- [ ] Git push OK
- [ ] Render DB criado
- [ ] Render Web Service deployed
- [ ] Migrations rodadas
- [ ] Seed executado
- [ ] Vercel deployed
- [ ] CORS atualizado
- [ ] Teste end-to-end OK
