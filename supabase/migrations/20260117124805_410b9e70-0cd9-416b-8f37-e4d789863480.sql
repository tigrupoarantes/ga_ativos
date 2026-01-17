-- Create trigger function to log asset assignment changes
CREATE OR REPLACE FUNCTION public.log_asset_assignment_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Only log if funcionario_id actually changed
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
      auth.uid()::text,
      true
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger on assets table
DROP TRIGGER IF EXISTS trigger_log_asset_assignment ON public.assets;
CREATE TRIGGER trigger_log_asset_assignment
  AFTER UPDATE ON public.assets
  FOR EACH ROW
  EXECUTE FUNCTION public.log_asset_assignment_change();