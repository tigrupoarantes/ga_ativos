
-- =====================================================
-- FASE 1: Padronização Estrutura Organizacional
-- =====================================================

-- 1.1 Adicionar novos campos na tabela empresas
ALTER TABLE empresas ADD COLUMN IF NOT EXISTS external_id TEXT UNIQUE;
ALTER TABLE empresas ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE empresas ADD COLUMN IF NOT EXISTS color TEXT DEFAULT '#0B3D91';
ALTER TABLE empresas ADD COLUMN IF NOT EXISTS is_auditable BOOLEAN DEFAULT false;

-- Criar índices para empresas
CREATE INDEX IF NOT EXISTS idx_empresas_external_id ON empresas(external_id);
CREATE INDEX IF NOT EXISTS idx_empresas_cnpj ON empresas(cnpj);
CREATE INDEX IF NOT EXISTS idx_empresas_active ON empresas(active);

-- Trigger para normalizar CNPJ automaticamente
CREATE OR REPLACE FUNCTION normalize_cnpj_to_external_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.cnpj IS NOT NULL AND NEW.cnpj != '' THEN
    NEW.external_id := regexp_replace(NEW.cnpj, '[^0-9]', '', 'g');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_empresas_normalize_cnpj ON empresas;
CREATE TRIGGER trg_empresas_normalize_cnpj
  BEFORE INSERT OR UPDATE ON empresas
  FOR EACH ROW
  EXECUTE FUNCTION normalize_cnpj_to_external_id();

-- Atualizar external_id para empresas existentes
UPDATE empresas 
SET external_id = regexp_replace(cnpj, '[^0-9]', '', 'g')
WHERE cnpj IS NOT NULL AND cnpj != '' AND external_id IS NULL;

-- 1.2 Criar tabela areas (substituindo equipes)
CREATE TABLE IF NOT EXISTS areas (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID        REFERENCES empresas(id) ON DELETE CASCADE,
  parent_id       UUID        REFERENCES areas(id) ON DELETE SET NULL,
  name            TEXT        NOT NULL,
  cost_center     TEXT,
  active          BOOLEAN     DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- Índices para areas
CREATE INDEX IF NOT EXISTS idx_areas_company ON areas(company_id);
CREATE INDEX IF NOT EXISTS idx_areas_parent ON areas(parent_id);
CREATE INDEX IF NOT EXISTS idx_areas_cost_center ON areas(cost_center);
CREATE INDEX IF NOT EXISTS idx_areas_active ON areas(active);

-- RLS para areas
ALTER TABLE areas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios autenticados podem ver areas"
  ON areas FOR SELECT USING (true);

CREATE POLICY "Admin pode gerenciar areas"
  ON areas FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = ANY (ARRAY['admin'::text, 'diretor'::text, 'coordenador'::text])
      AND user_roles.is_approved = true
    )
  );

-- Trigger para updated_at em areas
CREATE OR REPLACE FUNCTION update_areas_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_areas_updated_at ON areas;
CREATE TRIGGER trg_areas_updated_at
  BEFORE UPDATE ON areas
  FOR EACH ROW
  EXECUTE FUNCTION update_areas_updated_at();

-- 1.3 Migrar dados de equipes para areas (se existirem)
INSERT INTO areas (id, company_id, name, active, created_at, updated_at)
SELECT id, empresa_id, nome, active, created_at, updated_at
FROM equipes
WHERE NOT EXISTS (SELECT 1 FROM areas WHERE areas.id = equipes.id);

-- 1.4 Adicionar area_id em funcionarios
ALTER TABLE funcionarios ADD COLUMN IF NOT EXISTS area_id UUID REFERENCES areas(id);

-- Migrar equipe_id para area_id
UPDATE funcionarios 
SET area_id = equipe_id 
WHERE equipe_id IS NOT NULL AND area_id IS NULL;
