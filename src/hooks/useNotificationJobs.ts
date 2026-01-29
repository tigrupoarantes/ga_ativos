import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Json } from "@/integrations/supabase/types";

export interface NotificationJob {
  id: string;
  channel: "whatsapp" | "email";
  to_phone: string | null;
  to_email: string | null;
  template: string;
  payload: Json | null;
  status: "pendente" | "enviado" | "erro";
  tries: number;
  last_error: string | null;
  created_at: string;
  sent_at: string | null;
}

interface CreateJobInput {
  channel: "whatsapp" | "email";
  to_phone?: string;
  to_email?: string;
  template: string;
  payload?: Json;
}

export function useNotificationJobs(filters?: {
  status?: string;
  channel?: string;
  limit?: number;
}) {
  const queryClient = useQueryClient();

  const { data: jobs = [], isLoading, refetch } = useQuery({
    queryKey: ["notification-jobs", filters],
    queryFn: async () => {
      let query = supabase
        .from("notification_jobs")
        .select("*")
        .order("created_at", { ascending: false });

      if (filters?.status) {
        query = query.eq("status", filters.status);
      }
      if (filters?.channel) {
        query = query.eq("channel", filters.channel);
      }
      if (filters?.limit) {
        query = query.limit(filters.limit);
      } else {
        query = query.limit(100);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as NotificationJob[];
    },
  });

  const createJobMutation = useMutation({
    mutationFn: async (input: CreateJobInput) => {
      const insertData: {
        channel: string;
        template: string;
        to_phone?: string;
        to_email?: string;
        payload?: Json;
      } = {
        channel: input.channel,
        template: input.template,
      };
      if (input.to_phone) insertData.to_phone = input.to_phone;
      if (input.to_email) insertData.to_email = input.to_email;
      if (input.payload) insertData.payload = input.payload;

      const { data, error } = await supabase
        .from("notification_jobs")
        .insert([insertData])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notification-jobs"] });
    },
    onError: (error) => {
      toast.error("Erro ao criar job de notificação: " + error.message);
    },
  });

  const requestKmViaWhatsApp = useMutation({
    mutationFn: async (params: {
      vehicleId: string;
      vehiclePlaca: string;
      employeePhone: string;
      employeeName: string;
    }) => {
      const { data, error } = await supabase
        .from("notification_jobs")
        .insert({
          channel: "whatsapp",
          to_phone: params.employeePhone,
          template: "km_request",
          payload: {
            vehicle_id: params.vehicleId,
            vehicle_placa: params.vehiclePlaca,
            employee_name: params.employeeName,
          },
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notification-jobs"] });
      toast.success("Solicitação de KM enviada para a fila");
    },
    onError: (error) => {
      toast.error("Erro ao solicitar KM: " + error.message);
    },
  });

  const stats = {
    total: jobs.length,
    pendentes: jobs.filter((j) => j.status === "pendente").length,
    enviados: jobs.filter((j) => j.status === "enviado").length,
    erros: jobs.filter((j) => j.status === "erro").length,
  };

  return {
    jobs,
    isLoading,
    refetch,
    createJob: createJobMutation.mutateAsync,
    requestKmViaWhatsApp: requestKmViaWhatsApp.mutateAsync,
    isRequesting: requestKmViaWhatsApp.isPending,
    stats,
  };
}
