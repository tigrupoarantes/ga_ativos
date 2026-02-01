import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/external-client";
import { useToast } from "@/hooks/use-toast";
import { addDays, differenceInDays, isPast } from "date-fns";

export interface Preventiva {
  id: string;
  veiculo_id: string | null;
  tipo_manutencao: string;
  descricao: string | null;
  periodicidade_km: number | null;
  periodicidade_dias: number | null;
  ultima_realizacao: string | null;
  ultimo_km: number | null;
  proxima_realizacao: string | null;
  proximo_km: number | null;
  status: string | null;
  observacoes: string | null;
  active: boolean | null;
  created_at: string | null;
  updated_at: string | null;
  veiculos?: {
    placa: string;
    marca: string;
    modelo: string;
    km_atual: number | null;
  } | null;
}

export type PreventivaInsert = Omit<Preventiva, "id" | "created_at" | "updated_at" | "veiculos">;

export function usePreventivas() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: preventivas = [], isLoading, error } = useQuery({
    queryKey: ["preventivas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("preventivas")
        .select(`
          *,
          veiculos(placa, marca, modelo, km_atual)
        `)
        .eq("active", true)
        .order("proxima_realizacao");

      if (error) throw error;
      return data as Preventiva[];
    },
  });

  const createPreventiva = useMutation({
    mutationFn: async (preventiva: PreventivaInsert) => {
      // Calcular próxima realização
      let proxima_realizacao = preventiva.proxima_realizacao;
      let proximo_km = preventiva.proximo_km;

      if (!proxima_realizacao && preventiva.periodicidade_dias) {
        const base = preventiva.ultima_realizacao ? new Date(preventiva.ultima_realizacao) : new Date();
        proxima_realizacao = addDays(base, preventiva.periodicidade_dias).toISOString().split("T")[0];
      }

      if (!proximo_km && preventiva.periodicidade_km && preventiva.ultimo_km) {
        proximo_km = preventiva.ultimo_km + preventiva.periodicidade_km;
      }

      const { data, error } = await supabase
        .from("preventivas")
        .insert({ ...preventiva, proxima_realizacao, proximo_km })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["preventivas"] });
      toast({ title: "Preventiva agendada com sucesso!" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao agendar preventiva", description: error.message, variant: "destructive" });
    },
  });

  const updatePreventiva = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Preventiva> & { id: string }) => {
      const { data, error } = await supabase
        .from("preventivas")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["preventivas"] });
      toast({ title: "Preventiva atualizada!" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao atualizar preventiva", description: error.message, variant: "destructive" });
    },
  });

  const deletePreventiva = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("preventivas")
        .update({ active: false })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["preventivas"] });
      toast({ title: "Preventiva removida!" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao remover preventiva", description: error.message, variant: "destructive" });
    },
  });

  const realizarPreventiva = useMutation({
    mutationFn: async ({ id, km_atual }: { id: string; km_atual?: number }) => {
      const preventiva = preventivas.find((p) => p.id === id);
      if (!preventiva) throw new Error("Preventiva não encontrada");

      const hoje = new Date().toISOString().split("T")[0];
      let proxima_realizacao = null;
      let proximo_km = null;

      if (preventiva.periodicidade_dias) {
        proxima_realizacao = addDays(new Date(), preventiva.periodicidade_dias).toISOString().split("T")[0];
      }

      if (preventiva.periodicidade_km && km_atual) {
        proximo_km = km_atual + preventiva.periodicidade_km;
      }

      const { data, error } = await supabase
        .from("preventivas")
        .update({
          status: "realizada",
          ultima_realizacao: hoje,
          ultimo_km: km_atual || preventiva.ultimo_km,
          proxima_realizacao,
          proximo_km,
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["preventivas"] });
      toast({ title: "Preventiva realizada!" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao registrar realização", description: error.message, variant: "destructive" });
    },
  });

  // Calcular preventivas vencidas ou próximas do vencimento
  const preventivasVencidas = preventivas.filter((p) => {
    if (p.status === "realizada") return false;
    if (p.proxima_realizacao && isPast(new Date(p.proxima_realizacao))) return true;
    if (p.proximo_km && p.veiculos?.km_atual && p.veiculos.km_atual >= p.proximo_km) return true;
    return false;
  });

  const preventivasProximas = preventivas.filter((p) => {
    if (p.status === "realizada") return false;
    if (p.proxima_realizacao) {
      const dias = differenceInDays(new Date(p.proxima_realizacao), new Date());
      if (dias > 0 && dias <= 7) return true;
    }
    if (p.proximo_km && p.veiculos?.km_atual) {
      const diff = p.proximo_km - p.veiculos.km_atual;
      if (diff > 0 && diff <= 500) return true;
    }
    return false;
  });

  return {
    preventivas,
    preventivasVencidas,
    preventivasProximas,
    isLoading,
    error,
    createPreventiva,
    updatePreventiva,
    deletePreventiva,
    realizarPreventiva,
  };
}
