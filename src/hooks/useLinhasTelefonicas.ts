import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/external-client";
import { toast } from "sonner";
import { friendlyErrorMessage } from "@/lib/error-handler";

interface LinhaTelefonica {
  id: string;
  numero: string;
  funcionario_id: string | null;
  operadora: string | null;
  plano: string | null;
  observacoes: string | null;
  active: boolean | null;
  created_at: string;
  updated_at: string;
  funcionario?: {
    id: string;
    nome: string;
    cpf: string | null;
  } | null;
}

interface CreateLinhaData {
  numero: string;
  funcionario_id?: string | null;
  operadora?: string | null;
  plano?: string | null;
  observacoes?: string | null;
}

interface UpdateLinhaData extends Partial<CreateLinhaData> {
  id: string;
}

export function useLinhasTelefonicas(searchTerm?: string) {
  const queryClient = useQueryClient();

  const { data: linhas, isLoading, error } = useQuery({
    queryKey: ["linhas-telefonicas", searchTerm],
    queryFn: async () => {
      let query = supabase
        .from("linhas_telefonicas")
        .select(`
          *,
          funcionario:funcionarios(id, nome, cpf)
        `)
        .eq("active", true)
        .order("numero");

      if (searchTerm) {
        query = query.or(`numero.ilike.%${searchTerm}%`);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Filter by funcionario name if searchTerm provided
      if (searchTerm) {
        return (data as LinhaTelefonica[]).filter(linha => 
          linha.numero.includes(searchTerm) ||
          linha.funcionario?.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          linha.funcionario?.cpf?.includes(searchTerm)
        );
      }

      return data as LinhaTelefonica[];
    },
  });

  const createLinha = useMutation({
    mutationFn: async (data: CreateLinhaData) => {
      const { data: result, error } = await supabase
        .from("linhas_telefonicas")
        .insert(data)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["linhas-telefonicas"] });
      toast.success("Linha telefônica cadastrada com sucesso!");
    },
    onError: (error: Error) => {
      toast.error(friendlyErrorMessage("cadastrar linha telefônica", error));
    },
  });

  const updateLinha = useMutation({
    mutationFn: async ({ id, ...data }: UpdateLinhaData) => {
      const { data: result, error } = await supabase
        .from("linhas_telefonicas")
        .update(data)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["linhas-telefonicas"] });
      toast.success("Linha telefônica atualizada com sucesso!");
    },
    onError: (error: Error) => {
      toast.error(friendlyErrorMessage("atualizar linha telefônica", error));
    },
  });

  const deleteLinha = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("linhas_telefonicas")
        .update({ active: false })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["linhas-telefonicas"] });
      toast.success("Linha telefônica removida com sucesso!");
    },
    onError: (error: Error) => {
      toast.error(friendlyErrorMessage("remover linha telefônica", error));
    },
  });

  const bulkCreateLinhas = useMutation({
    mutationFn: async (linhasData: CreateLinhaData[]) => {
      const { data, error } = await supabase
        .from("linhas_telefonicas")
        .upsert(linhasData, { onConflict: "numero" })
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["linhas-telefonicas"] });
      toast.success(`${data.length} linhas importadas com sucesso!`);
    },
    onError: (error: Error) => {
      toast.error(friendlyErrorMessage("importar linhas", error));
    },
  });

  // Stats
  const totalLinhas = linhas?.length || 0;
  const linhasAtribuidas = linhas?.filter(l => l.funcionario_id)?.length || 0;
  const linhasDisponiveis = totalLinhas - linhasAtribuidas;

  return {
    linhas,
    isLoading,
    error,
    createLinha,
    updateLinha,
    deleteLinha,
    bulkCreateLinhas,
    stats: {
      total: totalLinhas,
      atribuidas: linhasAtribuidas,
      disponiveis: linhasDisponiveis,
    },
  };
}
