import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/external-client";
import { toast } from "sonner";

export interface Area {
  id: string;
  company_id?: string;
  parent_id?: string;
  name: string;
  cost_center?: string;
  active?: boolean;
  created_at?: string;
  updated_at?: string;
  children?: Area[];
}

interface AreaInsert {
  company_id?: string;
  parent_id?: string;
  name: string;
  cost_center?: string;
}

interface AreaUpdate {
  id: string;
  company_id?: string;
  parent_id?: string;
  name?: string;
  cost_center?: string;
  active?: boolean;
}

// Função para montar árvore hierárquica
export function buildAreaTree(areas: Area[]): Area[] {
  const map = new Map<string, Area>();
  const roots: Area[] = [];

  // Criar mapa de todos os nós
  areas.forEach(area => {
    map.set(area.id, { ...area, children: [] });
  });

  // Montar hierarquia
  areas.forEach(area => {
    const node = map.get(area.id)!;
    if (area.parent_id && map.has(area.parent_id)) {
      map.get(area.parent_id)!.children!.push(node);
    } else {
      roots.push(node);
    }
  });

  // Ordenar recursivamente
  const sortTree = (nodes: Area[]): Area[] => {
    return nodes
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(node => ({
        ...node,
        children: node.children ? sortTree(node.children) : []
      }));
  };

  return sortTree(roots);
}

// Função para obter todos os descendentes de uma área
export function getDescendantIds(areaId: string, areas: Area[]): string[] {
  const descendants: string[] = [];
  
  const findDescendants = (parentId: string) => {
    areas.forEach(area => {
      if (area.parent_id === parentId) {
        descendants.push(area.id);
        findDescendants(area.id);
      }
    });
  };
  
  findDescendants(areaId);
  return descendants;
}

export function useAreas(companyId?: string) {
  const queryClient = useQueryClient();

  // Query para buscar áreas flat (para uso em selects)
  const { data: areasFlat = [], isLoading: isLoadingFlat } = useQuery({
    queryKey: ["areas", "flat", companyId],
    queryFn: async () => {
      let query = supabase
        .from("areas")
        .select("*")
        .eq("active", true)
        .order("name");

      if (companyId) {
        query = query.eq("company_id", companyId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Area[];
    },
  });

  // Query para buscar áreas em árvore
  const { data: areasTree = [], isLoading: isLoadingTree } = useQuery({
    queryKey: ["areas", "tree", companyId],
    queryFn: async () => {
      let query = supabase
        .from("areas")
        .select("*")
        .eq("active", true)
        .order("name");

      if (companyId) {
        query = query.eq("company_id", companyId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return buildAreaTree(data as Area[]);
    },
  });

  const createArea = useMutation({
    mutationFn: async (area: AreaInsert) => {
      const { data, error } = await supabase
        .from("areas")
        .insert(area)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["areas"] });
      toast.success("Área criada com sucesso!");
    },
    onError: (error) => {
      toast.error("Erro ao criar área: " + error.message);
    },
  });

  const updateArea = useMutation({
    mutationFn: async ({ id, ...updates }: AreaUpdate) => {
      const { data, error } = await supabase
        .from("areas")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["areas"] });
      toast.success("Área atualizada!");
    },
    onError: (error) => {
      toast.error("Erro ao atualizar área: " + error.message);
    },
  });

  const deleteArea = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("areas")
        .update({ active: false })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["areas"] });
      toast.success("Área excluída!");
    },
    onError: (error) => {
      toast.error("Erro ao excluir área: " + error.message);
    },
  });

  return {
    areasFlat,
    areasTree,
    isLoading: isLoadingFlat || isLoadingTree,
    createArea,
    updateArea,
    deleteArea,
    getDescendantIds: (areaId: string) => getDescendantIds(areaId, areasFlat),
  };
}

// Hook para todas as áreas (sem filtro de empresa)
export function useAllAreas() {
  return useAreas();
}
