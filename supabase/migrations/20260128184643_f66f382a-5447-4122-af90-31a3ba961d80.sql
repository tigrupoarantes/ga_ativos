-- Novos campos para a tabela veiculos

-- Campo Propriedade (Empresa ou Particular)
ALTER TABLE veiculos ADD COLUMN IF NOT EXISTS propriedade text DEFAULT 'empresa';

-- Campos de Licenciamento
ALTER TABLE veiculos ADD COLUMN IF NOT EXISTS licenciamento_valor numeric;
ALTER TABLE veiculos ADD COLUMN IF NOT EXISTS licenciamento_vencimento date;
ALTER TABLE veiculos ADD COLUMN IF NOT EXISTS licenciamento_situacao text DEFAULT 'nao_pago';

-- Campos de IPVA
ALTER TABLE veiculos ADD COLUMN IF NOT EXISTS ipva_valor numeric;
ALTER TABLE veiculos ADD COLUMN IF NOT EXISTS ipva_vencimento date;
ALTER TABLE veiculos ADD COLUMN IF NOT EXISTS ipva_situacao text DEFAULT 'nao_pago';

-- Campos de Restricao
ALTER TABLE veiculos ADD COLUMN IF NOT EXISTS restricao boolean DEFAULT false;
ALTER TABLE veiculos ADD COLUMN IF NOT EXISTS restricao_descricao text;

-- Campos de Seguro
ALTER TABLE veiculos ADD COLUMN IF NOT EXISTS possui_seguro boolean DEFAULT false;
ALTER TABLE veiculos ADD COLUMN IF NOT EXISTS seguro_vencimento date;
ALTER TABLE veiculos ADD COLUMN IF NOT EXISTS seguro_valor numeric;
ALTER TABLE veiculos ADD COLUMN IF NOT EXISTS seguro_apolice text;