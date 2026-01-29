-- Fase 3: KM Manual + WhatsApp Básico

-- Tabela para histórico de leituras de hodômetro
CREATE TABLE public.vehicle_odometer_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID NOT NULL REFERENCES veiculos(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES funcionarios(id),
  reported_km INT NOT NULL,
  reported_at TIMESTAMPTZ DEFAULT now(),
  source TEXT NOT NULL CHECK (source IN ('whatsapp', 'manual')) DEFAULT 'manual',
  raw_message TEXT,
  validation_status TEXT CHECK (validation_status IN ('ok', 'suspeito', 'rejeitado')) DEFAULT 'ok',
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_odometer_vehicle_reported ON vehicle_odometer_reports(vehicle_id, reported_at DESC);
CREATE INDEX idx_odometer_employee ON vehicle_odometer_reports(employee_id);
CREATE INDEX idx_odometer_source ON vehicle_odometer_reports(source);

-- Habilitar RLS
ALTER TABLE vehicle_odometer_reports ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Authenticated users can view odometer reports"
  ON vehicle_odometer_reports FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert odometer reports"
  ON vehicle_odometer_reports FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update odometer reports"
  ON vehicle_odometer_reports FOR UPDATE
  TO authenticated
  USING (true);

-- Adicionar colunas em veiculos para rastrear última leitura
ALTER TABLE veiculos ADD COLUMN IF NOT EXISTS last_km_report_at TIMESTAMPTZ;
ALTER TABLE veiculos ADD COLUMN IF NOT EXISTS last_km_report_by_employee_id UUID REFERENCES funcionarios(id);

-- Trigger para atualizar km_atual do veículo quando nova leitura é inserida
CREATE OR REPLACE FUNCTION public.update_vehicle_km_on_report()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Atualiza o km_atual, last_km_report_at e last_km_report_by_employee_id do veículo
  UPDATE veiculos
  SET 
    km_atual = NEW.reported_km,
    last_km_report_at = NEW.reported_at,
    last_km_report_by_employee_id = NEW.employee_id,
    updated_at = now()
  WHERE id = NEW.vehicle_id
    AND (km_atual IS NULL OR km_atual < NEW.reported_km);
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_vehicle_km
AFTER INSERT ON vehicle_odometer_reports
FOR EACH ROW
EXECUTE FUNCTION update_vehicle_km_on_report();