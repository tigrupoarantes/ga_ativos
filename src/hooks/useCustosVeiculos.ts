import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/external-client";
import { toast } from "sonner";
import { friendlyErrorMessage } from "@/lib/error-handler";
import type { DespesaFromExcel, TipoDespesa } from "@/lib/parsers/custo-frota-parser";

// ─── Types ────────────────────────────────────────────────────────────────────

export type LoteStatus = "importado" | "aprovado" | "pago";

export interface LoteDespesaVeiculo {
  id: string;
  tipo: TipoDespesa;
  fornecedor: string | null;
  nota_fiscal: string | null;
  periodo_referencia: string;
  valor_total: number;
  qtd_veiculos: number;
  status: LoteStatus;
  observacoes: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DespesaVeiculo {
  id: string;
  lote_id: string;
  veiculo_placa: string;
  condutor: string | null;
  valor: number;
  rateio_1_empresa: string | null;
  rateio_1_valor: number | null;
  rateio_2_empresa: string | null;
  rateio_2_valor: number | null;
  observacoes: string | null;
  active: boolean;
  created_at: string;
  // Join
  veiculo?: { placa: string; modelo: string | null; marca: string | null } | null;
}

export interface ImportarLotePayload {
  tipo: TipoDespesa;
  fornecedor: string;
  notaFiscal: string;
  periodoReferencia: string; // ISO date "YYYY-MM-DD"
  despesas: DespesaFromExcel[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function formatCurrencyFrota(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function formatPeriodoFrota(isoDate: string): string {
  const d = new Date(isoDate + "T12:00:00");
  return d.toLocaleDateString("pt-BR", { month: "short", year: "numeric" });
}

export const TIPO_LABEL: Record<TipoDespesa, string> = {
  pedagio: "Pedágio",
  combustivel: "Combustível",
  outros: "Outros",
};

export const STATUS_LABEL: Record<LoteStatus, string> = {
  importado: "Importado",
  aprovado: "Aprovado",
  pago: "Pago",
};

export const STATUS_COLOR: Record<LoteStatus, string> = {
  importado: "bg-gray-100 text-gray-700 border-gray-200",
  aprovado: "bg-blue-100 text-blue-700 border-blue-200",
  pago: "bg-green-100 text-green-700 border-green-200",
};

// ─── Types: Dashboard ─────────────────────────────────────────────────────────

export interface DespesaComLote {
  veiculo_placa: string;
  condutor: string | null;
  valor: number;
  rateio_1_empresa: string | null;
  rateio_1_valor: number | null;
  rateio_2_empresa: string | null;
  rateio_2_valor: number | null;
  lote: { tipo: TipoDespesa; periodo_referencia: string } | null;
}

// ─── Queries ──────────────────────────────────────────────────────────────────

export function useLotesDespesa() {
  return useQuery({
    queryKey: ["lotes-despesa-veiculo"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lotes_despesa_veiculo")
        .select("*")
        .eq("active", true)
        .order("periodo_referencia", { ascending: false });
      if (error) throw error;
      return data as LoteDespesaVeiculo[];
    },
  });
}

export function useLoteDetalhe(loteId: string | null) {
  return useQuery({
    queryKey: ["lote-despesa-detalhe", loteId],
    enabled: !!loteId,
    queryFn: async () => {
      // Busca linhas sem join (despesas_veiculo.veiculo_placa não tem FK para veiculos)
      const { data, error } = await supabase
        .from("despesas_veiculo")
        .select("*")
        .eq("lote_id", loteId!)
        .eq("active", true)
        .order("veiculo_placa");
      if (error) throw error;

      // Join manual: busca veículos pelas placas presentes no lote
      const placas = [...new Set((data ?? []).map((d) => d.veiculo_placa))];
      const { data: veiculos } = placas.length
        ? await supabase.from("veiculos").select("placa, modelo, marca").in("placa", placas)
        : { data: [] };

      const veiculoMap = new Map((veiculos ?? []).map((v) => [v.placa, v]));

      return (data ?? []).map((d) => ({
        ...d,
        veiculo: veiculoMap.get(d.veiculo_placa) ?? null,
      })) as DespesaVeiculo[];
    },
  });
}

/** Stats: totais por tipo nos últimos 12 meses */
export function useCustosFrotaStats() {
  return useQuery({
    queryKey: ["custos-frota-stats"],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lotes_despesa_veiculo")
        .select("tipo, valor_total, qtd_veiculos")
        .eq("active", true);
      if (error) throw error;

      const lotes = data as Pick<LoteDespesaVeiculo, "tipo" | "valor_total" | "qtd_veiculos">[];

      const totalPedagio = lotes.filter((l) => l.tipo === "pedagio").reduce((s, l) => s + l.valor_total, 0);
      const totalCombustivel = lotes.filter((l) => l.tipo === "combustivel").reduce((s, l) => s + l.valor_total, 0);
      const totalOutros = lotes.filter((l) => l.tipo === "outros").reduce((s, l) => s + l.valor_total, 0);
      const totalGeral = totalPedagio + totalCombustivel + totalOutros;
      const totalLotes = lotes.length;

      return { totalPedagio, totalCombustivel, totalOutros, totalGeral, totalLotes };
    },
  });
}

/** Dashboard: todas as despesas com lote embutido, para agregação e filtros */
export function useCustosDashboard() {
  return useQuery({
    queryKey: ["custos-dashboard"],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("despesas_veiculo")
        .select(`
          veiculo_placa, condutor, valor,
          rateio_1_empresa, rateio_1_valor,
          rateio_2_empresa, rateio_2_valor,
          lote:lotes_despesa_veiculo(tipo, periodo_referencia)
        `)
        .eq("active", true);
      if (error) throw error;

      const despesas = (data ?? []) as DespesaComLote[];

      const placas = [...new Set(despesas.map((d) => d.veiculo_placa).filter(Boolean))].sort();
      const condutores = [...new Set(despesas.map((d) => d.condutor).filter((c): c is string => !!c))].sort();
      const empresasSet = new Set<string>();
      despesas.forEach((d) => {
        if (d.rateio_1_empresa) empresasSet.add(d.rateio_1_empresa);
        if (d.rateio_2_empresa) empresasSet.add(d.rateio_2_empresa);
      });
      const empresas = [...empresasSet].sort();

      return { despesas, placas, condutores, empresas };
    },
  });
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export function useImportarLoteDespesa() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: ImportarLotePayload) => {
      const { despesas } = payload;

      const valorTotal = despesas.reduce((s, d) => s + d.valor, 0);

      // 1. Inserir cabeçalho do lote
      const { data: lote, error: loteErr } = await supabase
        .from("lotes_despesa_veiculo")
        .insert({
          tipo: payload.tipo,
          fornecedor: payload.fornecedor || null,
          nota_fiscal: payload.notaFiscal || null,
          periodo_referencia: payload.periodoReferencia,
          valor_total: valorTotal,
          qtd_veiculos: despesas.length,
        })
        .select()
        .single();
      if (loteErr) throw loteErr;

      // 2. Inserir linhas em lotes de 100
      const linhasInsert = despesas.map((d) => ({
        lote_id: lote.id,
        veiculo_placa: d.placaCorreta,
        condutor: d.condutor || null,
        valor: d.valor,
        rateio_1_empresa: d.rateio1Empresa || null,
        rateio_1_valor: d.rateio1Valor || null,
        rateio_2_empresa: d.rateio2Empresa || null,
        rateio_2_valor: d.rateio2Valor || null,
      }));

      const BATCH = 100;
      for (let i = 0; i < linhasInsert.length; i += BATCH) {
        const { error } = await supabase.from("despesas_veiculo").insert(linhasInsert.slice(i, i + BATCH));
        if (error) throw error;
      }

      return lote as LoteDespesaVeiculo;
    },
    onSuccess: (lote) => {
      queryClient.invalidateQueries({ queryKey: ["lotes-despesa-veiculo"] });
      queryClient.invalidateQueries({ queryKey: ["custos-frota-stats"] });
      toast.success(`Lote importado: ${lote.qtd_veiculos} veículos, ${formatCurrencyFrota(lote.valor_total)}`);
    },
    onError: (error: Error) => {
      toast.error(friendlyErrorMessage("importar custos de frota", error));
    },
  });
}

export function useUpdateLoteStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: LoteStatus }) => {
      const { error } = await supabase
        .from("lotes_despesa_veiculo")
        .update({ status })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lotes-despesa-veiculo"] });
      toast.success("Status atualizado!");
    },
    onError: (error: Error) => {
      toast.error(friendlyErrorMessage("atualizar status", error));
    },
  });
}

export function useDeleteLote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("lotes_despesa_veiculo")
        .update({ active: false })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lotes-despesa-veiculo"] });
      queryClient.invalidateQueries({ queryKey: ["custos-frota-stats"] });
      toast.success("Lote removido!");
    },
    onError: (error: Error) => {
      toast.error(friendlyErrorMessage("remover lote", error));
    },
  });
}
