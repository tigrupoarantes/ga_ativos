import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/external-client";
import { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import { toast } from "sonner";
import { friendlyErrorMessage } from "@/lib/error-handler";

type Asset = Tables<"assets">;
type AssetInsert = TablesInsert<"assets">;
type AssetUpdate = TablesUpdate<"assets">;
type AssetType = Tables<"asset_types">;
type AssetTypeInsert = TablesInsert<"asset_types">;
type AssetTypeUpdate = TablesUpdate<"asset_types">;

// Função para gerar patrimônio automaticamente via RPC
export async function generatePatrimonio(tipoId: string): Promise<string> {
  const { data, error } = await supabase
    .rpc('generate_patrimonio', { p_tipo_id: tipoId });

  if (error) {
    console.error('Erro ao gerar patrimônio:', error);
    throw error;
  }
  return data as string;
}
export function useAtivos() {
  const queryClient = useQueryClient();

  const { data: ativos = [], isLoading, error } = useQuery({
    queryKey: ["ativos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("assets")
        .select(`
          *,
          tipo:asset_types(*),
          funcionario:funcionarios(*),
          empresa:empresas(*)
        `)
        .eq("active", true)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const createAtivo = useMutation({
    mutationFn: async (ativo: AssetInsert) => {
      const { data, error } = await supabase
        .from("assets")
        .insert(ativo)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ativos"] });
      toast.success("Ativo criado com sucesso!");
    },
    onError: (error) => {
      toast.error(friendlyErrorMessage("criar ativo", error));
    },
  });

  const updateAtivo = useMutation({
    mutationFn: async ({ id, ...updates }: AssetUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from("assets")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ativos"] });
      toast.success("Ativo atualizado com sucesso!");
    },
    onError: (error) => {
      toast.error(friendlyErrorMessage("atualizar ativo", error));
    },
  });

  const deleteAtivo = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("assets")
        .update({ active: false })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ativos"] });
      toast.success("Ativo excluído com sucesso!");
    },
    onError: (error) => {
      toast.error(friendlyErrorMessage("excluir ativo", error));
    },
  });

  const devolverAtivo = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from("assets")
        .update({ 
          funcionario_id: null,
          status: "disponivel"
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ativos"] });
      toast.success("Ativo devolvido com sucesso!");
    },
    onError: (error) => {
      toast.error(friendlyErrorMessage("devolver ativo", error));
    },
  });

  return {
    ativos,
    isLoading,
    error,
    createAtivo,
    updateAtivo,
    deleteAtivo,
    devolverAtivo,
  };
}

export function useTiposAtivos() {
  const queryClient = useQueryClient();

  const { data: tipos = [], isLoading } = useQuery({
    queryKey: ["tipos-ativos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("asset_types")
        .select("*")
        .eq("active", true)
        .order("name");

      if (error) throw error;
      return data;
    },
  });

  const createTipo = useMutation({
    mutationFn: async (tipo: AssetTypeInsert) => {
      const { data, error } = await supabase
        .from("asset_types")
        .insert(tipo)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tipos-ativos"] });
      toast.success("Tipo de ativo criado!");
    },
    onError: (error) => {
      toast.error(friendlyErrorMessage("criar tipo de ativo", error));
    },
  });

  const updateTipo = useMutation({
    mutationFn: async ({ id, ...updates }: AssetTypeUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from("asset_types")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tipos-ativos"] });
      toast.success("Tipo atualizado!");
    },
    onError: (error) => {
      toast.error(friendlyErrorMessage("atualizar tipo de ativo", error));
    },
  });

  const deleteTipo = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("asset_types")
        .update({ active: false })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tipos-ativos"] });
      toast.success("Tipo excluído!");
    },
    onError: (error) => {
      toast.error(friendlyErrorMessage("excluir tipo de ativo", error));
    },
  });

  return { tipos, isLoading, createTipo, updateTipo, deleteTipo };
}
