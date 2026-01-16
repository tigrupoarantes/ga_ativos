-- =====================================================
-- FASE 1: Índices para Performance
-- =====================================================

-- Veículos: índice composto para queries principais
CREATE INDEX IF NOT EXISTS idx_veiculos_active_status ON veiculos(active, status);
CREATE INDEX IF NOT EXISTS idx_veiculos_active_placa ON veiculos(active, placa);

-- Funcionários: índices para listagem e condutores
CREATE INDEX IF NOT EXISTS idx_funcionarios_active ON funcionarios(active);
CREATE INDEX IF NOT EXISTS idx_funcionarios_active_condutor ON funcionarios(active, is_condutor);
CREATE INDEX IF NOT EXISTS idx_funcionarios_cnh_validade ON funcionarios(cnh_validade) WHERE cnh_validade IS NOT NULL;

-- Contratos: índices para ordenação e alertas
CREATE INDEX IF NOT EXISTS idx_contratos_active_data_fim ON contratos(active, data_fim);

-- Ordens de Serviço: índices para filtros de status
CREATE INDEX IF NOT EXISTS idx_ordens_servico_active_status ON ordens_servico(active, status);

-- Preventivas: índices para alertas
CREATE INDEX IF NOT EXISTS idx_preventivas_active_status ON preventivas(active, status);
CREATE INDEX IF NOT EXISTS idx_preventivas_proxima_realizacao ON preventivas(proxima_realizacao) WHERE proxima_realizacao IS NOT NULL;

-- Peças: índices para alertas de estoque baixo
CREATE INDEX IF NOT EXISTS idx_pecas_active_estoque ON pecas(active, quantidade_estoque);

-- Assets: índices para queries principais
CREATE INDEX IF NOT EXISTS idx_assets_active_status ON assets(active, status);

-- =====================================================
-- FASE 2: Função RPC para Dashboard Stats
-- =====================================================

CREATE OR REPLACE FUNCTION get_dashboard_stats()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    -- Contadores principais
    'total_veiculos', (SELECT COUNT(*) FROM veiculos WHERE active = true),
    'total_ativos', (SELECT COUNT(*) FROM assets WHERE active = true),
    'total_funcionarios', (SELECT COUNT(*) FROM funcionarios WHERE active = true),
    'total_contratos', (SELECT COUNT(*) FROM contratos WHERE active = true),
    
    -- Veículos por status
    'veiculos_disponivel', (SELECT COUNT(*) FROM veiculos WHERE active = true AND status = 'disponivel'),
    'veiculos_em_uso', (SELECT COUNT(*) FROM veiculos WHERE active = true AND status = 'em_uso'),
    'veiculos_manutencao', (SELECT COUNT(*) FROM veiculos WHERE active = true AND status = 'manutencao'),
    'veiculos_inativo', (SELECT COUNT(*) FROM veiculos WHERE active = true AND status = 'inativo'),
    
    -- Ordens de serviço por status
    'ordens_aberta', (SELECT COUNT(*) FROM ordens_servico WHERE active = true AND status = 'aberta'),
    'ordens_em_andamento', (SELECT COUNT(*) FROM ordens_servico WHERE active = true AND status = 'em_andamento'),
    'ordens_fechada', (SELECT COUNT(*) FROM ordens_servico WHERE active = true AND status = 'fechada'),
    
    -- Alertas: CNHs vencidas/vencendo (próximos 30 dias)
    'cnhs_vencidas', (
      SELECT COUNT(*) FROM funcionarios 
      WHERE active = true 
        AND is_condutor = true 
        AND cnh_validade IS NOT NULL 
        AND cnh_validade < CURRENT_DATE
    ),
    'cnhs_vencendo', (
      SELECT COUNT(*) FROM funcionarios 
      WHERE active = true 
        AND is_condutor = true 
        AND cnh_validade IS NOT NULL 
        AND cnh_validade >= CURRENT_DATE
        AND cnh_validade <= CURRENT_DATE + INTERVAL '30 days'
    ),
    
    -- Alertas: Contratos vencendo (próximos 30 dias)
    'contratos_vencendo', (
      SELECT COUNT(*) FROM contratos 
      WHERE active = true 
        AND data_fim IS NOT NULL 
        AND data_fim >= CURRENT_DATE
        AND data_fim <= CURRENT_DATE + INTERVAL '30 days'
    ),
    
    -- Alertas: Preventivas
    'preventivas_vencidas', (
      SELECT COUNT(*) FROM preventivas 
      WHERE active = true 
        AND proxima_realizacao IS NOT NULL 
        AND proxima_realizacao < CURRENT_DATE
    ),
    'preventivas_proximas', (
      SELECT COUNT(*) FROM preventivas 
      WHERE active = true 
        AND proxima_realizacao IS NOT NULL 
        AND proxima_realizacao >= CURRENT_DATE
        AND proxima_realizacao <= CURRENT_DATE + INTERVAL '7 days'
    ),
    
    -- Alertas: Peças com estoque baixo
    'pecas_estoque_baixo', (
      SELECT COUNT(*) FROM pecas 
      WHERE active = true 
        AND estoque_minimo IS NOT NULL 
        AND quantidade_estoque <= estoque_minimo
    )
  ) INTO result;
  
  RETURN result;
