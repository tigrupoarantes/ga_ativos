import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/external-client";
import { toast } from "sonner";
import { friendlyErrorMessage } from "@/lib/error-handler";

export interface VeiculoDepreciationData {
  valor_aquisicao: number | null;
  data_aquisicao: string | null;
  depreciation_start_date: string | null;
  depreciation_policy_id: string | null;
  residual_percent: number | null;
  residual_value: number | null;
  depreciable_value: number | null;
  monthly_depreciation: number | null;
  accumulated_depreciation: number | null;
  valor_contabil: number | null;
  valor_fipe: number | null;
  is_depreciable: boolean | null;
  depreciation_override: boolean | null;
  depreciation_override_reason: string | null;
  depreciation_last_calculated_at: string | null;
  depreciation_stop_date: string | null;
  status: string | null;
  tipo: string | null;
}

export interface VeiculoDepreciationHistoryEntry {
  id: string;
  reference_date: string;
  purchase_value: number | null;
  residual_value: number | null;
  depreciable_value: number | null;
  monthly_depreciation: number | null;
  accumulated_depreciation: number | null;
  book_value: number | null;
  months_elapsed: number | null;
  calculated_at: string;
  calculation_reason: string | null;
}

const FIELDS = `
  valor_aquisicao, data_aquisicao, valor_fipe, valor_contabil, status, tipo,
  depreciation_start_date, depreciation_policy_id,
  residual_percent, residual_value, depreciable_value,
  monthly_depreciation, accumulated_depreciation,
  is_depreciable, depreciation_override, depreciation_override_reason,
  depreciation_last_calculated_at, depreciation_stop_date
`;

export function useVeiculoDepreciationData(vehicleId: string | null) {
  return useQuery({
    queryKey: ["vehicle-depreciation", vehicleId],
    enabled: !!vehicleId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("veiculos")
        .select(FIELDS)
        .eq("id", vehicleId!)
        .single();
      if (error) throw error;
      return data as unknown as VeiculoDepreciationData;
    },
  });
}

export function useRecalculateVeiculoDepreciation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (vehicleId: string) => {
      const { data, error } = await supabase.rpc("calculate_vehicle_depreciation", {
        p_vehicle_id: vehicleId,
      });
      if (error) throw error;
      return data as any;
    },
    onSuccess: (result, vehicleId) => {
      if (result.status === "ok") {
        toast.success("Depreciação recalculada com sucesso");
      } else if (result.status === "not_depreciable") {
        toast.info(result.reason || "Veículo não depreciável");
      } else if (result.error) {
        toast.error(result.error);
      }
      queryClient.invalidateQueries({ queryKey: ["vehicle-depreciation", vehicleId] });
      queryClient.invalidateQueries({ queryKey: ["vehicle-depreciation-history", vehicleId] });
      queryClient.invalidateQueries({ queryKey: ["veiculos"] });
    },
    onError: (error) => {
      toast.error(friendlyErrorMessage("recalcular depreciação", error));
    },
  });
}

export function useVeiculoDepreciationHistory(vehicleId: string | null) {
  return useQuery({
    queryKey: ["vehicle-depreciation-history", vehicleId],
    enabled: !!vehicleId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vehicle_depreciation_history")
        .select("*")
        .eq("vehicle_id", vehicleId!)
        .order("calculated_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data as unknown as VeiculoDepreciationHistoryEntry[];
    },
  });
}
