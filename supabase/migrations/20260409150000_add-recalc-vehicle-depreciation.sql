-- RPC para recalcular depreciação de todos os veículos
CREATE OR REPLACE FUNCTION recalculate_all_vehicle_depreciation()
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_veiculo RECORD;
  v_count INTEGER := 0;
  v_errors INTEGER := 0;
  v_result JSONB;
BEGIN
  FOR v_veiculo IN
    SELECT id FROM veiculos
    WHERE active = true
      AND valor_aquisicao IS NOT NULL
      AND valor_aquisicao > 0
      AND status != 'baixado'
  LOOP
    v_result := calculate_vehicle_depreciation(v_veiculo.id);
    IF v_result->>'status' = 'ok' THEN
      v_count := v_count + 1;
    ELSE
      v_errors := v_errors + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object('calculated', v_count, 'errors', v_errors);
END;
$$;
