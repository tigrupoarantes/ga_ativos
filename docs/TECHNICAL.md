# Documentação Técnica — Gestão de Ativos

Este documento descreve a arquitetura e principais decisões técnicas **como estão hoje** no repositório.

## 1) Visão de arquitetura

- Frontend: **Vite + React 18 + TypeScript** (SPA)
- UI: **Tailwind CSS** + **Radix UI** + componentes no padrão shadcn/ui
- Roteamento: **react-router-dom**
- Dados/cache: **TanStack React Query**
- Backend/infra: **Supabase**
  - Auth
  - Postgres (tabelas + views/RPC)
  - Edge Functions (Deno)

Diagrama lógico (alto nível):

1. Usuário acessa SPA (Vercel).
2. SPA autentica via Supabase Auth e usa PostgREST/RPC para CRUD.
3. Para integrações (IA, FIPE, WhatsApp, sync), SPA chama **Edge Functions**.
4. Edge Functions acessam o banco via **service role key** e serviços externos (SMTP, Graph API, AI Gateway).

## 2) Estrutura do repositório

- `src/`: aplicação React
  - `pages/`: páginas (rotas)
  - `components/`: componentes e layouts
  - `hooks/`: hooks de dados e integrações (React Query, streaming etc.)
  - `contexts/`: contexto de auth e estado global de sessão
  - `integrations/supabase/`: clientes Supabase e tipos
  - `config/`: configs do app (inclui config de Supabase externo)
- `supabase/`:
  - `functions/`: Edge Functions (Deno)
  - `migrations/`: migrações (quando aplicável)
  - `config.toml`: config Supabase
- `docs/migration/`: materiais de migração e schema SQL

## 3) Execução local e build

Pré-requisitos (observado em README):

- Node.js 20+
- npm 10+

Comandos:

- Dev: `npm run dev`
- Build: `npm run build`
- Preview: `npm run preview -- --host 0.0.0.0 --port 4173`
- Testes: `npm run test`

Vite:

- Porta de desenvolvimento configurada para `8080`.
- Alias `@` aponta para `src/`.

## 4) Variáveis de ambiente (frontend)

Variáveis esperadas no `.env` (README):

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

Observação importante (as-is):

- O app tem um **client externo** que usa credenciais hardcoded em código para migração (ver seção “Segurança/Dívida técnica”).

## 5) Integração Supabase no frontend

### 5.1 Cliente Supabase

Existem dois caminhos:

- Cliente por `.env` (padrão): `src/integrations/supabase/client.ts`
- Cliente externo (migração): `src/integrations/supabase/external-client.ts` + `src/config/supabase.config.ts`

No estado atual, muitos imports usam o `external-client` reexportado como `supabase`.

### 5.2 Tipagem do banco

- Tipos gerados/definidos em `src/integrations/supabase/types.ts`.

Tabelas citadas/observadas com uso no app/edge functions:

- `assets`, `asset_types`
- `ai_runs`, `ai_tool_calls`
- `veiculos`, `vehicle_odometer_reports`
- `funcionarios`, `empresas`, `equipes`
- `contratos`, `contrato_itens`, `contrato_metricas`, `contrato_consumo`
- `ordens_servico`, `pecas`, `preventivas`
- `linhas_telefonicas`
- `smtp_config`
- `user_roles`, `module_permissions`
- `notifications`, `notification_jobs`
- `password_reset_tokens`
- `app_config`

## 6) Autenticação, roles e permissões

- Contexto central: `src/contexts/AuthContext.tsx`
  - Mantém sessão, role e flags relevantes (ex.: se funcionário é condutor).
  - Cadastro cria registro em `user_roles` e exige aprovação (`is_approved`).
  - **Auto-link `funcionarios.user_id`**: no login/sessão, se não houver correspondência por `user_id`, o contexto tenta encontrar o funcionário pelo email (case-insensitive, somente quando `user_id IS NULL`) e grava o vínculo automaticamente. Resolve o caso de funcionários pré-cadastrados antes de criar conta.
  - **Redirect motorista**: usuários com `is_condutor = true` são redirecionados para `/motorista` **somente em dispositivos móveis** (verificado via `isMobileDevice()` em `src/hooks/use-mobile.tsx`, que usa `navigator.userAgent`). No desktop, caem no dashboard normal.
