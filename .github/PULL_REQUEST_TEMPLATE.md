## Descrição

Este pull request adiciona melhorias de UI e branding para o painel de notificações:

- Branding 26fit: inline SVG logo e paleta de cores
- Nova navegação (Dashboard, Enviar Holerites, Notificações, Equipe, Histórico)
- Movido o formulário de colaboradores para a aba "Equipe" e correções de HTML duplicado
- Dashboard com cartões de estatísticas que consomem os endpoints já existentes

Nenhuma mudança de backend foi feita neste PR.

## Como testar

1. Verifique os arquivos modificados localmente (ex.: `public/index.html`).
2. Faça o build / rode o frontend estático para testar localmente:
   ```powershell
   cd public
   python -m http.server 5173
   # abrir http://localhost:5173
   ```
3. Confirme que as requisições ao backend apontam para a URL correta (`VITE_API_BASE_URL` em produção).

## Observações de deploy

- Após merge, redeploy no Vercel para recompilar o bundle (e garantir que `VITE_API_BASE_URL` esteja configurada).
- Se editar variáveis de ambiente no Render (CORS, FRONTEND_URL), execute Manual Deploy da branch `chore/health-deploy-readme`.

## Checklist

- [ ] Testado localmente
- [ ] `VITE_API_BASE_URL` configurado no Vercel
- [ ] `FRONTEND_URL`/`CORS_ORIGIN` verificado no Render (se necessário)
