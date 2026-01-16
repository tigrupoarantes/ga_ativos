import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import { toast } from "sonner";

type FuncionarioInsert = TablesInsert<"funcionarios">;
type FuncionarioUpdate = TablesUpdate<"funcionarios">;

export function useFuncionarios() {
  const queryClient = useQueryClient();

  const { data: funcionarios = [], isLoading, error } = useQuery({
    queryKey: ["funcionarios"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("funcionarios")
        .select(`
          *,
          empresa:empresas(*),
          equipe:equipes(*)
        `)
        .eq("active", true)
        .order("nome");

      if (error) throw error;
      return data;
    },
  });

  const createFuncionario = useMutation({
    mutationFn: async (funcionario: FuncionarioInsert) => {
      const { data, error } = await supabase
        .from("funcionarios")
        .insert(funcionario)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["funcionarios"] });
      toast.success("Funcionário criado com sucesso!");
    },
    onError: (error) => {
      toast.error("Erro ao criar funcionário: " + error.message);
    },
  });

  const updateFuncionario = useMutation({
    mutationFn: async ({ id, ...updates }: FuncionarioUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from("funcionarios")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["funcionarios"] });
      toast.success("Funcionário atualizado!");
    },
    onError: (error) => {
      toast.error("Erro ao atualizar funcionário: " + error.message);
    },
  });

  const deleteFuncionario = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("funcionarios")
        .update({ active: false })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["funcionarios"] });
      toast.success("Funcionário excluído!");
    },
    onError: (error) => {
      toast.error("Erro ao excluir funcionário: " + error.message);
    },
  });

  return {
    funcionarios,
    isLoading,
    error,
    createFuncionario,
    updateFuncionario,
    deleteFuncionario,
  };
}

export function useCondutores() {
  const { data: condutores = [], isLoading } = useQuery({
    queryKey: ["condutores"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("funcionarios")
        .select(`
          *,
          empresa:empresas(*)
        `)
        .eq("active", true)
        .eq("is_condutor", true)
        .order("nome");

      if (error) throw error;
      return data;
    },
  });

  return { condutores, isLoading };
}
