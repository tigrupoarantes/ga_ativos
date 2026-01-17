-- 1. Desativar registros duplicados (soft-delete)
UPDATE funcionarios 
SET active = false 
WHERE id IN (
  '34c00f24-f51f-4c40-b943-80d1ed150a42',  -- Gabriel duplicado
  '4eba85ca-3ae1-4597-b8b4-6404a2da0ce5'   -- Rafael duplicado
);

-- 2. Padronizar todos os CPFs (remover pontos e traços)
UPDATE funcionarios 
SET cpf = REGEXP_REPLACE(cpf, '[^0-9]', '', 'g')
WHERE cpf IS NOT NULL AND cpf != '';

-- 3. Criar índice único para CPF (apenas registros ativos com CPF preenchido)
CREATE UNIQUE INDEX idx_funcionarios_cpf_unique 
ON funcionarios (cpf) 
WHERE active = true AND cpf IS NOT NULL AND cpf != '';