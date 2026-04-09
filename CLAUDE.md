# GA Ativos — Contexto para Desenvolvimento

Sistema de **Gestão de Ativos Corporativos** do Grupo Arantes. Controla patrimônio (notebooks, celulares), frota de veículos, oficina/manutenção, contratos, telefonia e pessoas.

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Frontend | React 18 + Vite 5 + TypeScript 5.8 + SWC |
| UI | Tailwind CSS + Radix UI (shadcn/ui) |
| Estado/cache | TanStack React Query v5 (staleTime 5min, gcTime 30min, retry 1) |
| Formulários | React Hook Form + Zod |
| Roteamento | React Router v6 (lazy-loaded pages) |
| Backend | Supabase (Postgres + PostgREST + Edge Functions Deno) |
| Auth | Supabase Auth com RBAC (user_roles + module_permissions) |
| PDF | @react-pdf/renderer v4 (client-side) |
| Excel | xlsx + read-excel-file (lazy-loaded) |
| Charts | Recharts |
| Deploy | Vercel (frontend) + Supabase (backend) |

## Comandos

```bash
npm run dev          # Vite dev server na porta 8080
npm run build        # Build de produção
npm run build:dev    # Build sem otimização
npm run preview      # Preview local (porta 4173)
npm run test         # Vitest (run once)
npm run test:watch   # Vitest (watch mode)
npm run lint         # ESLint
```

## Estrutura do Repositório

```
src/
├── pages/              # 33 páginas (rotas) — lazy-loaded
├── components/         # Componentes organizados por feature
│   ├── ui/             # Primitivos shadcn/ui (30+)
│   ├── admin/          # Empresas, áreas
│   ├── contratos/      # Chart, Chat, Itens, KPIs, Métricas
│   ├── frota/          # Custos, importação
│   ├── motorista/      # App mobile do condutor
│   ├── telefonia/      # Faturas, sincronização
│   ├── pdf/            # Templates PDF (comodato, termo)
│   └── feedback/       # Bug reports
├── hooks/              # 45 hooks (React Query + mutations)
├── contexts/           # AuthContext (sessão, role, funcionarioId)
├── integrations/supabase/
│   ├── external-client.ts  # Cliente Supabase principal
│   ├── client.ts           # Cliente via .env (fallback)
│   └── types.ts            # Tipos gerados do schema (2000+ linhas)
├── config/             # supabase.config.ts (credenciais externas)
├── lib/                # Utilitários: error-handler, excel, parsers
│   └── parsers/        # Parsers de PDF/Excel (Claro, custos frota)
├── types/              # index.ts — interfaces do app
└── App.tsx             # Rotas + providers (QueryClient, Auth, ErrorBoundary)

supabase/
├── functions/          # 14 Edge Functions (Deno)
│   ├── assistant-hub/      # Hub IA (roteia entre domínios)
│   ├── reports-chat/       # Chat de relatórios
│   ├── contrato-chat/      # Chat contextual de contratos
│   ├── consulta-fipe/      # Consulta valor veicular
│   ├── odometer-ocr/       # OCR de hodômetro
│   ├── whatsapp-send/      # Envio via Graph API
│   ├── whatsapp-webhook/   # Recepção + extração de KM
│   ├── workshop-scheduler/ # Alertas automáticos oficina
│   ├── sync-to-ga360/      # Sync empresas/funcionários
│   ├── sync-to-gapagamentos/
│   ├── password-reset-request/
│   ├── password-reset-confirm/
│   ├── send-email/
│   └── test-smtp/
└── migrations/         # Migrações SQL

docs/
├── PRD.md              # Escopo funcional (as-is)
├── TECHNICAL.md        # Arquitetura e decisões técnicas
├── dev-multiagentes.md # Modelo de trabalho com agentes
└── agents/             # Documentação por papel (7 agentes)
```

## Padrões e Convenções

### Hooks (src/hooks/)
- Cada hook encapsula queries + mutations via React Query
- Padrão: `useXxx()` retorna `{ data, isLoading, createX, updateX, deleteX }`
- Mutations invalidam cache via `queryClient.invalidateQueries()`
- Erros formatados com `friendlyErrorMessage()` de `@/lib/error-handler`
- Toasts via `sonner` (`toast.success()`, `toast.error()`)

### CRUD com Supabase
```typescript
// Query
const { data } = await supabase.from("tabela").select("*").eq("active", true);

// Insert
const { data, error } = await supabase.from("tabela").insert(payload).select().single();

// Update
const { error } = await supabase.from("tabela").update(payload).eq("id", id);

// RPC
const { data } = await supabase.rpc("nome_funcao", { param: valor });
```

### Soft Delete
- NUNCA usar DELETE real. Sempre `update({ active: false })`
- Todas as queries filtram `eq("active", true)`

