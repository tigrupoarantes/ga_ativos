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
      auth.uid(),
      true
    );
  END IF;
  
  RETURN NEW;
END;
$function$;