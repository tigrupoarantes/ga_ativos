-- ============================================================
-- Módulo de Depreciação de Ativos — Fase 1
-- ============================================================

-- 1A: Tabela de políticas de depreciação
CREATE TABLE IF NOT EXISTS asset_depreciation_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES empresas(id),
  name TEXT NOT NULL,
  asset_category TEXT NOT NULL,
  asset_subcategory TEXT,
  depreciation_method TEXT NOT NULL DEFAULT 'linear',
  useful_life_months INTEGER NOT NULL,
  residual_percent NUMERIC(5,2) NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID,
  updated_by UUID
);

-- 1B: Novos campos em assets
ALTER TABLE assets ADD COLUMN IF NOT EXISTS depreciation_policy_id UUID REFERENCES asset_depreciation_policies(id);
ALTER TABLE assets ADD COLUMN IF NOT EXISTS depreciation_start_date DATE;
ALTER TABLE assets ADD COLUMN IF NOT EXISTS entry_into_operation_date DATE;
ALTER TABLE assets ADD COLUMN IF NOT EXISTS residual_percent NUMERIC(5,2);
ALTER TABLE assets ADD COLUMN IF NOT EXISTS residual_value NUMERIC(12,2);
ALTER TABLE assets ADD COLUMN IF NOT EXISTS depreciable_value NUMERIC(12,2);
ALTER TABLE assets ADD COLUMN IF NOT EXISTS monthly_depreciation NUMERIC(12,2);
ALTER TABLE assets ADD COLUMN IF NOT EXISTS accumulated_depreciation NUMERIC(12,2);
ALTER TABLE assets ADD COLUMN IF NOT EXISTS depreciation_override BOOLEAN DEFAULT false;
ALTER TABLE assets ADD COLUMN IF NOT EXISTS depreciation_override_reason TEXT;
ALTER TABLE assets ADD COLUMN IF NOT EXISTS depreciation_last_calculated_at TIMESTAMPTZ;
ALTER TABLE assets ADD COLUMN IF NOT EXISTS depreciation_stop_date DATE;
ALTER TABLE assets ADD COLUMN IF NOT EXISTS is_depreciable BOOLEAN DEFAULT true;

-- 1C: Tabela de histórico de depreciação (snapshots)
CREATE TABLE IF NOT EXISTS asset_depreciation_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL REFERENCES assets(id),
  reference_date DATE NOT NULL,
  purchase_value NUMERIC(12,2),
  residual_value NUMERIC(12,2),
  depreciable_value NUMERIC(12,2),
  monthly_depreciation NUMERIC(12,2),
  accumulated_depreciation NUMERIC(12,2),
  book_value NUMERIC(12,2),
  months_elapsed INTEGER,
  policy_id UUID REFERENCES asset_depreciation_policies(id),
  calculated_at TIMESTAMPTZ DEFAULT now(),
  calculated_by UUID,
  calculation_reason TEXT
);

-- 1D: Seed de políticas iniciais
INSERT INTO asset_depreciation_policies (name, asset_category, asset_subcategory, depreciation_method, useful_life_months, residual_percent) VALUES
  ('Veículo Passeio', 'Veículo', 'Passeio', 'linear', 60, 10),
  ('Veículo Carga', 'Veículo', 'Carga', 'linear', 48, 10),
  ('Notebook', 'TI', 'Notebook', 'linear', 60, 5),
  ('Desktop', 'TI', 'Desktop', 'linear', 60, 5),
  ('Monitor', 'TI', 'Monitor', 'linear', 60, 0),
  ('Impressora', 'TI', 'Impressora', 'linear', 60, 0),
  ('Celular', 'TI', 'Celular', 'linear', 36, 10),
  ('Tablet', 'TI', 'Tablet', 'linear', 36, 10),
  ('Coletor', 'TI', 'Coletor', 'linear', 36, 10),
  ('Periférico', 'TI', 'Periférico', 'linear', 24, 0);