- Rotas protegidas: `src/components/ProtectedRoute.tsx`
- Permissões por módulo:
  - Hook `useModulePermissions` consulta `module_permissions` e filtra menu/navegação.

## 7) Padrões de dados (React Query)

- `QueryClient` em `src/App.tsx`:
  - `staleTime`: 5 min
  - `gcTime`: 30 min
  - `retry`: 1
  - `refetchOnWindowFocus`: false

Hooks típicos:

- CRUD via `supabase.from(...).select/insert/update/delete`
- RPC via `supabase.rpc(...)` (ex.: dashboard)

## 8) Edge Functions (Deno) — catálogo

As Edge Functions ficam em `supabase/functions/*`.

### 8.1 Reset de senha

- `password-reset-request`
  - Gera token (com rate limit por email), salva em `password_reset_tokens`.
  - Busca SMTP em `smtp_config`.
  - Envia email com link `/reset-password?token=...`.
- `password-reset-confirm`
  - Valida token e senha.
  - Atualiza senha do usuário via Admin API.

### 8.2 Email / SMTP

- `send-email`
  - Envia email usando SMTP configurado no banco.
- `test-smtp`
  - Testa credenciais SMTP informadas e envia email de teste.

### 8.3 Consulta FIPE

- `consulta-fipe`
  - Integra com `fipe.parallelum.com.br`.
  - Rotinas para marcas/modelos/anos e consulta por código/ano.

### 8.4 IA (Relatórios e Contratos)

- `reports-chat`
  - Agrega múltiplas tabelas (veículos, funcionários, ativos, contratos, oficina, telefonia etc.).
  - Monta um “system context” e chama a API da OpenAI com streaming SSE.
- `contrato-chat`
  - Busca contrato + métricas + consumo.
  - Opcionalmente processa Excel (base64) para contexto.
  - Chama a API da OpenAI com streaming SSE.
- `assistant-hub`
  - Ponto único de entrada para IA.
  - Roteia entre `reports`, `contratos`, `frota` e `oficina`.
  - `frota` e `oficina` estão em modo read-only nesta fase.

Configuração atual:

- **Endpoint**: `https://api.openai.com/v1/chat/completions`
- **Modelo**: `gpt-4o-mini`
- **Secret Supabase**: `OPENAI_API_KEY`
- (Migrado de `ai.gateway.lovable.dev` / `google/gemini-3-flash-preview` / `LOVABLE_API_KEY` em mar/2026)

### 8.5 WhatsApp (fila + envio)

- `whatsapp-send`
  - Consome `notification_jobs` com `status=pendente` e `channel=whatsapp`.
  - Templates atuais: `km_request`, `preventiva_alert`, `wash_reminder`, `agenda_reminder`.
  - Envia via Graph API usando envs:
    - `WHATSAPP_ACCESS_TOKEN`
    - `WHATSAPP_PHONE_NUMBER_ID`
  - Se tokens não estiverem configurados, marca como enviado em modo “simulado”.

### 8.6 WhatsApp (webhook)

- `whatsapp-webhook`
  - Verificação (GET) com token:
    - `WHATSAPP_VERIFY_TOKEN` (fallback: `ga_km_webhook`)
  - Recepção (POST):
    - Extrai KM de mensagens, encontra funcionário por telefone e veículo associado.
    - Insere em `vehicle_odometer_reports` e classifica leitura (`ok|suspeito|rejeitado`).

### 8.7 Scheduler da oficina

- `workshop-scheduler`
  - Gera jobs para WhatsApp com base em preventivas, lavagens e agenda.

### 8.8 Sync para sistemas externos (SSE)

- `sync-to-ga360`
- `sync-to-gapagamentos`

Características:

- Streaming de progresso via `data: {json}\n` (SSE-like), consumido por hooks no frontend.
- Deduplicação por CNPJ (empresas) e CPF (funcionários).

## 9) Streaming (frontend)

Alguns fluxos usam leitura incremental da resposta (estilo SSE):

