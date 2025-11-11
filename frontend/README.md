# Frontend - Notification Service

Interface moderna e responsiva para o serviço de notificações.

## 🚀 Deploy na Vercel

### Opção 1: Via CLI (Recomendado)

1. **Instale a Vercel CLI:**
```bash
npm install -g vercel
```

2. **Faça login na Vercel:**
```bash
vercel login
```

3. **Navegue até a pasta do frontend:**
```bash
cd notification-service/frontend
```

4. **Execute o deploy:**
```bash
vercel
```

5. **Configure as variáveis de ambiente:**
Quando solicitado, configure:
- `VITE_API_BASE_URL`: URL do seu backend (ex: `https://seu-backend.onrender.com`)

6. **Para deploy em produção:**
```bash
vercel --prod
```

### Opção 2: Via Dashboard da Vercel

1. **Acesse:** https://vercel.com/new

2. **Conecte seu repositório GitHub**

3. **Configure o projeto:**
   - **Framework Preset:** Vite
   - **Root Directory:** `frontend`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
   - **Install Command:** `npm install`

4. **Adicione a variável de ambiente:**
   - Vá em Settings → Environment Variables
   - Adicione: `VITE_API_BASE_URL` = `https://seu-backend.onrender.com`
   - Importante: Certifique-se de que a URL do backend NÃO tenha barra no final

5. **Click em "Deploy"**

## 🔧 Variáveis de Ambiente

Crie um arquivo `.env.local` na raiz do frontend para desenvolvimento local:

```env
VITE_API_BASE_URL=http://localhost:3001
```

Para produção na Vercel, configure:
```env
VITE_API_BASE_URL=https://seu-backend.onrender.com
```

## 🛠️ Desenvolvimento Local

```bash
# Instalar dependências
npm install

# Iniciar servidor de desenvolvimento
npm run dev

# Build de produção
npm run build

# Preview do build de produção
npm run preview
```

## 📋 Páginas Disponíveis

- **Dashboard** - Estatísticas e visão geral
- **Enviar Holerites** - Distribuição de holerites em lote
- **Notificações** - Gerenciamento de notificações agendadas
- **Histórico** - Consulta de envios realizados

## 🎨 Tecnologias

- React 19
- TypeScript
- Vite
- CSS Modules

## 📝 Importante

- Certifique-se de que o backend está rodando e acessível
- Configure o CORS no backend para permitir requisições do domínio da Vercel
- A URL do backend deve estar sem barra no final