### Formulários
- React Hook Form + Zod para validação
- Dialogs controlados com `open` + `onOpenChange`
- Componentes de form do shadcn/ui (`Form`, `FormField`, `FormItem`)

### Componentes de UI
- Usar componentes de `@/components/ui/` (shadcn/ui)
- `PageHeader` para título + ações de página
- `DataTablePagination` para tabelas paginadas
- `ConfirmDeleteDialog` para confirmações destrutivas
- Layout principal: `AppLayout` (sidebar + content)

### Imports e Aliases
- Alias `@` = `src/` (configurado em vite.config.ts e tsconfig.json)
- Exemplo: `import { supabase } from "@/integrations/supabase/external-client"`

### TypeScript
- Config leniente: `noImplicitAny: false`, `strictNullChecks: false`
- Tipos do banco em `src/integrations/supabase/types.ts` (gerados)
- Interfaces do app em `src/types/index.ts`

## Banco de Dados

### Tabelas Principais
| Tabela | Descrição |
|--------|-----------|
| `assets` | Ativos (notebook, celular, etc.) com patrimônio auto-gerado |
| `asset_types` | Tipos com form_fields JSONB, depreciação, prefix para patrimônio |
| `veiculos` | Frota (placa, chassi, renavam, km_atual, valor_fipe) |
| `funcionarios` | Funcionários (CPF, RG, CNH, is_condutor, is_vendedor) |
| `empresas` | Empresas (CNPJ) |
| `equipes` | Equipes com líder |
| `atribuicoes` | Histórico de atribuições ativo-funcionário |
| `contratos` | Contratos (número, fornecedor, datas, valores) |
| `contrato_itens` | Itens do contrato |
| `contrato_metricas` | KPIs do contrato |
| `contrato_consumo` | Consumo/uso do contrato |
| `ordens_servico` | OS de manutenção (sequência auto-incremento) |
| `pecas` | Estoque de peças (código, categoria, mín/máx) |
| `preventivas` | Manutenção preventiva (por KM e/ou data) |
| `linhas_telefonicas` | Linhas telefônicas |
| `faturas_telefonia` | Faturas de telecom |
| `vehicle_odometer_reports` | Leituras de KM (status: ok, suspeito, rejeitado) |
| `notification_jobs` | Fila de notificações (WhatsApp/email) |
| `user_roles` | Roles: assistente, coordenador, diretor, admin |
| `module_permissions` | Permissões por role × módulo (can_view, can_edit) |
| `audit_log` / `activity_history` | Auditoria de mudanças |

### RPCs Importantes
- `create_asset_with_patrimonio(...)` — cria ativo com patrimônio gerado
- `generate_patrimonio(p_tipo_id)` — gera próximo patrimônio
- `get_dashboard_stats()` — estatísticas do dashboard
- `get_dashboard_alerts(limit_count?)` — alertas (CNH, contratos, preventivas, estoque)
- `get_current_user_role()` — role do usuário atual
- `is_current_user_admin()` — check de admin

### Status (enums)
- **Ativos/Veículos**: `disponivel | em_uso | manutencao | baixado`
- **Contratos**: `ativo | vencido | cancelado | renovacao`
- **Roles**: `assistente | coordenador | diretor | admin`

## Auth e Permissões

- **AuthContext** (`src/contexts/AuthContext.tsx`): mantém `user`, `session`, `userRole`, `funcionarioId`, `isMotorista`
- **Auto-link**: no login, se funcionário não tem `user_id`, tenta match por email (case-insensitive) e grava vínculo
- **Motorista redirect**: `is_condutor=true` + mobile → redireciona para `/motorista`; desktop → dashboard normal
- **Aprovação**: novos cadastros precisam de `is_approved=true` em `user_roles`
- **Rota protegida**: `ProtectedRoute` verifica auth + aprovação
- **Permissões de módulo**: `useModulePermissions` filtra menu/navegação por role

## Rotas (src/App.tsx)

**Públicas**: `/auth`, `/reset-password`

**Protegidas (lazy-loaded)**:
- Dashboard: `/`
- Ativos: `/ativos`, `/tipos-ativos`
- Pessoas: `/funcionarios`, `/empresas`, `/equipes`
- Frota: `/veiculos`, `/veiculos/multas`, `/veiculos/historico`, `/veiculos/custos`
- Oficina: `/oficina`, `/oficina/agenda`, `/oficina/os`, `/oficina/pecas`, `/oficina/preventivas`, `/oficina/lavagem`, `/oficina/km`, `/oficina/notificacoes`
- Telefonia: `/telefonia`, `/linhas-telefonicas`, `/telefonia/faturas`
- Contratos: `/contratos`, `/contratos/:id`
- Relatórios: `/historico`, `/relatorios`
- Admin: `/configuracoes`, `/permissoes`, `/usuarios`, `/admin/bugs`
- Motorista: `/motorista` (mobile-first)

