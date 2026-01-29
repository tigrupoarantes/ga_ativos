-- Corrigir função generate_patrimonio com indexação correta
-- Problema: LENGTH >= 12 deveria ser >= 11, SUBSTRING FROM 8 deveria ser FROM 7

CREATE OR REPLACE FUNCTION public.generate_patrimonio(p_tipo_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_prefix VARCHAR(5);
  v_year VARCHAR(2);
  v_next_seq INTEGER;
  v_patrimonio TEXT;
  v_pattern TEXT;
BEGIN
  -- Buscar prefixo do tipo (usa ATI como padrão se não definido)
  SELECT COALESCE(prefix, 'ATI') INTO v_prefix 
  FROM asset_types WHERE id = p_tipo_id;
  
  IF v_prefix IS NULL THEN
    v_prefix := 'ATI';
  END IF;
  
  -- Ano atual (2 dígitos)
  v_year := TO_CHAR(NOW(), 'YY');
  
  -- Padrão para buscar patrimônios do mesmo tipo e ano
  v_pattern := v_prefix || '-' || v_year || '%';
  
  -- Buscar próximo sequencial (CORRIGIDO: LENGTH >= 11 e SUBSTRING FROM 7)
  SELECT COALESCE(MAX(
    CASE 
      WHEN LENGTH(patrimonio) >= 11 
           AND patrimonio ~ ('^' || v_prefix || '-' || v_year || '[0-9]{5}$')
      THEN CAST(SUBSTRING(patrimonio FROM 7 FOR 5) AS INTEGER)
      ELSE 0
    END
  ), 0) + 1 INTO v_next_seq
  FROM assets 
  WHERE patrimonio LIKE v_pattern;
  
  -- Formatar patrimônio: PREFIXO-AAXXXXX (ex: NTB-2600001)
  v_patrimonio := v_prefix || '-' || v_year || LPAD(v_next_seq::TEXT, 5, '0');
  
  RETURN v_patrimonio;
END;
$$;