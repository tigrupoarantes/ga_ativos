-- Adicionar coluna form_fields para configuração de campos do formulário por tipo de ativo
ALTER TABLE asset_types ADD COLUMN IF NOT EXISTS form_fields jsonb DEFAULT '[]';

-- Configuração padrão para Notebook (se existir)
UPDATE asset_types SET form_fields = '[
  {"field":"marca","required":true,"label":"Marca"},
  {"field":"modelo","required":true,"label":"Modelo"},
  {"field":"numero_serie","required":true,"label":"Número de Série"},
  {"field":"data_aquisicao","required":false,"label":"Data de Aquisição"},
  {"field":"valor_aquisicao","required":false,"label":"Valor de Aquisição"},
  {"field":"funcionario_id","required":false,"label":"Funcionário Responsável"}
]'::jsonb WHERE LOWER(name) LIKE '%notebook%' AND (form_fields IS NULL OR form_fields = '[]'::jsonb);

-- Configuração padrão para Celular (se existir)
UPDATE asset_types SET form_fields = '[
  {"field":"marca","required":false,"label":"Marca"},
  {"field":"modelo","required":true,"label":"Modelo"},
  {"field":"imei","required":true,"label":"IMEI"},
  {"field":"chip_linha","required":false,"label":"Linha/Chip"},
  {"field":"data_aquisicao","required":false,"label":"Data de Aquisição"},
  {"field":"valor_aquisicao","required":false,"label":"Valor de Aquisição"},
  {"field":"funcionario_id","required":false,"label":"Funcionário Responsável"}
]'::jsonb WHERE LOWER(name) LIKE '%celular%' AND (form_fields IS NULL OR form_fields = '[]'::jsonb);