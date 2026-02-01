import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/external-client";
import { toast } from "sonner";

export interface Atribuicao {
  id: string;
  ativo_id: string | null;
  funcionario_id: string | null;
  data_atribuicao: string | null;
  data_devolucao: string | null;
  status: string | null;
  usuario_operacao: string | null;
  observacoes: string | null;
  created_at: string | null;
  updated_at: string | null;
  active: boolean | null;
  ativo?: {
    id: string;
    nome: string;
    patrimonio: string;
    marca: string | null;
    modelo: string | null;
  };
  funcionario?: {
    id: string;
    nome: string;
    cargo: string | null;
  };
}

type AtribuicaoInsert = {
  ativo_id?: string | null;
  funcionario_id?: string | null;
  data_atribuicao?: string | null;
  data_devolucao?: string | null;
  status?: string | null;
  usuario_operacao?: string | null;
  observacoes?: string | null;
};

type AtribuicaoUpdate = AtribuicaoInsert & { id: string };

export function useAtribuicoes() {
  const queryClient = useQueryClient();

  const { data: atribuicoes = [], isLoading, error } = useQuery({
    queryKey: ["atribuicoes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("atribuicoes")
        .select(`
          *,
          ativo:assets(id, nome, patrimonio, marca, modelo),
          funcionario:funcionarios(id, nome, cargo)
        `)
        .eq("active", true)
        .order("data_atribuicao", { ascending: false });

      if (error) throw error;
      return data as Atribuicao[];
    },
  });

  const createAtribuicao = useMutation({
    mutationFn: async (atribuicao: AtribuicaoInsert) => {
      const { data, error } = await supabase
        .from("atribuicoes")
        .insert(atribuicao)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["atribuicoes"] });
      toast.success("Atribuição criada com sucesso!");
    },
    onError: (error) => {
      toast.error("Erro ao criar atribuição: " + error.message);
    },
  });

  const updateAtribuicao = useMutation({
    mutationFn: async ({ id, ...updates }: AtribuicaoUpdate) => {
      const { data, error } = await supabase
        .from("atribuicoes")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["atribuicoes"] });
      toast.success("Atribuição atualizada!");
    },
    onError: (error) => {
      toast.error("Erro ao atualizar atribuição: " + error.message);
    },
  });

  const deleteAtribuicao = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("atribuicoes")
        .update({ active: false })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["atribuicoes"] });
      toast.success("Atribuição excluída!");
    },
    onError: (error) => {
      toast.error("Erro ao excluir atribuição: " + error.message);
    },
  });

  const devolverAtivo = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from("atribuicoes")
        .update({ 
          data_devolucao: new Date().toISOString(),
          status: "Devolvido"
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["atribuicoes"] });
      toast.success("Ativo devolvido com sucesso!");
    },
    onError: (error) => {
      toast.error("Erro ao devolver ativo: " + error.message);
    },
  });

  return {
    atribuicoes,
    isLoading,
    error,
    createAtribuicao,
    updateAtribuicao,
    deleteAtribuicao,
    devolverAtivo,
  };
}
