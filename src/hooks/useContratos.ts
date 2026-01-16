import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import { toast } from "sonner";

type ContratoInsert = TablesInsert<"contratos">;
type ContratoUpdate = TablesUpdate<"contratos">;

export function useContratos() {
  const queryClient = useQueryClient();

  const { data: contratos = [], isLoading, error } = useQuery({
    queryKey: ["contratos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contratos")
        .select("*")
        .eq("active", true)
        .order("data_fim", { ascending: true });

      if (error) throw error;
      return data;
    },
  });

  const createContrato = useMutation({
    mutationFn: async (contrato: ContratoInsert) => {
      const { data, error } = await supabase
        .from("contratos")
        .insert(contrato)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contratos"] });
      toast.success("Contrato criado com sucesso!");
    },
    onError: (error) => {
      toast.error("Erro ao criar contrato: " + error.message);
    },
  });

  const updateContrato = useMutation({
    mutationFn: async ({ id, ...updates }: ContratoUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from("contratos")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contratos"] });
      toast.success("Contrato atualizado!");
    },
    onError: (error) => {
      toast.error("Erro ao atualizar contrato: " + error.message);
    },
  });

  const deleteContrato = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("contratos")
        .update({ active: false })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contratos"] });
      toast.success("Contrato excluído!");
    },
    onError: (error) => {
      toast.error("Erro ao excluir contrato: " + error.message);
    },
  });

  return {
    contratos,
    isLoading,
    error,
    createContrato,
    updateContrato,
    deleteContrato,
  };
}
