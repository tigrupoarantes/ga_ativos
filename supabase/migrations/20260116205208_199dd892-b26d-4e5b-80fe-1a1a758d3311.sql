-- 1. Criar função security definer para verificar se usuário é admin
-- Isso evita recursão infinita nas políticas RLS
CREATE OR REPLACE FUNCTION public.is_current_user_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin' 
    AND is_approved = true
  )
$$;

-- 2. Criar função para obter role do usuário atual
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_roles 
  WHERE user_id = auth.uid() 
  AND is_approved = true
  LIMIT 1
$$;

-- 3. Remover todas as políticas existentes na tabela user_roles
DROP POLICY IF EXISTS "Usuarios podem ver seu proprio role" ON public.user_roles;
DROP POLICY IF EXISTS "Admin pode ver todos os roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admin pode gerenciar roles" ON public.user_roles;
DROP POLICY IF EXISTS "Usuarios podem criar seu proprio role" ON public.user_roles;

-- 4. Recriar políticas sem recursão
-- Usuários podem ver seu próprio role
CREATE POLICY "Usuarios podem ver seu proprio role" ON public.user_roles
FOR SELECT USING (user_id = auth.uid());

-- Admin pode ver todos os roles (usando função security definer)
CREATE POLICY "Admin pode ver todos os roles" ON public.user_roles
FOR SELECT USING (public.is_current_user_admin());

-- Admin pode gerenciar roles (usando função security definer)
CREATE POLICY "Admin pode gerenciar roles" ON public.user_roles
FOR ALL USING (public.is_current_user_admin());

-- Usuários podem criar seu próprio role (para registro)
CREATE POLICY "Usuarios podem criar seu proprio role" ON public.user_roles
FOR INSERT WITH CHECK ((user_id = auth.uid()) AND (role = 'assistente'::text));