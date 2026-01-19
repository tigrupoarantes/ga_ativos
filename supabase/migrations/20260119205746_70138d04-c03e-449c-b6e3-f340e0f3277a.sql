-- Create table for password reset tokens
CREATE TABLE public.password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  email TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fast token lookup
CREATE INDEX idx_password_reset_tokens_token ON public.password_reset_tokens(token);

-- Index for cleanup of expired tokens
CREATE INDEX idx_password_reset_tokens_expires_at ON public.password_reset_tokens(expires_at);

-- Enable RLS - only service role can access (edge functions)
ALTER TABLE public.password_reset_tokens ENABLE ROW LEVEL SECURITY;

-- No public policies - only service role can access this table