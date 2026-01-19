-- Criar tabela de configuração SMTP
CREATE TABLE public.smtp_config (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  host VARCHAR(255) NOT NULL,
  port INTEGER NOT NULL DEFAULT 587,
  secure BOOLEAN DEFAULT false,
  username VARCHAR(255) NOT NULL,
  password_encrypted TEXT NOT NULL,
  from_email VARCHAR(255) NOT NULL,
  from_name VARCHAR(255) DEFAULT 'Sistema de Gestão',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID
);

-- Criar trigger para updated_at
CREATE TRIGGER update_smtp_config_updated_at
  BEFORE UPDATE ON public.smtp_config
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS
ALTER TABLE public.smtp_config ENABLE ROW LEVEL SECURITY;

-- Política: Somente admin pode ver configurações SMTP
CREATE POLICY "Somente admin pode ver config SMTP"
ON public.smtp_config
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
    AND user_roles.is_approved = true
  )
);

-- Política: Somente admin pode gerenciar configurações SMTP
CREATE POLICY "Somente admin pode gerenciar config SMTP"
ON public.smtp_config
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