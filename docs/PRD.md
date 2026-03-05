# PRD (as-is) — Gestão de Ativos

Este documento descreve **como o produto está hoje**, com base no código presente neste repositório (frontend Vite/React + Supabase).

## 1) Visão geral

O **Gestão de Ativos** é uma aplicação web (SPA) para:

- Gerir **ativos patrimoniais** (ex.: notebooks, celulares) e seus tipos.
- Gerir **frota de veículos** (cadastro, responsável, documentos, histórico e valor FIPE).
- Gerir **oficina/manutenção** (OS, peças, preventivas, lavagens, agenda e coletas de KM).
- Gerir **contratos** (cadastro, itens, métricas, consumo e análises).
- Gerir **telefonia** (linhas e associações).
- Oferecer **relatórios e chat com IA** (relatórios gerais e por contrato) alimentados pelo banco.
- Automatizar **notificações via WhatsApp** (fila, envio, webhook de retorno de KM e scheduler).
- Administrar **usuários, permissões por módulo** e fila de aprovação de cadastros.

## 2) Perfis de acesso (roles)

Perfis observados no código:

- `assistente`
- `coordenador`
- `diretor`
- `admin`

Regras relevantes (observadas):

- Cadastro (`signUp`) cria usuário e atribui role (padrão) em `user_roles`, porém o usuário **precisa ser aprovado** (`is_approved`) para utilizar o sistema.
- A navegação (menu) é filtrada por **permissões por módulo** via `module_permissions` (por role).

## 3) Escopo funcional atual

### 3.1 Autenticação e acesso

- Login e sessão via Supabase Auth.
- Cadastro com verificação de existência e fluxo de **aprovação**.
- Reset de senha via **Edge Functions** (request/confirm) e envio por SMTP (configurado no banco).

### 3.2 Dashboard

- Tela inicial com estatísticas e alertas agregados.
- Uso de RPCs no Supabase (ex.: `get_dashboard_stats` e `get_dashboard_alerts`).

Alertas/indicadores observados nos relatórios/IA e dashboard:

- CNH vencida / vencendo (para funcionários condutores).
- Contratos vencidos / vencendo.
- Preventivas vencidas / próximas.
- Peças com estoque baixo.

### 3.3 Ativos (Patrimônio)

- CRUD de ativos (`assets`) e tipos (`asset_types`).
- Vínculo do ativo com funcionário/empresa.
- Regras observadas:
  - Status do ativo pode ser ajustado automaticamente com base no vínculo (ex.: “em uso” quando há funcionário associado; “disponível” quando não há).
  - Há histórico/diálogo para visualizar movimentações.

### 3.4 Pessoas e organização

- CRUD de funcionários.
- CRUD de empresas.
- CRUD de equipes.

### 3.5 Frota (Veículos)

- CRUD de veículos (`veiculos`) com filtros e paginação client-side.
- Histórico de responsável do veículo.
- Consulta FIPE via Edge Function:
  - Consulta direta por código/ano.
  - Fluxo de consulta assistida (marcas/modelos/anos) e preenchimento no cadastro.
- Seções/tabs de apoio (observadas por componentes importados): documentos, licenciamento, seguros, dashboard.

### 3.6 Oficina

Rotas e telas sob o módulo Oficina:

- Dashboard/visão geral.
- Agenda.
- Ordens de serviço (OS) com fluxo de fechamento.
- Peças (estoque, mínimo, custos).
- Preventivas (por KM e/ou data; status pendente etc.).
- Lavagens.
- Coletas de KM.
- Notificações.

Automação observada:

- Scheduler (Edge Function) gera jobs em `notification_jobs` para WhatsApp:
  - Alertas de preventivas próximas (por KM e por data).
  - Lembretes de agenda (D-1).
  - Lembretes de lavagem.

### 3.7 Telefonia

- Módulos/telas para telefonia e linhas telefônicas.
- Linhas podem estar associadas a funcionários.

### 3.8 Contratos

- CRUD de contratos.
- Detalhe do contrato com:
  - Itens.
  - Métricas.
  - Consumo/histórico.
  - Gráficos/KPIs.
  - Chat com IA contextualizado no contrato.

