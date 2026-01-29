

# Plano: Corrigir Tipo de Dados na Função de Trigger

## Problema Identificado

A função `log_asset_assignment_change` está inserindo `auth.uid()::text` na coluna `usuario_operacao`, mas essa coluna é do tipo **UUID**. O PostgreSQL não aceita texto onde espera UUID.

## Código Atual (Errado)

```sql
INSERT INTO public.atribuicoes (
  ...
  usuario_operacao,
  ...
) VALUES (
  ...
  auth.uid()::text,  -- ERRO: converte UUID para TEXT
  ...
);
```

## Código Corrigido

```sql
INSERT INTO public.atribuicoes (
  ...
  usuario_operacao,
  ...
) VALUES (
  ...
  auth.uid(),  -- CORRETO: mantém como UUID
  ...
);
```

## Solução

Criar migração SQL para corrigir a função `log_asset_assignment_change`:

```sql
CREATE OR REPLACE FUNCTION public.log_asset_assignment_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF (OLD.funcionario_id IS DISTINCT FROM NEW.funcionario_id) THEN
    INSERT INTO public.atribuicoes (
      ativo_id,
      funcionario_id,
      data_atribuicao,
      status,
      observacoes,
      usuario_operacao,
      active
    ) VALUES (
      NEW.id,
      NEW.funcionario_id,
      NOW(),
      CASE 
        WHEN NEW.funcionario_id IS NULL THEN 'devolvido'
        WHEN OLD.funcionario_id IS NULL THEN 'atribuido'
        ELSE 'transferido'
      END,
      CASE 
        WHEN NEW.funcionario_id IS NULL THEN 'Ativo devolvido ao estoque'
        WHEN OLD.funcionario_id IS NULL THEN 'Ativo atribuído a funcionário'
        ELSE 'Ativo transferido entre funcionários'
      END,
      auth.uid(),  -- Removido ::text
      true
    );
  END IF;
  
  RETURN NEW;
END;
$function$;
```

## Mudança

| Tipo | Descrição |
|------|-----------|
| Migração SQL | Remover `::text` do `auth.uid()` na função de trigger |

## Resultado Esperado

1. Atribuição de funcionários a ativos funciona sem erro
2. Histórico de atribuições é registrado corretamente na tabela `atribuicoes`

