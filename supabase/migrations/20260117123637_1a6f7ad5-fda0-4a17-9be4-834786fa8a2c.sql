-- Adicionar coluna prefix na tabela asset_types
ALTER TABLE public.asset_types ADD COLUMN IF NOT EXISTS prefix VARCHAR(5);

-- Criar índice único para prefixo
CREATE UNIQUE INDEX IF NOT EXISTS idx_asset_types_prefix ON public.asset_types(prefix) WHERE prefix IS NOT NULL AND active = true;

-- Atualizar tipos existentes com prefixos padrão
UPDATE public.asset_types SET prefix = 'NTB' WHERE LOWER(name) LIKE '%notebook%' AND prefix IS NULL;
UPDATE public.asset_types SET prefix = 'CEL' WHERE LOWER(name) LIKE '%celular%' AND prefix IS NULL;
UPDATE public.asset_types SET prefix = 'IMP' WHERE LOWER(name) LIKE '%impressora%' AND prefix IS NULL;
UPDATE public.asset_types SET prefix = 'MON' WHERE LOWER(name) LIKE '%monitor%' AND prefix IS NULL;
UPDATE public.asset_types SET prefix = 'TEC' WHERE LOWER(name) LIKE '%teclado%' AND prefix IS NULL;
UPDATE public.asset_types SET prefix = 'MOU' WHERE LOWER(name) LIKE '%mouse%' AND prefix IS NULL;

-- Criar função para gerar número de patrimônio
CREATE OR REPLACE FUNCTION public.generate_patrimonio(p_tipo_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
  
  -- Se não encontrou o tipo, usa ATI
  IF v_prefix IS NULL THEN
    v_prefix := 'ATI';
  END IF;
  
  -- Ano atual (2 dígitos)
  v_year := TO_CHAR(NOW(), 'YY');
  
  -- Padrão para buscar patrimônios do mesmo tipo e ano
  v_pattern := v_prefix || '-' || v_year || '%';
  
  -- Buscar próximo sequencial
  SELECT COALESCE(MAX(
    CASE 
      WHEN LENGTH(patrimonio) >= 12 AND patrimonio ~ ('^' || v_prefix || '-' || v_year || '[0-9]{5}$')
      THEN CAST(SUBSTRING(patrimonio FROM 8 FOR 5) AS INTEGER)
      ELSE 0
    END
  ), 0) + 1 INTO v_next_seq
  FROM assets 
  WHERE patrimonio LIKE v_pattern;
  
  -- Formatar patrimônio: PREFIXO-AAXXXXX (ex: NTB-2500001)
  v_patrimonio := v_prefix || '-' || v_year || LPAD(v_next_seq::TEXT, 5, '0');
  
  RETURN v_patrimonio;
END;
$$;