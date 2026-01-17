import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface HistoricoAtivo {
  id: string;
  ativo_id: string | null;
  funcionario_id: string | null;
  data_atribuicao: string | null;
  data_devolucao: string | null;
  status: string | null;
  observacoes: string | null;
  created_at: string | null;
  funcionario?: {
    id: string;
    nome: string;
    cargo: string | null;
  } | null;
}

export function useHistoricoAtivo(ativoId?: string) {
  const { data: historico = [], isLoading, error, refetch } = useQuery({
    queryKey: ["historico-ativo", ativoId],
    queryFn: async () => {
      if (!ativoId) return [];
      
      const { data, error } = await supabase
        .from("atribuicoes")
        .select(`
          id,
          ativo_id,
          funcionario_id,
          data_atribuicao,
          data_devolucao,
          status,
          observacoes,
          created_at,
          funcionario:funcionarios(id, nome, cargo)
        `)
        .eq("ativo_id", ativoId)
        .order("data_atribuicao", { ascending: false });

      if (error) throw error;
      return data as HistoricoAtivo[];
    },
    enabled: !!ativoId,
  });

  return {
    historico,
    isLoading,
    error,
    refetch,
  };
}
