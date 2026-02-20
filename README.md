# Gestão de Ativos (Vite + React)

Aplicação frontend em Vite/React com integração ao Supabase.

## Pré-requisitos

- Node.js 20+
- npm 10+

## Configuração local

1. Instale dependências:

```bash
npm install
```

2. Crie o arquivo `.env` a partir do exemplo:

```bash
cp .env.example .env
```

3. Preencha as variáveis no `.env`:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

## Desenvolvimento

```bash
npm run dev
```

## Deploy local (produção)

1. Build de produção:

```bash
npm run build
```

2. Subir o preview local:

```bash
npm run preview -- --host 0.0.0.0 --port 4173
```

A aplicação ficará disponível em `http://localhost:4173`.

## Deploy na Vercel

Este projeto já está preparado com `vercel.json` para:

- Build command: `npm run build`
- Output directory: `dist`
- Rewrite SPA para `index.html` (rotas do React Router)

### Passos

1. Importar o repositório na Vercel.
2. Confirmar framework detectado como **Vite**.
3. Em **Project Settings > Environment Variables**, cadastrar:
	- `VITE_SUPABASE_URL`
	- `VITE_SUPABASE_PUBLISHABLE_KEY`
4. Fazer o primeiro deploy.

## Observações da migração

- O projeto está preparado para execução e deploy independentes.
- O deploy está padronizado para Vercel.
