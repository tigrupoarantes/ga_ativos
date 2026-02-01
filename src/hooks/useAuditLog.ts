import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/external-client";
import { Json } from "@/integrations/supabase/types";

export interface AuditLogEntry {
  id: string;
  entidade: string;
  entidade_id: string;
  acao: string;
  payload: Json | null;
  usuario: string | null;
  timestamp: string | null;
}

type AuditLogInsert = {
  entidade: string;
  entidade_id: string;
  acao: string;
  payload?: Json | null;
  usuario?: string | null;
};

export function useAuditLog(entidade?: string, entidadeId?: string) {
  const queryClient = useQueryClient();

  const { data: logs = [], isLoading, error } = useQuery({
    queryKey: ["audit_log", entidade, entidadeId],
    queryFn: async () => {
      let query = supabase
        .from("audit_log")
        .select("*")
        .order("timestamp", { ascending: false })
        .limit(100);

      if (entidade) {
        query = query.eq("entidade", entidade);
      }

      if (entidadeId) {
        query = query.eq("entidade_id", entidadeId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as AuditLogEntry[];
    },
  });

  const registrarLog = useMutation({
    mutationFn: async (log: AuditLogInsert) => {
      const { data: userData } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from("audit_log")
        .insert({
          ...log,
          usuario: userData?.user?.id || null,
          timestamp: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["audit_log"] });
    },
  });

  return {
    logs,
    isLoading,
    error,
    registrarLog,
  };
}
