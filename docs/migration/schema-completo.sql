-- ============================================================
-- SCRIPT DE MIGRAÇÃO COMPLETO - Ambiente Gerenciado para Supabase
-- Gerado em: 2026-02-01
-- ============================================================
-- 
-- INSTRUÇÕES:
-- 1. Execute este script no SQL Editor do seu novo projeto Supabase
-- 2. Execute em ordem (o script já está ordenado por dependências)
-- 3. Após executar, verifique se todas as tabelas foram criadas
--
-- ============================================================

-- ============================================================
-- PARTE 1: SEQUÊNCIAS
-- ============================================================

CREATE SEQUENCE IF NOT EXISTS os_sequence START 1;

-- ============================================================
-- PARTE 2: TABELAS BASE (sem foreign keys)
-- ============================================================

-- Tabela: empresas
CREATE TABLE IF NOT EXISTS public.empresas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  razao_social TEXT,
  cnpj TEXT,
  email TEXT,
  telefone TEXT,
  endereco TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabela: asset_types
CREATE TABLE IF NOT EXISTS public.asset_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  prefix VARCHAR(5),
  form_fields JSONB DEFAULT '[]'::jsonb,
  useful_life_months INTEGER,
  depreciation_rate NUMERIC,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabela: tipos_veiculos
CREATE TABLE IF NOT EXISTS public.tipos_veiculos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome_tipo TEXT NOT NULL,
  descricao TEXT,
  vida_util_anos INTEGER,
  taxa_anual_depreciacao NUMERIC,
  taxa_mensal_depreciacao NUMERIC,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabela: allowed_email_domains
