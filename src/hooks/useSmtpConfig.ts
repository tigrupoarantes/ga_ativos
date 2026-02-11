import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/external-client";
import { useToast } from "@/hooks/use-toast";
import { friendlyErrorMessage } from "@/lib/error-handler";

export interface SmtpConfig {
  id: string;
  host: string;
  port: number;
  secure: boolean;
  username: string;
  password_encrypted: string;
  from_email: string;
  from_name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  updated_by: string | null;
}

export interface SmtpConfigInput {
  host: string;
  port: number;
  secure: boolean;
  username: string;
  password_encrypted: string;
  from_email: string;
  from_name: string;
  is_active?: boolean;
}

export function useSmtpConfig() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: smtpConfig, isLoading } = useQuery({
    queryKey: ["smtp-config"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("smtp_config")
        .select("*")
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data as SmtpConfig | null;
    },
  });

  const saveConfig = useMutation({
    mutationFn: async (config: SmtpConfigInput) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (smtpConfig?.id) {
        // Update existing
        const { data, error } = await supabase
          .from("smtp_config")
          .update({
            ...config,
            updated_by: user?.id,
          })
          .eq("id", smtpConfig.id)
          .select()
          .single();
        
        if (error) throw error;
        return data;
      } else {
        // Insert new
        const { data, error } = await supabase
          .from("smtp_config")
          .insert({
            ...config,
            updated_by: user?.id,
          })
          .select()
          .single();
        
        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["smtp-config"] });
      toast({
        title: "Configuração salva",
        description: "As configurações SMTP foram salvas com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao salvar",
        description: friendlyErrorMessage("salvar configuração SMTP", error),
        variant: "destructive",
      });
    },
  });

  const testConnection = useMutation({
    mutationFn: async (config: SmtpConfigInput & { test_email: string }) => {
      const { data, error } = await supabase.functions.invoke("test-smtp", {
        body: config,
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      toast({
        title: "Teste realizado",
        description: "Email de teste enviado com sucesso! Verifique sua caixa de entrada.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro no teste",
        description: friendlyErrorMessage("testar conexão SMTP", error),
        variant: "destructive",
      });
    },
  });

  return {
    smtpConfig,
    isLoading,
    saveConfig,
    testConnection,
  };
}
