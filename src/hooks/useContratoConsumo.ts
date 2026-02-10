import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/external-client";
import { toast } from "sonner";

export interface ContratoConsumo {
  id: string;
  contrato_id: string;
  metrica_id: string;
  mes_referencia: string;
  quantidade: number;
  valor_total: number | null;
  observacoes: string | null;
  fonte: string;
  arquivo_origem: string | null;
  created_at: string;
}

export function useContratoConsumo(contratoId?: string) {
  const queryClient = useQueryClient();

  const { data: consumos = [], isLoading } = useQuery({
    queryKey: ["contrato_consumo", contratoId],
    enabled: !!contratoId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contrato_consumo" as any)
        .select("*")
        .eq("contrato_id", contratoId!)
        .order("mes_referencia", { ascending: false });

      if (error) throw error;
      return (data || []) as unknown as ContratoConsumo[];
    },
  });

  const createConsumo = useMutation({
    mutationFn: async (consumo: Omit<ContratoConsumo, "id" | "created_at">) => {
      const { data, error } = await supabase
        .from("contrato_consumo" as any)
        .upsert(consumo as any, { onConflict: "metrica_id,mes_referencia" })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contrato_consumo", contratoId] });
    },
    onError: (error: Error) => {
      toast.error("Erro ao salvar consumo: " + error.message);
    },
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["contrato_consumo", contratoId] });
  };

  return { consumos, isLoading, createConsumo, invalidate };
}
