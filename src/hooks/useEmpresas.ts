import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/external-client";
import { toast } from "sonner";

export interface Empresa {
  id: string;
  nome: string;
  razao_social?: string;
  cnpj?: string;
  external_id?: string;
  endereco?: string;
  telefone?: string;
  email?: string;
  logo_url?: string;
  color?: string;
  is_auditable?: boolean;
  active?: boolean;
  created_at?: string;
  updated_at?: string;
}

interface EmpresaInsert {
  nome: string;
  razao_social?: string;
  cnpj?: string;
  endereco?: string;
  telefone?: string;
  email?: string;
  logo_url?: string;
  color?: string;
  is_auditable?: boolean;
}

interface EmpresaUpdate extends Partial<EmpresaInsert> {
  id: string;
}

export function useEmpresas() {
  const queryClient = useQueryClient();

  const { data: empresas = [], isLoading, error } = useQuery({
    queryKey: ["empresas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("empresas")
        .select("*")
        .eq("active", true)
        .order("nome");

      if (error) throw error;
      return data as Empresa[];
    },
  });

  const createEmpresa = useMutation({
    mutationFn: async (empresa: EmpresaInsert) => {
      const { data, error } = await supabase
        .from("empresas")
        .insert(empresa)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["empresas"] });
      queryClient.invalidateQueries({ queryKey: ["areas"] });
      toast.success("Empresa criada com sucesso!");
    },
    onError: (error) => {
      toast.error("Erro ao criar empresa: " + error.message);
    },
  });

  const updateEmpresa = useMutation({
    mutationFn: async ({ id, ...updates }: EmpresaUpdate) => {
      const { data, error } = await supabase
        .from("empresas")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["empresas"] });
      toast.success("Empresa atualizada!");
    },
    onError: (error) => {
      toast.error("Erro ao atualizar empresa: " + error.message);
    },
  });

  const deleteEmpresa = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("empresas")
        .update({ active: false })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["empresas"] });
      queryClient.invalidateQueries({ queryKey: ["areas"] });
      toast.success("Empresa excluída!");
    },
    onError: (error) => {
      toast.error("Erro ao excluir empresa: " + error.message);
    },
  });

  return {
    empresas,
    isLoading,
    error,
    createEmpresa,
    updateEmpresa,
    deleteEmpresa,
  };
}
