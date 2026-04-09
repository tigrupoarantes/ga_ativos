-- Fix: usar valor_fipe como fallback quando valor_aquisicao não existe
-- Fix: usar 01/01/ano_fabricacao como fallback para data de início
-- Fix: nome_tipo em vez de nome na tabela tipos_veiculos
-- Estas correções já foram aplicadas via execute_sql no banco

-- A RPC calculate_vehicle_depreciation agora usa:
-- 1. Valor base: COALESCE(valor_aquisicao, valor_fipe)
-- 2. Data início: COALESCE(depreciation_start_date, data_aquisicao, make_date(ano_fabricacao, 1, 1))
-- 3. Tipo veículo: tipos_veiculos.nome_tipo (não .nome)

-- A RPC recalculate_all_vehicle_depreciation agora filtra:
-- WHERE (valor_aquisicao > 0 OR valor_fipe > 0) em vez de apenas valor_aquisicao > 0
