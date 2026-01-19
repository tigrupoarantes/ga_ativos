-- Drop existing policies on empresas table
DROP POLICY IF EXISTS "Admin pode gerenciar empresas" ON public.empresas;
DROP POLICY IF EXISTS "Somente admin pode gerenciar empresas" ON public.empresas;
DROP POLICY IF EXISTS "Authenticated users can view empresas" ON public.empresas;
DROP POLICY IF EXISTS "Usuários autenticados podem ver empresas" ON public.empresas;

-- Enable RLS on empresas table
ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;

-- Create policy for viewing empresas - all authenticated users can view
CREATE POLICY "Usuários autenticados podem ver empresas"
ON public.empresas
FOR SELECT
TO authenticated
USING (true);

-- Create policy for managing (INSERT, UPDATE, DELETE) - only admin
CREATE POLICY "Somente admin pode gerenciar empresas"
ON public.empresas
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
    AND user_roles.is_approved = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
    AND user_roles.is_approved = true
  )
);