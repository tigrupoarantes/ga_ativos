
ALTER TABLE public.contratos
ADD COLUMN empresa_id UUID REFERENCES public.empresas(id);

CREATE INDEX idx_contratos_empresa_id ON public.contratos(empresa_id);
