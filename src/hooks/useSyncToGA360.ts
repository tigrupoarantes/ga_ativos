import { useState, useCallback } from "react";
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

export interface SyncProgress {
  phase: 'idle' | 'empresas' | 'funcionarios' | 'complete';
  current: number;
  total: number;
  percentage: number;
  message: string;
}

interface ProgressEvent {
  type: 'progress' | 'complete' | 'error';
  phase?: 'empresas' | 'funcionarios';
  current?: number;
  total?: number;
  message?: string;
  success?: boolean;
  result?: SyncResult;
  summary?: {
    empresas: string;
    funcionarios: string;
    totalErrors: number;
  };
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export function useSyncToGA360() {
  const [isLoading, setIsLoading] = useState(false);
  const [lastResult, setLastResult] = useState<SyncResponse | null>(null);
  const [progress, setProgress] = useState<SyncProgress>({
    phase: 'idle',
    current: 0,
    total: 0,
    percentage: 0,
    message: ''
  });

  const resetProgress = useCallback(() => {
    setProgress({
      phase: 'idle',
      current: 0,
      total: 0,
      percentage: 0,
      message: ''
    });
  }, []);

  const sync = useCallback(async (syncType: SyncType = 'all') => {
    setIsLoading(true);
    resetProgress();
    
    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/sync-to-ga360`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ syncType })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      const decoder = new TextDecoder();
      let buffer = '';
      let finalResult: SyncResponse | null = null;

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        
        // Process SSE events from buffer
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const event: ProgressEvent = JSON.parse(line.slice(6));
              
              if (event.type === 'progress' && event.phase) {
                const percentage = event.total && event.total > 0 
                  ? Math.round((event.current || 0) / event.total * 100) 
                  : 0;
                
                setProgress({
                  phase: event.phase,
                  current: event.current || 0,
                  total: event.total || 0,
                  percentage,
                  message: event.message || ''
                });
              } else if (event.type === 'complete') {
                setProgress({
                  phase: 'complete',
                  current: 0,
                  total: 0,
                  percentage: 100,
                  message: 'Sincronização concluída!'
                });

                if (event.result && event.summary) {
                  finalResult = {
                    success: event.success ?? true,
                    syncType,
                    result: event.result,
                    summary: event.summary
                  };
                  setLastResult(finalResult);
                }
              } else if (event.type === 'error') {
                throw new Error(event.message || 'Erro desconhecido');
              }
            } catch (parseError) {
              console.error('Error parsing SSE event:', parseError, line);
            }
          }
        }
      }

      if (finalResult) {
        const messages: string[] = [];
        
        if (syncType === 'empresas' || syncType === 'all') {
          messages.push(`Empresas: ${finalResult.summary.empresas}`);
        }
        if (syncType === 'funcionarios' || syncType === 'all') {
          messages.push(`Funcionários: ${finalResult.summary.funcionarios}`);
        }
        
        toast.success('Sincronização concluída!', {
          description: messages.join(' | ')
        });

        if (finalResult.summary.totalErrors > 0) {
          toast.warning(`${finalResult.summary.totalErrors} erro(s) durante a sincronização`, {
            description: 'Verifique os detalhes para mais informações'
          });
        }

        return finalResult;
      }

    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro desconhecido';
      toast.error('Erro na sincronização', { description: message });
      setProgress(prev => ({ ...prev, phase: 'idle', message: '' }));
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [resetProgress]);

  return {
    sync,
    isLoading,
    lastResult,
    progress,
    resetProgress
  };
}
