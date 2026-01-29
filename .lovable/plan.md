

# Plano: Corrigir Função generate_patrimonio

## Problema Identificado

A função `generate_patrimonio` está com **erros de indexação** que fazem ela sempre gerar o mesmo patrimônio:

### Formato Real vs Esperado pela Função

```text
Patrimônio: NTB-2600024
Posição:    123 4 56 78901
            ^^^ ^ ^^ ^^^^^
            |   | |  |
            |   | |  +-- Sequencial (posições 7-11)
            |   | +-- Ano (posições 5-6)
            |   +-- Hífen (posição 4)
            +-- Prefixo (posições 1-3)
```

### Erros na Função Atual

| Problema | Código Atual | Código Correto |
|----------|--------------|----------------|
| Verificação de tamanho | `LENGTH(patrimonio) >= 12` | `LENGTH(patrimonio) >= 11` |
| Extração do sequencial | `SUBSTRING(patrimonio FROM 8 FOR 5)` | `SUBSTRING(patrimonio FROM 7 FOR 5)` |

### Por que Falha em 5 Tentativas

1. Função sempre retorna sequencial = 0 (devido ao LENGTH errado)
2. Calcula próximo = 0 + 1 = 1
3. Gera `NTB-2600001` que já existe
4. Tenta novamente, mesmo resultado
5. Após 5 tentativas, desiste com erro

---

## Solução

Criar migração para corrigir a função `generate_patrimonio`:

```sql
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
  
  -- Buscar próximo sequencial (CORRIGIDO)
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
```

---

## Mudanças

| Arquivo | Alteração |
|---------|-----------|
| Nova Migração SQL | Corrigir função `generate_patrimonio` |

---

## Resultado Esperado

1. Função calcula corretamente o próximo sequencial
2. Para NTB com último `NTB-2600024`, gerará `NTB-2600025`
3. Cadastro de ativos funciona normalmente
4. Não haverá mais erros de chave duplicada

