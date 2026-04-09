-- ============================================================
-- Depreciação de Veículos
-- ============================================================

-- Campos de depreciação em veiculos (mesmo padrão de assets)
ALTER TABLE veiculos ADD COLUMN IF NOT EXISTS depreciation_policy_id UUID REFERENCES asset_depreciation_policies(id);
ALTER TABLE veiculos ADD COLUMN IF NOT EXISTS depreciation_start_date DATE;
ALTER TABLE veiculos ADD COLUMN IF NOT EXISTS residual_percent NUMERIC(5,2);
ALTER TABLE veiculos ADD COLUMN IF NOT EXISTS residual_value NUMERIC(12,2);
ALTER TABLE veiculos ADD COLUMN IF NOT EXISTS depreciable_value NUMERIC(12,2);
ALTER TABLE veiculos ADD COLUMN IF NOT EXISTS monthly_depreciation NUMERIC(12,2);
ALTER TABLE veiculos ADD COLUMN IF NOT EXISTS accumulated_depreciation NUMERIC(12,2);
ALTER TABLE veiculos ADD COLUMN IF NOT EXISTS valor_contabil NUMERIC(12,2);
ALTER TABLE veiculos ADD COLUMN IF NOT EXISTS depreciation_override BOOLEAN DEFAULT false;
ALTER TABLE veiculos ADD COLUMN IF NOT EXISTS depreciation_override_reason TEXT;
ALTER TABLE veiculos ADD COLUMN IF NOT EXISTS depreciation_last_calculated_at TIMESTAMPTZ;
ALTER TABLE veiculos ADD COLUMN IF NOT EXISTS depreciation_stop_date DATE;
ALTER TABLE veiculos ADD COLUMN IF NOT EXISTS is_depreciable BOOLEAN DEFAULT true;

-- Histórico de depreciação para veículos
CREATE TABLE IF NOT EXISTS vehicle_depreciation_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID NOT NULL REFERENCES veiculos(id),
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

-- RPC para calcular depreciação de um veículo
CREATE OR REPLACE FUNCTION calculate_vehicle_depreciation(p_vehicle_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_veiculo RECORD;
  v_policy RECORD;
  v_tipo RECORD;
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
  SELECT * INTO v_veiculo FROM veiculos WHERE id = p_vehicle_id AND active = true;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Veículo não encontrado');
  END IF;

  IF v_veiculo.valor_aquisicao IS NULL OR v_veiculo.valor_aquisicao <= 0 THEN
    UPDATE veiculos SET is_depreciable = false WHERE id = p_vehicle_id;
    RETURN jsonb_build_object('status', 'not_depreciable', 'reason', 'Sem valor de aquisição');
  END IF;

  -- Override do veículo
  IF v_veiculo.depreciation_override AND v_veiculo.residual_percent IS NOT NULL THEN
    v_residual_pct := v_veiculo.residual_percent;
    -- Buscar vida útil do tipo de veículo
    SELECT vida_util_anos INTO v_useful_life FROM tipos_veiculos WHERE nome = v_veiculo.tipo;
    v_useful_life := COALESCE(v_useful_life * 12, 60);
  -- Política vinculada
  ELSIF v_veiculo.depreciation_policy_id IS NOT NULL THEN
    SELECT * INTO v_policy FROM asset_depreciation_policies
      WHERE id = v_veiculo.depreciation_policy_id AND is_active = true;
    IF FOUND THEN
      v_residual_pct := v_policy.residual_percent;
      v_useful_life := v_policy.useful_life_months;
    END IF;
  END IF;

  -- Fallback: tipos_veiculos → política por categoria → padrão
  IF v_useful_life IS NULL THEN
    SELECT vida_util_anos, taxa_anual_depreciacao INTO v_tipo
      FROM tipos_veiculos WHERE nome = v_veiculo.tipo;
    IF v_tipo IS NOT NULL AND v_tipo.vida_util_anos IS NOT NULL THEN
      v_useful_life := v_tipo.vida_util_anos * 12;
      v_residual_pct := COALESCE(v_residual_pct, 10);
    ELSE
      -- Fallback: política "Veículo Passeio" ou padrão 60 meses / 10%
      SELECT useful_life_months, residual_percent INTO v_useful_life, v_residual_pct
        FROM asset_depreciation_policies
        WHERE asset_category = 'Veículo' AND is_active = true
        ORDER BY CASE WHEN asset_subcategory = 'Passeio' THEN 0 ELSE 1 END
        LIMIT 1;
      v_useful_life := COALESCE(v_useful_life, 60);
      v_residual_pct := COALESCE(v_residual_pct, 10);
    END IF;
  END IF;

  IF v_useful_life <= 0 THEN
    RETURN jsonb_build_object('error', 'Vida útil inválida');
  END IF;

  -- Data de início: depreciation_start_date > data_aquisicao
  v_start_date := COALESCE(v_veiculo.depreciation_start_date, v_veiculo.data_aquisicao);
  IF v_start_date IS NULL THEN
    UPDATE veiculos SET is_depreciable = false WHERE id = p_vehicle_id;
    RETURN jsonb_build_object('status', 'not_depreciable', 'reason', 'Sem data de início');
  END IF;

  v_stop_date := COALESCE(v_veiculo.depreciation_stop_date,
    CASE WHEN v_veiculo.status = 'baixado' THEN CURRENT_DATE ELSE NULL END);

  v_months := GREATEST(0,
    (EXTRACT(YEAR FROM AGE(COALESCE(v_stop_date, CURRENT_DATE), v_start_date)) * 12 +
     EXTRACT(MONTH FROM AGE(COALESCE(v_stop_date, CURRENT_DATE), v_start_date)))::INTEGER
  );

  v_residual_value := ROUND(v_veiculo.valor_aquisicao * (v_residual_pct / 100), 2);
  v_depreciable := v_veiculo.valor_aquisicao - v_residual_value;
  v_monthly := ROUND(v_depreciable / v_useful_life, 2);
  v_accumulated := LEAST(v_monthly * v_months, v_depreciable);
  v_book_value := GREATEST(v_veiculo.valor_aquisicao - v_accumulated, v_residual_value);

  UPDATE veiculos SET
    residual_percent = v_residual_pct,
    residual_value = v_residual_value,
    depreciable_value = v_depreciable,
    monthly_depreciation = v_monthly,
    accumulated_depreciation = v_accumulated,
    valor_contabil = v_book_value,
    is_depreciable = true,
    depreciation_last_calculated_at = now()
  WHERE id = p_vehicle_id;

  INSERT INTO vehicle_depreciation_history
    (vehicle_id, reference_date, purchase_value, residual_value, depreciable_value,
     monthly_depreciation, accumulated_depreciation, book_value, months_elapsed,
     policy_id, calculation_reason)
  VALUES
    (p_vehicle_id, CURRENT_DATE, v_veiculo.valor_aquisicao, v_residual_value, v_depreciable,
     v_monthly, v_accumulated, v_book_value, v_months,
     v_veiculo.depreciation_policy_id, 'Cálculo automático');

  RETURN jsonb_build_object(
    'status', 'ok',
    'vehicle_id', p_vehicle_id,
    'purchase_value', v_veiculo.valor_aquisicao,
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
