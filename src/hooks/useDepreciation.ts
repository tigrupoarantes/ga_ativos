import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/external-client";
import { toast } from "sonner";
import { friendlyErrorMessage } from "@/lib/error-handler";

export interface DepreciationData {
  valor_aquisicao: number | null;
  data_aquisicao: string | null;
  depreciation_start_date: string | null;
  entry_into_operation_date: string | null;
  depreciation_policy_id: string | null;
  residual_percent: number | null;
  residual_value: number | null;
  depreciable_value: number | null;
  monthly_depreciation: number | null;
  accumulated_depreciation: number | null;
  valor_atual: number | null;
  is_depreciable: boolean | null;
  depreciation_override: boolean | null;
  depreciation_override_reason: string | null;
  depreciation_last_calculated_at: string | null;
  depreciation_stop_date: string | null;
  status: string | null;
  tipo?: { name?: string; useful_life_months?: number; depreciation_rate?: number } | null;
}

export interface DepreciationHistoryEntry {
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

export interface DepreciationPolicy {
  id: string;
  name: string;
  asset_category: string;
  asset_subcategory: string | null;
  depreciation_method: string;
  useful_life_months: number;
  residual_percent: number;
  is_active: boolean;
  company_id: string | null;
}

export interface CalculationResult {
  status: string;
  error?: string;
  reason?: string;
  asset_id?: string;
  purchase_value?: number;
  residual_percent?: number;
  residual_value?: number;
  depreciable_value?: number;
  monthly_depreciation?: number;
  months_elapsed?: number;
  accumulated_depreciation?: number;
  book_value?: number;
  useful_life_months?: number;
  start_date?: string;
}

const DEPRECIATION_FIELDS = `
  valor_aquisicao, data_aquisicao, valor_atual, status,
  depreciation_start_date, entry_into_operation_date,
  depreciation_policy_id, residual_percent, residual_value,
  depreciable_value, monthly_depreciation, accumulated_depreciation,
  is_depreciable, depreciation_override, depreciation_override_reason,
  depreciation_last_calculated_at, depreciation_stop_date,
  tipo:asset_types(name, useful_life_months, depreciation_rate)
`;

export function useDepreciationData(assetId: string | null) {
  return useQuery({
    queryKey: ["depreciation", assetId],
    enabled: !!assetId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("assets")
        .select(DEPRECIATION_FIELDS)
        .eq("id", assetId!)
        .single();

      if (error) throw error;
      return data as unknown as DepreciationData;
    },
  });
}

export function useRecalculateDepreciation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (assetId: string) => {
      const { data, error } = await supabase.rpc("calculate_asset_depreciation", {
        p_asset_id: assetId,
      });
      if (error) throw error;
      return data as unknown as CalculationResult;
    },
    onSuccess: (result, assetId) => {
      if (result.status === "ok") {
        toast.success("Depreciação recalculada com sucesso");
      } else if (result.status === "not_depreciable") {
        toast.info(result.reason || "Ativo não depreciável");
      } else if (result.error) {
        toast.error(result.error);
      }
      queryClient.invalidateQueries({ queryKey: ["depreciation", assetId] });
      queryClient.invalidateQueries({ queryKey: ["depreciation-history", assetId] });
      queryClient.invalidateQueries({ queryKey: ["ativos"] });
    },
    onError: (error) => {
      toast.error(friendlyErrorMessage("recalcular depreciação", error));
    },
  });
}

export function useDepreciationHistory(assetId: string | null) {
  return useQuery({
    queryKey: ["depreciation-history", assetId],
    enabled: !!assetId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("asset_depreciation_history")
        .select("*")
        .eq("asset_id", assetId!)
        .order("calculated_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      return data as unknown as DepreciationHistoryEntry[];
    },
  });
}

export function useDepreciationPolicies() {
  return useQuery({
    queryKey: ["depreciation-policies"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("asset_depreciation_policies")
        .select("*")
        .eq("is_active", true)
        .order("asset_category")
        .order("name");

      if (error) throw error;
      return data as unknown as DepreciationPolicy[];
    },
  });
}

export function useRecalculateAll() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("recalculate_all_depreciation");
      if (error) throw error;
      return data as unknown as { calculated: number; errors: number };
    },
    onSuccess: (result) => {
      toast.success(`Recálculo concluído: ${result.calculated} ativos calculados, ${result.errors} erros`);
      queryClient.invalidateQueries({ queryKey: ["ativos"] });
    },
    onError: (error) => {
      toast.error(friendlyErrorMessage("recalcular depreciação em lote", error));
    },
  });
}
