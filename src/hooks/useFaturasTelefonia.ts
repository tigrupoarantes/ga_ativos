import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/external-client";
import { toast } from "sonner";
import { friendlyErrorMessage } from "@/lib/error-handler";
import type { LinhaComRateio } from "@/lib/parsers/claro-bill-parser";

// ─── Types ────────────────────────────────────────────────────────────────────

export type FaturaStatus = "importada" | "aprovada" | "paga";

export interface FaturaTelefonia {
  id: string;
  empresa_id: string;
  operadora: string;
  numero_fatura: string | null;
  periodo_inicio: string;
  periodo_fim: string;
  data_vencimento: string | null;
  valor_total: number;
  custo_compartilhado: number;
  qtd_linhas: number;
  status: FaturaStatus;
  observacoes: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface FaturaLinhaDetalhe {
  id: string;
  fatura_id: string;
  numero_linha: string;
  linha_id: string | null;
  valor_mensalidade: number;
  valor_ligacoes: number;
  valor_dados: number;
  valor_servicos: number;
  valor_compartilhado: number;
  valor_total: number;
  // Joins
  linhas_telefonicas?: {
    numero: string;
    operadora: string | null;
    plano: string | null;
    funcionario?: {
      id: string;
      nome: string;
      equipe?: { id: string; nome: string } | null;
      area?: { id: string; name: string; cost_center: string | null } | null;
    } | null;
  } | null;
}

export interface RateioItem {
  equipeNome: string;
  areaNome: string;
  costCenter: string;
  qtdLinhas: number;
  valorTotal: number;
  valorMensalidade: number;
  valorLigacoes: number;
  valorDados: number;
  valorServicos: number;
  valorCompartilhado: number;
}

export interface ImportFaturaPayload {
  operadora: string;
  numeroFatura: string;
  periodoInicio: string; // ISO date "2026-01-20"
  periodoFim: string;
  dataVencimento: string;
  valorTotal: number;
  custoCompartilhado: number;
  linhas: LinhaComRateio[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Normaliza número de telefone para comparação: apenas dígitos */
function digitsOnly(v: string): string {
  return v.replace(/\D/g, "");
}

/** Converte data BR "DD/MM/YYYY" para ISO "YYYY-MM-DD" */
export function brDateToIso(br: string): string {
  const [d, m, y] = br.split("/");
  return `${y}-${m}-${d}`;
}

/** Formata valor em R$ */
export function formatCurrency(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/** Formata período "2026-01-20" a "2026-02-19" → "jan/2026" */
export function formatPeriod(inicio: string, fim: string): string {
  const d = new Date(inicio + "T12:00:00");
  return d.toLocaleDateString("pt-BR", { month: "short", year: "numeric" });
}

// ─── Queries ──────────────────────────────────────────────────────────────────

/** Lista de faturas (sem linhas) */
export function useFaturasTelefonia() {
  return useQuery({
    queryKey: ["faturas-telefonia"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("faturas_telefonia")
        .select("*")
        .eq("active", true)
        .order("periodo_inicio", { ascending: false });
      if (error) throw error;
      return data as FaturaTelefonia[];
    },
  });
}

/** Detalhe de uma fatura com linhas e joins de funcionário/equipe/área */
export function useFaturaDetalhe(faturaId: string | null) {
  return useQuery({
    queryKey: ["fatura-telefonia-detalhe", faturaId],
    enabled: !!faturaId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fatura_telefonia_linhas")
        .select(`
          *,
          linhas_telefonicas (
            numero,
            operadora,
            plano,
            funcionario:funcionarios (
              id,
              nome,
              equipe:equipes!funcionarios_equipe_id_fkey ( id, nome ),
              area:areas!funcionarios_area_id_fkey ( id, name, cost_center )
            )
          )
        `)
        .eq("fatura_id", faturaId!)
        .order("numero_linha");
      if (error) {
        console.error("[useFaturaDetalhe] erro:", error);
        throw error;
      }
      console.log("[useFaturaDetalhe] linhas retornadas:", data?.length, data?.[0]);
      return data as FaturaLinhaDetalhe[];
    },
  });
}

/** Agrupamento de rateio por equipe/área (computed client-side) */
export function computeRateio(linhas: FaturaLinhaDetalhe[]): RateioItem[] {
  const map = new Map<string, RateioItem>();

  for (const l of linhas) {
    const funcionario = l.linhas_telefonicas?.funcionario;
    const equipeNome = funcionario?.equipe?.nome ?? "Sem equipe";
    const areaNome = funcionario?.area?.name ?? "Sem área";
    const costCenter = funcionario?.area?.cost_center ?? "-";
    const key = `${equipeNome}||${areaNome}||${costCenter}`;

    if (!map.has(key)) {
      map.set(key, {
        equipeNome,
        areaNome,
        costCenter,
        qtdLinhas: 0,
        valorTotal: 0,
        valorMensalidade: 0,
        valorLigacoes: 0,
        valorDados: 0,
        valorServicos: 0,
        valorCompartilhado: 0,
      });
    }

    const item = map.get(key)!;
    item.qtdLinhas++;
    item.valorTotal += l.valor_total;
    item.valorMensalidade += l.valor_mensalidade;
    item.valorLigacoes += l.valor_ligacoes;
    item.valorDados += l.valor_dados;
    item.valorServicos += l.valor_servicos;
    item.valorCompartilhado += l.valor_compartilhado;
  }

  return Array.from(map.values()).sort((a, b) =>
    a.equipeNome.localeCompare(b.equipeNome)
  );
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export function useImportarFatura() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: ImportFaturaPayload) => {
      // 1. Buscar todas as linhas cadastradas para auto-match
      const { data: linhasCadastradas, error: linhasErr } = await supabase
        .from("linhas_telefonicas")
        .select("id, numero")
        .eq("active", true);
      if (linhasErr) throw linhasErr;

      const linhaByDigits = new Map<string, string>();
      for (const l of linhasCadastradas ?? []) {
        linhaByDigits.set(digitsOnly(l.numero), l.id);
      }

      // 2. Inserir cabeçalho da fatura
      const { data: fatura, error: faturaErr } = await supabase
        .from("faturas_telefonia")
        .insert({
          operadora: payload.operadora,
          numero_fatura: payload.numeroFatura || null,
          periodo_inicio: payload.periodoInicio,
          periodo_fim: payload.periodoFim,
          data_vencimento: payload.dataVencimento || null,
          valor_total: payload.valorTotal,
          custo_compartilhado: payload.custoCompartilhado,
          qtd_linhas: payload.linhas.length,
        })
        .select()
        .single();
      if (faturaErr) throw faturaErr;

      // 3. Inserir linhas em lotes de 100
      const linhasInsert = payload.linhas.map((l) => ({
        fatura_id: fatura.id,
        numero_linha: l.numeroLinha,
        linha_id: linhaByDigits.get(l.numeroLinha) ?? null,
        valor_mensalidade: l.valorMensalidade,
        valor_ligacoes: l.valorLigacoes,
        valor_dados: l.valorDados,
        valor_servicos: l.valorServicos,
        valor_compartilhado: l.valorCompartilhado,
        valor_total: l.valorTotal,
      }));

      const BATCH = 100;
      for (let i = 0; i < linhasInsert.length; i += BATCH) {
        const batch = linhasInsert.slice(i, i + BATCH);
        const { error } = await supabase.from("fatura_telefonia_linhas").insert(batch);
        if (error) throw error;
      }

      return fatura as FaturaTelefonia;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["faturas-telefonia"] });
      toast.success("Fatura importada com sucesso!");
    },
    onError: (error: Error) => {
      toast.error(friendlyErrorMessage("importar fatura", error));
    },
  });
}

export function useUpdateFaturaStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: FaturaStatus }) => {
      const { error } = await supabase
        .from("faturas_telefonia")
        .update({ status })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["faturas-telefonia"] });
      toast.success("Status atualizado!");
    },
    onError: (error: Error) => {
      toast.error(friendlyErrorMessage("atualizar status", error));
    },
  });
}

export function useDeleteFatura() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("faturas_telefonia")
        .update({ active: false })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["faturas-telefonia"] });
      toast.success("Fatura removida!");
    },
    onError: (error: Error) => {
      toast.error(friendlyErrorMessage("remover fatura", error));
    },
  });
}
