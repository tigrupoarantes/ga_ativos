import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/external-client";

interface DashboardStats {
  total_veiculos: number;
  total_ativos: number;
  total_funcionarios: number;
  total_contratos: number;
  veiculos_disponivel: number;
  veiculos_em_uso: number;
  veiculos_manutencao: number;
  veiculos_inativo: number;
  ordens_aberta: number;
  ordens_em_andamento: number;
  ordens_fechada: number;
  cnhs_vencidas: number;
  cnhs_vencendo: number;
  contratos_vencendo: number;
  preventivas_vencidas: number;
  preventivas_proximas: number;
  pecas_estoque_baixo: number;
}

interface AlertItem {
  id: string;
  nome?: string;
  numero?: string;
  tipo_manutencao?: string;
  placa?: string;
  cnh_validade?: string;
  data_fim?: string;
  proxima_realizacao?: string;
  quantidade_estoque?: number;
  unidade?: string;
}

interface DashboardAlerts {
  cnhs_vencidas: AlertItem[] | null;
  cnhs_vencendo: AlertItem[] | null;
  contratos_vencendo: AlertItem[] | null;
  preventivas_vencidas: AlertItem[] | null;
  preventivas_proximas: AlertItem[] | null;
  pecas_estoque_baixo: AlertItem[] | null;
}

export function useDashboardStats() {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_dashboard_stats");
      if (error) throw error;
      return data as unknown as DashboardStats;
    },
    staleTime: 2 * 60 * 1000, // 2 minutos
    gcTime: 10 * 60 * 1000, // 10 minutos
  });

  const { data: alerts, isLoading: alertsLoading } = useQuery({
    queryKey: ["dashboard-alerts"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_dashboard_alerts", {
        limit_count: 10,
      });
      if (error) throw error;
      return data as unknown as DashboardAlerts;
    },
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  return {
    stats: stats ?? {
      total_veiculos: 0,
      total_ativos: 0,
      total_funcionarios: 0,
      total_contratos: 0,
      veiculos_disponivel: 0,
      veiculos_em_uso: 0,
      veiculos_manutencao: 0,
      veiculos_inativo: 0,
      ordens_aberta: 0,
      ordens_em_andamento: 0,
      ordens_fechada: 0,
      cnhs_vencidas: 0,
      cnhs_vencendo: 0,
      contratos_vencendo: 0,
      preventivas_vencidas: 0,
      preventivas_proximas: 0,
      pecas_estoque_baixo: 0,
    },
    alerts: alerts ?? {
      cnhs_vencidas: null,
      cnhs_vencendo: null,
      contratos_vencendo: null,
      preventivas_vencidas: null,
      preventivas_proximas: null,
      pecas_estoque_baixo: null,
    },
    isLoading: statsLoading || alertsLoading,
  };
}
