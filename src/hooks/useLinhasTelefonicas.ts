import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/external-client";
import { toast } from "sonner";
import { friendlyErrorMessage } from "@/lib/error-handler";

interface LinhaTelefonica {
  id: string;
  numero: string;
  funcionario_id: string | null;
  operadora: string | null;
  plano: string | null;
  empresa_id: string | null;
  centro_custo: string | null;
  funcao: string | null;
  observacoes: string | null;
  active: boolean | null;
  created_at: string;
  updated_at: string;
  funcionario?: {
    id: string;
    nome: string;
    cpf: string | null;
  } | null;
  empresa?: {
    id: string;
    nome: string;
  } | null;
}

interface CreateLinhaData {
  numero: string;
  funcionario_id?: string | null;
  operadora?: string | null;
  plano?: string | null;
  observacoes?: string | null;
}

interface UpdateLinhaData extends Partial<CreateLinhaData> {
  id: string;
}

function normalizeForSearch(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

const PAGE_SIZE = 50;

export function useLinhasTelefonicas(searchTerm?: string, page = 1, operadoraFilter?: string) {
  const queryClient = useQueryClient();

  const { data: result, isLoading, error } = useQuery({
    queryKey: ["linhas-telefonicas", searchTerm ?? "", page, operadoraFilter ?? ""],
    queryFn: async () => {
      const search = searchTerm?.trim() ?? "";
      const digits = digitsOnly(search);
      const isNumericSearch = search.length > 0 && digits.length === search.replace(/[\s\-()]/g, "").length;
      const from = (page - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      if (search && !isNumericSearch) {
        // Busca por nome: usa !inner para que o filtro na FK funcione como WHERE
        let query = supabase
          .from("linhas_telefonicas")
          .select(`
            *,
            funcionario:funcionarios!inner(id, nome, cpf),
            empresa:empresas(id, nome)
          `, { count: "exact" })
          .eq("active", true)
          .ilike("funcionario.nome", `%${search}%`)
          .order("numero")
          .range(from, to);

        if (operadoraFilter) {
          query = query.eq("operadora", operadoraFilter);
        }

        const { data, error, count } = await query;
        if (error) throw error;
        return { linhas: data as LinhaTelefonica[], total: count ?? 0 };
      }

      let query = supabase
        .from("linhas_telefonicas")
        .select(`
          *,
          funcionario:funcionarios(id, nome, cpf),
          empresa:empresas(id, nome)
        `, { count: "exact" })
        .eq("active", true)
        .order("numero")
        .range(from, to);

      if (search && isNumericSearch) {
        query = query.ilike("numero", `%${digits}%`);
      }

      if (operadoraFilter) {
        query = query.eq("operadora", operadoraFilter);
      }

      const { data, error, count } = await query;
      if (error) throw error;
      return { linhas: data as LinhaTelefonica[], total: count ?? 0 };
    },
  });

  const linhas = result?.linhas ?? [];
  const total = result?.total ?? 0;

  const createLinha = useMutation({
    mutationFn: async (data: CreateLinhaData) => {
      const { data: result, error } = await supabase
        .from("linhas_telefonicas")
        .insert(data)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["linhas-telefonicas"] });
      queryClient.invalidateQueries({ queryKey: ["linhas-telefonicas-stats"] });
      toast.success("Linha telefônica cadastrada com sucesso!");
    },
    onError: (error: Error) => {
      toast.error(friendlyErrorMessage("cadastrar linha telefônica", error));
    },
  });

  const updateLinha = useMutation({
    mutationFn: async ({ id, ...data }: UpdateLinhaData) => {
      const { data: result, error } = await supabase
        .from("linhas_telefonicas")
        .update(data)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["linhas-telefonicas"] });
      queryClient.invalidateQueries({ queryKey: ["linhas-telefonicas-stats"] });
      toast.success("Linha telefônica atualizada com sucesso!");
    },
    onError: (error: Error) => {
      toast.error(friendlyErrorMessage("atualizar linha telefônica", error));
    },
  });

  const deleteLinha = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("linhas_telefonicas")
        .update({ active: false })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["linhas-telefonicas"] });
      queryClient.invalidateQueries({ queryKey: ["linhas-telefonicas-stats"] });
      toast.success("Linha telefônica removida com sucesso!");
    },
    onError: (error: Error) => {
      toast.error(friendlyErrorMessage("remover linha telefônica", error));
    },
  });

  const bulkCreateLinhas = useMutation({
    mutationFn: async (linhasData: CreateLinhaData[]) => {
      const { data, error } = await supabase
        .from("linhas_telefonicas")
        .upsert(linhasData, { onConflict: "numero" })
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["linhas-telefonicas"] });
      queryClient.invalidateQueries({ queryKey: ["linhas-telefonicas-stats"] });
      toast.success(`${data.length} linhas sincronizadas com sucesso!`);
    },
    onError: (error: Error) => {
      toast.error(friendlyErrorMessage("importar linhas", error));
    },
  });

  // Stats: query leve separada (sem JOIN, apenas contagens) — stale 5min
  const { data: statsData } = useQuery({
    queryKey: ["linhas-telefonicas-stats"],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const [{ count: total }, { count: atribuidas }] = await Promise.all([
        supabase
          .from("linhas_telefonicas")
          .select("*", { count: "exact", head: true })
          .eq("active", true),
        supabase
          .from("linhas_telefonicas")
          .select("*", { count: "exact", head: true })
          .eq("active", true)
          .not("funcionario_id", "is", null),
      ]);
      return { total: total ?? 0, atribuidas: atribuidas ?? 0 };
    },
  });

  return {
    linhas,
    total,
    isLoading,
    error,
    createLinha,
    updateLinha,
    deleteLinha,
    bulkCreateLinhas,
    stats: {
      total: statsData?.total ?? 0,
      atribuidas: statsData?.atribuidas ?? 0,
      disponiveis: (statsData?.total ?? 0) - (statsData?.atribuidas ?? 0),
    },
  };
}
