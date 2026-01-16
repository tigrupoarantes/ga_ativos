-- Criar tabela de empresas
CREATE TABLE IF NOT EXISTS public.empresas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  cnpj TEXT,
  razao_social TEXT,
  endereco TEXT,
  telefone TEXT,
  email TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Criar tabela de equipes
CREATE TABLE IF NOT EXISTS public.equipes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  descricao TEXT,
  empresa_id UUID REFERENCES public.empresas(id),
  lider_id UUID,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Criar tabela de funcionários
CREATE TABLE IF NOT EXISTS public.funcionarios (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  email TEXT,
  cpf TEXT,
  telefone TEXT,
  cargo TEXT,
  departamento TEXT,
  empresa_id UUID REFERENCES public.empresas(id),
  equipe_id UUID REFERENCES public.equipes(id),
  user_id UUID,
  is_condutor BOOLEAN DEFAULT false,
  cnh_numero TEXT,
  cnh_validade DATE,
  cnh_categoria TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Atualizar referência do lider na equipe
ALTER TABLE public.equipes 
ADD CONSTRAINT fk_equipes_lider 
FOREIGN KEY (lider_id) REFERENCES public.funcionarios(id);

-- Criar tabela de tipos de ativos
CREATE TABLE IF NOT EXISTS public.asset_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  depreciation_rate NUMERIC(5,2),
  useful_life_months INTEGER,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Criar tabela de ativos
CREATE TABLE IF NOT EXISTS public.assets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patrimonio TEXT NOT NULL UNIQUE,
  nome TEXT NOT NULL,
  descricao TEXT,
  tipo_id UUID REFERENCES public.asset_types(id),
  status TEXT DEFAULT 'disponivel',
  valor_aquisicao NUMERIC(12,2),
  data_aquisicao DATE,
  valor_atual NUMERIC(12,2),
  funcionario_id UUID REFERENCES public.funcionarios(id),
  empresa_id UUID REFERENCES public.empresas(id),
  numero_serie TEXT,
  marca TEXT,
  modelo TEXT,
  imei TEXT,
  chip_linha TEXT,
  observacoes TEXT,
  fotos TEXT[],
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Criar tabela de veículos
CREATE TABLE IF NOT EXISTS public.veiculos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  placa TEXT NOT NULL UNIQUE,
  renavam TEXT,
  chassi TEXT,
  marca TEXT NOT NULL,
  modelo TEXT NOT NULL,
  ano_fabricacao INTEGER,
  ano_modelo INTEGER,
  cor TEXT,
  tipo TEXT,
  combustivel TEXT,
  km_atual INTEGER DEFAULT 0,
  status TEXT DEFAULT 'disponivel',
  empresa_id UUID REFERENCES public.empresas(id),
  funcionario_id UUID REFERENCES public.funcionarios(id),
  valor_fipe NUMERIC(12,2),
  valor_aquisicao NUMERIC(12,2),
  data_aquisicao DATE,
  observacoes TEXT,
  fotos TEXT[],
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Criar tabela de user_roles
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'assistente',
  is_approved BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id),
  UNIQUE(email)
);

-- Criar tabela de allowed_email_domains
CREATE TABLE IF NOT EXISTS public.allowed_email_domains (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  domain TEXT NOT NULL UNIQUE,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Criar tabela de module_permissions
CREATE TABLE IF NOT EXISTS public.module_permissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  role TEXT NOT NULL,
  module TEXT NOT NULL,
  can_view BOOLEAN DEFAULT true,
  can_edit BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(role, module)
);

-- Criar tabela de contratos
CREATE TABLE IF NOT EXISTS public.contratos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  numero TEXT NOT NULL,
  tipo TEXT,
  descricao TEXT,
  fornecedor TEXT,
  valor_total NUMERIC(12,2),
  valor_mensal NUMERIC(12,2),
  data_inicio DATE,
  data_fim DATE,
  status TEXT DEFAULT 'ativo',
  observacoes TEXT,
  arquivos TEXT[],
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Criar tabela de histórico de atividades
CREATE TABLE IF NOT EXISTS public.activity_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  action TEXT NOT NULL,
  description TEXT,
  old_data JSONB,
  new_data JSONB,
  user_id UUID,
  user_email TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Criar tabela de notificações
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  title TEXT NOT NULL,
  message TEXT,
  type TEXT DEFAULT 'info',
  read BOOLEAN DEFAULT false,
  link TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Habilitar RLS em todas as tabelas
ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.funcionarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.veiculos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.allowed_email_domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.module_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contratos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Políticas para empresas (todos autenticados podem ler, admin pode escrever)
CREATE POLICY "Usuarios autenticados podem ver empresas" ON public.empresas FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin pode gerenciar empresas" ON public.empresas FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'diretor', 'coordenador') AND is_approved = true)
);

