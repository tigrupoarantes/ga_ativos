// Types for the Asset Guardian system

export interface Empresa {
  id: string;
  nome: string;
  razao_social?: string;
  cnpj?: string;
  endereco?: string;
  telefone?: string;
  email?: string;
  active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Equipe {
  id: string;
  nome: string;
  descricao?: string;
  empresa_id?: string;
  lider_id?: string;
  active?: boolean;
  created_at?: string;
  updated_at?: string;
  empresa?: Empresa;
  lider?: Funcionario;
}

export interface Funcionario {
  id: string;
  nome: string;
  email?: string;
  telefone?: string;
  cargo?: string;
  departamento?: string;
  cpf?: string;
  empresa_id?: string;
  equipe_id?: string;
  user_id?: string;
  is_condutor?: boolean;
  cnh_numero?: string;
  cnh_categoria?: string;
  cnh_validade?: string;
  active?: boolean;
  created_at?: string;
  updated_at?: string;
  empresa?: Empresa;
  equipe?: Equipe;
}

export interface AssetType {
  id: string;
  name: string;
  description?: string;
  category?: string;
  depreciation_rate?: number;
  useful_life_months?: number;
  active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Asset {
  id: string;
  patrimonio: string;
  nome: string;
  descricao?: string;
  tipo_id?: string;
  marca?: string;
  modelo?: string;
  numero_serie?: string;
  imei?: string;
  chip_linha?: string;
  data_aquisicao?: string;
  valor_aquisicao?: number;
  valor_atual?: number;
  status?: string;
  funcionario_id?: string;
  empresa_id?: string;
  fotos?: string[];
  observacoes?: string;
  active?: boolean;
  created_at?: string;
  updated_at?: string;
  tipo?: AssetType;
  funcionario?: Funcionario;
  empresa?: Empresa;
}

export interface Veiculo {
  id: string;
  placa: string;
  marca: string;
  modelo: string;
  ano_fabricacao?: number;
  ano_modelo?: number;
  cor?: string;
  combustivel?: string;
  tipo?: string;
  chassi?: string;
  renavam?: string;
  km_atual?: number;
  data_aquisicao?: string;
  valor_aquisicao?: number;
  valor_fipe?: number;
  status?: string;
  funcionario_id?: string;
  empresa_id?: string;
  fotos?: string[];
  observacoes?: string;
  active?: boolean;
  created_at?: string;
  updated_at?: string;
  funcionario?: Funcionario;
  empresa?: Empresa;
}

export interface Contrato {
  id: string;
  numero: string;
  descricao?: string;
  tipo?: string;
  fornecedor?: string;
  data_inicio?: string;
  data_fim?: string;
  valor_mensal?: number;
  valor_total?: number;
  status?: string;
  arquivos?: string[];
  observacoes?: string;
  active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface ModulePermission {
  id: string;
  module: string;
  role: string;
  can_view?: boolean;
  can_edit?: boolean;
  created_at?: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  email: string;
  role: string;
  is_approved?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface ActivityHistory {
  id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  description?: string;
  old_data?: Record<string, unknown>;
  new_data?: Record<string, unknown>;
  user_id?: string;
  user_email?: string;
  created_at?: string;
}

export interface Notification {
  id: string;
  user_id?: string;
  title: string;
  message?: string;
  type?: string;
  link?: string;
  read?: boolean;
  created_at?: string;
}

export type AssetStatus = 'disponivel' | 'em_uso' | 'manutencao' | 'baixado';
export type VeiculoStatus = 'disponivel' | 'em_uso' | 'manutencao' | 'baixado';
export type ContratoStatus = 'ativo' | 'vencido' | 'cancelado' | 'renovacao';
export type UserRoleType = 'assistente' | 'coordenador' | 'diretor' | 'admin';
