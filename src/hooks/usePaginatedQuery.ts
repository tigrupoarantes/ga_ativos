import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/external-client";

interface PaginationOptions {
  pageSize?: number;
  initialPage?: number;
}

interface PaginatedResult<T> {
  data: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  isLoading: boolean;
  error: Error | null;
  setPage: (page: number) => void;
  nextPage: () => void;
  prevPage: () => void;
  setSearch: (search: string) => void;
  search: string;
}

interface QueryConfig {
  table: string;
  queryKey: string;
  select: string;
  searchColumns?: string[];
  orderBy?: { column: string; ascending?: boolean };
  filters?: Record<string, string | number | boolean | null | undefined>;
  options?: PaginationOptions;
}

export function usePaginatedQuery<T>({
  table,
  queryKey,
  select,
  searchColumns = [],
  orderBy = { column: "created_at", ascending: false },
  filters = {},
  options = {},
}: QueryConfig): PaginatedResult<T> {
  const { pageSize = 25, initialPage = 1 } = options;
  
  const [page, setPage] = useState(initialPage);
  const [search, setSearchState] = useState("");

  const setSearch = useCallback((value: string) => {
    setSearchState(value);
    setPage(1);
  }, []);

  const filtersKey = JSON.stringify(filters);

  // Query for counting total records
  const { data: countData } = useQuery({
    queryKey: [queryKey, "count", search, filtersKey],
    queryFn: async () => {
      // Using any to avoid deep type instantiation issues
      let query: any = supabase
        .from(table as any)
        .select("*", { count: "exact", head: true })
        .eq("active", true);

      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          query = query.eq(key, value);
        }
      });

      if (search && searchColumns.length > 0) {
        const searchFilter = searchColumns
          .map((col) => `${col}.ilike.%${search}%`)
          .join(",");
        query = query.or(searchFilter);
      }

      const { count, error } = await query;
      if (error) throw error;
      return count ?? 0;
    },
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  // Query for paginated data
  const { data, isLoading, error } = useQuery({
    queryKey: [queryKey, page, pageSize, search, filtersKey],
    queryFn: async () => {
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      // Using any to avoid deep type instantiation issues
      let query: any = supabase
        .from(table as any)
        .select(select)
        .eq("active", true)
        .order(orderBy.column, { ascending: orderBy.ascending ?? false })
        .range(from, to);

      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          query = query.eq(key, value);
        }
      });

      if (search && searchColumns.length > 0) {
        const searchFilter = searchColumns
          .map((col) => `${col}.ilike.%${search}%`)
          .join(",");
        query = query.or(searchFilter);
      }

      const { data: result, error: queryError } = await query;
      if (queryError) throw queryError;
      return (result ?? []) as T[];
    },
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const totalCount = countData ?? 0;
  const totalPages = Math.ceil(totalCount / pageSize);

  const nextPage = useCallback(() => {
    setPage((p) => Math.min(p + 1, totalPages));
  }, [totalPages]);

  const prevPage = useCallback(() => {
    setPage((p) => Math.max(p - 1, 1));
  }, []);

  return {
    data: data ?? [],
    totalCount,
    page,
    pageSize,
    totalPages,
    isLoading,
    error: error as Error | null,
    setPage,
    nextPage,
    prevPage,
    setSearch,
    search,
  };
}
