

# Plano de Implementacao - Modulo Oficina v1.1

## Visao Geral

Este plano implementa o PRD v1.1 em **4 fases** sequenciais, conforme especificado. Cada fase entrega valor incremental e pode ser testada independentemente.

---

## Fase 1 - Agenda Unificada (Base de Tudo)

### Objetivo
Criar o "motor" de agendamento que centraliza revisoes, preventivas e lavagens.

### Banco de Dados

**Nova tabela: `service_appointments`**

```sql
CREATE TABLE service_appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID NOT NULL REFERENCES veiculos(id),
  service_type TEXT NOT NULL CHECK (service_type IN ('preventiva', 'revisao', 'corretiva', 'lavagem')),
  origin TEXT NOT NULL CHECK (origin IN ('manual', 'preventiva_plan', 'wash_plan', 'whatsapp_km_rule')) DEFAULT 'manual',
  scheduled_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('agendada', 'confirmada', 'em_execucao', 'concluida', 'reagendada', 'cancelada', 'faltou')) DEFAULT 'agendada',
  priority TEXT CHECK (priority IN ('baixa', 'normal', 'alta', 'urgente')) DEFAULT 'normal',
  assigned_to_employee_id UUID REFERENCES funcionarios(id),
  requested_by_employee_id UUID REFERENCES funcionarios(id),
  preventive_plan_id UUID REFERENCES preventivas(id),
  wash_plan_id UUID,
  work_order_id UUID REFERENCES ordens_servico(id),
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  active BOOLEAN DEFAULT true
);

-- Indices
CREATE INDEX idx_service_appointments_vehicle_scheduled ON service_appointments(vehicle_id, scheduled_at);
CREATE INDEX idx_service_appointments_status ON service_appointments(status, scheduled_at);
CREATE INDEX idx_service_appointments_type ON service_appointments(service_type, scheduled_at);

-- RLS
ALTER TABLE service_appointments ENABLE ROW LEVEL SECURITY;
-- Policies similares as outras tabelas de oficina
```

### Frontend

**Arquivos novos:**
- `src/pages/Agenda.tsx` - Lista de agendamentos com filtros
- `src/hooks/useServiceAppointments.ts` - Hook para CRUD

**Componentes:**
- Tabela com colunas: Veiculo, Tipo, Data/Hora, Status, Prioridade, Responsavel, Acoes
- Filtros: Por tipo, status, veiculo, periodo
- Dialog para criar/editar agendamento
- Badges coloridos para status
- Acao de reagendar (altera data + status para "reagendada")
- Acao de concluir (muda status para "concluida")

**Rota:** `/oficina/agenda`

**Menu:** Atualizar `OficinaLayout.tsx` para adicionar "Agenda" antes de "Ordens de Servico"

### Entregaveis
1. Tabela `service_appointments` com RLS
2. Pagina `/oficina/agenda` funcional
3. CRUD de agendamentos
4. Filtros por status/tipo/veiculo/data

---

## Fase 2 - Lava-rapido (Rotinas + Fila)

### Objetivo
Operacionalizar lavagens recorrentes com planos por veiculo e fila do dia.

### Banco de Dados

**Nova tabela: `wash_plans`**

```sql
CREATE TABLE wash_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID NOT NULL REFERENCES veiculos(id),
  wash_type TEXT NOT NULL CHECK (wash_type IN ('simples', 'completa', 'interna', 'motor', 'higienizacao')) DEFAULT 'simples',
  frequency_days INT,
  preferred_weekday INT CHECK (preferred_weekday >= 0 AND preferred_weekday <= 6),
  estimated_minutes INT,
  notes TEXT,
  status TEXT CHECK (status IN ('ativo', 'pausado', 'cancelado')) DEFAULT 'ativo',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  active BOOLEAN DEFAULT true
);

-- Indices
CREATE INDEX idx_wash_plans_vehicle ON wash_plans(vehicle_id);
CREATE INDEX idx_wash_plans_status ON wash_plans(status);

-- RLS similar
```

### Frontend

**Arquivos novos:**
- `src/pages/Lavagens.tsx` - Pagina principal com abas
- `src/hooks/useWashPlans.ts` - Hook para planos de lavagem

**Componentes:**
- Aba "Planos": Lista de wash_plans por veiculo
- Aba "Fila do Dia": service_appointments do tipo lavagem agendados para hoje
- Acao "Gerar Agendamento" a partir de um plano
- Acao "Concluir Lavagem" na fila

**Rota:** `/oficina/lavagem` (ja existe no menu, falta a pagina)

### Entregaveis
1. Tabela `wash_plans` com RLS
2. Pagina `/oficina/lavagem` com abas Planos e Fila
3. CRUD de planos de lavagem
4. Geracao de agendamento a partir do plano

---

## Fase 3 - KM (Manual + WhatsApp Basico)

### Objetivo
Registrar KM com historico e preparar infraestrutura WhatsApp.

### Banco de Dados

**Nova tabela: `vehicle_odometer_reports`**

```sql
CREATE TABLE vehicle_odometer_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID NOT NULL REFERENCES veiculos(id),
  employee_id UUID NOT NULL REFERENCES funcionarios(id),
  reported_km INT NOT NULL,
  reported_at TIMESTAMPTZ DEFAULT now(),
  source TEXT NOT NULL CHECK (source IN ('whatsapp', 'manual')) DEFAULT 'manual',
  raw_message TEXT,
  validation_status TEXT CHECK (validation_status IN ('ok', 'suspeito', 'rejeitado')) DEFAULT 'ok',
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indices
CREATE INDEX idx_odometer_vehicle_reported ON vehicle_odometer_reports(vehicle_id, reported_at DESC);

-- RLS similar
```