Upload e análise de Excel no chat (observado):

- O chat do contrato aceita um arquivo (Excel) em base64; a Edge Function extrai até 3 abas e limita linhas para contextualizar a IA.

### 3.9 Relatórios com IA

- Chat de relatórios gerais.
- A Edge Function agrega dados relevantes do banco e produz respostas **apenas com base no contexto** fornecido.
- Streaming de resposta (texto incremental) na UI.

### 3.10 Notificações WhatsApp (fila + webhook)

- Envio:
  - Jobs em `notification_jobs` com `channel=whatsapp` e templates (`km_request`, `preventiva_alert`, `wash_reminder`, `agenda_reminder`).
  - Edge Function `whatsapp-send` consome a fila e envia via Graph API (ou simula “enviado” se não houver secrets).
- Recebimento:
  - Webhook `whatsapp-webhook` valida assinatura (GET challenge) e processa mensagens (POST).
  - Extrai KM do texto do WhatsApp, encontra funcionário por telefone (matching parcial), encontra veículo associado e salva em `vehicle_odometer_reports` com status de validação (`ok|suspeito|rejeitado`).

### 3.11 Administração

- Gestão de permissões por módulo.
- Gestão de usuários (incluindo aprovação, conforme observado na modelagem de roles).
- Página administrativa de bug reports.

### 3.12 Integrações / Sincronizações

- Sincronização de empresas e funcionários com sistemas externos:
  - GA360
  - GA Pagamentos

Características observadas:

- Execução via Edge Functions (`sync-to-ga360`, `sync-to-gapagamentos`).
- Progresso por streaming (SSE-like) na UI.
- Chaves de deduplicação:
  - Empresas por CNPJ.
  - Funcionários por CPF.

## 4) Requisitos não funcionais (observados/implícitos)

- **SPA** com React Router; rotas protegidas no frontend.
- Cache/dados com React Query (stale time e garbage collection configurados).
- Integração com Supabase (Auth, PostgREST, RPC, Edge Functions).
- Deploy preparado para Vercel, com rewrite SPA.

## 5) Dependências externas

- Supabase (DB/Auth/Edge Functions).
- WhatsApp Business (Meta Graph API + webhook) para notificações e coleta de KM.
- Consulta FIPE via API pública do Parallelum.
- IA via AI Gateway (streaming) usando modelo configurado nas Edge Functions.

## 6) Restrições, gaps e dívidas técnicas (observadas)

- **Credenciais Supabase hardcoded no frontend**: existe um client “external” com `url` e `anonKey` no código (risco de segurança/operacional). Ideal: usar `.env` (Vite) e segredos no deploy.
- **Configuração de IA na UI não está alinhada com as Edge Functions**:
  - Há UI para salvar `OPENAI_API_KEY` em `app_config`.
  - As Edge Functions de chat usam `AI_GATEWAY_API_KEY`/`LOVABLE_API_KEY` via `Deno.env` (secrets), não consultam `app_config`.
  - Resultado: o “token OpenAI” salvo no banco pode não ter efeito prático no chat atual.
- **Configuração WhatsApp na UI**: a tela atual permite testar credenciais, mas não persiste tokens no banco; o envio depende de secrets em Edge Functions.
- Alguns fluxos (ex.: “salvar consumo” via chat em JSON) parecem **previstos** no prompt, mas não há confirmação de persistência automática no frontend.

## 7) Itens fora do escopo (não observados)

- Não há evidência de app mobile nativo.
- Não há (neste repo) backend próprio fora do Supabase.

## 8) Referências rápidas (navegação)

Rotas principais observadas:

- Público: `/auth`, `/reset-password`
- Protegido: `/` (dashboard), `/ativos`, `/tipos-ativos`, `/funcionarios`, `/empresas`, `/equipes`, `/veiculos`, `/veiculos/multas`, `/veiculos/historico`, `/oficina/*`, `/telefonia`, `/linhas-telefonicas`, `/contratos`, `/contratos/:id`, `/historico`, `/relatorios`, `/configuracoes`, `/permissoes`, `/usuarios`, `/admin/bugs`
