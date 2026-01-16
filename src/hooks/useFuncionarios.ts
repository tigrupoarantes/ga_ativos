import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import { toast } from "sonner";
import { useState, useCallback } from "react";

type FuncionarioInsert = TablesInsert<"funcionarios">;
type FuncionarioUpdate = TablesUpdate<"funcionarios">;

interface UseFuncionariosPaginatedOptions {
  pageSize?: number;
  initialPage?: number;
}

export function useFuncionariosPaginated(options: UseFuncionariosPaginatedOptions = {}) {
  const { pageSize = 25, initialPage = 1 } = options;
  const queryClient = useQueryClient();
  
  const [page, setPage] = useState(initialPage);
  const [search, setSearchState] = useState("");

  const setSearch = useCallback((value: string) => {
    setSearchState(value);
    setPage(1);
  }, []);

  // Count query
  const { data: countData } = useQuery({
    queryKey: ["funcionarios", "count", search],
    queryFn: async () => {
      let query = supabase
        .from("funcionarios")
        .select("*", { count: "exact", head: true })
        .eq("active", true);

      if (search) {
        query = query.or(`nome.ilike.%${search}%,email.ilike.%${search}%,cargo.ilike.%${search}%`);
      }

      const { count, error } = await query;
      if (error) throw error;
      return count ?? 0;
    },
    staleTime: 2 * 60 * 1000,
  });

  // Data query with pagination
  const { data: funcionarios = [], isLoading, error } = useQuery({
    queryKey: ["funcionarios", page, pageSize, search],
    queryFn: async () => {
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      let query = supabase
        .from("funcionarios")
        .select(`
          id, nome, email, telefone, cargo, departamento, cpf,
          empresa_id, equipe_id, is_condutor,
          cnh_numero, cnh_categoria, cnh_validade,
          empresa:empresas(id, nome),
          equipe:equipes(id, nome)
        `)
        .eq("active", true)
        .order("nome")
        .range(from, to);

      if (search) {
        query = query.or(`nome.ilike.%${search}%,email.ilike.%${search}%,cargo.ilike.%${search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    staleTime: 2 * 60 * 1000,
  });

  const totalCount = countData ?? 0;
  const totalPages = Math.ceil(totalCount / pageSize);

  const nextPage = useCallback(() => {
    setPage((p) => Math.min(p + 1, totalPages));
  }, [totalPages]);

  const prevPage = useCallback(() => {
    setPage((p) => Math.max(p - 1, 1));
  }, []);

  const createFuncionario = useMutation({
    mutationFn: async (funcionario: FuncionarioInsert) => {
      const { data, error } = await supabase
        .from("funcionarios")
        .insert(funcionario)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["funcionarios"] });
      toast.success("Funcionário criado com sucesso!");
    },
    onError: (error) => {
      toast.error("Erro ao criar funcionário: " + error.message);
    },
  });

  const updateFuncionario = useMutation({
    mutationFn: async ({ id, ...updates }: FuncionarioUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from("funcionarios")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["funcionarios"] });
      toast.success("Funcionário atualizado!");
    },
    onError: (error) => {
      toast.error("Erro ao atualizar funcionário: " + error.message);
    },
  });

  const deleteFuncionario = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("funcionarios")
        .update({ active: false })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["funcionarios"] });
      toast.success("Funcionário excluído!");
    },
    onError: (error) => {
      toast.error("Erro ao excluir funcionário: " + error.message);
    },
  });

  return {
    funcionarios,
    isLoading,
    error,
    page,
    pageSize,
    totalCount,
    totalPages,
    search,
    setPage,
    setSearch,
    nextPage,
    prevPage,
    createFuncionario,
    updateFuncionario,
    deleteFuncionario,
  };
}

// Legacy hook for backwards compatibility (select dropdowns, etc.)
export function useFuncionarios() {
  const queryClient = useQueryClient();

  const { data: funcionarios = [], isLoading, error } = useQuery({
    queryKey: ["funcionarios", "all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("funcionarios")
        .select(`
          *,
          empresa:empresas(*),
          equipe:equipes(*)
        `)
        .eq("active", true)
        .order("nome");

      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });

  const createFuncionario = useMutation({
    mutationFn: async (funcionario: FuncionarioInsert) => {
      const { data, error } = await supabase
        .from("funcionarios")
        .insert(funcionario)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["funcionarios"] });
      toast.success("Funcionário criado com sucesso!");
    },
    onError: (error) => {
      toast.error("Erro ao criar funcionário: " + error.message);
    },
  });

  const updateFuncionario = useMutation({
    mutationFn: async ({ id, ...updates }: FuncionarioUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from("funcionarios")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["funcionarios"] });
      toast.success("Funcionário atualizado!");
    },
    onError: (error) => {
      toast.error("Erro ao atualizar funcionário: " + error.message);
    },
  });

  const deleteFuncionario = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("funcionarios")
        .update({ active: false })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["funcionarios"] });
      toast.success("Funcionário excluído!");
    },
    onError: (error) => {
      toast.error("Erro ao excluir funcionário: " + error.message);
    },
  });

  return {
    funcionarios,
    isLoading,
    error,
    createFuncionario,
    updateFuncionario,
    deleteFuncionario,
  };
}

export function useCondutores() {
  const { data: condutores = [], isLoading } = useQuery({
    queryKey: ["condutores"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("funcionarios")
        .select(`
          *,
          empresa:empresas(*)
        `)
        .eq("active", true)
        .eq("is_condutor", true)
        .order("nome");

      if (error) throw error;
      return data;
    },
  });

  return { condutores, isLoading };
}
