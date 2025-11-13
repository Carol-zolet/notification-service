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

Novo: script orquestrador `auto_full_deploy.ps1`
-------------------------------------------------
Esse script centraliza o fluxo e vai solicitar (se não estiverem setadas) as chaves/IDs necessários e executará os passos em sequência.

Uso (PowerShell):

```powershell
.
\scripts\automation\auto_full_deploy.ps1
```

Você pode passar parâmetros opcionais:

```powershell
.
\scripts\automation\auto_full_deploy.ps1 -Branch 'chore/health-deploy-readme' -FrontendUrl 'https://seu-front.vercel.app' -ApiBaseUrl 'https://notification-service-rmnv.onrender.com/api/v1'
```

O script pedirá as variáveis que não estiverem definidas em ambiente:
- RENDER_API_KEY
- RENDER_SERVICE_ID
- VERCEL_TOKEN
- VERCEL_PROJECT_ID

Ele valida as credenciais com chamadas leves e então invoca os scripts individuais para atualizar envs e disparar deploys.

Segurança: nunca comite as chaves. O script usa as variáveis só na sessão atual.

Rotacionar DATABASE_URL (semi-automático)
---------------------------------------
Há um script auxiliar `rotate_database_credentials.ps1` que gera uma nova senha para o usuário do banco,
tenta aplicar a senha via `psql` (se disponível) e atualiza `DATABASE_URL` no Render.

Uso (recomendado):

```powershell
# rode no diretório raiz do projeto
.\scripts\automation\rotate_database_credentials.ps1
```

O script solicitará a `DATABASE_URL` atual se não estiver definida na variável de ambiente e
pedirá `RENDER_API_KEY` e `RENDER_SERVICE_ID` para escrever a nova `DATABASE_URL` no Render.

Notas de segurança:
- Garanta que o `psql` (cliente) esteja instalado se quiser que o script aplique a senha automaticamente.
- Se preferir, o script imprime o SQL `ALTER USER` pronto para você executar manualmente.
- Não cole chaves em conversas públicas.

Observações finais
------------------
- Verifique a API/CLI do provedor antes de rodar em produção. Os endpoints de API são usados diretamente pelos scripts; revise os logs e respostas.
- Eu posso adaptar os scripts para usar o CLI (Render CLI / Vercel CLI) se preferir esse fluxo.

Se quiser, eu já adiciono estes scripts ao repositório agora — eles são templates testados via `Invoke-RestMethod` e `curl`.