## Code Splitting (vite.config.ts)

Chunks manuais para cache de longa duração:

| Chunk | Conteúdo |
|-------|----------|
| `vendor-misc` | react, react-dom, react-router, lucide-react, date-fns, sonner |
| `vendor-supabase` | @supabase/* |
| `vendor-query` | @tanstack/react-query |
| `vendor-ui` | @radix-ui/*, cmdk, vaul, embla-carousel |
| `vendor-forms` | react-hook-form, @hookform, zod |
| `vendor-charts` | recharts, d3-* |
| `vendor-markdown` | react-markdown, remark/rehype |
| `vendor-excel` | read-excel-file (lazy) |
| `vendor-xlsx` | xlsx/SheetJS (lazy) |
| `vendor-pdf` | @react-pdf/renderer |

**IMPORTANTE**: react/react-dom/react-router DEVEM ficar juntos em `vendor-misc`. Separar causa TDZ no ESM (tela branca em produção).

## Integrações Externas

| Integração | Onde | Como |
|-----------|------|------|
| FIPE (Parallelum) | `supabase/functions/consulta-fipe/` | REST API pública |
| WhatsApp (Meta Graph API) | `whatsapp-send/`, `whatsapp-webhook/` | Secrets: `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID` |
| OpenAI (gpt-4o-mini) | `assistant-hub/`, `reports-chat/`, `contrato-chat/` | Secret: `OPENAI_API_KEY` |
| GA360 | `sync-to-ga360/` | Sync empresas/funcionários (dedup CNPJ/CPF) |
| GA Pagamentos | `sync-to-gapagamentos/` | Idem GA360 |
| SMTP | `send-email/`, `test-smtp/` | Config em `smtp_config` (senha encriptada) |
| Vercel Analytics | `@vercel/analytics` no frontend | Automático |

## Edge Functions — Deploy

```bash
SUPABASE_ACCESS_TOKEN=<token> npx supabase functions deploy <nome> --no-verify-jwt
```
- Project ref: `ftksidxyhnvzdsuonwop`
- Edge Functions NÃO são deployadas pela Vercel — precisam de deploy separado no Supabase

## Modelo de Trabalho com Agentes

Para features que cruzam múltiplas camadas, usar agentes especializados (ver `docs/dev-multiagentes.md`):

1. `planner-produto` — escopo e impacto
2. `database-migrations` — tabelas, RLS, RPCs
3. `backend-edge` — Edge Functions
4. `frontend-dados` — hooks e integração
5. `frontend-ui` — telas e componentes
6. `qa-review` — revisão e testes
7. `security-appsec` — segurança e riscos

## Regras Importantes

### SEMPRE
- Usar `supabase` de `@/integrations/supabase/external-client` (é o cliente principal)
- Filtrar por `active: true` em todas as queries
- Usar `friendlyErrorMessage()` para erros exibidos ao usuário
- Usar `toast.success()` / `toast.error()` do sonner para feedback
- Lazy-load novas páginas com `React.lazy()` + adicionar ao `Suspense`
- Adicionar nova página ao chunk splitting se usar lib pesada
- Seguir conventional commits: `feat:`, `fix:`, `chore:`, `refactor:`

### NUNCA
- DELETE real no banco — usar soft delete (`active: false`)
- Separar react/react-dom do `vendor-misc` no vite.config.ts
- Hardcodar credenciais em código (dívida técnica existente, não piorar)
- Criar Edge Function sem `--no-verify-jwt` no deploy (auth é feita internamente)
- Modificar `src/integrations/supabase/types.ts` manualmente (é gerado)
- Usar `refetchOnWindowFocus: true` (está desabilitado globalmente)

### Dívidas Técnicas Conhecidas
- Credenciais Supabase hardcoded em `src/config/supabase.config.ts` (deveria estar em `.env`)
- Config de IA na UI é apenas informativa — chave real fica nos secrets do Supabase
- Config WhatsApp na UI apenas testa — envio real depende de secrets das Edge Functions
- TypeScript leniente (`noImplicitAny: false`, `strictNullChecks: false`) — prioriza velocidade

## Variáveis de Ambiente

```
VITE_SUPABASE_URL=https://ftksidxyhnvzdsuonwop.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<anon key>
```

## Supabase Secrets (Edge Functions)

```
OPENAI_API_KEY
WHATSAPP_ACCESS_TOKEN
WHATSAPP_PHONE_NUMBER_ID
WHATSAPP_VERIFY_TOKEN
```
