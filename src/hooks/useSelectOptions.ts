import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/external-client";

interface SelectOption {
  id: string;
  nome: string;
}

interface VeiculoOption {
  id: string;
  placa: string;
}

// Hook otimizado para selects de Funcionários - busca apenas id e nome
export function useFuncionariosSelect() {
  const { data: funcionarios = [], isLoading } = useQuery({
    queryKey: ["funcionarios-select"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("funcionarios")
        .select("id, nome")
        .eq("active", true)
        .order("nome");

      if (error) throw error;
      return data as SelectOption[];
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 30 * 60 * 1000, // 30 minutos
  });

  return { funcionarios, isLoading };
}

// Hook otimizado para selects de Condutores
export function useCondutoresSelect() {
  const { data: condutores = [], isLoading } = useQuery({
    queryKey: ["condutores-select"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("funcionarios")
        .select("id, nome")
        .eq("active", true)
        .eq("is_condutor", true)
        .order("nome");

      if (error) throw error;
      return data as SelectOption[];
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  return { condutores, isLoading };
}

// Hook otimizado para selects de Empresas
export function useEmpresasSelect() {
  const { data: empresas = [], isLoading } = useQuery({
    queryKey: ["empresas-select"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("empresas")
        .select("id, nome")
        .eq("active", true)
        .order("nome");

      if (error) throw error;
      return data as SelectOption[];
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  return { empresas, isLoading };
}

// Hook otimizado para selects de Equipes
export function useEquipesSelect() {
  const { data: equipes = [], isLoading } = useQuery({
    queryKey: ["equipes-select"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("equipes")
        .select("id, nome")
        .eq("active", true)
        .order("nome");

      if (error) throw error;
      return data as SelectOption[];
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  return { equipes, isLoading };
}

// Hook otimizado para selects de Veículos
export function useVeiculosSelect() {
  const { data: veiculos = [], isLoading } = useQuery({
    queryKey: ["veiculos-select"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("veiculos")
        .select("id, placa")
        .eq("active", true)
        .order("placa");

      if (error) throw error;
      return data as VeiculoOption[];
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  return { veiculos, isLoading };
}

// Hook otimizado para selects de Tipos de Ativos
export function useTiposAtivosSelect() {
  const { data: tipos = [], isLoading } = useQuery({
    queryKey: ["tipos-ativos-select"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("asset_types")
        .select("id, name")
        .eq("active", true)
        .order("name");

      if (error) throw error;
      return data.map((t) => ({ id: t.id, nome: t.name })) as SelectOption[];
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  return { tipos, isLoading };
}

// Hook otimizado para Combobox de Funcionários (com CPF)
interface FuncionarioCombobox {
  id: string;
  nome: string;
  cpf: string | null;
  empresa_id: string | null;
}

export function useFuncionariosCombobox() {
  const { data: funcionarios = [], isLoading } = useQuery({
    queryKey: ["funcionarios-combobox"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("funcionarios")
        .select("id, nome, cpf, empresa_id")
        .eq("active", true)
        .order("nome");

      if (error) throw error;
      return data as FuncionarioCombobox[];
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  return { funcionarios, isLoading };
}