-- 1E: RPC para calcular depreciação de um ativo
CREATE OR REPLACE FUNCTION calculate_asset_depreciation(p_asset_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_asset RECORD;
  v_policy RECORD;
  v_start_date DATE;
  v_stop_date DATE;
  v_months INTEGER;
  v_residual_pct NUMERIC(5,2);
  v_useful_life INTEGER;
  v_residual_value NUMERIC(12,2);
  v_depreciable NUMERIC(12,2);
  v_monthly NUMERIC(12,2);
  v_accumulated NUMERIC(12,2);
  v_book_value NUMERIC(12,2);
BEGIN
  SELECT * INTO v_asset FROM assets WHERE id = p_asset_id AND active = true;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Ativo não encontrado');
  END IF;

  IF v_asset.valor_aquisicao IS NULL OR v_asset.valor_aquisicao <= 0 THEN
    UPDATE assets SET is_depreciable = false WHERE id = p_asset_id;
    RETURN jsonb_build_object('status', 'not_depreciable', 'reason', 'Sem valor de aquisição');
  END IF;

  -- Determinar parâmetros: override > política > asset_type > fallback
  IF v_asset.depreciation_override AND v_asset.residual_percent IS NOT NULL THEN
    v_residual_pct := v_asset.residual_percent;
    v_useful_life := COALESCE(
      (SELECT useful_life_months FROM asset_types WHERE id = v_asset.tipo_id),
      60
    );
  ELSIF v_asset.depreciation_policy_id IS NOT NULL THEN
    SELECT * INTO v_policy FROM asset_depreciation_policies
      WHERE id = v_asset.depreciation_policy_id AND is_active = true;
    IF FOUND THEN
      v_residual_pct := v_policy.residual_percent;
      v_useful_life := v_policy.useful_life_months;
    END IF;
  END IF;

  IF v_useful_life IS NULL THEN
    SELECT depreciation_rate, useful_life_months
      INTO v_residual_pct, v_useful_life
      FROM asset_types WHERE id = v_asset.tipo_id;
    v_useful_life := COALESCE(v_useful_life, 60);
    v_residual_pct := COALESCE(v_residual_pct, 0);
  END IF;

  IF v_useful_life <= 0 THEN
    RETURN jsonb_build_object('error', 'Vida útil inválida');
  END IF;
  IF v_residual_pct < 0 OR v_residual_pct > 100 THEN
    RETURN jsonb_build_object('error', 'Percentual residual inválido');
  END IF;

  v_start_date := COALESCE(
    v_asset.depreciation_start_date,
    v_asset.entry_into_operation_date,
    v_asset.data_aquisicao
  );
  IF v_start_date IS NULL THEN
    UPDATE assets SET is_depreciable = false WHERE id = p_asset_id;
    RETURN jsonb_build_object('status', 'not_depreciable', 'reason', 'Sem data de início');
  END IF;

  v_stop_date := COALESCE(
    v_asset.depreciation_stop_date,
    CASE WHEN v_asset.status = 'baixado' THEN CURRENT_DATE ELSE NULL END
  );

  v_months := GREATEST(0,
    (EXTRACT(YEAR FROM AGE(COALESCE(v_stop_date, CURRENT_DATE), v_start_date)) * 12 +
     EXTRACT(MONTH FROM AGE(COALESCE(v_stop_date, CURRENT_DATE), v_start_date)))::INTEGER
  );

  v_residual_value := ROUND(v_asset.valor_aquisicao * (v_residual_pct / 100), 2);
  v_depreciable := v_asset.valor_aquisicao - v_residual_value;
  v_monthly := ROUND(v_depreciable / v_useful_life, 2);
  v_accumulated := LEAST(v_monthly * v_months, v_depreciable);
  v_book_value := GREATEST(v_asset.valor_aquisicao - v_accumulated, v_residual_value);

  UPDATE assets SET
    residual_percent = v_residual_pct,
    residual_value = v_residual_value,
    depreciable_value = v_depreciable,
    monthly_depreciation = v_monthly,
    accumulated_depreciation = v_accumulated,
    valor_atual = v_book_value,
    is_depreciable = true,
    depreciation_last_calculated_at = now()
  WHERE id = p_asset_id;

  INSERT INTO asset_depreciation_history
    (asset_id, reference_date, purchase_value, residual_value, depreciable_value,
     monthly_depreciation, accumulated_depreciation, book_value, months_elapsed,
     policy_id, calculation_reason)
  VALUES
    (p_asset_id, CURRENT_DATE, v_asset.valor_aquisicao, v_residual_value, v_depreciable,
     v_monthly, v_accumulated, v_book_value, v_months,
     v_asset.depreciation_policy_id, 'Cálculo automático');

  RETURN jsonb_build_object(
    'status', 'ok',
    'asset_id', p_asset_id,
    'purchase_value', v_asset.valor_aquisicao,
    'residual_percent', v_residual_pct,
    'residual_value', v_residual_value,
    'depreciable_value', v_depreciable,
    'monthly_depreciation', v_monthly,
    'months_elapsed', v_months,
    'accumulated_depreciation', v_accumulated,
    'book_value', v_book_value,
    'useful_life_months', v_useful_life,
    'start_date', v_start_date
  );
END;
$$;

-- 1F: RPC para recalcular todos os ativos depreciáveis
CREATE OR REPLACE FUNCTION recalculate_all_depreciation()
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_asset RECORD;
  v_count INTEGER := 0;
  v_errors INTEGER := 0;
  v_result JSONB;
BEGIN
  FOR v_asset IN
    SELECT id FROM assets
    WHERE active = true
      AND valor_aquisicao IS NOT NULL
      AND valor_aquisicao > 0
      AND status != 'baixado'
  LOOP
    v_result := calculate_asset_depreciation(v_asset.id);
    IF v_result->>'status' = 'ok' THEN
      v_count := v_count + 1;
    ELSE
      v_errors := v_errors + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object('calculated', v_count, 'errors', v_errors);
END;
$$;
