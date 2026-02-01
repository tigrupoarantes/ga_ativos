import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/external-client";
import { TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import { toast } from "sonner";

type EmpresaInsert = TablesInsert<"empresas">;
type EmpresaUpdate = TablesUpdate<"empresas">;

export function useEmpresas() {
  const queryClient = useQueryClient();

  const { data: empresas = [], isLoading, error } = useQuery({
    queryKey: ["empresas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("empresas")
        .select("*")
        .eq("active", true)
        .order("nome");

      if (error) throw error;
      return data;
    },
  });

  const createEmpresa = useMutation({
    mutationFn: async (empresa: EmpresaInsert) => {
      const { data, error } = await supabase
        .from("empresas")
        .insert(empresa)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["empresas"] });
      toast.success("Empresa criada com sucesso!");
    },
    onError: (error) => {
      toast.error("Erro ao criar empresa: " + error.message);
    },
  });

  const updateEmpresa = useMutation({
    mutationFn: async ({ id, ...updates }: EmpresaUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from("empresas")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["empresas"] });
      toast.success("Empresa atualizada!");
    },
    onError: (error) => {
      toast.error("Erro ao atualizar empresa: " + error.message);
    },
  });

  const deleteEmpresa = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("empresas")
        .update({ active: false })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["empresas"] });
      toast.success("Empresa excluída!");
    },
    onError: (error) => {
      toast.error("Erro ao excluir empresa: " + error.message);
    },
  });

  return {
    empresas,
    isLoading,
    error,
    createEmpresa,
    updateEmpresa,
    deleteEmpresa,
  };
}