-- Políticas para equipes
CREATE POLICY "Usuarios autenticados podem ver equipes" ON public.equipes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin pode gerenciar equipes" ON public.equipes FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'diretor', 'coordenador') AND is_approved = true)
);

-- Políticas para funcionários
CREATE POLICY "Usuarios autenticados podem ver funcionarios" ON public.funcionarios FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin pode gerenciar funcionarios" ON public.funcionarios FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'diretor', 'coordenador') AND is_approved = true)
);

-- Políticas para tipos de ativos
CREATE POLICY "Usuarios autenticados podem ver tipos de ativos" ON public.asset_types FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin pode gerenciar tipos de ativos" ON public.asset_types FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'diretor') AND is_approved = true)
);

-- Políticas para ativos
CREATE POLICY "Usuarios autenticados podem ver ativos" ON public.assets FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff pode gerenciar ativos" ON public.assets FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'diretor', 'coordenador') AND is_approved = true)
);

-- Políticas para veículos
CREATE POLICY "Usuarios autenticados podem ver veiculos" ON public.veiculos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff pode gerenciar veiculos" ON public.veiculos FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'diretor', 'coordenador') AND is_approved = true)
);

-- Políticas para user_roles
CREATE POLICY "Usuarios podem ver seu proprio role" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admin pode ver todos os roles" ON public.user_roles FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin' AND is_approved = true)
);
CREATE POLICY "Usuarios podem criar seu proprio role" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND role = 'assistente');
CREATE POLICY "Admin pode gerenciar roles" ON public.user_roles FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin' AND is_approved = true)
);

-- Políticas para allowed_email_domains
CREATE POLICY "Todos podem ver dominios permitidos" ON public.allowed_email_domains FOR SELECT USING (true);
CREATE POLICY "Admin pode gerenciar dominios" ON public.allowed_email_domains FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin' AND is_approved = true)
);

-- Políticas para module_permissions
CREATE POLICY "Usuarios autenticados podem ver permissoes" ON public.module_permissions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin pode gerenciar permissoes" ON public.module_permissions FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin' AND is_approved = true)
);

-- Políticas para contratos
CREATE POLICY "Usuarios autenticados podem ver contratos" ON public.contratos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff pode gerenciar contratos" ON public.contratos FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'diretor', 'coordenador') AND is_approved = true)
);

-- Políticas para histórico
CREATE POLICY "Usuarios autenticados podem ver historico" ON public.activity_history FOR SELECT TO authenticated USING (true);
CREATE POLICY "Sistema pode inserir historico" ON public.activity_history FOR INSERT TO authenticated WITH CHECK (true);

-- Políticas para notificações
CREATE POLICY "Usuarios podem ver suas notificacoes" ON public.notifications FOR SELECT TO authenticated USING (user_id = auth.uid() OR user_id IS NULL);
CREATE POLICY "Sistema pode inserir notificacoes" ON public.notifications FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Usuarios podem atualizar suas notificacoes" ON public.notifications FOR UPDATE TO authenticated USING (user_id = auth.uid());

-- Trigger para criar user_role automaticamente
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, email, role, is_approved)
  VALUES (NEW.id, NEW.email, 'assistente', false);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Inserir permissões padrão para módulos
INSERT INTO public.module_permissions (role, module, can_view, can_edit) VALUES
('admin', 'dashboard', true, true),
('admin', 'ativos', true, true),
('admin', 'tipos_ativos', true, true),
('admin', 'funcionarios', true, true),
('admin', 'empresas', true, true),
('admin', 'veiculos', true, true),
('admin', 'oficina', true, true),
('admin', 'telefonia', true, true),
('admin', 'contratos', true, true),
('admin', 'historico', true, true),
('admin', 'configuracoes', true, true),
('coordenador', 'dashboard', true, true),
('coordenador', 'ativos', true, true),
('coordenador', 'funcionarios', true, true),
('coordenador', 'veiculos', true, true),
('coordenador', 'oficina', true, true),
('assistente', 'dashboard', true, false),
('assistente', 'ativos', true, false)
ON CONFLICT (role, module) DO NOTHING;