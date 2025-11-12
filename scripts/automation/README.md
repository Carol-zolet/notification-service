Automação para ajustes de deploy
================================

Esses scripts ajudam a automatizar três tarefas comuns que você está fazendo manualmente:

- Atualizar variáveis de ambiente no Render (ex.: `FRONTEND_URL`, `DATABASE_URL`) e disparar um deploy da branch desejada
- Atualizar variável de ambiente de build no Vercel (`VITE_API_BASE_URL`) e disparar um redeploy
- Wrapper para executar ambos em sequência

IMPORTANTE: os scripts são templates. Você precisa fornecer tokens com permissões apropriadas e IDs/nomes de serviço/projeto:

- `RENDER_API_KEY` — token com permissão para gerenciar serviços (coloque como variável de ambiente local ou no CI)
- `RENDER_SERVICE_ID` — id do serviço backend no Render (pode ser obtido no dashboard > Settings > Service Details)
- `VERCEL_TOKEN` — token com permissão para alterar variáveis e criar deployments
- `VERCEL_PROJECT_ID` — id do projeto Vercel

Segurança:
- Nunca comite tokens em git. Use GitHub Secrets, variáveis de ambiente no CI ou variáveis locais na sua máquina.

Como usar (PowerShell)
----------------------

1) Torne o script executável se necessário e defina as variáveis de ambiente localmente (exemplo no PowerShell):

```powershell
$env:RENDER_API_KEY = '<seu-render-api-key>'
$env:RENDER_SERVICE_ID = '<seu-render-service-id>'
$env:VERCEL_TOKEN = '<seu-vercel-token>'
$env:VERCEL_PROJECT_ID = '<seu-vercel-project-id>'
```

2) Atualizar `FRONTEND_URL` e disparar deploy no Render (exemplo):

```powershell
.
\scripts\automation\render_update_env_and_deploy.ps1 -EnvName 'FRONTEND_URL' -EnvValue 'https://seu-front.vercel.app' -Branch 'chore/health-deploy-readme'
```

3) Atualizar `VITE_API_BASE_URL` no Vercel e disparar redeploy (exemplo):

```powershell
.
\scripts\automation\vercel_update_env_and_deploy.ps1 -EnvName 'VITE_API_BASE_URL' -EnvValue 'https://notification-service-rmnv.onrender.com/api/v1'
```

4) Wrapper para executar ambos (opcional):

```powershell
.
\scripts\automation\deploy_all.ps1 -FrontendUrl 'https://seu-front.vercel.app' -ApiBaseUrl 'https://notification-service-rmnv.onrender.com/api/v1' -Branch 'chore/health-deploy-readme'
```

Observações finais
------------------
- Verifique a API/CLI do provedor antes de rodar em produção. Os endpoints de API são usados diretamente pelos scripts; revise os logs e respostas.
- Eu posso adaptar os scripts para usar o CLI (Render CLI / Vercel CLI) se preferir esse fluxo.

Se quiser, eu já adiciono estes scripts ao repositório agora — eles são templates testados via `Invoke-RestMethod` e `curl`.
