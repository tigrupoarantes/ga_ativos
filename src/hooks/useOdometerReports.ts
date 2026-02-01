import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/external-client";
import { toast } from "sonner";

export interface OdometerReport {
  id: string;
  vehicle_id: string;
  employee_id: string;
  reported_km: number;
  reported_at: string;
  source: "whatsapp" | "manual";
  raw_message?: string;
  validation_status: "ok" | "suspeito" | "rejeitado";
  created_by?: string;
  created_at: string;
  veiculo?: {
    id: string;
    placa: string;
    marca: string;
    modelo: string;
    km_atual?: number;
  };
  funcionario?: {
    id: string;
    nome: string;
  };
}

interface CreateOdometerReportInput {
  vehicle_id: string;
  employee_id: string;
  reported_km: number;
  source?: "whatsapp" | "manual";
  raw_message?: string;
  validation_status?: "ok" | "suspeito" | "rejeitado";
}

interface UpdateOdometerReportInput {
  id: string;
  validation_status?: "ok" | "suspeito" | "rejeitado";
}

export function useOdometerReports(filters?: {
  vehicleId?: string;
  employeeId?: string;
  source?: string;
  startDate?: string;
  endDate?: string;
}) {
  const queryClient = useQueryClient();

  const { data: reports = [], isLoading, error } = useQuery({
    queryKey: ["odometer-reports", filters],
    queryFn: async () => {
      let query = supabase
        .from("vehicle_odometer_reports")
        .select(`
          *,
          veiculo:veiculos!vehicle_odometer_reports_vehicle_id_fkey(id, placa, marca, modelo, km_atual),
          funcionario:funcionarios!vehicle_odometer_reports_employee_id_fkey(id, nome)
        `)
        .order("reported_at", { ascending: false });

      if (filters?.vehicleId) {
        query = query.eq("vehicle_id", filters.vehicleId);
      }
      if (filters?.employeeId) {
        query = query.eq("employee_id", filters.employeeId);
      }
      if (filters?.source) {
        query = query.eq("source", filters.source);
      }
      if (filters?.startDate) {
        query = query.gte("reported_at", filters.startDate);
      }
      if (filters?.endDate) {
        query = query.lte("reported_at", filters.endDate);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as OdometerReport[];
    },
  });

  const createReport = useMutation({
    mutationFn: async (input: CreateOdometerReportInput) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from("vehicle_odometer_reports")
        .insert({
          ...input,
          source: input.source || "manual",
          validation_status: input.validation_status || "ok",
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["odometer-reports"] });
      queryClient.invalidateQueries({ queryKey: ["veiculos"] });
      toast.success("Leitura de KM registrada com sucesso!");
    },
    onError: (error) => {
      toast.error("Erro ao registrar leitura: " + error.message);
    },
  });

  const updateReport = useMutation({
    mutationFn: async ({ id, ...updates }: UpdateOdometerReportInput) => {
      const { data, error } = await supabase
        .from("vehicle_odometer_reports")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["odometer-reports"] });
      toast.success("Status da leitura atualizado!");
    },
    onError: (error) => {
      toast.error("Erro ao atualizar: " + error.message);
    },
  });

  return {
    reports,
    isLoading,
    error,
    createReport,
    updateReport,
  };
}
