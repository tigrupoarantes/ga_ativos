-- Adicionar campos para funcionalidade "É Vendedor"
ALTER TABLE funcionarios 
ADD COLUMN IF NOT EXISTS is_vendedor boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS codigo_vendedor text;

-- Comentário para documentação
COMMENT ON COLUMN funcionarios.is_vendedor IS 'Indica se o funcionário é vendedor';
COMMENT ON COLUMN funcionarios.codigo_vendedor IS 'Código numérico do vendedor';