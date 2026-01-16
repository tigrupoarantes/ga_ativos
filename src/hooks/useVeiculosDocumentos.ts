import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface VeiculoDocumento {
  id: string;
  veiculo_id: string | null;
  nome_arquivo: string;
  tipo_documento: string;
  url: string;
  tamanho_bytes: number | null;
  created_at: string | null;
  active: boolean | null;
  veiculo?: {
    id: string;
    placa: string;
    marca: string;
    modelo: string;
  };
}

type VeiculoDocumentoInsert = {
  veiculo_id?: string | null;
  nome_arquivo: string;
  tipo_documento: string;
  url: string;
  tamanho_bytes?: number | null;
};

type VeiculoDocumentoUpdate = Partial<VeiculoDocumentoInsert> & { id: string };

export function useVeiculosDocumentos(veiculoId?: string) {
  const queryClient = useQueryClient();

  const { data: documentos = [], isLoading, error } = useQuery({
    queryKey: ["veiculos_documentos", veiculoId],
    queryFn: async () => {
      let query = supabase
        .from("veiculos_documentos")
        .select(`
          *,
          veiculo:veiculos(id, placa, marca, modelo)
        `)
        .eq("active", true)
        .order("created_at", { ascending: false });

      if (veiculoId) {
        query = query.eq("veiculo_id", veiculoId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as VeiculoDocumento[];
    },
  });

  const createDocumento = useMutation({
    mutationFn: async (documento: VeiculoDocumentoInsert) => {
      const { data, error } = await supabase
        .from("veiculos_documentos")
        .insert(documento)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["veiculos_documentos"] });
      toast.success("Documento adicionado com sucesso!");
    },
    onError: (error) => {
      toast.error("Erro ao adicionar documento: " + error.message);
    },
  });

  const updateDocumento = useMutation({
    mutationFn: async ({ id, ...updates }: VeiculoDocumentoUpdate) => {
      const { data, error } = await supabase
        .from("veiculos_documentos")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["veiculos_documentos"] });
      toast.success("Documento atualizado!");
    },
    onError: (error) => {
      toast.error("Erro ao atualizar documento: " + error.message);
    },
  });

  const deleteDocumento = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("veiculos_documentos")
        .update({ active: false })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["veiculos_documentos"] });
      toast.success("Documento excluído!");
    },
    onError: (error) => {
      toast.error("Erro ao excluir documento: " + error.message);
    },
  });

  return {
    documentos,
    isLoading,
    error,
    createDocumento,
    updateDocumento,
    deleteDocumento,
  };
}
