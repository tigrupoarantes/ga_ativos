import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/external-client";
import { toast } from "sonner";
import { friendlyErrorMessage } from "@/lib/error-handler";

export interface Peca {
  id: string;
  nome: string;
  codigo: string | null;
  descricao: string | null;
  quantidade_estoque: number;
  estoque_minimo: number | null;
  preco_unitario: number | null;
  unidade: string | null;
  fornecedor: string | null;
  categoria: string | null;
  localizacao: string | null;
  active: boolean | null;
  created_at: string | null;
  updated_at: string | null;
}

export type PecaInsert = Omit<Peca, "id" | "created_at" | "updated_at">;

export function usePecas() {
  const queryClient = useQueryClient();

  const { data: pecas = [], isLoading, error } = useQuery({
    queryKey: ["pecas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pecas")
        .select("*")
        .eq("active", true)
        .order("nome");

      if (error) throw error;
      return data as Peca[];
    },
  });

  const createPeca = useMutation({
    mutationFn: async (peca: PecaInsert) => {
      const { data, error } = await supabase
        .from("pecas")
        .insert(peca)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pecas"] });
      toast.success("Peça cadastrada com sucesso!");
    },
    onError: (error: Error) => {
      toast.error(friendlyErrorMessage("cadastrar peça", error));
    },
  });

  const updatePeca = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Peca> & { id: string }) => {
      const { data, error } = await supabase
        .from("pecas")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pecas"] });
      toast.success("Peça atualizada!");
    },
    onError: (error: Error) => {
      toast.error(friendlyErrorMessage("atualizar peça", error));
    },
  });

  const deletePeca = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("pecas")
        .update({ active: false })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pecas"] });
      toast.success("Peça removida!");
    },
    onError: (error: Error) => {
      toast.error(friendlyErrorMessage("remover peça", error));
    },
  });

  const ajustarEstoque = useMutation({
    mutationFn: async ({ id, quantidade, tipo, motivo }: { id: string; quantidade: number; tipo: "entrada" | "saida"; motivo?: string }) => {
      const { data: peca, error: fetchError } = await supabase
        .from("pecas")
        .select("quantidade_estoque")
        .eq("id", id)
        .single();

      if (fetchError) throw fetchError;

      const novaQuantidade = tipo === "entrada" 
        ? peca.quantidade_estoque + quantidade 
        : peca.quantidade_estoque - quantidade;

      if (novaQuantidade < 0) {
        throw new Error("Estoque insuficiente");
      }

      const { error: movError } = await supabase
        .from("movimentacoes_estoque")
        .insert({
          peca_id: id,
          tipo,
          quantidade,
          quantidade_anterior: peca.quantidade_estoque,
          quantidade_atual: novaQuantidade,
          motivo,
        });

      if (movError) throw movError;

      const { data, error } = await supabase
        .from("pecas")
        .update({ quantidade_estoque: novaQuantidade })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pecas"] });
      toast.success("Estoque ajustado!");
    },
    onError: (error: Error) => {
      toast.error(friendlyErrorMessage("ajustar estoque", error));
    },
  });

  const pecasEstoqueBaixo = pecas.filter(
    (p) => p.estoque_minimo && p.quantidade_estoque <= p.estoque_minimo
  );

  return {
    pecas,
    pecasEstoqueBaixo,
    isLoading,
    error,
    createPeca,
    updatePeca,
    deletePeca,
    ajustarEstoque,
  };
}
