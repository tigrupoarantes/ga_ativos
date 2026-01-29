-- Função atômica para criar ativo com patrimônio único (com retry em caso de colisão)
CREATE OR REPLACE FUNCTION public.create_asset_with_patrimonio(
  p_tipo_id UUID,
  p_nome TEXT,
  p_marca TEXT DEFAULT NULL,
  p_modelo TEXT DEFAULT NULL,
  p_numero_serie TEXT DEFAULT NULL,
  p_imei TEXT DEFAULT NULL,
  p_chip_linha TEXT DEFAULT NULL,
  p_descricao TEXT DEFAULT NULL,
  p_data_aquisicao DATE DEFAULT NULL,
  p_valor_aquisicao NUMERIC DEFAULT NULL,
  p_funcionario_id UUID DEFAULT NULL,
  p_empresa_id UUID DEFAULT NULL,
  p_status TEXT DEFAULT 'disponivel'
)
RETURNS TABLE(id UUID, patrimonio TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_patrimonio TEXT;
  v_asset_id UUID;
  v_attempt INTEGER := 0;
  v_max_attempts INTEGER := 5;
BEGIN
  WHILE v_attempt < v_max_attempts LOOP
    v_attempt := v_attempt + 1;
    
    -- Gerar patrimônio usando função existente
    v_patrimonio := public.generate_patrimonio(p_tipo_id);
    
    BEGIN
      -- Tentar inserir o ativo
      INSERT INTO assets (
        patrimonio, nome, tipo_id, marca, modelo, numero_serie,
        imei, chip_linha, descricao, data_aquisicao, valor_aquisicao,
        funcionario_id, empresa_id, status, active
      ) VALUES (
        v_patrimonio, p_nome, p_tipo_id, p_marca, p_modelo, p_numero_serie,
        p_imei, p_chip_linha, p_descricao, p_data_aquisicao, p_valor_aquisicao,
        p_funcionario_id, p_empresa_id, p_status, true
      )
      RETURNING assets.id INTO v_asset_id;
      
      -- Sucesso - retornar o resultado
      RETURN QUERY SELECT v_asset_id, v_patrimonio;
      RETURN;
      
    EXCEPTION WHEN unique_violation THEN
      -- Colisão no patrimônio - tentar novamente com próximo sequencial
      IF v_attempt < v_max_attempts THEN
        CONTINUE;
      END IF;
    END;
  END LOOP;
  
  -- Excedeu tentativas máximas
  RAISE EXCEPTION 'Não foi possível gerar patrimônio único após % tentativas', v_max_attempts;
END;
$$;