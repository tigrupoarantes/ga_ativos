import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/external-client";
import { toast } from "sonner";
import { friendlyErrorMessage } from "@/lib/error-handler";

export interface WashPlan {
  id: string;
  vehicle_id: string;
  wash_type: "simples" | "completa" | "interna" | "motor" | "higienizacao";
  frequency_days: number | null;
  preferred_weekday: number | null;
  estimated_minutes: number | null;
  notes: string | null;
  status: "ativo" | "pausado" | "cancelado";
  created_at: string;
  updated_at: string;
  active: boolean;
  veiculo?: {
    id: string;
    placa: string;
    marca: string;
    modelo: string;
  };
}

export type WashPlanInsert = Omit<WashPlan, "id" | "created_at" | "updated_at" | "active" | "veiculo">;
export type WashPlanUpdate = Partial<WashPlanInsert>;

export function useWashPlans() {
  const queryClient = useQueryClient();

  const { data: washPlans = [], isLoading, error } = useQuery({
    queryKey: ["wash_plans"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wash_plans")
        .select(`
          *,
          veiculo:veiculos(id, placa, marca, modelo)
        `)
        .eq("active", true)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as WashPlan[];
    },
  });

  const createWashPlan = useMutation({
    mutationFn: async (washPlan: WashPlanInsert) => {
      const { data, error } = await supabase
        .from("wash_plans")
        .insert(washPlan)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wash_plans"] });
      toast.success("Plano de lavagem criado com sucesso!");
    },
    onError: (error) => {
      toast.error(friendlyErrorMessage("criar plano de lavagem", error));
    },
  });

  const updateWashPlan = useMutation({
    mutationFn: async ({ id, ...updates }: WashPlanUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from("wash_plans")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wash_plans"] });
      toast.success("Plano de lavagem atualizado!");
    },
    onError: (error) => {
      toast.error(friendlyErrorMessage("atualizar plano de lavagem", error));
    },
  });

  const deleteWashPlan = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("wash_plans")
        .update({ active: false })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wash_plans"] });
      toast.success("Plano de lavagem excluído!");
    },
    onError: (error) => {
      toast.error(friendlyErrorMessage("excluir plano de lavagem", error));
    },
  });

  const pauseWashPlan = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from("wash_plans")
        .update({ status: "pausado" })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wash_plans"] });
      toast.success("Plano de lavagem pausado!");
    },
    onError: (error) => {
      toast.error(friendlyErrorMessage("pausar plano de lavagem", error));
    },
  });

  const activateWashPlan = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from("wash_plans")
        .update({ status: "ativo" })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wash_plans"] });
      toast.success("Plano de lavagem ativado!");
    },
    onError: (error) => {
      toast.error(friendlyErrorMessage("ativar plano de lavagem", error));
    },
  });

  return {
    washPlans,
    isLoading,
    error,
    createWashPlan,
    updateWashPlan,
    deleteWashPlan,
    pauseWashPlan,
    activateWashPlan,
  };
}
