-- #3: Adicionar campo is_promotor em funcionarios
ALTER TABLE funcionarios ADD COLUMN IF NOT EXISTS is_promotor BOOLEAN DEFAULT FALSE;

-- #4: Adicionar campo gravidade em veiculos_multas
ALTER TABLE veiculos_multas ADD COLUMN IF NOT EXISTS gravidade TEXT;

-- Comentários para documentação
COMMENT ON COLUMN funcionarios.is_promotor IS 'Flag indicando se o funcionário é promotor (aparece no contrato de comodato)';
COMMENT ON COLUMN veiculos_multas.gravidade IS 'Gravidade da multa: leve, media, grave, gravissima';

-- #6: Adicionar campos de rateio em linhas_telefonicas
ALTER TABLE linhas_telefonicas ADD COLUMN IF NOT EXISTS empresa_id UUID REFERENCES empresas(id);
ALTER TABLE linhas_telefonicas ADD COLUMN IF NOT EXISTS centro_custo TEXT;
ALTER TABLE linhas_telefonicas ADD COLUMN IF NOT EXISTS funcao TEXT;
