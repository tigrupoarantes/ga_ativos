-- Tabela service_appointments - Agenda Unificada da Oficina
CREATE TABLE service_appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID NOT NULL REFERENCES veiculos(id) ON DELETE CASCADE,
  service_type TEXT NOT NULL,
  origin TEXT NOT NULL DEFAULT 'manual',
  scheduled_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'agendada',
  priority TEXT DEFAULT 'normal',
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

-- Índices para performance
CREATE INDEX idx_service_appointments_vehicle_scheduled ON service_appointments(vehicle_id, scheduled_at);
CREATE INDEX idx_service_appointments_status ON service_appointments(status, scheduled_at);
CREATE INDEX idx_service_appointments_type ON service_appointments(service_type, scheduled_at);
CREATE INDEX idx_service_appointments_active ON service_appointments(active) WHERE active = true;

-- Trigger para updated_at
CREATE TRIGGER update_service_appointments_updated_at
  BEFORE UPDATE ON service_appointments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Habilitar RLS
ALTER TABLE service_appointments ENABLE ROW LEVEL SECURITY;

-- Políticas RLS (padrão oficina - usuários autenticados podem CRUD)
CREATE POLICY "Usuarios autenticados podem ver agendamentos"
  ON service_appointments FOR SELECT
  USING (true);

CREATE POLICY "Usuarios autenticados podem inserir agendamentos"
  ON service_appointments FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Usuarios autenticados podem atualizar agendamentos"
  ON service_appointments FOR UPDATE
  USING (true);

CREATE POLICY "Usuarios autenticados podem deletar agendamentos"
  ON service_appointments FOR DELETE
  USING (true);