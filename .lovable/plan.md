
# Plano: Sincronização Manual entre Ativos Arantes e GA360

## Objetivo
Criar um sistema de sincronização manual que permite exportar os dados de **empresas** e **funcionarios** do Ativos Arantes (banco master) para o GA360, mantendo os bancos de dados separados.

---

## Arquitetura da Solução

```text
┌─────────────────────────────┐         ┌─────────────────────────────┐
│     ATIVOS ARANTES          │         │         GA360               │
│   (Master - Supabase)       │         │    (Destino - Supabase)     │
│  ftksidxyhnvzdsuonwop       │         │    [Credenciais GA360]      │
├─────────────────────────────┤         ├─────────────────────────────┤
│  - empresas                 │ ──────► │  - empresas                 │
│  - funcionarios             │  Sync   │  - funcionarios             │
│  - equipes                  │ ──────► │  - equipes (opcional)       │
└─────────────────────────────┘         └─────────────────────────────┘
            │                                       ▲
            │                                       │
            ▼                                       │
┌─────────────────────────────────────────────────────────────────────┐
│                     Edge Function: sync-to-ga360                     │
│   1. Busca dados do banco Ativos Arantes                            │
│   2. Faz upsert no banco GA360 usando CNPJ (empresa) / CPF (func)   │
│   3. Retorna relatório de sincronização                             │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Componentes a Implementar

### 1. Configuração de Secrets
Precisaremos armazenar as credenciais do banco GA360 como secrets:

| Secret | Descrição |
|--------|-----------|
| `GA360_SUPABASE_URL` | URL do projeto GA360 (ex: https://xxx.supabase.co) |
| `GA360_SUPABASE_SERVICE_KEY` | Service Role Key do GA360 (para bypass de RLS) |

### 2. Edge Function: `sync-to-ga360`
Uma Edge Function que:
- Recebe o tipo de sincronização (empresas, funcionarios, ou ambos)
- Busca os dados ativos do banco Ativos Arantes
- Conecta ao banco GA360 usando as credenciais armazenadas
- Faz UPSERT usando CNPJ (empresas) e CPF (funcionarios) como chaves
- Retorna um relatório com quantidades inseridas/atualizadas

### 3. Interface de Sincronização
Um novo componente na página de Configuracoes (aba Integracoes):
- Botao para sincronizar empresas
- Botao para sincronizar funcionarios
- Botao para sincronizar tudo
- Exibicao do status/resultado da ultima sincronizacao

---

## Detalhes Tecnicos

### Mapeamento de Campos - Empresas

| Campo Ativos Arantes | Tipo | Chave |
|---------------------|------|-------|
| id | uuid | - |
| nome | text | - |
| razao_social | text | - |
| cnpj | text | **Chave de Match** |
| endereco | text | - |
| telefone | text | - |
| email | text | - |
| active | boolean | - |

**Logica de Upsert:** Buscar por CNPJ. Se existir, atualizar. Se nao, inserir com novo UUID.

### Mapeamento de Campos - Funcionarios

| Campo Ativos Arantes | Tipo | Chave |
|---------------------|------|-------|
| id | uuid | - |
| nome | text | - |
| email | text | - |
| telefone | text | - |
| cargo | text | - |
| departamento | text | - |
| cpf | text | **Chave de Match** |
| empresa_id | uuid | FK (mapeado via CNPJ) |
| equipe_id | uuid | FK (opcional) |
| is_condutor | boolean | - |
| cnh_numero | text | - |
| cnh_categoria | text | - |
| cnh_validade | date | - |
| active | boolean | - |

**Logica de Upsert:** 
1. Buscar funcionario por CPF
2. Resolver empresa_id: buscar empresa no GA360 pelo CNPJ da empresa original
3. Se existir, atualizar. Se nao, inserir com novo UUID

### Codigo da Edge Function (resumo)

```typescript
// supabase/functions/sync-to-ga360/index.ts

import { createClient } from "@supabase/supabase-js";

// Cliente para o banco ORIGEM (Ativos Arantes)
const sourceSupabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

// Cliente para o banco DESTINO (GA360)
const targetSupabase = createClient(
  Deno.env.get("GA360_SUPABASE_URL")!,
  Deno.env.get("GA360_SUPABASE_SERVICE_KEY")!
);

Deno.serve(async (req) => {
  // 1. Buscar empresas ativas do banco origem
  // 2. Para cada empresa, fazer upsert no destino por CNPJ
  // 3. Buscar funcionarios ativos do banco origem
  // 4. Mapear empresa_id usando CNPJ
  // 5. Para cada funcionario, fazer upsert no destino por CPF
  // 6. Retornar relatorio
});
```

---

## Alteracoes nos Arquivos

| Arquivo | Acao |
|---------|------|
| `supabase/functions/sync-to-ga360/index.ts` | **CRIAR** - Edge Function de sincronizacao |
| `src/components/SyncToGA360.tsx` | **CRIAR** - Componente de UI para sincronizacao |
| `src/hooks/useSyncToGA360.ts` | **CRIAR** - Hook para chamar a Edge Function |
| `src/pages/Configuracoes.tsx` | **EDITAR** - Adicionar componente de sync na aba Integracoes |
| `supabase/config.toml` | **EDITAR** - Registrar nova Edge Function |

---

## Fluxo de Uso

1. Admin acessa **Configuracoes > Integracoes**
2. Na secao "Sincronizacao GA360", clica em "Sincronizar Empresas e Funcionarios"
3. Sistema executa Edge Function que:
   - Le empresas ativas do Ativos Arantes
   - Faz upsert no GA360 por CNPJ
   - Le funcionarios ativos do Ativos Arantes
   - Resolve vinculo empresa via CNPJ
   - Faz upsert no GA360 por CPF
4. Exibe toast com resultado: "Sincronizados: 15 empresas, 234 funcionarios"

---

## Pre-requisitos

Antes de implementar, voce precisara fornecer:

1. **GA360_SUPABASE_URL** - URL do projeto GA360
2. **GA360_SUPABASE_SERVICE_KEY** - Service Role Key do GA360

O GA360 precisa ter as tabelas `empresas` e `funcionarios` com estrutura compativel.

---

## Proximos Passos apos Aprovacao

1. Solicitar as credenciais do GA360 (URL e Service Role Key)
2. Configurar os secrets no Supabase
3. Criar a Edge Function
4. Criar componente de UI
5. Testar sincronizacao em ambiente controlado
