-- Create table for telephone lines
CREATE TABLE public.linhas_telefonicas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  numero TEXT NOT NULL UNIQUE,
  funcionario_id UUID REFERENCES public.funcionarios(id),
  operadora TEXT,
  plano TEXT,
  observacoes TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.linhas_telefonicas ENABLE ROW LEVEL SECURITY;

-- Policy for viewing lines (authenticated users can view)
CREATE POLICY "Usuarios autenticados podem ver linhas telefonicas"
ON public.linhas_telefonicas
FOR SELECT
TO authenticated
USING (true);

-- Policy for managing lines (admin/staff roles)
CREATE POLICY "Staff pode gerenciar linhas telefonicas"
ON public.linhas_telefonicas
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

-- Trigger for updated_at
CREATE TRIGGER update_linhas_telefonicas_updated_at
BEFORE UPDATE ON public.linhas_telefonicas
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();