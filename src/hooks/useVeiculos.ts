import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import { toast } from "sonner";

type VeiculoInsert = TablesInsert<"veiculos">;
type VeiculoUpdate = TablesUpdate<"veiculos">;

export function useVeiculos() {
  const queryClient = useQueryClient();

  const { data: veiculos = [], isLoading, error } = useQuery({
    queryKey: ["veiculos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("veiculos")
        .select(`
          *,
          funcionario:funcionarios(*),
          empresa:empresas(*)
        `)
        .eq("active", true)
        .order("placa");

      if (error) throw error;
      return data;
    },
  });

  const createVeiculo = useMutation({
    mutationFn: async (veiculo: VeiculoInsert) => {
      const { data, error } = await supabase
        .from("veiculos")
        .insert(veiculo)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["veiculos"] });
      toast.success("Veículo criado com sucesso!");
    },
    onError: (error) => {
      toast.error("Erro ao criar veículo: " + error.message);
    },
  });

  const updateVeiculo = useMutation({
    mutationFn: async ({ id, ...updates }: VeiculoUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from("veiculos")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["veiculos"] });
      toast.success("Veículo atualizado!");
    },
    onError: (error) => {
      toast.error("Erro ao atualizar veículo: " + error.message);
    },
  });

  const deleteVeiculo = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("veiculos")
        .update({ active: false })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["veiculos"] });
      toast.success("Veículo excluído!");
    },
    onError: (error) => {
      toast.error("Erro ao excluir veículo: " + error.message);
    },
  });

  return {
    veiculos,
    isLoading,
    error,
    createVeiculo,
    updateVeiculo,
    deleteVeiculo,
  };
}
