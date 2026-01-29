-- Tabela wash_plans - Planos de Lavagem por Veículo
CREATE TABLE public.wash_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID NOT NULL REFERENCES veiculos(id) ON DELETE CASCADE,
  wash_type TEXT NOT NULL DEFAULT 'simples' CHECK (wash_type IN ('simples', 'completa', 'interna', 'motor', 'higienizacao')),
  frequency_days INT,
  preferred_weekday INT CHECK (preferred_weekday >= 0 AND preferred_weekday <= 6),
  estimated_minutes INT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo', 'pausado', 'cancelado')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  active BOOLEAN DEFAULT true
);

-- Índices para performance
CREATE INDEX idx_wash_plans_vehicle ON wash_plans(vehicle_id);
CREATE INDEX idx_wash_plans_status ON wash_plans(status);
CREATE INDEX idx_wash_plans_active ON wash_plans(active) WHERE active = true;

-- Enable RLS
ALTER TABLE wash_plans ENABLE ROW LEVEL SECURITY;

-- Policies - usuários autenticados podem ver
CREATE POLICY "Usuarios autenticados podem ver planos de lavagem"
ON wash_plans FOR SELECT
USING (true);

-- Policies - usuários autenticados podem inserir
CREATE POLICY "Usuarios autenticados podem inserir planos de lavagem"
ON wash_plans FOR INSERT
WITH CHECK (true);

-- Policies - usuários autenticados podem atualizar
CREATE POLICY "Usuarios autenticados podem atualizar planos de lavagem"
ON wash_plans FOR UPDATE
USING (true);

-- Policies - usuários autenticados podem deletar
CREATE POLICY "Usuarios autenticados podem deletar planos de lavagem"
ON wash_plans FOR DELETE
USING (true);

-- Trigger para updated_at
CREATE TRIGGER update_wash_plans_updated_at
  BEFORE UPDATE ON wash_plans
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();