import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import { toast } from "sonner";

type EquipeInsert = TablesInsert<"equipes">;
type EquipeUpdate = TablesUpdate<"equipes">;

export function useEquipes() {
  const queryClient = useQueryClient();

  const { data: equipes = [], isLoading, error } = useQuery({
    queryKey: ["equipes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("equipes")
        .select(`
          *,
          empresa:empresas(*),
          lider:funcionarios(*)
        `)
        .eq("active", true)
        .order("nome");

      if (error) throw error;
      return data;
    },
  });

  const createEquipe = useMutation({
    mutationFn: async (equipe: EquipeInsert) => {
      const { data, error } = await supabase
        .from("equipes")
        .insert(equipe)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["equipes"] });
      toast.success("Equipe criada com sucesso!");
    },
    onError: (error) => {
      toast.error("Erro ao criar equipe: " + error.message);
    },
  });

  const updateEquipe = useMutation({
    mutationFn: async ({ id, ...updates }: EquipeUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from("equipes")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["equipes"] });
      toast.success("Equipe atualizada!");
    },
    onError: (error) => {
      toast.error("Erro ao atualizar equipe: " + error.message);
    },
  });

  const deleteEquipe = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("equipes")
        .update({ active: false })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["equipes"] });
      toast.success("Equipe excluída!");
    },
    onError: (error) => {
      toast.error("Erro ao excluir equipe: " + error.message);
    },
  });

  return {
    equipes,
    isLoading,
    error,
    createEquipe,
    updateEquipe,
    deleteEquipe,
  };
}
