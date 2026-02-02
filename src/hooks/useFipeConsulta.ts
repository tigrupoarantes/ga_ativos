import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
// Cliente externo para operações de banco (veiculos)
import { supabase } from "@/integrations/supabase/external-client";
// Cliente Lovable Cloud para Edge Functions
import { supabase as supabaseLovable } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface FipeMarca {
  code: string;
  name: string;
}

interface FipeModelo {
  code: string;
  name: string;
}

interface FipeAno {
  code: string;
  name: string;
}

interface FipeValor {
  marca: string;
  modelo: string;
  anoModelo: number;
  combustivel: string;
  codigoFipe: string;
  valor: string;
  valorNumerico: number | null;
  mesReferencia: string;
}

async function consultaFipe<T>(body: Record<string, unknown>): Promise<T> {
  // Usar cliente Lovable Cloud para chamar Edge Functions
  const { data, error } = await supabaseLovable.functions.invoke("consulta-fipe", {
    body,
  });

  if (error) throw error;
  if (data.error) throw new Error(data.error);
  return data as T;
}

export function useFipeMarcas(tipo: string, enabled: boolean = true) {
  return useQuery({
    queryKey: ["fipe-marcas", tipo],
    queryFn: () => consultaFipe<FipeMarca[]>({ action: "marcas", tipo }),
    enabled: enabled && !!tipo,
    staleTime: 1000 * 60 * 60 * 24, // 24 horas
  });
}

export function useFipeModelos(tipo: string, marcaId: string | null, enabled: boolean = true) {
  return useQuery({
    queryKey: ["fipe-modelos", tipo, marcaId],
    queryFn: () => consultaFipe<FipeModelo[]>({ action: "modelos", tipo, marcaId }),
    enabled: enabled && !!tipo && !!marcaId,
    staleTime: 1000 * 60 * 60 * 24,
  });
}

export function useFipeAnos(tipo: string, marcaId: string | null, modeloId: string | null, enabled: boolean = true) {
  return useQuery({
    queryKey: ["fipe-anos", tipo, marcaId, modeloId],
    queryFn: () => consultaFipe<FipeAno[]>({ action: "anos", tipo, marcaId, modeloId }),
    enabled: enabled && !!tipo && !!marcaId && !!modeloId,
    staleTime: 1000 * 60 * 60 * 24,
  });
}

export function useFipeConsultaValor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      veiculoId: string;
      tipo: string;
      marcaId: string;
      modeloId: string;
      anoId: string;
      codigoFipe?: string;
    }) => {
      // Consultar valor na FIPE
      const valorData = await consultaFipe<FipeValor>({
        action: "valor",
        tipo: params.tipo,
        marcaId: params.marcaId,
        modeloId: params.modeloId,
        anoId: params.anoId,
      });

      if (!valorData.valorNumerico) {
        throw new Error("Não foi possível obter o valor FIPE");
      }

      // Atualizar veículo com o valor
      const { error } = await supabase
        .from("veiculos")
        .update({
          valor_fipe: valorData.valorNumerico,
          codigo_fipe: valorData.codigoFipe || params.codigoFipe,
          data_consulta_fipe: new Date().toISOString(),
        })
        .eq("id", params.veiculoId);

      if (error) throw error;

      return valorData;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["veiculos"] });
      toast.success(`Valor FIPE atualizado: ${data.valor}`);
    },
    onError: (error) => {
      toast.error("Erro ao consultar FIPE: " + error.message);
    },
  });
}

export function useFipeConsultaDireta() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      veiculoId: string;
      codigoFipe: string;
      tipo: string;
      ano: number;
    }) => {
      // Consulta direta por código FIPE e ano
      const valorData = await consultaFipe<FipeValor & { anoConsultado?: string }>({
        action: "valor-por-codigo-ano",
        codigoFipe: params.codigoFipe,
        tipo: params.tipo,
        ano: params.ano,
      });

      if (!valorData.valorNumerico) {
        throw new Error("Não foi possível obter o valor FIPE");
      }

      // Atualizar veículo com o valor
      const { error } = await supabase
        .from("veiculos")
        .update({
          valor_fipe: valorData.valorNumerico,
          codigo_fipe: valorData.codigoFipe,
          data_consulta_fipe: new Date().toISOString(),
        })
        .eq("id", params.veiculoId);

      if (error) throw error;

      return valorData;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["veiculos"] });
      toast.success(`Valor FIPE atualizado: ${data.valor}`);
    },
    onError: (error) => {
      toast.error("Erro ao consultar FIPE: " + error.message);
    },
  });
}
