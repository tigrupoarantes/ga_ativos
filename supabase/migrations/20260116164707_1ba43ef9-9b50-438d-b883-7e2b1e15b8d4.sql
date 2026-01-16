-- Alterar veiculos_documentos: remover veiculo_id e adicionar veiculo_placa
ALTER TABLE public.veiculos_documentos 
DROP CONSTRAINT IF EXISTS veiculos_documentos_veiculo_id_fkey;

ALTER TABLE public.veiculos_documentos 
DROP COLUMN IF EXISTS veiculo_id;

ALTER TABLE public.veiculos_documentos 
ADD COLUMN IF NOT EXISTS veiculo_placa TEXT;

-- Alterar veiculos_multas: remover veiculo_id e adicionar veiculo_placa
ALTER TABLE public.veiculos_multas 
DROP CONSTRAINT IF EXISTS veiculos_multas_veiculo_id_fkey;

ALTER TABLE public.veiculos_multas 
DROP COLUMN IF EXISTS veiculo_id;

ALTER TABLE public.veiculos_multas 
ADD COLUMN IF NOT EXISTS veiculo_placa TEXT;

-- Alterar veiculos_historico_responsavel: remover veiculo_id e adicionar veiculo_placa
ALTER TABLE public.veiculos_historico_responsavel 
DROP CONSTRAINT IF EXISTS veiculos_historico_responsavel_veiculo_id_fkey;

ALTER TABLE public.veiculos_historico_responsavel 
DROP COLUMN IF EXISTS veiculo_id;

ALTER TABLE public.veiculos_historico_responsavel 
ADD COLUMN IF NOT EXISTS veiculo_placa TEXT;

-- Criar índices para melhorar performance de busca por placa
CREATE INDEX IF NOT EXISTS idx_veiculos_documentos_placa ON public.veiculos_documentos(veiculo_placa);
CREATE INDEX IF NOT EXISTS idx_veiculos_multas_placa ON public.veiculos_multas(veiculo_placa);
CREATE INDEX IF NOT EXISTS idx_veiculos_historico_placa ON public.veiculos_historico_responsavel(veiculo_placa);