import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/external-client";
import { toast } from "sonner";

export interface ContratoItem {
  id: string;
  contrato_id: string;
  identificador: string | null;
  descricao: string | null;
  funcionario_id: string | null;
  empresa_id: string | null;
  valor_mensal: number | null;
  status: string;
  observacoes: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

interface CreateItemData {
  contrato_id: string;
  identificador?: string | null;
  descricao?: string | null;
  funcionario_id?: string | null;
  empresa_id?: string | null;
  valor_mensal?: number | null;
  observacoes?: string | null;
}

// Helper to access contrato_itens table (not yet in auto-generated types)
const contratoItensTable = () => (supabase as any).from("contrato_itens");

export function useContratoItens(contratoId?: string) {
  const queryClient = useQueryClient();
  const queryKey = ["contrato-itens", contratoId];

  const { data: itens = [], isLoading } = useQuery({
    queryKey,
    enabled: !!contratoId,
    queryFn: async () => {
      const { data, error } = await contratoItensTable()
        .select("*")
        .eq("contrato_id", contratoId!)
        .eq("active", true)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data || []) as ContratoItem[];
    },
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey });

  const createItem = useMutation({
    mutationFn: async (item: CreateItemData) => {
      const status = item.funcionario_id ? "em_uso" : "disponivel";
      const { data, error } = await contratoItensTable()
        .insert({ ...item, status })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { invalidate(); toast.success("Item adicionado!"); },
    onError: (e: Error) => toast.error("Erro ao adicionar item: " + e.message),
  });

  const updateItem = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ContratoItem> & { id: string }) => {
      const { error } = await contratoItensTable()
        .update(updates)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast.success("Item atualizado!"); },
    onError: (e: Error) => toast.error("Erro ao atualizar: " + e.message),
  });

  const deleteItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await contratoItensTable()
        .update({ active: false })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast.success("Item removido!"); },
    onError: (e: Error) => toast.error("Erro ao remover: " + e.message),
  });

  const atribuirItem = useMutation({
    mutationFn: async ({ itemId, funcionarioId }: { itemId: string; funcionarioId: string }) => {
      const { error } = await contratoItensTable()
        .update({ funcionario_id: funcionarioId, status: "em_uso" })
        .eq("id", itemId);
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast.success("Item atribuído ao funcionário!"); },
    onError: (e: Error) => toast.error("Erro ao atribuir: " + e.message),
  });

  const devolverItem = useMutation({
    mutationFn: async (itemId: string) => {
      const { error } = await contratoItensTable()
        .update({ funcionario_id: null, status: "disponivel" })
        .eq("id", itemId);
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast.success("Item devolvido!"); },
    onError: (e: Error) => toast.error("Erro ao devolver: " + e.message),
  });

  return { itens, isLoading, createItem, updateItem, deleteItem, atribuirItem, devolverItem };
}
