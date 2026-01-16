import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface OrdemServico {
  id: string;
  numero: string | null;
  veiculo_id: string | null;
  tipo: string | null;
  status: string | null;
  prioridade: string | null;
  descricao: string | null;
  diagnostico: string | null;
  solucao: string | null;
  km_entrada: number | null;
  km_saida: number | null;
  data_abertura: string | null;
  data_previsao: string | null;
  data_fechamento: string | null;
  responsavel_id: string | null;
  solicitante_id: string | null;
  custo_pecas: number | null;
  custo_mao_obra: number | null;
  custo_total: number | null;
  preventiva_id: string | null;
  observacoes: string | null;
  active: boolean | null;
  created_at: string | null;
  updated_at: string | null;
  veiculos?: {
    placa: string;
    marca: string;
    modelo: string;
  } | null;
  responsavel?: {
    nome: string;
  } | null;
  solicitante?: {
    nome: string;
  } | null;
}

export type OrdemServicoInsert = Omit<OrdemServico, "id" | "numero" | "created_at" | "updated_at" | "veiculos" | "responsavel" | "solicitante">;

export function useOrdensServico() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: ordensServico = [], isLoading, error } = useQuery({
    queryKey: ["ordens_servico"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ordens_servico")
        .select(`
          *,
          veiculos(placa, marca, modelo),
          responsavel:funcionarios!ordens_servico_responsavel_id_fkey(nome),
          solicitante:funcionarios!ordens_servico_solicitante_id_fkey(nome)
        `)
        .eq("active", true)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as OrdemServico[];
    },
  });

  const createOrdem = useMutation({
    mutationFn: async (ordem: OrdemServicoInsert) => {
      const { data, error } = await supabase
        .from("ordens_servico")
        .insert(ordem)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ordens_servico"] });
      toast({ title: "Ordem de serviço criada com sucesso!" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao criar ordem", description: error.message, variant: "destructive" });
    },
  });

  const updateOrdem = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<OrdemServico> & { id: string }) => {
      const { data, error } = await supabase
        .from("ordens_servico")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ordens_servico"] });
      toast({ title: "Ordem de serviço atualizada!" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao atualizar ordem", description: error.message, variant: "destructive" });
    },
  });

  const deleteOrdem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("ordens_servico")
        .update({ active: false })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ordens_servico"] });
      toast({ title: "Ordem de serviço removida!" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao remover ordem", description: error.message, variant: "destructive" });
    },
  });

  const fecharOrdem = useMutation({
    mutationFn: async ({ id, solucao, km_saida }: { id: string; solucao?: string; km_saida?: number }) => {
      const { data, error } = await supabase
        .from("ordens_servico")
        .update({
          status: "fechada",
          solucao,
          km_saida,
          data_fechamento: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ordens_servico"] });
      toast({ title: "Ordem de serviço fechada!" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao fechar ordem", description: error.message, variant: "destructive" });
    },
  });

  return {
    ordensServico,
    isLoading,
    error,
    createOrdem,
    updateOrdem,
    deleteOrdem,
    fecharOrdem,
  };
}
