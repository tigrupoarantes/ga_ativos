
-- Key-value config table for application settings (AI tokens, etc.)
CREATE TABLE public.app_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  description TEXT,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_by TEXT
);

-- Enable RLS
ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;

-- Only authenticated users can read
CREATE POLICY "Authenticated users can read config"
  ON public.app_config FOR SELECT
  USING (auth.role() = 'authenticated');

-- Only admins can insert/update/delete (using user_roles table)
CREATE POLICY "Admins can manage config"
  ON public.app_config FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'diretor')
    )
  );

-- Insert default row for OpenAI key (empty)
INSERT INTO public.app_config (key, value, description)
VALUES ('OPENAI_API_KEY', '', 'Token da API OpenAI para funcionalidades de IA');
