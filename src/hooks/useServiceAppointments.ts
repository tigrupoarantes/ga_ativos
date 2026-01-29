import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export type ServiceType = "preventiva" | "revisao" | "corretiva" | "lavagem";
export type AppointmentOrigin = "manual" | "preventiva_plan" | "wash_plan" | "whatsapp_km_rule";
export type AppointmentStatus = "agendada" | "confirmada" | "em_execucao" | "concluida" | "reagendada" | "cancelada" | "faltou";
export type AppointmentPriority = "baixa" | "normal" | "alta" | "urgente";

export interface ServiceAppointment {
  id: string;
  vehicle_id: string;
  service_type: ServiceType;
  origin: AppointmentOrigin;
  scheduled_at: string;
  status: AppointmentStatus;
  priority: AppointmentPriority | null;
  assigned_to_employee_id: string | null;
  requested_by_employee_id: string | null;
  preventive_plan_id: string | null;
  wash_plan_id: string | null;
  work_order_id: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  active: boolean;
  // Joins
  veiculos?: {
    id: string;
    placa: string;
    marca: string;
    modelo: string;
  };
  assigned_employee?: {
    id: string;
    nome: string;
  };
  requested_employee?: {
    id: string;
    nome: string;
  };
}

export interface ServiceAppointmentInsert {
  vehicle_id: string;
  service_type: ServiceType;
  origin?: AppointmentOrigin;
  scheduled_at: string;
  status?: AppointmentStatus;
  priority?: AppointmentPriority;
  assigned_to_employee_id?: string | null;
  requested_by_employee_id?: string | null;
  preventive_plan_id?: string | null;
  wash_plan_id?: string | null;
  work_order_id?: string | null;
  notes?: string | null;
}

export interface ServiceAppointmentFilters {
  service_type?: ServiceType;
  status?: AppointmentStatus;
  vehicle_id?: string;
  date_from?: string;
  date_to?: string;
}

export function useServiceAppointments(filters?: ServiceAppointmentFilters) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const {
    data: appointments = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["service_appointments", filters],
    queryFn: async () => {
      let query = supabase
        .from("service_appointments")
        .select(`
          *,
          veiculos:vehicle_id (id, placa, marca, modelo),
          funcionarios!service_appointments_assigned_to_employee_id_fkey (id, nome)
        `)
        .eq("active", true)
        .order("scheduled_at", { ascending: true });

      if (filters?.service_type) {
        query = query.eq("service_type", filters.service_type);
      }
      if (filters?.status) {
        query = query.eq("status", filters.status);
      }
      if (filters?.vehicle_id) {
        query = query.eq("vehicle_id", filters.vehicle_id);
      }
      if (filters?.date_from) {
        query = query.gte("scheduled_at", filters.date_from);
      }
      if (filters?.date_to) {
        query = query.lte("scheduled_at", filters.date_to);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      // Map data to our interface
      return (data || []).map((item: any) => ({
        ...item,
        assigned_employee: item.funcionarios,
      })) as ServiceAppointment[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (appointment: ServiceAppointmentInsert) => {
      const { data, error } = await supabase
        .from("service_appointments")
        .insert(appointment)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["service_appointments"] });
      toast({
        title: "Agendamento criado",
        description: "O agendamento foi criado com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao criar agendamento",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: Partial<ServiceAppointmentInsert> & { id: string }) => {
      const { data, error } = await supabase
        .from("service_appointments")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["service_appointments"] });
      toast({
        title: "Agendamento atualizado",
        description: "O agendamento foi atualizado com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao atualizar agendamento",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("service_appointments")
        .update({ active: false })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["service_appointments"] });
      toast({
        title: "Agendamento excluído",
        description: "O agendamento foi excluído com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao excluir agendamento",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const concludeAppointment = async (id: string) => {
    return updateMutation.mutateAsync({ id, status: "concluida" });
  };

  const rescheduleAppointment = async (id: string, newDate: string) => {
    return updateMutation.mutateAsync({
      id,
      scheduled_at: newDate,
      status: "reagendada",
    });
  };

  const cancelAppointment = async (id: string) => {
    return updateMutation.mutateAsync({ id, status: "cancelada" });
  };

  return {
    appointments,
    isLoading,
    error,
    refetch,
    createAppointment: createMutation.mutateAsync,
    updateAppointment: updateMutation.mutateAsync,
    deleteAppointment: deleteMutation.mutateAsync,
    concludeAppointment,
    rescheduleAppointment,
    cancelAppointment,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
