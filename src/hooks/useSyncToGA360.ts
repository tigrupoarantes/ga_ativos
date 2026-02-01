import { useState } from "react";
import { supabase } from "@/integrations/supabase/external-client";
import { toast } from "sonner";

export type SyncType = 'empresas' | 'funcionarios' | 'all';

interface SyncResult {
  empresas: { inserted: number; updated: number; errors: string[] };
  funcionarios: { inserted: number; updated: number; errors: string[] };
}

interface SyncResponse {
  success: boolean;
  syncType: SyncType;
  result: SyncResult;
  summary: {
    empresas: string;
    funcionarios: string;
    totalErrors: number;
  };
}

export function useSyncToGA360() {
  const [isLoading, setIsLoading] = useState(false);
  const [lastResult, setLastResult] = useState<SyncResponse | null>(null);

  const sync = async (syncType: SyncType = 'all') => {
    setIsLoading(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('sync-to-ga360', {
        body: { syncType }
      });

      if (error) {
        throw new Error(error.message);
      }

      const response = data as SyncResponse;
      setLastResult(response);

      if (response.success) {
        const messages: string[] = [];
        
        if (syncType === 'empresas' || syncType === 'all') {
          messages.push(`Empresas: ${response.summary.empresas}`);
        }
        if (syncType === 'funcionarios' || syncType === 'all') {
          messages.push(`Funcionários: ${response.summary.funcionarios}`);
        }
        
        toast.success('Sincronização concluída!', {
          description: messages.join(' | ')
        });

        if (response.summary.totalErrors > 0) {
          toast.warning(`${response.summary.totalErrors} erro(s) durante a sincronização`, {
            description: 'Verifique os detalhes para mais informações'
          });
        }
      }

      return response;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro desconhecido';
      toast.error('Erro na sincronização', { description: message });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    sync,
    isLoading,
    lastResult
  };
}
