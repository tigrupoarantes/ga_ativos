-- Adicionar campos para consulta FIPE na tabela veiculos
ALTER TABLE veiculos 
ADD COLUMN IF NOT EXISTS codigo_fipe text,
ADD COLUMN IF NOT EXISTS data_consulta_fipe timestamptz;