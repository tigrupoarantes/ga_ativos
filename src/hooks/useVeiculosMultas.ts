import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/external-client";
import { toast } from "sonner";
import { friendlyErrorMessage } from "@/lib/error-handler";

export interface VeiculoMulta {
  id: string;
  veiculo_placa: string | null;
  funcionario_responsavel_id: string | null;
  data_infracao: string;
  data_lancamento: string | null;
  codigo_infracao: string | null;
  descricao_infracao: string;
  valor_multa: number | null;
  pontos: number | null;
  local_infracao: string | null;
  status: string | null;
  observacoes: string | null;
  comprovante_url: string | null;
  created_at: string | null;
  updated_at: string | null;
  active: boolean | null;
  funcionario_responsavel?: {
    id: string;
    nome: string;
  };
}

type VeiculoMultaInsert = {
  veiculo_placa?: string | null;
  funcionario_responsavel_id?: string | null;
  data_infracao: string;
  codigo_infracao?: string | null;
  descricao_infracao: string;
  valor_multa?: number | null;
  pontos?: number | null;
  local_infracao?: string | null;
  status?: string | null;
  observacoes?: string | null;
  comprovante_url?: string | null;
};

type VeiculoMultaUpdate = Partial<VeiculoMultaInsert> & { id: string };

export function useVeiculosMultas(veiculoPlaca?: string) {
  const queryClient = useQueryClient();

  const { data: multas = [], isLoading, error } = useQuery({
    queryKey: ["veiculos_multas", veiculoPlaca],
    queryFn: async () => {
      let query = supabase
        .from("veiculos_multas")
        .select(`
          *,
          funcionario_responsavel:funcionarios(id, nome)
        `)
        .eq("active", true)
        .order("data_infracao", { ascending: false });

      if (veiculoPlaca) {
        query = query.eq("veiculo_placa", veiculoPlaca);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as VeiculoMulta[];
    },
  });

  const createMulta = useMutation({
    mutationFn: async (multa: VeiculoMultaInsert) => {
      const { data, error } = await supabase
        .from("veiculos_multas")
        .insert(multa)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["veiculos_multas"] });
      toast.success("Multa registrada com sucesso!");
    },
    onError: (error) => {
      toast.error(friendlyErrorMessage("registrar multa", error));
    },
  });

  const updateMulta = useMutation({
    mutationFn: async ({ id, ...updates }: VeiculoMultaUpdate) => {
      const { data, error } = await supabase
        .from("veiculos_multas")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["veiculos_multas"] });
      toast.success("Multa atualizada!");
    },
    onError: (error) => {
      toast.error(friendlyErrorMessage("atualizar multa", error));
    },
  });

  const deleteMulta = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("veiculos_multas")
        .update({ active: false })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["veiculos_multas"] });
      toast.success("Multa excluída!");
    },
    onError: (error) => {
      toast.error(friendlyErrorMessage("excluir multa", error));
    },
  });

  // Estatísticas de multas
  const totalMultas = multas.length;
  const valorTotalMultas = multas.reduce((acc, m) => acc + (m.valor_multa || 0), 0);
  const pontosTotais = multas.reduce((acc, m) => acc + (m.pontos || 0), 0);
  const multasPendentes = multas.filter(m => m.status === 'PENDENTE').length;

  return {
    multas,
    isLoading,
    error,
    createMulta,
    updateMulta,
    deleteMulta,
    totalMultas,
    valorTotalMultas,
    pontosTotais,
    multasPendentes,
  };
}
