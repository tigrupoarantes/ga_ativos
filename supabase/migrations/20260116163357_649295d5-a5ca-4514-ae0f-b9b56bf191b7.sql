-- =====================================================
-- FASE 1: CRIAÇÃO DAS NOVAS TABELAS
-- =====================================================

-- 1. Tabela tipos_veiculos - Tipos de veículos com depreciação
CREATE TABLE public.tipos_veiculos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome_tipo TEXT NOT NULL,
  descricao TEXT,
  vida_util_anos INTEGER,
  taxa_anual_depreciacao NUMERIC,
  taxa_mensal_depreciacao NUMERIC,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  active BOOLEAN DEFAULT true
);

-- 2. Tabela atribuicoes - Histórico de empréstimos/atribuições de ativos
CREATE TABLE public.atribuicoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ativo_id UUID REFERENCES public.assets(id) ON DELETE CASCADE,
  funcionario_id UUID REFERENCES public.funcionarios(id) ON DELETE SET NULL,
  data_atribuicao TIMESTAMPTZ DEFAULT now(),
  data_devolucao TIMESTAMPTZ,
  status TEXT DEFAULT 'Ativo',
  usuario_operacao UUID,
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  active BOOLEAN DEFAULT true
);

-- 3. Tabela audit_log - Log de auditoria de operações
CREATE TABLE public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entidade TEXT NOT NULL,
  entidade_id UUID NOT NULL,
  acao TEXT NOT NULL,
  payload JSONB,
  usuario UUID,
  timestamp TIMESTAMPTZ DEFAULT now()
);

-- 4. Tabela veiculos_documentos - Documentos anexados aos veículos
CREATE TABLE public.veiculos_documentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  veiculo_id UUID REFERENCES public.veiculos(id) ON DELETE CASCADE,
  nome_arquivo TEXT NOT NULL,
  tipo_documento TEXT NOT NULL,
  url TEXT NOT NULL,
  tamanho_bytes BIGINT,
  created_at TIMESTAMPTZ DEFAULT now(),
  active BOOLEAN DEFAULT true
);

-- 5. Tabela veiculos_multas - Registro de multas de trânsito
CREATE TABLE public.veiculos_multas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  veiculo_id UUID REFERENCES public.veiculos(id) ON DELETE CASCADE,
  funcionario_responsavel_id UUID REFERENCES public.funcionarios(id) ON DELETE SET NULL,
  data_infracao DATE NOT NULL,
  data_lancamento TIMESTAMPTZ DEFAULT now(),
  codigo_infracao TEXT,
  descricao_infracao TEXT NOT NULL,
  valor_multa NUMERIC,
  pontos INTEGER,
  local_infracao TEXT,
  status TEXT DEFAULT 'PENDENTE',
  observacoes TEXT,
  comprovante_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  active BOOLEAN DEFAULT true
);

-- 6. Tabela veiculos_historico_responsavel - Histórico de trocas de responsável
CREATE TABLE public.veiculos_historico_responsavel (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  veiculo_id UUID REFERENCES public.veiculos(id) ON DELETE CASCADE,
  funcionario_anterior_id UUID REFERENCES public.funcionarios(id) ON DELETE SET NULL,
  funcionario_novo_id UUID REFERENCES public.funcionarios(id) ON DELETE SET NULL,
  data_alteracao TIMESTAMPTZ DEFAULT now(),
  usuario_alteracao UUID,
  observacoes TEXT
);

-- =====================================================
-- FASE 2: ADICIONAR COLUNA JSONB NA TABELA ASSETS
-- =====================================================

ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS detalhes_especificos JSONB;

-- =====================================================
-- FASE 3: HABILITAR RLS EM TODAS AS NOVAS TABELAS
-- =====================================================

ALTER TABLE public.tipos_veiculos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.atribuicoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.veiculos_documentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.veiculos_multas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.veiculos_historico_responsavel ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- FASE 4: POLÍTICAS RLS PARA TIPOS_VEICULOS
-- =====================================================

CREATE POLICY "Authenticated users can view tipos_veiculos"
ON public.tipos_veiculos FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert tipos_veiculos"
ON public.tipos_veiculos FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update tipos_veiculos"
ON public.tipos_veiculos FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can delete tipos_veiculos"
ON public.tipos_veiculos FOR DELETE
TO authenticated
USING (true);

-- =====================================================
-- FASE 5: POLÍTICAS RLS PARA ATRIBUICOES
-- =====================================================

CREATE POLICY "Authenticated users can view atribuicoes"
ON public.atribuicoes FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert atribuicoes"
ON public.atribuicoes FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update atribuicoes"
ON public.atribuicoes FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can delete atribuicoes"
ON public.atribuicoes FOR DELETE
TO authenticated
USING (true);

-- =====================================================
-- FASE 6: POLÍTICAS RLS PARA AUDIT_LOG
-- =====================================================

CREATE POLICY "Authenticated users can view audit_log"
ON public.audit_log FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert audit_log"
ON public.audit_log FOR INSERT
TO authenticated
WITH CHECK (true);

-- =====================================================
-- FASE 7: POLÍTICAS RLS PARA VEICULOS_DOCUMENTOS
-- =====================================================

CREATE POLICY "Authenticated users can view veiculos_documentos"
ON public.veiculos_documentos FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert veiculos_documentos"
ON public.veiculos_documentos FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update veiculos_documentos"
ON public.veiculos_documentos FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can delete veiculos_documentos"
ON public.veiculos_documentos FOR DELETE
TO authenticated
USING (true);

-- =====================================================
-- FASE 8: POLÍTICAS RLS PARA VEICULOS_MULTAS
-- =====================================================

CREATE POLICY "Authenticated users can view veiculos_multas"
ON public.veiculos_multas FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert veiculos_multas"
ON public.veiculos_multas FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update veiculos_multas"
ON public.veiculos_multas FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can delete veiculos_multas"
ON public.veiculos_multas FOR DELETE
TO authenticated
USING (true);

-- =====================================================
-- FASE 9: POLÍTICAS RLS PARA VEICULOS_HISTORICO_RESPONSAVEL
-- =====================================================

CREATE POLICY "Authenticated users can view veiculos_historico_responsavel"
ON public.veiculos_historico_responsavel FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert veiculos_historico_responsavel"
ON public.veiculos_historico_responsavel FOR INSERT
TO authenticated
WITH CHECK (true);

-- =====================================================
-- FASE 10: TRIGGERS PARA UPDATED_AT
-- =====================================================

CREATE TRIGGER update_tipos_veiculos_updated_at
BEFORE UPDATE ON public.tipos_veiculos
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_atribuicoes_updated_at
BEFORE UPDATE ON public.atribuicoes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_veiculos_multas_updated_at
BEFORE UPDATE ON public.veiculos_multas
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();