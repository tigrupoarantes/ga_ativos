-- RLS para tabelas de custos de frota
ALTER TABLE public.lotes_despesa_veiculo ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.despesas_veiculo ENABLE ROW LEVEL SECURITY;

-- Qualquer usuário autenticado pode visualizar
CREATE POLICY "Usuarios autenticados podem ver lotes de despesa"
  ON public.lotes_despesa_veiculo FOR SELECT TO authenticated USING (true);

CREATE POLICY "Usuarios autenticados podem ver despesas de veiculo"
  ON public.despesas_veiculo FOR SELECT TO authenticated USING (true);

-- Apenas admin/diretor/coordenador podem escrever
CREATE POLICY "Admin pode gerenciar lotes de despesa"
  ON public.lotes_despesa_veiculo FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
        AND role IN ('admin', 'diretor', 'coordenador')
        AND is_approved = true
    )
  );

CREATE POLICY "Admin pode gerenciar despesas de veiculo"
  ON public.despesas_veiculo FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
        AND role IN ('admin', 'diretor', 'coordenador')
        AND is_approved = true
    )
  );
