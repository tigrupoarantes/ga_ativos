import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/external-client";
import { toast } from "sonner";

export interface TipoVeiculo {
  id: string;
  nome_tipo: string;
  descricao: string | null;
  vida_util_anos: number | null;
  taxa_anual_depreciacao: number | null;
  taxa_mensal_depreciacao: number | null;
  created_at: string | null;
  updated_at: string | null;
  active: boolean | null;
}

type TipoVeiculoInsert = {
  nome_tipo: string;
  descricao?: string | null;
  vida_util_anos?: number | null;
  taxa_anual_depreciacao?: number | null;
  taxa_mensal_depreciacao?: number | null;
};

type TipoVeiculoUpdate = Partial<TipoVeiculoInsert> & { id: string };

export function useTiposVeiculos() {
  const queryClient = useQueryClient();

  const { data: tiposVeiculos = [], isLoading, error } = useQuery({
    queryKey: ["tipos_veiculos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tipos_veiculos")
        .select("*")
        .eq("active", true)
        .order("nome_tipo");

      if (error) throw error;
      return data as TipoVeiculo[];
    },
  });

  const createTipoVeiculo = useMutation({
    mutationFn: async (tipo: TipoVeiculoInsert) => {
      const { data, error } = await supabase
        .from("tipos_veiculos")
        .insert(tipo)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tipos_veiculos"] });
      toast.success("Tipo de veículo criado com sucesso!");
    },
    onError: (error) => {
      toast.error("Erro ao criar tipo de veículo: " + error.message);
    },
  });

  const updateTipoVeiculo = useMutation({
    mutationFn: async ({ id, ...updates }: TipoVeiculoUpdate) => {
      const { data, error } = await supabase
        .from("tipos_veiculos")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tipos_veiculos"] });
      toast.success("Tipo de veículo atualizado!");
    },
    onError: (error) => {
      toast.error("Erro ao atualizar tipo de veículo: " + error.message);
    },
  });

  const deleteTipoVeiculo = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("tipos_veiculos")
        .update({ active: false })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tipos_veiculos"] });
      toast.success("Tipo de veículo excluído!");
    },
    onError: (error) => {
      toast.error("Erro ao excluir tipo de veículo: " + error.message);
    },
  });

  return {
    tiposVeiculos,
    isLoading,
    error,
    createTipoVeiculo,
    updateTipoVeiculo,
    deleteTipoVeiculo,
  };
}
