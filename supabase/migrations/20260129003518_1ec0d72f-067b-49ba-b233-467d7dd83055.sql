-- Create notification_jobs table for queuing WhatsApp/Email messages
CREATE TABLE public.notification_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel TEXT NOT NULL CHECK (channel IN ('whatsapp', 'email')),
  to_phone TEXT,
  to_email TEXT,
  template TEXT NOT NULL,
  payload JSONB,
  status TEXT CHECK (status IN ('pendente', 'enviado', 'erro')) DEFAULT 'pendente',
  tries INT DEFAULT 0,
  last_error TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  sent_at TIMESTAMPTZ
);

-- Indices for efficient queue processing
CREATE INDEX idx_notification_jobs_status ON notification_jobs(status, created_at);
CREATE INDEX idx_notification_jobs_channel ON notification_jobs(channel, status);

-- Enable RLS
ALTER TABLE notification_jobs ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Usuarios autenticados podem ver jobs de notificacao"
  ON notification_jobs FOR SELECT
  USING (true);

CREATE POLICY "Sistema pode inserir jobs de notificacao"
  ON notification_jobs FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Sistema pode atualizar jobs de notificacao"
  ON notification_jobs FOR UPDATE
  USING (true);

-- Add WhatsApp columns to funcionarios
ALTER TABLE funcionarios 
ADD COLUMN IF NOT EXISTS whatsapp_opt_in BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS whatsapp_phone_e164 TEXT;

-- Comment for documentation
COMMENT ON TABLE notification_jobs IS 'Fila de notificações para envio via WhatsApp ou Email';
COMMENT ON COLUMN funcionarios.whatsapp_phone_e164 IS 'Telefone WhatsApp no formato E.164 (+5511999999999)';