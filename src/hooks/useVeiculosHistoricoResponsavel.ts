import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface VeiculoHistoricoResponsavel {
  id: string;
  veiculo_id: string | null;
  funcionario_anterior_id: string | null;
  funcionario_novo_id: string | null;
  data_alteracao: string | null;
  usuario_alteracao: string | null;
  observacoes: string | null;
  veiculo?: {
    id: string;
    placa: string;
    marca: string;
    modelo: string;
  };
  funcionario_anterior?: {
    id: string;
    nome: string;
  };
  funcionario_novo?: {
    id: string;
    nome: string;
  };
}

type VeiculoHistoricoInsert = {
  veiculo_id?: string | null;
  funcionario_anterior_id?: string | null;
  funcionario_novo_id?: string | null;
  usuario_alteracao?: string | null;
  observacoes?: string | null;
};

export function useVeiculosHistoricoResponsavel(veiculoId?: string) {
  const queryClient = useQueryClient();

  const { data: historico = [], isLoading, error } = useQuery({
    queryKey: ["veiculos_historico_responsavel", veiculoId],
    queryFn: async () => {
      let query = supabase
        .from("veiculos_historico_responsavel")
        .select(`
          *,
          veiculo:veiculos(id, placa, marca, modelo),
          funcionario_anterior:funcionarios!veiculos_historico_responsavel_funcionario_anterior_id_fkey(id, nome),
          funcionario_novo:funcionarios!veiculos_historico_responsavel_funcionario_novo_id_fkey(id, nome)
        `)
        .order("data_alteracao", { ascending: false });

      if (veiculoId) {
        query = query.eq("veiculo_id", veiculoId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as VeiculoHistoricoResponsavel[];
    },
  });

  const registrarAlteracaoResponsavel = useMutation({
    mutationFn: async (registro: VeiculoHistoricoInsert) => {
      const { data, error } = await supabase
        .from("veiculos_historico_responsavel")
        .insert({
          ...registro,
          data_alteracao: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["veiculos_historico_responsavel"] });
      toast.success("Alteração de responsável registrada!");
    },
    onError: (error) => {
      toast.error("Erro ao registrar alteração: " + error.message);
    },
  });

  return {
    historico,
    isLoading,
    error,
    registrarAlteracaoResponsavel,
  };
}