CREATE TABLE IF NOT EXISTS public.allowed_email_domains (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  domain TEXT NOT NULL,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabela: contratos
CREATE TABLE IF NOT EXISTS public.contratos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  numero TEXT NOT NULL,
  tipo TEXT,
  descricao TEXT,
  fornecedor TEXT,
  data_inicio DATE,
  data_fim DATE,
  valor_total NUMERIC,
  valor_mensal NUMERIC,
  status TEXT DEFAULT 'ativo',
  arquivos TEXT[],
  observacoes TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabela: pecas
CREATE TABLE IF NOT EXISTS public.pecas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  codigo TEXT,
  descricao TEXT,
  categoria TEXT,
  fornecedor TEXT,
  unidade TEXT DEFAULT 'UN',
  quantidade_estoque INTEGER NOT NULL DEFAULT 0,
  estoque_minimo INTEGER DEFAULT 5,
  preco_unitario NUMERIC,
  localizacao TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela: user_roles
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'assistente',
  is_approved BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabela: module_permissions
CREATE TABLE IF NOT EXISTS public.module_permissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  role TEXT NOT NULL,
  module TEXT NOT NULL,
  can_view BOOLEAN DEFAULT true,
  can_edit BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabela: smtp_config
CREATE TABLE IF NOT EXISTS public.smtp_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  host VARCHAR NOT NULL,
  port INTEGER NOT NULL DEFAULT 587,
  username VARCHAR NOT NULL,
  password_encrypted TEXT NOT NULL,
  from_email VARCHAR NOT NULL,
  from_name VARCHAR DEFAULT 'Sistema de Gestão',
  secure BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  updated_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabela: password_reset_tokens
CREATE TABLE IF NOT EXISTS public.password_reset_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  email TEXT NOT NULL,
  token TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabela: notification_jobs
CREATE TABLE IF NOT EXISTS public.notification_jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  channel TEXT NOT NULL,
  template TEXT NOT NULL,
  to_email TEXT,
  to_phone TEXT,
  payload JSONB,
  status TEXT DEFAULT 'pendente',
  tries INTEGER DEFAULT 0,
  last_error TEXT,
  sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabela: notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  title TEXT NOT NULL,
  message TEXT,
  type TEXT DEFAULT 'info',
  link TEXT,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabela: activity_history
CREATE TABLE IF NOT EXISTS public.activity_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  action TEXT NOT NULL,
  description TEXT,
  user_id UUID,
  user_email TEXT,
  old_data JSONB,
  new_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabela: audit_log
CREATE TABLE IF NOT EXISTS public.audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  entidade TEXT NOT NULL,
  entidade_id UUID NOT NULL,
  acao TEXT NOT NULL,
  payload JSONB,
  usuario UUID,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ============================================================
-- PARTE 3: TABELAS COM FOREIGN KEYS
-- ============================================================

-- Tabela: equipes
CREATE TABLE IF NOT EXISTS public.equipes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  descricao TEXT,
  empresa_id UUID REFERENCES public.empresas(id),
  lider_id UUID, -- FK será adicionada depois (referencia funcionarios)
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabela: funcionarios
CREATE TABLE IF NOT EXISTS public.funcionarios (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  email TEXT,
  telefone TEXT,
  cpf TEXT,
  cargo TEXT,
  departamento TEXT,
  empresa_id UUID REFERENCES public.empresas(id),
  equipe_id UUID REFERENCES public.equipes(id),
  user_id UUID,
  is_condutor BOOLEAN DEFAULT false,
  cnh_numero TEXT,
  cnh_categoria TEXT,
  cnh_validade DATE,
  whatsapp_opt_in BOOLEAN DEFAULT true,
  whatsapp_phone_e164 TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Adicionar FK de lider_id em equipes
ALTER TABLE public.equipes 
ADD CONSTRAINT fk_equipes_lider 
FOREIGN KEY (lider_id) REFERENCES public.funcionarios(id);

-- Tabela: veiculos
CREATE TABLE IF NOT EXISTS public.veiculos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  placa TEXT NOT NULL,
  marca TEXT NOT NULL,
  modelo TEXT NOT NULL,
  tipo TEXT,
  ano_fabricacao INTEGER,
  ano_modelo INTEGER,
  cor TEXT,
  combustivel TEXT,
  chassi TEXT,
  renavam TEXT,
  km_atual INTEGER DEFAULT 0,
  status TEXT DEFAULT 'disponivel',
  propriedade TEXT DEFAULT 'empresa',
  empresa_id UUID REFERENCES public.empresas(id),
  funcionario_id UUID REFERENCES public.funcionarios(id),
  data_aquisicao DATE,
  valor_aquisicao NUMERIC,
  codigo_fipe TEXT,
  valor_fipe NUMERIC,
  data_consulta_fipe TIMESTAMP WITH TIME ZONE,
  ipva_valor NUMERIC,
  ipva_vencimento DATE,
  ipva_situacao TEXT DEFAULT 'nao_pago',
  licenciamento_valor NUMERIC,
  licenciamento_vencimento DATE,
  licenciamento_situacao TEXT DEFAULT 'nao_pago',
  possui_seguro BOOLEAN DEFAULT false,
  seguro_apolice TEXT,
  seguro_valor NUMERIC,
  seguro_vencimento DATE,
  restricao BOOLEAN DEFAULT false,
  restricao_descricao TEXT,
  fotos TEXT[],
  observacoes TEXT,
  last_km_report_at TIMESTAMP WITH TIME ZONE,
  last_km_report_by_employee_id UUID REFERENCES public.funcionarios(id),
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabela: assets
CREATE TABLE IF NOT EXISTS public.assets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patrimonio TEXT NOT NULL UNIQUE,
  nome TEXT NOT NULL,
  descricao TEXT,
  tipo_id UUID REFERENCES public.asset_types(id),
  marca TEXT,
  modelo TEXT,
  numero_serie TEXT,
  imei TEXT,
  chip_linha TEXT,
  status TEXT DEFAULT 'disponivel',
  funcionario_id UUID REFERENCES public.funcionarios(id),
  empresa_id UUID REFERENCES public.empresas(id),
  data_aquisicao DATE,
  valor_aquisicao NUMERIC,
  valor_atual NUMERIC,
  detalhes_especificos JSONB,
  fotos TEXT[],
  observacoes TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabela: atribuicoes
CREATE TABLE IF NOT EXISTS public.atribuicoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ativo_id UUID REFERENCES public.assets(id),
  funcionario_id UUID REFERENCES public.funcionarios(id),
  data_atribuicao TIMESTAMP WITH TIME ZONE DEFAULT now(),
  data_devolucao TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'Ativo',
  observacoes TEXT,
  usuario_operacao UUID,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabela: linhas_telefonicas
CREATE TABLE IF NOT EXISTS public.linhas_telefonicas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  numero TEXT NOT NULL,
  operadora TEXT,
  plano TEXT,
  funcionario_id UUID REFERENCES public.funcionarios(id),
  observacoes TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela: preventivas
CREATE TABLE IF NOT EXISTS public.preventivas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  veiculo_id UUID REFERENCES public.veiculos(id),
  tipo_manutencao TEXT NOT NULL,
  descricao TEXT,
  periodicidade_km INTEGER,
  periodicidade_dias INTEGER,
  ultima_realizacao DATE,
  ultimo_km INTEGER,
  proxima_realizacao DATE,
  proximo_km INTEGER,
  status TEXT DEFAULT 'pendente',
  observacoes TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela: ordens_servico
CREATE TABLE IF NOT EXISTS public.ordens_servico (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  numero TEXT,
  veiculo_id UUID REFERENCES public.veiculos(id),
  preventiva_id UUID REFERENCES public.preventivas(id),
  tipo TEXT NOT NULL DEFAULT 'corretiva',
  status TEXT NOT NULL DEFAULT 'aberta',
  prioridade TEXT DEFAULT 'normal',
  descricao TEXT,
  diagnostico TEXT,
  solucao TEXT,
  km_entrada INTEGER,
  km_saida INTEGER,
  solicitante_id UUID REFERENCES public.funcionarios(id),
  responsavel_id UUID REFERENCES public.funcionarios(id),
  data_abertura TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  data_previsao TIMESTAMP WITH TIME ZONE,
  data_fechamento TIMESTAMP WITH TIME ZONE,
  custo_pecas NUMERIC DEFAULT 0,
  custo_mao_obra NUMERIC DEFAULT 0,
  custo_total NUMERIC DEFAULT 0,
  observacoes TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela: itens_ordem
CREATE TABLE IF NOT EXISTS public.itens_ordem (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ordem_id UUID NOT NULL REFERENCES public.ordens_servico(id),
  peca_id UUID REFERENCES public.pecas(id),
  descricao TEXT,
  quantidade INTEGER NOT NULL DEFAULT 1,
  preco_unitario NUMERIC,
  preco_total NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela: movimentacoes_estoque
CREATE TABLE IF NOT EXISTS public.movimentacoes_estoque (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  peca_id UUID NOT NULL REFERENCES public.pecas(id),
  ordem_id UUID REFERENCES public.ordens_servico(id),
  tipo TEXT NOT NULL,
  quantidade INTEGER NOT NULL,
  quantidade_anterior INTEGER,
  quantidade_atual INTEGER,
  motivo TEXT,
  usuario_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela: wash_plans
CREATE TABLE IF NOT EXISTS public.wash_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vehicle_id UUID NOT NULL REFERENCES public.veiculos(id),
  wash_type TEXT NOT NULL DEFAULT 'simples',
  frequency_days INTEGER,
  preferred_weekday INTEGER,
  estimated_minutes INTEGER,
  status TEXT NOT NULL DEFAULT 'ativo',
  notes TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabela: service_appointments
CREATE TABLE IF NOT EXISTS public.service_appointments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vehicle_id UUID NOT NULL REFERENCES public.veiculos(id),
  service_type TEXT NOT NULL,
  scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT NOT NULL DEFAULT 'agendada',
  priority TEXT DEFAULT 'normal',
  origin TEXT NOT NULL DEFAULT 'manual',
  notes TEXT,
  assigned_to_employee_id UUID REFERENCES public.funcionarios(id),
  requested_by_employee_id UUID REFERENCES public.funcionarios(id),
  preventive_plan_id UUID REFERENCES public.preventivas(id),
  wash_plan_id UUID REFERENCES public.wash_plans(id),
  work_order_id UUID REFERENCES public.ordens_servico(id),
  created_by UUID,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabela: vehicle_odometer_reports
CREATE TABLE IF NOT EXISTS public.vehicle_odometer_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vehicle_id UUID NOT NULL REFERENCES public.veiculos(id),
  employee_id UUID NOT NULL REFERENCES public.funcionarios(id),
  reported_km INTEGER NOT NULL,
  source TEXT NOT NULL DEFAULT 'manual',
  raw_message TEXT,
  validation_status TEXT DEFAULT 'ok',
  reported_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabela: veiculos_documentos
CREATE TABLE IF NOT EXISTS public.veiculos_documentos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  veiculo_placa TEXT,
  tipo_documento TEXT NOT NULL,
  nome_arquivo TEXT NOT NULL,
  url TEXT NOT NULL,
  tamanho_bytes BIGINT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabela: veiculos_historico_responsavel
CREATE TABLE IF NOT EXISTS public.veiculos_historico_responsavel (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  veiculo_placa TEXT,
  funcionario_anterior_id UUID REFERENCES public.funcionarios(id),
  funcionario_novo_id UUID REFERENCES public.funcionarios(id),
  data_alteracao TIMESTAMP WITH TIME ZONE DEFAULT now(),
  observacoes TEXT,
  usuario_alteracao UUID
);

-- Tabela: veiculos_multas
CREATE TABLE IF NOT EXISTS public.veiculos_multas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  veiculo_placa TEXT,
  data_infracao DATE NOT NULL,
  descricao_infracao TEXT NOT NULL,
  codigo_infracao TEXT,
  local_infracao TEXT,
  valor_multa NUMERIC,
  pontos INTEGER,
  status TEXT DEFAULT 'PENDENTE',
  funcionario_responsavel_id UUID REFERENCES public.funcionarios(id),
  comprovante_url TEXT,
  observacoes TEXT,
  data_lancamento TIMESTAMP WITH TIME ZONE DEFAULT now(),
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ============================================================
-- PARTE 4: HABILITAR RLS EM TODAS AS TABELAS
-- ============================================================

ALTER TABLE public.activity_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.allowed_email_domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.atribuicoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contratos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.funcionarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.itens_ordem ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.linhas_telefonicas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.module_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movimentacoes_estoque ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ordens_servico ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.password_reset_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pecas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.preventivas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.smtp_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tipos_veiculos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_odometer_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.veiculos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.veiculos_documentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.veiculos_historico_responsavel ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.veiculos_multas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wash_plans ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- PARTE 5: DATABASE FUNCTIONS
-- ============================================================

-- Function: is_current_user_admin
CREATE OR REPLACE FUNCTION public.is_current_user_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin' 
    AND is_approved = true
  )
$$;

-- Function: get_current_user_role
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT role FROM public.user_roles 
  WHERE user_id = auth.uid() 
  AND is_approved = true
  LIMIT 1
$$;

-- Function: update_updated_at_column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

-- Function: generate_os_number
CREATE OR REPLACE FUNCTION public.generate_os_number()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
    IF NEW.numero IS NULL OR NEW.numero = '' THEN
        NEW.numero := 'OS-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(NEXTVAL('os_sequence')::TEXT, 4, '0');
    END IF;
    RETURN NEW;
END;
$$;

-- Function: generate_patrimonio
CREATE OR REPLACE FUNCTION public.generate_patrimonio(p_tipo_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_prefix VARCHAR(5);
  v_year VARCHAR(2);
  v_next_seq INTEGER;
  v_patrimonio TEXT;
  v_pattern TEXT;
BEGIN
  SELECT COALESCE(prefix, 'ATI') INTO v_prefix 
  FROM asset_types WHERE id = p_tipo_id;
  
  IF v_prefix IS NULL THEN
    v_prefix := 'ATI';
  END IF;
  
  v_year := TO_CHAR(NOW(), 'YY');
  v_pattern := v_prefix || '-' || v_year || '%';
  
  SELECT COALESCE(MAX(
    CASE 
      WHEN LENGTH(patrimonio) >= 11 
           AND patrimonio ~ ('^' || v_prefix || '-' || v_year || '[0-9]{5}$')
      THEN CAST(SUBSTRING(patrimonio FROM 7 FOR 5) AS INTEGER)
      ELSE 0
    END
  ), 0) + 1 INTO v_next_seq
  FROM assets 
  WHERE patrimonio LIKE v_pattern;
  
  v_patrimonio := v_prefix || '-' || v_year || LPAD(v_next_seq::TEXT, 5, '0');
  
  RETURN v_patrimonio;
END;
$$;

-- Function: create_asset_with_patrimonio
CREATE OR REPLACE FUNCTION public.create_asset_with_patrimonio(
  p_tipo_id uuid,
  p_nome text,
  p_marca text DEFAULT NULL,
  p_modelo text DEFAULT NULL,
  p_numero_serie text DEFAULT NULL,
  p_imei text DEFAULT NULL,
  p_chip_linha text DEFAULT NULL,
  p_descricao text DEFAULT NULL,
  p_data_aquisicao date DEFAULT NULL,
  p_valor_aquisicao numeric DEFAULT NULL,
  p_funcionario_id uuid DEFAULT NULL,
  p_empresa_id uuid DEFAULT NULL,
  p_status text DEFAULT 'disponivel'
)
RETURNS TABLE(id uuid, patrimonio text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_patrimonio TEXT;
  v_asset_id UUID;
  v_attempt INTEGER := 0;
  v_max_attempts INTEGER := 5;
BEGIN
  WHILE v_attempt < v_max_attempts LOOP
    v_attempt := v_attempt + 1;
    v_patrimonio := public.generate_patrimonio(p_tipo_id);
    
    BEGIN
      INSERT INTO assets (
        patrimonio, nome, tipo_id, marca, modelo, numero_serie,
        imei, chip_linha, descricao, data_aquisicao, valor_aquisicao,
        funcionario_id, empresa_id, status, active
      ) VALUES (
        v_patrimonio, p_nome, p_tipo_id, p_marca, p_modelo, p_numero_serie,
        p_imei, p_chip_linha, p_descricao, p_data_aquisicao, p_valor_aquisicao,
        p_funcionario_id, p_empresa_id, p_status, true
      )
      RETURNING assets.id INTO v_asset_id;
      
      RETURN QUERY SELECT v_asset_id, v_patrimonio;
      RETURN;
      
    EXCEPTION WHEN unique_violation THEN
      IF v_attempt < v_max_attempts THEN
        CONTINUE;
      END IF;
    END;
  END LOOP;
  
  RAISE EXCEPTION 'Não foi possível gerar patrimônio único após % tentativas', v_max_attempts;
END;
$$;

-- Function: log_asset_assignment_change
CREATE OR REPLACE FUNCTION public.log_asset_assignment_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF (OLD.funcionario_id IS DISTINCT FROM NEW.funcionario_id) THEN
    INSERT INTO public.atribuicoes (
      ativo_id,
      funcionario_id,
      data_atribuicao,
      status,
      observacoes,
      usuario_operacao,
      active
    ) VALUES (
      NEW.id,
      NEW.funcionario_id,
      NOW(),
      CASE 
        WHEN NEW.funcionario_id IS NULL THEN 'devolvido'
        WHEN OLD.funcionario_id IS NULL THEN 'atribuido'
        ELSE 'transferido'
      END,
      CASE 
        WHEN NEW.funcionario_id IS NULL THEN 'Ativo devolvido ao estoque'
        WHEN OLD.funcionario_id IS NULL THEN 'Ativo atribuído a funcionário'
        ELSE 'Ativo transferido entre funcionários'
      END,
      auth.uid(),
      true
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Function: handle_new_user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, email, role, is_approved)
  VALUES (NEW.id, NEW.email, 'assistente', false);
  RETURN NEW;
END;
$$;

-- Function: update_vehicle_km_on_report
CREATE OR REPLACE FUNCTION public.update_vehicle_km_on_report()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE veiculos
  SET 
    km_atual = NEW.reported_km,
    last_km_report_at = NEW.reported_at,
    last_km_report_by_employee_id = NEW.employee_id,
    updated_at = now()
  WHERE id = NEW.vehicle_id
    AND (km_atual IS NULL OR km_atual < NEW.reported_km);
  
  RETURN NEW;
END;
$$;

-- Function: get_dashboard_stats
CREATE OR REPLACE FUNCTION public.get_dashboard_stats()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'total_veiculos', (SELECT COUNT(*) FROM veiculos WHERE active = true),
    'total_ativos', (SELECT COUNT(*) FROM assets WHERE active = true),
    'total_funcionarios', (SELECT COUNT(*) FROM funcionarios WHERE active = true),
    'total_contratos', (SELECT COUNT(*) FROM contratos WHERE active = true),
    'veiculos_disponivel', (SELECT COUNT(*) FROM veiculos WHERE active = true AND status = 'disponivel'),
    'veiculos_em_uso', (SELECT COUNT(*) FROM veiculos WHERE active = true AND status = 'em_uso'),
    'veiculos_manutencao', (SELECT COUNT(*) FROM veiculos WHERE active = true AND status = 'manutencao'),
    'veiculos_inativo', (SELECT COUNT(*) FROM veiculos WHERE active = true AND status = 'inativo'),
    'ordens_aberta', (SELECT COUNT(*) FROM ordens_servico WHERE active = true AND status = 'aberta'),
    'ordens_em_andamento', (SELECT COUNT(*) FROM ordens_servico WHERE active = true AND status = 'em_andamento'),
    'ordens_fechada', (SELECT COUNT(*) FROM ordens_servico WHERE active = true AND status = 'fechada'),
    'cnhs_vencidas', (
      SELECT COUNT(*) FROM funcionarios 
      WHERE active = true AND is_condutor = true AND cnh_validade IS NOT NULL AND cnh_validade < CURRENT_DATE
    ),
    'cnhs_vencendo', (
      SELECT COUNT(*) FROM funcionarios 
      WHERE active = true AND is_condutor = true AND cnh_validade IS NOT NULL 
        AND cnh_validade >= CURRENT_DATE AND cnh_validade <= CURRENT_DATE + INTERVAL '30 days'
    ),
    'contratos_vencendo', (
      SELECT COUNT(*) FROM contratos 
      WHERE active = true AND data_fim IS NOT NULL 
        AND data_fim >= CURRENT_DATE AND data_fim <= CURRENT_DATE + INTERVAL '30 days'
    ),
    'preventivas_vencidas', (
      SELECT COUNT(*) FROM preventivas 
      WHERE active = true AND proxima_realizacao IS NOT NULL AND proxima_realizacao < CURRENT_DATE
    ),
    'preventivas_proximas', (
      SELECT COUNT(*) FROM preventivas 
      WHERE active = true AND proxima_realizacao IS NOT NULL 
        AND proxima_realizacao >= CURRENT_DATE AND proxima_realizacao <= CURRENT_DATE + INTERVAL '7 days'
    ),
    'pecas_estoque_baixo', (
      SELECT COUNT(*) FROM pecas 
      WHERE active = true AND estoque_minimo IS NOT NULL AND quantidade_estoque <= estoque_minimo
    )
  ) INTO result;
  
  RETURN result;
END;
$$;

-- Function: get_dashboard_alerts
CREATE OR REPLACE FUNCTION public.get_dashboard_alerts(limit_count integer DEFAULT 10)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'cnhs_vencidas', (
      SELECT json_agg(json_build_object('id', id, 'nome', nome, 'cnh_validade', cnh_validade))
      FROM (
        SELECT id, nome, cnh_validade FROM funcionarios 
        WHERE active = true AND is_condutor = true AND cnh_validade IS NOT NULL AND cnh_validade < CURRENT_DATE
        ORDER BY cnh_validade LIMIT limit_count
      ) sub
    ),
    'cnhs_vencendo', (
      SELECT json_agg(json_build_object('id', id, 'nome', nome, 'cnh_validade', cnh_validade))
      FROM (
        SELECT id, nome, cnh_validade FROM funcionarios 
        WHERE active = true AND is_condutor = true AND cnh_validade IS NOT NULL 
          AND cnh_validade >= CURRENT_DATE AND cnh_validade <= CURRENT_DATE + INTERVAL '30 days'
        ORDER BY cnh_validade LIMIT limit_count
      ) sub
    ),
    'contratos_vencendo', (
      SELECT json_agg(json_build_object('id', id, 'numero', numero, 'data_fim', data_fim))
      FROM (
        SELECT id, numero, data_fim FROM contratos 
        WHERE active = true AND data_fim IS NOT NULL 
          AND data_fim >= CURRENT_DATE AND data_fim <= CURRENT_DATE + INTERVAL '30 days'
        ORDER BY data_fim LIMIT limit_count
      ) sub
    ),
    'preventivas_vencidas', (
      SELECT json_agg(json_build_object('id', p.id, 'tipo_manutencao', p.tipo_manutencao, 'proxima_realizacao', p.proxima_realizacao, 'placa', v.placa))
      FROM (
        SELECT id, tipo_manutencao, proxima_realizacao, veiculo_id FROM preventivas 
        WHERE active = true AND proxima_realizacao IS NOT NULL AND proxima_realizacao < CURRENT_DATE
        ORDER BY proxima_realizacao LIMIT limit_count
      ) p
      LEFT JOIN veiculos v ON v.id = p.veiculo_id
    ),
    'preventivas_proximas', (
      SELECT json_agg(json_build_object('id', p.id, 'tipo_manutencao', p.tipo_manutencao, 'proxima_realizacao', p.proxima_realizacao, 'placa', v.placa))
      FROM (
        SELECT id, tipo_manutencao, proxima_realizacao, veiculo_id FROM preventivas 
        WHERE active = true AND proxima_realizacao IS NOT NULL 
          AND proxima_realizacao >= CURRENT_DATE AND proxima_realizacao <= CURRENT_DATE + INTERVAL '7 days'
        ORDER BY proxima_realizacao LIMIT limit_count
      ) p
      LEFT JOIN veiculos v ON v.id = p.veiculo_id
    ),
    'pecas_estoque_baixo', (
      SELECT json_agg(json_build_object('id', id, 'nome', nome, 'quantidade_estoque', quantidade_estoque, 'unidade', unidade))
      FROM (
        SELECT id, nome, quantidade_estoque, unidade FROM pecas 
        WHERE active = true AND estoque_minimo IS NOT NULL AND quantidade_estoque <= estoque_minimo
        ORDER BY quantidade_estoque LIMIT limit_count
      ) sub
    )
  ) INTO result;
  
  RETURN result;
END;
$$;

-- ============================================================
-- PARTE 6: TRIGGERS
-- ============================================================

-- Trigger: Gerar número de OS automaticamente
CREATE TRIGGER generate_os_number_trigger
BEFORE INSERT ON public.ordens_servico
FOR EACH ROW
EXECUTE FUNCTION public.generate_os_number();

-- Trigger: Atualizar KM do veículo ao reportar odômetro
CREATE TRIGGER update_vehicle_km_on_report_trigger
AFTER INSERT ON public.vehicle_odometer_reports
FOR EACH ROW
EXECUTE FUNCTION public.update_vehicle_km_on_report();

-- Trigger: Log de mudança de atribuição de ativo
CREATE TRIGGER log_asset_assignment_change_trigger
AFTER UPDATE ON public.assets
FOR EACH ROW
EXECUTE FUNCTION public.log_asset_assignment_change();

-- Trigger: Criar user_role para novos usuários
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- PARTE 7: RLS POLICIES
-- ============================================================

-- === activity_history ===
CREATE POLICY "Sistema pode inserir historico" ON public.activity_history
FOR INSERT WITH CHECK (true);

CREATE POLICY "Usuarios autenticados podem ver historico" ON public.activity_history
FOR SELECT USING (true);

-- === allowed_email_domains ===
CREATE POLICY "Admin pode gerenciar dominios" ON public.allowed_email_domains
FOR ALL USING (EXISTS (
  SELECT 1 FROM user_roles
  WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin' AND user_roles.is_approved = true
));

CREATE POLICY "Todos podem ver dominios permitidos" ON public.allowed_email_domains
FOR SELECT USING (true);

-- === asset_types ===
CREATE POLICY "Admin pode gerenciar tipos de ativos" ON public.asset_types
FOR ALL USING (EXISTS (
  SELECT 1 FROM user_roles
  WHERE user_roles.user_id = auth.uid() AND user_roles.role IN ('admin', 'diretor') AND user_roles.is_approved = true
));

CREATE POLICY "Usuarios autenticados podem ver tipos de ativos" ON public.asset_types
FOR SELECT USING (true);

-- === assets ===
CREATE POLICY "Staff pode gerenciar ativos" ON public.assets
FOR ALL USING (EXISTS (
  SELECT 1 FROM user_roles
  WHERE user_roles.user_id = auth.uid() AND user_roles.role IN ('admin', 'diretor', 'coordenador') AND user_roles.is_approved = true
));

CREATE POLICY "Usuarios autenticados podem ver ativos" ON public.assets
FOR SELECT USING (true);

-- === atribuicoes ===
CREATE POLICY "Authenticated users can delete atribuicoes" ON public.atribuicoes
FOR DELETE USING (true);

CREATE POLICY "Authenticated users can insert atribuicoes" ON public.atribuicoes
FOR INSERT WITH CHECK (true);

CREATE POLICY "Authenticated users can update atribuicoes" ON public.atribuicoes
FOR UPDATE USING (true);

CREATE POLICY "Authenticated users can view atribuicoes" ON public.atribuicoes
FOR SELECT USING (true);

-- === audit_log ===
CREATE POLICY "Authenticated users can insert audit_log" ON public.audit_log
FOR INSERT WITH CHECK (true);

CREATE POLICY "Authenticated users can view audit_log" ON public.audit_log
FOR SELECT USING (true);

-- === contratos ===
CREATE POLICY "Staff pode gerenciar contratos" ON public.contratos
FOR ALL USING (EXISTS (
  SELECT 1 FROM user_roles
  WHERE user_roles.user_id = auth.uid() AND user_roles.role IN ('admin', 'diretor', 'coordenador') AND user_roles.is_approved = true
));

CREATE POLICY "Usuarios autenticados podem ver contratos" ON public.contratos
FOR SELECT USING (true);

-- === empresas ===
CREATE POLICY "Somente admin pode gerenciar empresas" ON public.empresas
FOR ALL USING (EXISTS (
  SELECT 1 FROM user_roles
  WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin' AND user_roles.is_approved = true
)) WITH CHECK (EXISTS (
  SELECT 1 FROM user_roles
  WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin' AND user_roles.is_approved = true
));

CREATE POLICY "Usuarios autenticados podem ver empresas" ON public.empresas
FOR SELECT USING (true);

-- === equipes ===
CREATE POLICY "Admin pode gerenciar equipes" ON public.equipes
FOR ALL USING (EXISTS (
  SELECT 1 FROM user_roles
  WHERE user_roles.user_id = auth.uid() AND user_roles.role IN ('admin', 'diretor', 'coordenador') AND user_roles.is_approved = true
));

CREATE POLICY "Usuarios autenticados podem ver equipes" ON public.equipes
FOR SELECT USING (true);

-- === funcionarios ===
CREATE POLICY "Admin pode gerenciar funcionarios" ON public.funcionarios
FOR ALL USING (EXISTS (
  SELECT 1 FROM user_roles
  WHERE user_roles.user_id = auth.uid() AND user_roles.role IN ('admin', 'diretor', 'coordenador') AND user_roles.is_approved = true
));

CREATE POLICY "Usuarios autenticados podem ver funcionarios" ON public.funcionarios
FOR SELECT USING (true);

-- === itens_ordem ===
CREATE POLICY "Usuarios autenticados podem atualizar itens" ON public.itens_ordem
FOR UPDATE USING (true);

CREATE POLICY "Usuarios autenticados podem deletar itens" ON public.itens_ordem
FOR DELETE USING (true);

CREATE POLICY "Usuarios autenticados podem inserir itens" ON public.itens_ordem
FOR INSERT WITH CHECK (true);

CREATE POLICY "Usuarios autenticados podem ver itens" ON public.itens_ordem
FOR SELECT USING (true);

-- === linhas_telefonicas ===
CREATE POLICY "Staff pode gerenciar linhas telefonicas" ON public.linhas_telefonicas
FOR ALL USING (EXISTS (
  SELECT 1 FROM user_roles
  WHERE user_roles.user_id = auth.uid() AND user_roles.role IN ('admin', 'diretor', 'coordenador') AND user_roles.is_approved = true
));

CREATE POLICY "Usuarios autenticados podem ver linhas telefonicas" ON public.linhas_telefonicas
FOR SELECT USING (true);

-- === module_permissions ===
CREATE POLICY "Admin pode gerenciar permissoes" ON public.module_permissions
FOR ALL USING (EXISTS (
  SELECT 1 FROM user_roles
  WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin' AND user_roles.is_approved = true
));

CREATE POLICY "Usuarios autenticados podem ver permissoes" ON public.module_permissions
FOR SELECT USING (true);

-- === movimentacoes_estoque ===
CREATE POLICY "Usuarios autenticados podem inserir movimentacoes" ON public.movimentacoes_estoque
FOR INSERT WITH CHECK (true);

CREATE POLICY "Usuarios autenticados podem ver movimentacoes" ON public.movimentacoes_estoque
FOR SELECT USING (true);

-- === notification_jobs ===
CREATE POLICY "Sistema pode atualizar jobs de notificacao" ON public.notification_jobs
FOR UPDATE USING (true);

CREATE POLICY "Sistema pode inserir jobs de notificacao" ON public.notification_jobs
FOR INSERT WITH CHECK (true);

CREATE POLICY "Usuarios autenticados podem ver jobs de notificacao" ON public.notification_jobs
FOR SELECT USING (true);

-- === notifications ===
CREATE POLICY "Sistema pode inserir notificacoes" ON public.notifications
FOR INSERT WITH CHECK (true);

CREATE POLICY "Usuarios podem atualizar suas notificacoes" ON public.notifications
FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Usuarios podem ver suas notificacoes" ON public.notifications
FOR SELECT USING (user_id = auth.uid() OR user_id IS NULL);

-- === ordens_servico ===
CREATE POLICY "Usuarios autenticados podem atualizar ordens" ON public.ordens_servico
FOR UPDATE USING (true);

CREATE POLICY "Usuarios autenticados podem deletar ordens" ON public.ordens_servico
FOR DELETE USING (true);

CREATE POLICY "Usuarios autenticados podem inserir ordens" ON public.ordens_servico
FOR INSERT WITH CHECK (true);

CREATE POLICY "Usuarios autenticados podem ver ordens" ON public.ordens_servico
FOR SELECT USING (true);

-- === pecas ===
CREATE POLICY "Usuarios autenticados podem atualizar pecas" ON public.pecas
FOR UPDATE USING (true);

CREATE POLICY "Usuarios autenticados podem deletar pecas" ON public.pecas
FOR DELETE USING (true);

CREATE POLICY "Usuarios autenticados podem inserir pecas" ON public.pecas
FOR INSERT WITH CHECK (true);

CREATE POLICY "Usuarios autenticados podem ver pecas" ON public.pecas
FOR SELECT USING (true);

-- === preventivas ===
CREATE POLICY "Usuarios autenticados podem atualizar preventivas" ON public.preventivas
FOR UPDATE USING (true);

CREATE POLICY "Usuarios autenticados podem deletar preventivas" ON public.preventivas
FOR DELETE USING (true);

CREATE POLICY "Usuarios autenticados podem inserir preventivas" ON public.preventivas
FOR INSERT WITH CHECK (true);

CREATE POLICY "Usuarios autenticados podem ver preventivas" ON public.preventivas
FOR SELECT USING (true);

-- === service_appointments ===
CREATE POLICY "Usuarios autenticados podem atualizar agendamentos" ON public.service_appointments
FOR UPDATE USING (true);

CREATE POLICY "Usuarios autenticados podem deletar agendamentos" ON public.service_appointments
FOR DELETE USING (true);

CREATE POLICY "Usuarios autenticados podem inserir agendamentos" ON public.service_appointments
FOR INSERT WITH CHECK (true);

CREATE POLICY "Usuarios autenticados podem ver agendamentos" ON public.service_appointments
FOR SELECT USING (true);

-- === smtp_config ===
CREATE POLICY "Somente admin pode gerenciar config SMTP" ON public.smtp_config
FOR ALL USING (EXISTS (
  SELECT 1 FROM user_roles
  WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin' AND user_roles.is_approved = true
)) WITH CHECK (EXISTS (
  SELECT 1 FROM user_roles
  WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin' AND user_roles.is_approved = true
));

CREATE POLICY "Somente admin pode ver config SMTP" ON public.smtp_config
FOR SELECT USING (EXISTS (
  SELECT 1 FROM user_roles
  WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin' AND user_roles.is_approved = true
));

-- === tipos_veiculos ===
CREATE POLICY "Authenticated users can delete tipos_veiculos" ON public.tipos_veiculos
FOR DELETE USING (true);

CREATE POLICY "Authenticated users can insert tipos_veiculos" ON public.tipos_veiculos
FOR INSERT WITH CHECK (true);

CREATE POLICY "Authenticated users can update tipos_veiculos" ON public.tipos_veiculos
FOR UPDATE USING (true);

CREATE POLICY "Authenticated users can view tipos_veiculos" ON public.tipos_veiculos
FOR SELECT USING (true);

-- === user_roles ===
CREATE POLICY "Admin pode gerenciar roles" ON public.user_roles
FOR ALL USING (is_current_user_admin());

CREATE POLICY "Admin pode ver todos os roles" ON public.user_roles
FOR SELECT USING (is_current_user_admin());

CREATE POLICY "Usuarios podem criar seu proprio role" ON public.user_roles
FOR INSERT WITH CHECK (user_id = auth.uid() AND role = 'assistente');

CREATE POLICY "Usuarios podem ver seu proprio role" ON public.user_roles
FOR SELECT USING (user_id = auth.uid());

-- === vehicle_odometer_reports ===
CREATE POLICY "Authenticated users can insert odometer reports" ON public.vehicle_odometer_reports
FOR INSERT WITH CHECK (true);

CREATE POLICY "Authenticated users can update odometer reports" ON public.vehicle_odometer_reports
FOR UPDATE USING (true);

CREATE POLICY "Authenticated users can view odometer reports" ON public.vehicle_odometer_reports
FOR SELECT USING (true);

-- === veiculos ===
CREATE POLICY "Staff pode gerenciar veiculos" ON public.veiculos
FOR ALL USING (EXISTS (
  SELECT 1 FROM user_roles
  WHERE user_roles.user_id = auth.uid() AND user_roles.role IN ('admin', 'diretor', 'coordenador') AND user_roles.is_approved = true
));

CREATE POLICY "Usuarios autenticados podem ver veiculos" ON public.veiculos
FOR SELECT USING (true);

-- === veiculos_documentos ===
CREATE POLICY "Authenticated users can delete veiculos_documentos" ON public.veiculos_documentos
FOR DELETE USING (true);

CREATE POLICY "Authenticated users can insert veiculos_documentos" ON public.veiculos_documentos
FOR INSERT WITH CHECK (true);

CREATE POLICY "Authenticated users can update veiculos_documentos" ON public.veiculos_documentos
FOR UPDATE USING (true);

CREATE POLICY "Authenticated users can view veiculos_documentos" ON public.veiculos_documentos
FOR SELECT USING (true);

-- === veiculos_historico_responsavel ===
CREATE POLICY "Authenticated users can insert veiculos_historico_responsavel" ON public.veiculos_historico_responsavel
FOR INSERT WITH CHECK (true);

CREATE POLICY "Authenticated users can view veiculos_historico_responsavel" ON public.veiculos_historico_responsavel
FOR SELECT USING (true);

-- === veiculos_multas ===
CREATE POLICY "Authenticated users can delete veiculos_multas" ON public.veiculos_multas
FOR DELETE USING (true);

CREATE POLICY "Authenticated users can insert veiculos_multas" ON public.veiculos_multas
FOR INSERT WITH CHECK (true);

CREATE POLICY "Authenticated users can update veiculos_multas" ON public.veiculos_multas
FOR UPDATE USING (true);

CREATE POLICY "Authenticated users can view veiculos_multas" ON public.veiculos_multas
FOR SELECT USING (true);

-- === wash_plans ===
CREATE POLICY "Usuarios autenticados podem atualizar planos de lavagem" ON public.wash_plans
FOR UPDATE USING (true);

CREATE POLICY "Usuarios autenticados podem deletar planos de lavagem" ON public.wash_plans
FOR DELETE USING (true);

CREATE POLICY "Usuarios autenticados podem inserir planos de lavagem" ON public.wash_plans
FOR INSERT WITH CHECK (true);

CREATE POLICY "Usuarios autenticados podem ver planos de lavagem" ON public.wash_plans
FOR SELECT USING (true);

-- ============================================================
-- PARTE 8: DADOS INICIAIS (module_permissions)
-- ============================================================

INSERT INTO public.module_permissions (role, module, can_view, can_edit) VALUES
-- Admin - acesso total
('admin', 'dashboard', true, true),
('admin', 'veiculos', true, true),
('admin', 'ativos', true, true),
('admin', 'funcionarios', true, true),
('admin', 'empresas', true, true),
('admin', 'equipes', true, true),
('admin', 'contratos', true, true),
('admin', 'oficina', true, true),
('admin', 'telefonia', true, true),
('admin', 'configuracoes', true, true),
('admin', 'usuarios', true, true),
('admin', 'permissoes', true, true),
('admin', 'relatorios', true, true),
-- Diretor
('diretor', 'dashboard', true, true),
('diretor', 'veiculos', true, true),
('diretor', 'ativos', true, true),
('diretor', 'funcionarios', true, true),
('diretor', 'empresas', true, false),
('diretor', 'equipes', true, true),
('diretor', 'contratos', true, true),
('diretor', 'oficina', true, true),
('diretor', 'telefonia', true, true),
('diretor', 'relatorios', true, true),
-- Coordenador
('coordenador', 'dashboard', true, false),
('coordenador', 'veiculos', true, true),
('coordenador', 'ativos', true, true),
('coordenador', 'funcionarios', true, true),
('coordenador', 'equipes', true, false),
('coordenador', 'oficina', true, true),
('coordenador', 'telefonia', true, true),
-- Assistente
('assistente', 'dashboard', true, false),
('assistente', 'veiculos', true, false),
('assistente', 'ativos', true, false),
('assistente', 'funcionarios', true, false)
ON CONFLICT DO NOTHING;

-- ============================================================
-- PARTE 9: STORAGE BUCKET
-- ============================================================

-- Criar bucket para documentos de veículos
INSERT INTO storage.buckets (id, name, public) 
VALUES ('veiculos-documentos', 'veiculos-documentos', true)
ON CONFLICT (id) DO NOTHING;

-- Policies para o bucket
CREATE POLICY "Public Access for veiculos-documentos"
ON storage.objects FOR SELECT
USING (bucket_id = 'veiculos-documentos');

CREATE POLICY "Authenticated users can upload to veiculos-documentos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'veiculos-documentos' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update veiculos-documentos"
ON storage.objects FOR UPDATE
USING (bucket_id = 'veiculos-documentos' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete from veiculos-documentos"
ON storage.objects FOR DELETE
USING (bucket_id = 'veiculos-documentos' AND auth.role() = 'authenticated');

-- ============================================================
-- FIM DO SCRIPT
-- ============================================================
