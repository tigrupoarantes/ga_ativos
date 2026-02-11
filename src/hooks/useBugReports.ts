import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/external-client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { friendlyErrorMessage } from '@/lib/error-handler';

export interface BugReport {
  id: string;
  user_id: string;
  type: 'bug' | 'melhoria';
  title: string;
  description: string;
  priority: 'baixa' | 'media' | 'alta' | 'critica';
  status: 'aberto' | 'em_analise' | 'resolvido' | 'recusado';
  page_url: string | null;
  admin_notes: string | null;
  user_email: string | null;
  created_at: string;
  updated_at: string;
}

export function useBugReports() {
  const { user, userRole } = useAuth();
  const queryClient = useQueryClient();
  const isAdmin = userRole === 'admin';

  const reportsQuery = useQuery({
    queryKey: ['bug-reports', isAdmin],
    queryFn: async () => {
      const query = supabase
        .from('bug_reports' as any)
        .select('*')
        .order('created_at', { ascending: false });

      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as BugReport[];
    },
    enabled: !!user,
  });

  const createReport = useMutation({
    mutationFn: async (report: {
      type: 'bug' | 'melhoria';
      title: string;
      description: string;
      priority: 'baixa' | 'media' | 'alta' | 'critica';
      page_url: string;
    }) => {
      const { error } = await supabase.from('bug_reports' as any).insert({
        ...report,
        user_id: user!.id,
        user_email: user!.email,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bug-reports'] });
      toast.success('Report enviado com sucesso!');
    },
    onError: (err: any) => {
      toast.error(friendlyErrorMessage('enviar report', err));
    },
  });

  const updateReport = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; status?: string; admin_notes?: string }) => {
      const { error } = await supabase
        .from('bug_reports' as any)
        .update({ ...updates, updated_at: new Date().toISOString() } as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bug-reports'] });
      toast.success('Report atualizado!');
    },
    onError: (err: any) => {
      toast.error(friendlyErrorMessage('atualizar report', err));
    },
  });

  const deleteReport = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('bug_reports' as any)
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bug-reports'] });
      toast.success('Report removido!');
    },
    onError: (err: any) => {
      toast.error(friendlyErrorMessage('remover report', err));
    },
  });

  return {
    reports: reportsQuery.data ?? [],
    isLoading: reportsQuery.isLoading,
    createReport,
    updateReport,
    deleteReport,
    isAdmin,
  };
}
