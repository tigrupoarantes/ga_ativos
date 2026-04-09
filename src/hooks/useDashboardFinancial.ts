import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/external-client";

export interface TipoDado {
  tipo: string;
  quantidade: number;
  valor_aquisicao: number;
  valor_contabil: number;
  valor_fipe?: number;
}

export interface DashboardFinancialStats {
  // Ativos
  ativos_total: number;
  ativos_em_uso: number;
  ativos_disponiveis: number;
  ativos_manutencao: number;
  ativos_baixados: number;
  ativos_valor_aquisicao: number;
  ativos_valor_contabil: number;
  ativos_depreciacao_acumulada: number;
  ativos_depreciacao_mensal: number;
  ativos_sem_valor: number;
  ativos_totalmente_depreciados: number;
  ativos_por_tipo: TipoDado[];

  // Veículos
  veiculos_total: number;
  veiculos_em_uso: number;
  veiculos_disponiveis: number;
  veiculos_manutencao: number;
  veiculos_baixados: number;
  veiculos_valor_aquisicao: number;
  veiculos_valor_fipe: number;
  veiculos_valor_contabil: number;
  veiculos_depreciacao_acumulada: number;
  veiculos_depreciacao_mensal: number;
  veiculos_por_tipo: TipoDado[];

  // Alertas
  total_funcionarios: number;
  total_contratos: number;
  cnhs_vencidas: number;
  contratos_vencendo: number;
  preventivas_vencidas: number;
  pecas_estoque_baixo: number;
  ordens_abertas: number;
}

export function useDashboardFinancial() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["dashboard-financial"],
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_dashboard_financial_stats");
      if (error) throw error;
      return data as unknown as DashboardFinancialStats;
    },
  });

  return { stats, isLoading };
}
