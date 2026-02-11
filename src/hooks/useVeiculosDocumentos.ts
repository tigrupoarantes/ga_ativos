import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/external-client";
import { toast } from "sonner";
import { friendlyErrorMessage } from "@/lib/error-handler";

export interface VeiculoDocumento {
  id: string;
  veiculo_placa: string | null;
  nome_arquivo: string;
  tipo_documento: string;
  url: string;
  tamanho_bytes: number | null;
  created_at: string | null;
  active: boolean | null;
}

type VeiculoDocumentoInsert = {
  veiculo_placa?: string | null;
  nome_arquivo: string;
  tipo_documento: string;
  url: string;
  tamanho_bytes?: number | null;
};

type VeiculoDocumentoUpdate = Partial<VeiculoDocumentoInsert> & { id: string };

export function useVeiculosDocumentos(veiculoPlaca?: string) {
  const queryClient = useQueryClient();

  const { data: documentos = [], isLoading, error } = useQuery({
    queryKey: ["veiculos_documentos", veiculoPlaca],
    queryFn: async () => {
      let query = supabase
        .from("veiculos_documentos")
        .select("*")
        .eq("active", true)
        .order("created_at", { ascending: false });

      if (veiculoPlaca) {
        query = query.eq("veiculo_placa", veiculoPlaca);
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
      toast.error(friendlyErrorMessage("adicionar documento", error));
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
      toast.error(friendlyErrorMessage("atualizar documento", error));
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
      toast.error(friendlyErrorMessage("excluir documento", error));
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
