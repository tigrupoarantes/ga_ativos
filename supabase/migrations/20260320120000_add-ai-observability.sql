CREATE TABLE public.ai_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'running',
  route TEXT NOT NULL,
  agent_key TEXT NOT NULL DEFAULT 'assistant-hub',
  user_id UUID,
  request_id UUID NOT NULL DEFAULT gen_random_uuid(),
  model TEXT,
  provider TEXT NOT NULL DEFAULT 'openai',
  message_count INTEGER NOT NULL DEFAULT 0,
  has_file BOOLEAN NOT NULL DEFAULT false,
  tool_action TEXT,
  entity_type TEXT,
  entity_id UUID,
  error_code TEXT,
  error_message TEXT,
  metadata JSONB
);

CREATE TABLE public.ai_tool_calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES public.ai_runs(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'requested',
  tool_name TEXT NOT NULL,
  user_id UUID,
  entity_type TEXT,
  entity_id UUID,
  input_summary JSONB,
  result_summary JSONB,
  error_code TEXT,
  error_message TEXT
);

ALTER TABLE public.ai_runs
  ADD CONSTRAINT ai_runs_status_check
  CHECK (status IN ('running', 'completed', 'failed', 'cancelled'));

ALTER TABLE public.ai_tool_calls
  ADD CONSTRAINT ai_tool_calls_status_check
  CHECK (status IN ('requested', 'confirmed', 'executing', 'completed', 'failed', 'denied'));

CREATE INDEX ai_runs_created_at_idx ON public.ai_runs (created_at DESC);
CREATE INDEX ai_runs_user_id_created_at_idx ON public.ai_runs (user_id, created_at DESC);
CREATE INDEX ai_runs_route_created_at_idx ON public.ai_runs (route, created_at DESC);
CREATE INDEX ai_runs_status_idx ON public.ai_runs (status);

CREATE INDEX ai_tool_calls_run_id_idx ON public.ai_tool_calls (run_id);
CREATE INDEX ai_tool_calls_tool_name_created_at_idx ON public.ai_tool_calls (tool_name, created_at DESC);
CREATE INDEX ai_tool_calls_status_idx ON public.ai_tool_calls (status);

ALTER TABLE public.ai_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_tool_calls ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.ai_runs IS 'Telemetria estruturada de execucoes do runtime de IA';
COMMENT ON TABLE public.ai_tool_calls IS 'Telemetria estruturada de tools executadas pelo runtime de IA';