**Ajustes em `veiculos`:**

```sql
ALTER TABLE veiculos ADD COLUMN IF NOT EXISTS last_km_report_at TIMESTAMPTZ;
ALTER TABLE veiculos ADD COLUMN IF NOT EXISTS last_km_report_by_employee_id UUID REFERENCES funcionarios(id);
```

### Frontend

**Arquivos novos:**
- `src/pages/KmColetas.tsx` - Painel de coletas de KM
- `src/hooks/useOdometerReports.ts` - Hook para leituras

**Componentes:**
- Lista de leituras com filtros (periodo, veiculo, motorista)
- Dialog para lancar KM manualmente
- Badge de status de validacao (ok, suspeito, rejeitado)
- Componente de "Ultimas Leituras" para detalhe do veiculo

**Rota:** `/oficina/km`

### Edge Function (preparacao)

**`supabase/functions/whatsapp-webhook/index.ts`**
- Estrutura basica para receber webhooks
- Parse de mensagem KM
- Validacao e gravacao em `vehicle_odometer_reports`
- Atualizacao de `veiculos.km_atual`
- (Conexao com provedor WhatsApp sera Fase 4)

### Entregaveis
1. Tabela `vehicle_odometer_reports` com RLS
2. Colunas extras em `veiculos`
3. Pagina `/oficina/km` funcional
4. Lancamento manual de KM com atualizacao do veiculo
5. Edge Function `whatsapp-webhook` estruturada

---

## Fase 4 - WhatsApp Completo + Alertas Proativos

### Objetivo
Automacao real: oficina solicita KM, motorista responde, sistema alerta.

### Banco de Dados

**Nova tabela: `notification_jobs`**

```sql
CREATE TABLE notification_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel TEXT NOT NULL CHECK (channel IN ('whatsapp', 'email')),
  to_phone TEXT,
  to_email TEXT,
  template TEXT NOT NULL,
  payload JSONB,
  status TEXT CHECK (status IN ('pendente', 'enviado', 'erro')) DEFAULT 'pendente',
  tries INT DEFAULT 0,
  last_error TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  sent_at TIMESTAMPTZ
);

-- Indices
CREATE INDEX idx_notification_jobs_status ON notification_jobs(status, created_at);
```

**Ajustes opcionais em `funcionarios`:**

```sql
ALTER TABLE funcionarios ADD COLUMN IF NOT EXISTS whatsapp_opt_in BOOLEAN DEFAULT true;
ALTER TABLE funcionarios ADD COLUMN IF NOT EXISTS whatsapp_phone_e164 TEXT;
```

### Edge Functions

**`supabase/functions/whatsapp-send/index.ts`**
- Consome fila `notification_jobs`
- Envia mensagem via Meta WhatsApp Cloud API (ou provedor)
- Atualiza status do job

**`supabase/functions/workshop-scheduler/index.ts`** (Cron - diario ou 6h)
- Verifica preventivas vencidas/proximas (1000 km antes)
- Verifica lavagens atrasadas
- Gera lembretes de agenda (D-1)
- Enfileira em `notification_jobs`

### Frontend

**Atualizacoes:**
- Botao "Solicitar KM via WhatsApp" no detalhe do veiculo
- Acao "Solicitar KM" na pagina `/oficina/km`
- Painel `/oficina/notificacoes` (opcional) para ver jobs pendentes/erro

### Configuracao

- Secrets para WhatsApp: `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`
- Configuracao na aba Sistema de `/configuracoes` para tokens WhatsApp

### Entregaveis
1. Tabela `notification_jobs` com RLS
2. Colunas opcionais em `funcionarios`
3. Edge Function `whatsapp-send`
4. Edge Function `workshop-scheduler` com cron
5. Botao "Solicitar KM via WhatsApp"
6. Alertas automaticos (1000 km, lavagem atrasada)

---

## Ordem de Execucao Sugerida

```text
Fase 1 (Agenda)
  |
  v
Fase 2 (Lavagem)
  |
  v
Fase 3 (KM Manual + Webhook)
  |
  v
Fase 4 (WhatsApp + Alertas)
```

Cada fase pode ser implantada, testada e validada antes de avancar.

---

## Resumo de Arquivos Novos

### Migrations (4 arquivos)
1. `create_service_appointments.sql`
2. `create_wash_plans.sql`
3. `create_vehicle_odometer_reports.sql`
4. `create_notification_jobs.sql`

### Pages (4 arquivos)
1. `src/pages/Agenda.tsx`
2. `src/pages/Lavagens.tsx`
3. `src/pages/KmColetas.tsx`
4. `src/pages/Notificacoes.tsx` (opcional)

### Hooks (4 arquivos)
1. `src/hooks/useServiceAppointments.ts`
2. `src/hooks/useWashPlans.ts`
3. `src/hooks/useOdometerReports.ts`
4. `src/hooks/useNotificationJobs.ts`

### Edge Functions (3 arquivos)
1. `supabase/functions/whatsapp-webhook/index.ts`
2. `supabase/functions/whatsapp-send/index.ts`
3. `supabase/functions/workshop-scheduler/index.ts`

### Atualizacoes
1. `src/components/OficinaLayout.tsx` - Novo item "Agenda"
2. `src/App.tsx` - Novas rotas
3. `src/pages/Veiculos.tsx` - Botao "Solicitar KM"

---

## Qual fase deseja implementar primeiro?

Recomendo iniciar pela **Fase 1 (Agenda Unificada)** pois e a base para todas as outras funcionalidades.

