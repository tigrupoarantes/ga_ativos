import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/external-client";
import { toast } from "sonner";

export interface ContratoMetrica {
  id: string;
  contrato_id: string;
  nome: string;
  unidade: string;
  valor_unitario: number | null;
  meta_mensal: number | null;
  active: boolean;
  created_at: string;
}

export type ContratoMetricaInsert = Omit<ContratoMetrica, "id" | "active" | "created_at">;

export function useContratoMetricas(contratoId?: string) {
  const queryClient = useQueryClient();

  const { data: metricas = [], isLoading } = useQuery({
    queryKey: ["contrato_metricas", contratoId],
    enabled: !!contratoId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contrato_metricas" as any)
        .select("*")
        .eq("contrato_id", contratoId!)
        .eq("active", true)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return (data || []) as unknown as ContratoMetrica[];
    },
  });

  const createMetrica = useMutation({
    mutationFn: async (metrica: ContratoMetricaInsert) => {
      const { data, error } = await supabase
        .from("contrato_metricas" as any)
        .insert(metrica as any)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contrato_metricas", contratoId] });
      toast.success("Métrica adicionada!");
    },
    onError: (error: Error) => {
      toast.error("Erro ao adicionar métrica: " + error.message);
    },
  });

  const deleteMetrica = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("contrato_metricas" as any)
        .update({ active: false } as any)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contrato_metricas", contratoId] });
      toast.success("Métrica removida!");
    },
    onError: (error: Error) => {
      toast.error("Erro ao remover métrica: " + error.message);
    },
  });

  return { metricas, isLoading, createMetrica, deleteMetrica };
}