- Relatórios IA: `src/hooks/useReportsChat.ts`
- Chat de contratos: `src/hooks/useContratoChat.ts`
- Sync GA360/GA Pagamentos: `src/hooks/useSyncToGA360.ts`, `src/hooks/useSyncToGAPagamentos.ts`

O padrão é:

- `fetch(...)` para a Edge Function
- `response.body.getReader()`
- parse de linhas iniciadas com `data: `

## 10) Otimização de bundle (code splitting)

O build usa `manualChunks` no Rollup para dividir vendors em chunks separados e habilitar cache de longa duração no browser:

| Chunk | Conteúdo |
|---|---|
| `vendor-misc` | react, react-dom, react-router, scheduler, lucide-react, date-fns, sonner e demais libs |
| `vendor-supabase` | `@supabase/*` |
| `vendor-query` | `@tanstack/react-query` |
| `vendor-ui` | `@radix-ui/*`, cmdk, vaul, next-themes, embla-carousel e afins |
| `vendor-forms` | react-hook-form, @hookform, zod |
| `vendor-charts` | recharts, d3-*, victory-vendor |
| `vendor-markdown` | react-markdown + ecossistema remark/rehype/unified (carregado lazy) |
| `vendor-excel` | read-excel-file (carregado via dynamic import) |

**Decisão importante:** `react`/`react-dom`/`react-router` ficam em `vendor-misc` (não em chunk separado). Separar o React causava dependência circular com `scheduler` e outros pacotes em `vendor-misc`, quebrando o app em produção silenciosamente (tela branca por TDZ no ESM).

Todas as páginas (exceto Auth, NotFound, ResetPassword) são carregadas via `React.lazy()` + `Suspense` com spinner de loading.

## 11) Identidade visual / favicon

- Arquivo: `public/favicon.jpg`
- Referenciado em `index.html` com `<link rel="icon" type="image/jpeg">` e `<link rel="apple-touch-icon">`
- Usado também nas meta tags OG e Twitter

## 12) Deploy

- **Vercel** (frontend) — ver `vercel.json`:
  - Build: `npm run build`
  - Output: `dist`
  - Rewrite para SPA (React Router)
  - Deploy automático via push para `main` no GitHub

- **Supabase Edge Functions** — deploy manual via CLI:
  ```bash
  SUPABASE_ACCESS_TOKEN=<token> npx supabase functions deploy <nome> --no-verify-jwt
  ```
  - Project ref: `ftksidxyhnvzdsuonwop` (configurado em `supabase/config.toml`)
  - Token: Personal Access Token gerado em `https://supabase.com/dashboard/account/tokens`
  - Edge Functions **não** são deployadas pela Vercel; precisam ser publicadas separadamente no Supabase.

## 13) Segurança e pontos de atenção (as-is)

- **Credenciais Supabase hardcoded no frontend**
  - Existe um arquivo com URL/anonKey fixos para um projeto Supabase externo.
  - Impacto: risco de exposição/uso indevido e acoplamento ao ambiente.
  - Recomendação: migrar para `.env` e remover do código; usar secrets no ambiente de deploy.

- **IA Config**
  - Edge Functions usam `OPENAI_API_KEY` via secret do Supabase (configurado no projeto `ftksidxyhnvzdsuonwop`).
  - A UI administrativa de IA agora é apenas informativa e não salva mais `OPENAI_API_KEY` em `app_config`.
  - Alterações de chave devem ser feitas via secrets do projeto Supabase, fora da interface da aplicação.

- **WhatsApp Config**
  - UI apenas testa credenciais; envio real depende de secrets das Edge Functions.

## 14) Observabilidade

- Analytics: `@vercel/analytics` habilitado no app.
- Logs: Edge Functions escrevem logs via `console.log/error`.
- Runtime de IA: `assistant-hub` registra execuções estruturadas em `ai_runs` e `ai_tool_calls`.
- Escopo atual da telemetria: rota, status, usuário, ferramenta executada, erro sanitizado e metadados operacionais mínimos.
- A telemetria não persiste prompt completo, resposta completa nem arquivos em base64.

## 15) Testes

- Configurado `vitest` (`npm run test`).
- Não há (no escopo analisado) uma suíte extensa documentada; recomenda-se adicionar testes de hooks/fluxos críticos conforme evoluir.
