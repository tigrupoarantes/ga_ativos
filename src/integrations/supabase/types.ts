export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      activity_history: {
        Row: {
          action: string
          created_at: string | null
          description: string | null
          entity_id: string
          entity_type: string
          id: string
          new_data: Json | null
          old_data: Json | null
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          description?: string | null
          entity_id: string
          entity_type: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          description?: string | null
          entity_id?: string
          entity_type?: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      allowed_email_domains: {
        Row: {
          active: boolean | null
          created_at: string | null
          domain: string
          id: string
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          domain: string
          id?: string
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          domain?: string
          id?: string
        }
        Relationships: []
      }
      asset_types: {
        Row: {
          active: boolean | null
          category: string | null
          created_at: string | null
          depreciation_rate: number | null
          description: string | null
          id: string
          name: string
          updated_at: string | null
          useful_life_months: number | null
        }
        Insert: {
          active?: boolean | null
          category?: string | null
          created_at?: string | null
          depreciation_rate?: number | null
          description?: string | null
          id?: string
          name: string
          updated_at?: string | null
          useful_life_months?: number | null
        }
        Update: {
          active?: boolean | null
          category?: string | null
          created_at?: string | null
          depreciation_rate?: number | null
          description?: string | null
          id?: string
          name?: string
          updated_at?: string | null
          useful_life_months?: number | null
        }
        Relationships: []
      }
      assets: {
        Row: {
          active: boolean | null
          chip_linha: string | null
          created_at: string | null
          data_aquisicao: string | null
          descricao: string | null
          detalhes_especificos: Json | null
          empresa_id: string | null
          fotos: string[] | null
          funcionario_id: string | null
          id: string
          imei: string | null
          marca: string | null
          modelo: string | null
          nome: string
          numero_serie: string | null
          observacoes: string | null
          patrimonio: string
          status: string | null
          tipo_id: string | null
          updated_at: string | null
          valor_aquisicao: number | null
          valor_atual: number | null
        }
        Insert: {
          active?: boolean | null
          chip_linha?: string | null
          created_at?: string | null
          data_aquisicao?: string | null
          descricao?: string | null
          detalhes_especificos?: Json | null
          empresa_id?: string | null
          fotos?: string[] | null
          funcionario_id?: string | null
          id?: string
          imei?: string | null
          marca?: string | null
          modelo?: string | null
          nome: string
          numero_serie?: string | null
          observacoes?: string | null
          patrimonio: string
          status?: string | null
          tipo_id?: string | null
          updated_at?: string | null
          valor_aquisicao?: number | null
          valor_atual?: number | null
        }
        Update: {
          active?: boolean | null
          chip_linha?: string | null
          created_at?: string | null
          data_aquisicao?: string | null
          descricao?: string | null
          detalhes_especificos?: Json | null
          empresa_id?: string | null
          fotos?: string[] | null
          funcionario_id?: string | null
          id?: string
          imei?: string | null
          marca?: string | null
          modelo?: string | null
          nome?: string
          numero_serie?: string | null
          observacoes?: string | null
          patrimonio?: string
          status?: string | null
          tipo_id?: string | null
          updated_at?: string | null
          valor_aquisicao?: number | null
          valor_atual?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "assets_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assets_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "funcionarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assets_tipo_id_fkey"
            columns: ["tipo_id"]
            isOneToOne: false
            referencedRelation: "asset_types"
            referencedColumns: ["id"]
          },
        ]
      }
      atribuicoes: {
        Row: {
          active: boolean | null
          ativo_id: string | null
          created_at: string | null
          data_atribuicao: string | null
          data_devolucao: string | null
          funcionario_id: string | null
          id: string
          observacoes: string | null
          status: string | null
          updated_at: string | null
          usuario_operacao: string | null
        }
        Insert: {
          active?: boolean | null
          ativo_id?: string | null
          created_at?: string | null
          data_atribuicao?: string | null
          data_devolucao?: string | null
          funcionario_id?: string | null
          id?: string
          observacoes?: string | null
          status?: string | null
          updated_at?: string | null
          usuario_operacao?: string | null
        }
        Update: {
          active?: boolean | null
          ativo_id?: string | null
          created_at?: string | null
          data_atribuicao?: string | null
          data_devolucao?: string | null
          funcionario_id?: string | null
          id?: string
          observacoes?: string | null
          status?: string | null
          updated_at?: string | null
          usuario_operacao?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "atribuicoes_ativo_id_fkey"
            columns: ["ativo_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "atribuicoes_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "funcionarios"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          acao: string
          entidade: string
          entidade_id: string
          id: string
          payload: Json | null
          timestamp: string | null
          usuario: string | null
        }
        Insert: {
          acao: string
          entidade: string
          entidade_id: string
          id?: string
          payload?: Json | null
          timestamp?: string | null
          usuario?: string | null
        }
        Update: {
          acao?: string
          entidade?: string
          entidade_id?: string
          id?: string
          payload?: Json | null
          timestamp?: string | null
          usuario?: string | null
        }
        Relationships: []
      }
      contratos: {
        Row: {
          active: boolean | null
          arquivos: string[] | null
          created_at: string | null
          data_fim: string | null
          data_inicio: string | null
          descricao: string | null
          fornecedor: string | null
          id: string
          numero: string
          observacoes: string | null
          status: string | null
          tipo: string | null
          updated_at: string | null
          valor_mensal: number | null
          valor_total: number | null
        }
        Insert: {
          active?: boolean | null
          arquivos?: string[] | null
          created_at?: string | null
          data_fim?: string | null
          data_inicio?: string | null
          descricao?: string | null
          fornecedor?: string | null
          id?: string
          numero: string
          observacoes?: string | null
          status?: string | null
          tipo?: string | null
          updated_at?: string | null
          valor_mensal?: number | null
          valor_total?: number | null
        }
        Update: {
          active?: boolean | null
          arquivos?: string[] | null
          created_at?: string | null
          data_fim?: string | null
          data_inicio?: string | null
          descricao?: string | null
          fornecedor?: string | null
          id?: string
          numero?: string
          observacoes?: string | null
          status?: string | null
          tipo?: string | null
          updated_at?: string | null
          valor_mensal?: number | null
          valor_total?: number | null
        }
        Relationships: []
      }
      empresas: {
        Row: {
          active: boolean | null
          cnpj: string | null
          created_at: string | null
          email: string | null
          endereco: string | null
          id: string
          nome: string
          razao_social: string | null
          telefone: string | null
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          cnpj?: string | null
          created_at?: string | null
          email?: string | null
          endereco?: string | null
          id?: string
          nome: string
          razao_social?: string | null
          telefone?: string | null
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          cnpj?: string | null
          created_at?: string | null
          email?: string | null
          endereco?: string | null
          id?: string
          nome?: string
          razao_social?: string | null
          telefone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      equipes: {
        Row: {
          active: boolean | null
          created_at: string | null
          descricao: string | null
          empresa_id: string | null
          id: string
          lider_id: string | null
          nome: string
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          descricao?: string | null
          empresa_id?: string | null
          id?: string
          lider_id?: string | null
          nome: string
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          descricao?: string | null
          empresa_id?: string | null
          id?: string
          lider_id?: string | null
          nome?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "equipes_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_equipes_lider"
            columns: ["lider_id"]
            isOneToOne: false
            referencedRelation: "funcionarios"
            referencedColumns: ["id"]
          },
        ]
      }
      funcionarios: {
        Row: {
          active: boolean | null
          cargo: string | null
          cnh_categoria: string | null
          cnh_numero: string | null
          cnh_validade: string | null
          cpf: string | null
          created_at: string | null
          departamento: string | null
          email: string | null
          empresa_id: string | null
          equipe_id: string | null
          id: string
          is_condutor: boolean | null
          nome: string
          telefone: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          active?: boolean | null
          cargo?: string | null
          cnh_categoria?: string | null
          cnh_numero?: string | null
          cnh_validade?: string | null
          cpf?: string | null
          created_at?: string | null
          departamento?: string | null
          email?: string | null
          empresa_id?: string | null
          equipe_id?: string | null
          id?: string
          is_condutor?: boolean | null
          nome: string
          telefone?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          active?: boolean | null
          cargo?: string | null
          cnh_categoria?: string | null
          cnh_numero?: string | null
          cnh_validade?: string | null
          cpf?: string | null
          created_at?: string | null
          departamento?: string | null
          email?: string | null
          empresa_id?: string | null
          equipe_id?: string | null
          id?: string
          is_condutor?: boolean | null
          nome?: string
          telefone?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "funcionarios_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "funcionarios_equipe_id_fkey"
            columns: ["equipe_id"]
            isOneToOne: false
            referencedRelation: "equipes"
            referencedColumns: ["id"]
          },
        ]
      }
      itens_ordem: {
        Row: {
          created_at: string
          descricao: string | null
          id: string
          ordem_id: string
          peca_id: string | null
          preco_total: number | null
          preco_unitario: number | null
          quantidade: number
        }
        Insert: {
          created_at?: string
          descricao?: string | null
          id?: string
          ordem_id: string
          peca_id?: string | null
          preco_total?: number | null
          preco_unitario?: number | null
          quantidade?: number
        }
        Update: {
          created_at?: string
          descricao?: string | null
          id?: string
          ordem_id?: string
          peca_id?: string | null
          preco_total?: number | null
          preco_unitario?: number | null
          quantidade?: number
        }
        Relationships: [
          {
            foreignKeyName: "itens_ordem_ordem_id_fkey"
            columns: ["ordem_id"]
            isOneToOne: false
            referencedRelation: "ordens_servico"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "itens_ordem_peca_id_fkey"
            columns: ["peca_id"]
            isOneToOne: false
            referencedRelation: "pecas"
            referencedColumns: ["id"]
          },
        ]
      }
      module_permissions: {
        Row: {
          can_edit: boolean | null
          can_view: boolean | null
          created_at: string | null
          id: string
          module: string
          role: string
        }
        Insert: {
          can_edit?: boolean | null
          can_view?: boolean | null
          created_at?: string | null
          id?: string
          module: string
          role: string
        }
        Update: {
          can_edit?: boolean | null
          can_view?: boolean | null
          created_at?: string | null
          id?: string
          module?: string
          role?: string
        }
        Relationships: []
      }
      movimentacoes_estoque: {
        Row: {
          created_at: string
          id: string
          motivo: string | null
          ordem_id: string | null
          peca_id: string
          quantidade: number
          quantidade_anterior: number | null
          quantidade_atual: number | null
          tipo: string
          usuario_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          motivo?: string | null
          ordem_id?: string | null
          peca_id: string
          quantidade: number
          quantidade_anterior?: number | null
          quantidade_atual?: number | null
          tipo: string
          usuario_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          motivo?: string | null
          ordem_id?: string | null
          peca_id?: string
          quantidade?: number
          quantidade_anterior?: number | null
          quantidade_atual?: number | null
          tipo?: string
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "movimentacoes_estoque_ordem_id_fkey"
            columns: ["ordem_id"]
            isOneToOne: false
            referencedRelation: "ordens_servico"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimentacoes_estoque_peca_id_fkey"
            columns: ["peca_id"]
            isOneToOne: false
            referencedRelation: "pecas"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string | null
          id: string
          link: string | null
          message: string | null
          read: boolean | null
          title: string
          type: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          link?: string | null
          message?: string | null
          read?: boolean | null
          title: string
          type?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          link?: string | null
          message?: string | null
          read?: boolean | null
          title?: string
          type?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      ordens_servico: {
        Row: {
          active: boolean | null
          created_at: string
          custo_mao_obra: number | null
          custo_pecas: number | null
          custo_total: number | null
          data_abertura: string
          data_fechamento: string | null
          data_previsao: string | null
          descricao: string | null
          diagnostico: string | null
          id: string
          km_entrada: number | null
          km_saida: number | null
          numero: string | null
          observacoes: string | null
          preventiva_id: string | null
          prioridade: string | null
          responsavel_id: string | null
          solicitante_id: string | null
          solucao: string | null
          status: string
          tipo: string
          updated_at: string
          veiculo_id: string | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string
          custo_mao_obra?: number | null
          custo_pecas?: number | null
          custo_total?: number | null
          data_abertura?: string
          data_fechamento?: string | null
          data_previsao?: string | null
          descricao?: string | null
          diagnostico?: string | null
          id?: string
          km_entrada?: number | null
          km_saida?: number | null
          numero?: string | null
          observacoes?: string | null
          preventiva_id?: string | null
          prioridade?: string | null
          responsavel_id?: string | null
          solicitante_id?: string | null
          solucao?: string | null
          status?: string
          tipo?: string
          updated_at?: string
          veiculo_id?: string | null
        }
        Update: {
          active?: boolean | null
          created_at?: string
          custo_mao_obra?: number | null
          custo_pecas?: number | null
          custo_total?: number | null
          data_abertura?: string
          data_fechamento?: string | null
          data_previsao?: string | null
          descricao?: string | null
          diagnostico?: string | null
          id?: string
          km_entrada?: number | null
          km_saida?: number | null
          numero?: string | null
          observacoes?: string | null
          preventiva_id?: string | null
          prioridade?: string | null
          responsavel_id?: string | null
          solicitante_id?: string | null
          solucao?: string | null
          status?: string
          tipo?: string
          updated_at?: string
          veiculo_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ordens_servico_preventiva_id_fkey"
            columns: ["preventiva_id"]
            isOneToOne: false
            referencedRelation: "preventivas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ordens_servico_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "funcionarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ordens_servico_solicitante_id_fkey"
            columns: ["solicitante_id"]
            isOneToOne: false
            referencedRelation: "funcionarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ordens_servico_veiculo_id_fkey"
            columns: ["veiculo_id"]
            isOneToOne: false
            referencedRelation: "veiculos"
            referencedColumns: ["id"]
          },
        ]
      }
      pecas: {
        Row: {
          active: boolean | null
          categoria: string | null
          codigo: string | null
          created_at: string
          descricao: string | null
          estoque_minimo: number | null
          fornecedor: string | null
          id: string
          localizacao: string | null
          nome: string
          preco_unitario: number | null
          quantidade_estoque: number
          unidade: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean | null
          categoria?: string | null
          codigo?: string | null
          created_at?: string
          descricao?: string | null
          estoque_minimo?: number | null
          fornecedor?: string | null
          id?: string
          localizacao?: string | null
          nome: string
          preco_unitario?: number | null
          quantidade_estoque?: number
          unidade?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean | null
          categoria?: string | null
          codigo?: string | null
          created_at?: string
          descricao?: string | null
          estoque_minimo?: number | null
          fornecedor?: string | null
          id?: string
          localizacao?: string | null
          nome?: string
          preco_unitario?: number | null
          quantidade_estoque?: number
          unidade?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      preventivas: {
        Row: {
          active: boolean | null
          created_at: string
          descricao: string | null
          id: string
          observacoes: string | null
          periodicidade_dias: number | null
          periodicidade_km: number | null
          proxima_realizacao: string | null
          proximo_km: number | null
          status: string | null
          tipo_manutencao: string
          ultima_realizacao: string | null
          ultimo_km: number | null
          updated_at: string
          veiculo_id: string | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string
          descricao?: string | null
          id?: string
          observacoes?: string | null
          periodicidade_dias?: number | null
          periodicidade_km?: number | null
          proxima_realizacao?: string | null
          proximo_km?: number | null
          status?: string | null
          tipo_manutencao: string
          ultima_realizacao?: string | null
          ultimo_km?: number | null
          updated_at?: string
          veiculo_id?: string | null
        }
        Update: {
          active?: boolean | null
          created_at?: string
          descricao?: string | null
          id?: string
          observacoes?: string | null
          periodicidade_dias?: number | null
          periodicidade_km?: number | null
          proxima_realizacao?: string | null
          proximo_km?: number | null
          status?: string | null
          tipo_manutencao?: string
          ultima_realizacao?: string | null
          ultimo_km?: number | null
          updated_at?: string
          veiculo_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "preventivas_veiculo_id_fkey"
            columns: ["veiculo_id"]
            isOneToOne: false
            referencedRelation: "veiculos"
            referencedColumns: ["id"]
          },
        ]
      }
      tipos_veiculos: {
        Row: {
          active: boolean | null
          created_at: string | null
          descricao: string | null
          id: string
          nome_tipo: string
          taxa_anual_depreciacao: number | null
          taxa_mensal_depreciacao: number | null
          updated_at: string | null
          vida_util_anos: number | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          descricao?: string | null
          id?: string
          nome_tipo: string
          taxa_anual_depreciacao?: number | null
          taxa_mensal_depreciacao?: number | null
          updated_at?: string | null
          vida_util_anos?: number | null
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          descricao?: string | null
          id?: string
          nome_tipo?: string
          taxa_anual_depreciacao?: number | null
          taxa_mensal_depreciacao?: number | null
          updated_at?: string | null
          vida_util_anos?: number | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          email: string
          id: string
          is_approved: boolean | null
          role: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          is_approved?: boolean | null
          role?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          is_approved?: boolean | null
          role?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      veiculos: {
        Row: {
          active: boolean | null
          ano_fabricacao: number | null
          ano_modelo: number | null
          chassi: string | null
          combustivel: string | null
          cor: string | null
          created_at: string | null
          data_aquisicao: string | null
          empresa_id: string | null
          fotos: string[] | null
          funcionario_id: string | null
          id: string
          km_atual: number | null
          marca: string
          modelo: string
          observacoes: string | null
          placa: string
          renavam: string | null
          status: string | null
          tipo: string | null
          updated_at: string | null
          valor_aquisicao: number | null
          valor_fipe: number | null
        }
        Insert: {
          active?: boolean | null
          ano_fabricacao?: number | null
          ano_modelo?: number | null
          chassi?: string | null
          combustivel?: string | null
          cor?: string | null
          created_at?: string | null
          data_aquisicao?: string | null
          empresa_id?: string | null
          fotos?: string[] | null
          funcionario_id?: string | null
          id?: string
          km_atual?: number | null
          marca: string
          modelo: string
          observacoes?: string | null
          placa: string
          renavam?: string | null
          status?: string | null
          tipo?: string | null
          updated_at?: string | null
          valor_aquisicao?: number | null
          valor_fipe?: number | null
        }
        Update: {
          active?: boolean | null
          ano_fabricacao?: number | null
          ano_modelo?: number | null
          chassi?: string | null
          combustivel?: string | null
          cor?: string | null
          created_at?: string | null
          data_aquisicao?: string | null
          empresa_id?: string | null
          fotos?: string[] | null
          funcionario_id?: string | null
          id?: string
          km_atual?: number | null
          marca?: string
          modelo?: string
          observacoes?: string | null
          placa?: string
          renavam?: string | null
          status?: string | null
          tipo?: string | null
          updated_at?: string | null
          valor_aquisicao?: number | null
          valor_fipe?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "veiculos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "veiculos_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "funcionarios"
            referencedColumns: ["id"]
          },
        ]
      }
      veiculos_documentos: {
        Row: {
          active: boolean | null
          created_at: string | null
          id: string
          nome_arquivo: string
          tamanho_bytes: number | null
          tipo_documento: string
          url: string
          veiculo_placa: string | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          id?: string
          nome_arquivo: string
          tamanho_bytes?: number | null
          tipo_documento: string
          url: string
          veiculo_placa?: string | null
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          id?: string
          nome_arquivo?: string
          tamanho_bytes?: number | null
          tipo_documento?: string
          url?: string
          veiculo_placa?: string | null
        }
        Relationships: []
      }
      veiculos_historico_responsavel: {
        Row: {
          data_alteracao: string | null
          funcionario_anterior_id: string | null
          funcionario_novo_id: string | null
          id: string
          observacoes: string | null
          usuario_alteracao: string | null
          veiculo_placa: string | null
        }
        Insert: {
          data_alteracao?: string | null
          funcionario_anterior_id?: string | null
          funcionario_novo_id?: string | null
          id?: string
          observacoes?: string | null
          usuario_alteracao?: string | null
          veiculo_placa?: string | null
        }
        Update: {
          data_alteracao?: string | null
          funcionario_anterior_id?: string | null
          funcionario_novo_id?: string | null
          id?: string
          observacoes?: string | null
          usuario_alteracao?: string | null
          veiculo_placa?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "veiculos_historico_responsavel_funcionario_anterior_id_fkey"
            columns: ["funcionario_anterior_id"]
            isOneToOne: false
            referencedRelation: "funcionarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "veiculos_historico_responsavel_funcionario_novo_id_fkey"
            columns: ["funcionario_novo_id"]
            isOneToOne: false
            referencedRelation: "funcionarios"
            referencedColumns: ["id"]
          },
        ]
      }
      veiculos_multas: {
        Row: {
          active: boolean | null
          codigo_infracao: string | null
          comprovante_url: string | null
          created_at: string | null
          data_infracao: string
          data_lancamento: string | null
          descricao_infracao: string
          funcionario_responsavel_id: string | null
          id: string
          local_infracao: string | null
          observacoes: string | null
          pontos: number | null
          status: string | null
          updated_at: string | null
          valor_multa: number | null
          veiculo_placa: string | null
        }
        Insert: {
          active?: boolean | null
          codigo_infracao?: string | null
          comprovante_url?: string | null
          created_at?: string | null
          data_infracao: string
          data_lancamento?: string | null
          descricao_infracao: string
          funcionario_responsavel_id?: string | null
          id?: string
          local_infracao?: string | null
          observacoes?: string | null
          pontos?: number | null
          status?: string | null
          updated_at?: string | null
          valor_multa?: number | null
          veiculo_placa?: string | null
        }
        Update: {
          active?: boolean | null
          codigo_infracao?: string | null
          comprovante_url?: string | null
          created_at?: string | null
          data_infracao?: string
          data_lancamento?: string | null
          descricao_infracao?: string
          funcionario_responsavel_id?: string | null
          id?: string
          local_infracao?: string | null
          observacoes?: string | null
          pontos?: number | null
          status?: string | null
          updated_at?: string | null
          valor_multa?: number | null
          veiculo_placa?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "veiculos_multas_funcionario_responsavel_id_fkey"
            columns: ["funcionario_responsavel_id"]
            isOneToOne: false
            referencedRelation: "funcionarios"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_current_user_role: { Args: never; Returns: string }
      get_dashboard_alerts: { Args: { limit_count?: number }; Returns: Json }
      get_dashboard_stats: { Args: never; Returns: Json }
      is_current_user_admin: { Args: never; Returns: boolean }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
