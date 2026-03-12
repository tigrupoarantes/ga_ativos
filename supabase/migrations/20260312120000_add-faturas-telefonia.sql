-- =====================================================
-- Faturas de Telefonia: Importação e Rateio
-- =====================================================

-- Tabela: cabeçalho da fatura
CREATE TABLE public.faturas_telefonia (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL REFERENCES public.empresas(id),
  operadora TEXT NOT NULL DEFAULT 'Claro',
  numero_fatura TEXT,
  periodo_inicio DATE NOT NULL,
  periodo_fim DATE NOT NULL,
  data_vencimento DATE,
  valor_total NUMERIC(10, 2) NOT NULL,
  custo_compartilhado NUMERIC(10, 2) NOT NULL DEFAULT 0,
  qtd_linhas INT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'importada',
  observacoes TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela: custo agregado por linha da fatura
CREATE TABLE public.fatura_telefonia_linhas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  fatura_id UUID NOT NULL REFERENCES public.faturas_telefonia(id) ON DELETE CASCADE,
  numero_linha TEXT NOT NULL,
  linha_id UUID REFERENCES public.linhas_telefonicas(id),
  valor_mensalidade NUMERIC(10, 2) NOT NULL DEFAULT 0,
  valor_ligacoes NUMERIC(10, 2) NOT NULL DEFAULT 0,
  valor_dados NUMERIC(10, 2) NOT NULL DEFAULT 0,
  valor_servicos NUMERIC(10, 2) NOT NULL DEFAULT 0,
  valor_compartilhado NUMERIC(10, 2) NOT NULL DEFAULT 0,
  valor_total NUMERIC(10, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices
CREATE INDEX idx_fatura_telefonia_linhas_fatura_id ON public.fatura_telefonia_linhas(fatura_id);
CREATE INDEX idx_fatura_telefonia_linhas_linha_id ON public.fatura_telefonia_linhas(linha_id);
CREATE INDEX idx_faturas_telefonia_empresa_id ON public.faturas_telefonia(empresa_id);
CREATE INDEX idx_faturas_telefonia_periodo ON public.faturas_telefonia(periodo_inicio DESC);

-- Trigger updated_at
CREATE TRIGGER update_faturas_telefonia_updated_at
BEFORE UPDATE ON public.faturas_telefonia
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- RLS: faturas_telefonia
ALTER TABLE public.faturas_telefonia ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios autenticados podem ver faturas telefonia"
ON public.faturas_telefonia
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Staff pode gerenciar faturas telefonia"
ON public.faturas_telefonia
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role IN ('admin', 'diretor', 'coordenador')
    AND user_roles.is_approved = true
  )
);

-- RLS: fatura_telefonia_linhas
ALTER TABLE public.fatura_telefonia_linhas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios autenticados podem ver linhas de faturas"
ON public.fatura_telefonia_linhas
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Staff pode gerenciar linhas de faturas"
ON public.fatura_telefonia_linhas
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role IN ('admin', 'diretor', 'coordenador')
    AND user_roles.is_approved = true
  )
);

-- Permissões do módulo
INSERT INTO public.module_permissions (role, module, can_view, can_edit)
SELECT r.role, r.module, r.can_view, r.can_edit
FROM (VALUES
  ('admin',       'faturas_telefonia', true,  true),
  ('diretor',     'faturas_telefonia', true,  true),
  ('coordenador', 'faturas_telefonia', true,  false),
  ('assistente',  'faturas_telefonia', true,  false)
) AS r(role, module, can_view, can_edit)
WHERE NOT EXISTS (
  SELECT 1 FROM public.module_permissions mp
  WHERE mp.role = r.role AND mp.module = r.module
);