END;
$$;

-- =====================================================
-- Função RPC para Alertas Detalhados (para listagem)
-- =====================================================

CREATE OR REPLACE FUNCTION get_dashboard_alerts(limit_count INT DEFAULT 10)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'cnhs_vencidas', (
      SELECT json_agg(json_build_object('id', id, 'nome', nome, 'cnh_validade', cnh_validade))
      FROM (
        SELECT id, nome, cnh_validade FROM funcionarios 
        WHERE active = true AND is_condutor = true AND cnh_validade IS NOT NULL AND cnh_validade < CURRENT_DATE
        ORDER BY cnh_validade LIMIT limit_count
      ) sub
    ),
    'cnhs_vencendo', (
      SELECT json_agg(json_build_object('id', id, 'nome', nome, 'cnh_validade', cnh_validade))
      FROM (
        SELECT id, nome, cnh_validade FROM funcionarios 
        WHERE active = true AND is_condutor = true AND cnh_validade IS NOT NULL 
          AND cnh_validade >= CURRENT_DATE AND cnh_validade <= CURRENT_DATE + INTERVAL '30 days'
        ORDER BY cnh_validade LIMIT limit_count
      ) sub
    ),
    'contratos_vencendo', (
      SELECT json_agg(json_build_object('id', id, 'numero', numero, 'data_fim', data_fim))
      FROM (
        SELECT id, numero, data_fim FROM contratos 
        WHERE active = true AND data_fim IS NOT NULL 
          AND data_fim >= CURRENT_DATE AND data_fim <= CURRENT_DATE + INTERVAL '30 days'
        ORDER BY data_fim LIMIT limit_count
      ) sub
    ),
    'preventivas_vencidas', (
      SELECT json_agg(json_build_object('id', p.id, 'tipo_manutencao', p.tipo_manutencao, 'proxima_realizacao', p.proxima_realizacao, 'placa', v.placa))
      FROM (
        SELECT id, tipo_manutencao, proxima_realizacao, veiculo_id FROM preventivas 
        WHERE active = true AND proxima_realizacao IS NOT NULL AND proxima_realizacao < CURRENT_DATE
        ORDER BY proxima_realizacao LIMIT limit_count
      ) p
      LEFT JOIN veiculos v ON v.id = p.veiculo_id
    ),
    'preventivas_proximas', (
      SELECT json_agg(json_build_object('id', p.id, 'tipo_manutencao', p.tipo_manutencao, 'proxima_realizacao', p.proxima_realizacao, 'placa', v.placa))
      FROM (
        SELECT id, tipo_manutencao, proxima_realizacao, veiculo_id FROM preventivas 
        WHERE active = true AND proxima_realizacao IS NOT NULL 
          AND proxima_realizacao >= CURRENT_DATE AND proxima_realizacao <= CURRENT_DATE + INTERVAL '7 days'
        ORDER BY proxima_realizacao LIMIT limit_count
      ) p
      LEFT JOIN veiculos v ON v.id = p.veiculo_id
    ),
    'pecas_estoque_baixo', (
      SELECT json_agg(json_build_object('id', id, 'nome', nome, 'quantidade_estoque', quantidade_estoque, 'unidade', unidade))
      FROM (
        SELECT id, nome, quantidade_estoque, unidade FROM pecas 
        WHERE active = true AND estoque_minimo IS NOT NULL AND quantidade_estoque <= estoque_minimo
        ORDER BY quantidade_estoque LIMIT limit_count
      ) sub
    )
  ) INTO result;
  
  RETURN result;
END;
$$;