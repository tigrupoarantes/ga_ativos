-- Criar função para atualizar timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Criar tabela de peças/estoque
CREATE TABLE public.pecas (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    nome TEXT NOT NULL,
    codigo TEXT UNIQUE,
    descricao TEXT,
    quantidade_estoque INTEGER NOT NULL DEFAULT 0,
    estoque_minimo INTEGER DEFAULT 5,
    preco_unitario NUMERIC(10,2),
    unidade TEXT DEFAULT 'UN',
    fornecedor TEXT,
    categoria TEXT,
    localizacao TEXT,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela de manutenções preventivas
CREATE TABLE public.preventivas (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    veiculo_id UUID REFERENCES public.veiculos(id) ON DELETE CASCADE,
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

-- Sequence para número da OS
CREATE SEQUENCE IF NOT EXISTS os_sequence START 1;

-- Criar tabela de ordens de serviço
CREATE TABLE public.ordens_servico (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    numero TEXT UNIQUE,
    veiculo_id UUID REFERENCES public.veiculos(id) ON DELETE SET NULL,
    tipo TEXT NOT NULL DEFAULT 'corretiva',
    status TEXT NOT NULL DEFAULT 'aberta',
    prioridade TEXT DEFAULT 'normal',
    descricao TEXT,
    diagnostico TEXT,
    solucao TEXT,
    km_entrada INTEGER,
    km_saida INTEGER,
    data_abertura TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    data_previsao TIMESTAMP WITH TIME ZONE,
    data_fechamento TIMESTAMP WITH TIME ZONE,
    responsavel_id UUID REFERENCES public.funcionarios(id) ON DELETE SET NULL,
    solicitante_id UUID REFERENCES public.funcionarios(id) ON DELETE SET NULL,
    custo_pecas NUMERIC(10,2) DEFAULT 0,
    custo_mao_obra NUMERIC(10,2) DEFAULT 0,
    custo_total NUMERIC(10,2) DEFAULT 0,
    preventiva_id UUID REFERENCES public.preventivas(id) ON DELETE SET NULL,
    observacoes TEXT,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela de itens da ordem (peças utilizadas)
CREATE TABLE public.itens_ordem (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    ordem_id UUID NOT NULL REFERENCES public.ordens_servico(id) ON DELETE CASCADE,
    peca_id UUID REFERENCES public.pecas(id) ON DELETE SET NULL,
    descricao TEXT,
    quantidade INTEGER NOT NULL DEFAULT 1,
    preco_unitario NUMERIC(10,2),
    preco_total NUMERIC(10,2),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela de movimentações de estoque
CREATE TABLE public.movimentacoes_estoque (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    peca_id UUID NOT NULL REFERENCES public.pecas(id) ON DELETE CASCADE,
    tipo TEXT NOT NULL,
    quantidade INTEGER NOT NULL,
    quantidade_anterior INTEGER,
    quantidade_atual INTEGER,
    ordem_id UUID REFERENCES public.ordens_servico(id) ON DELETE SET NULL,
    motivo TEXT,
    usuario_id UUID,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.pecas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.preventivas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ordens_servico ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.itens_ordem ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movimentacoes_estoque ENABLE ROW LEVEL SECURITY;

-- Policies for pecas
CREATE POLICY "Usuarios autenticados podem ver pecas" ON public.pecas FOR SELECT TO authenticated USING (true);
CREATE POLICY "Usuarios autenticados podem inserir pecas" ON public.pecas FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Usuarios autenticados podem atualizar pecas" ON public.pecas FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Usuarios autenticados podem deletar pecas" ON public.pecas FOR DELETE TO authenticated USING (true);

-- Policies for preventivas
CREATE POLICY "Usuarios autenticados podem ver preventivas" ON public.preventivas FOR SELECT TO authenticated USING (true);
CREATE POLICY "Usuarios autenticados podem inserir preventivas" ON public.preventivas FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Usuarios autenticados podem atualizar preventivas" ON public.preventivas FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Usuarios autenticados podem deletar preventivas" ON public.preventivas FOR DELETE TO authenticated USING (true);

-- Policies for ordens_servico
CREATE POLICY "Usuarios autenticados podem ver ordens" ON public.ordens_servico FOR SELECT TO authenticated USING (true);
CREATE POLICY "Usuarios autenticados podem inserir ordens" ON public.ordens_servico FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Usuarios autenticados podem atualizar ordens" ON public.ordens_servico FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Usuarios autenticados podem deletar ordens" ON public.ordens_servico FOR DELETE TO authenticated USING (true);

-- Policies for itens_ordem
CREATE POLICY "Usuarios autenticados podem ver itens" ON public.itens_ordem FOR SELECT TO authenticated USING (true);
CREATE POLICY "Usuarios autenticados podem inserir itens" ON public.itens_ordem FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Usuarios autenticados podem atualizar itens" ON public.itens_ordem FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Usuarios autenticados podem deletar itens" ON public.itens_ordem FOR DELETE TO authenticated USING (true);

-- Policies for movimentacoes_estoque
CREATE POLICY "Usuarios autenticados podem ver movimentacoes" ON public.movimentacoes_estoque FOR SELECT TO authenticated USING (true);
CREATE POLICY "Usuarios autenticados podem inserir movimentacoes" ON public.movimentacoes_estoque FOR INSERT TO authenticated WITH CHECK (true);

-- Triggers para atualizar updated_at
CREATE TRIGGER update_pecas_updated_at BEFORE UPDATE ON public.pecas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_preventivas_updated_at BEFORE UPDATE ON public.preventivas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_ordens_servico_updated_at BEFORE UPDATE ON public.ordens_servico FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Função para gerar número sequencial de OS
CREATE OR REPLACE FUNCTION public.generate_os_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.numero IS NULL OR NEW.numero = '' THEN
        NEW.numero := 'OS-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(NEXTVAL('os_sequence')::TEXT, 4, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Trigger para gerar número automático
CREATE TRIGGER generate_os_number_trigger BEFORE INSERT ON public.ordens_servico FOR EACH ROW EXECUTE FUNCTION public.generate_os_number();