
# Plano: Implementar Sincronização para GA Pagamentos

## Resumo

Implementar sincronização de Empresas e Funcionários do Gestão de Ativos para o GA Pagamentos, seguindo o mesmo padrão já existente para o GA360.

## Credenciais Recebidas

| Configuração | Valor |
|--------------|-------|
| URL | `https://rdccyabdhaemwhmtoniy.supabase.co` |
| Service Role Key | `eyJhbGciOiJI...wSm4Q1Vk` |

## Arquitetura

```text
┌─────────────────────────────────────────────────────────────────────────────────┐
│                        FLUXO DE SINCRONIZAÇÃO                                   │
│                                                                                 │
│  ┌─────────────────────────┐                                                    │
│  │   SUPABASE EXTERNO      │                                                    │
│  │   (Gestão de Ativos)    │                                                    │
│  │   FONTE ÚNICA           │                                                    │
│  │   ftksidxyhnvzdsuonwop  │                                                    │
│  │                         │                                                    │
│  │   empresas              │                                                    │
│  │   funcionarios          │                                                    │
│  └───────────┬─────────────┘                                                    │
│              │                                                                  │
│              │ Leitura via Service Key                                          │
│              ▼                                                                  │
│  ┌─────────────────────────┐                                                    │
│  │   LOVABLE CLOUD         │                                                    │
│  │   aahtjjolpmrfcxxiouxj  │                                                    │
│  │                         │                                                    │
│  │   Edge Functions:       │                                                    │
│  │   - sync-to-ga360       │ (existente)                                        │
│  │   - sync-to-gapagam.    │ (NOVO)                                             │
│  └───────────┬─────────────┘                                                    │
│              │                                                                  │
│              │ Escrita via Service Key                                          │
│              ▼                                                                  │
│  ┌─────────────────────────┐                                                    │
│  │   GA PAGAMENTOS         │                                                    │
│  │   rdccyabdhaemwhmtoniy  │                                                    │
│  │                         │                                                    │
│  │   companies             │                                                    │
│  │   external_employees    │                                                    │
│  └─────────────────────────┘                                                    │
└─────────────────────────────────────────────────────────────────────────────────┘
```

## Etapas de Implementação

### 1. Configurar Secrets

Adicionar dois novos secrets no Lovable Cloud:

| Secret | Valor |
|--------|-------|
| `GAPAGAMENTOS_SUPABASE_URL` | `https://rdccyabdhaemwhmtoniy.supabase.co` |
| `GAPAGAMENTOS_SUPABASE_SERVICE_KEY` | `eyJhbGciOiJI...` (service_role key) |

### 2. Criar Edge Function

**Arquivo:** `supabase/functions/sync-to-gapagamentos/index.ts`

Baseado no `sync-to-ga360`, com as seguintes diferenças:

| Aspecto | GA360 | GA Pagamentos |
|---------|-------|---------------|
| Secret URL | `GA360_SUPABASE_URL` | `GAPAGAMENTOS_SUPABASE_URL` |
| Secret Key | `GA360_SUPABASE_SERVICE_KEY` | `GAPAGAMENTOS_SUPABASE_SERVICE_KEY` |
| Campos adicionais | - | `is_vendedor`, `codigo_vendedor`, CNH completa |

#### Mapeamento de Campos (Funcionários)

| Campo Origem | Campo Destino | Novo |
|--------------|---------------|------|
| id | external_id | |
| nome | full_name | |
| cpf | cpf | |
| email | email | |
| telefone | phone | |
| departamento | department | |
| cargo | position | |
| empresa_id | company_id | |
| empresas.nome | unidade | |
| is_condutor | is_condutor | |
| cnh_numero | cnh_numero | Sim |
| cnh_categoria | cnh_categoria | Sim |
| cnh_validade | cnh_validade | Sim |
| is_vendedor | is_vendedor | Sim |
| codigo_vendedor | codigo_vendedor | Sim |
| whatsapp_phone_e164 | whatsapp_phone_e164 | Sim |
| whatsapp_opt_in | whatsapp_opt_in | Sim |
| active | is_active | |

### 3. Atualizar Config.toml

Adicionar configuração para a nova função:

```toml
[functions.sync-to-gapagamentos]
verify_jwt = false
```

### 4. Criar Hook React

**Arquivo:** `src/hooks/useSyncToGAPagamentos.ts`

Cópia do `useSyncToGA360.ts` com endpoint alterado para `sync-to-gapagamentos`.

### 5. Criar Componente de UI

**Arquivo:** `src/components/SyncToGAPagamentos.tsx`

Similar ao `SyncToGA360.tsx`, com:
- Título: "Sincronização GA Pagamentos"
- Descrição: "Sincronize empresas e funcionários com o sistema GA Pagamentos"
- Mesma UI de progresso e resultados

### 6. Adicionar na Página de Configurações

Adicionar o componente `<SyncToGAPagamentos />` na página de configurações, abaixo do `<SyncToGA360 />`.

## Detalhes Técnicos

### Edge Function (sync-to-gapagamentos)

```typescript
// Campos adicionais no mapeamento de funcionários
const employeeData = {
  external_id: func.id,
  source_system: 'gestao_ativos',
  company_id: targetCompanyId,
  unidade: func.empresas?.nome || null,
  full_name: func.nome,
  email: func.email,
  phone: func.telefone,
  department: func.departamento,
  position: func.cargo,
  cpf: func.cpf,
  is_active: func.active ?? true,
  // Condutor
  is_condutor: func.is_condutor ?? false,
  cnh_numero: func.cnh_numero,
  cnh_categoria: func.cnh_categoria,
  cnh_validade: func.cnh_validade,
  // Vendedor (NOVOS)
  is_vendedor: func.is_vendedor ?? false,
  codigo_vendedor: func.codigo_vendedor,
  // WhatsApp
  whatsapp_phone_e164: func.whatsapp_phone_e164,
  whatsapp_opt_in: func.whatsapp_opt_in ?? true,
  // Sync
  synced_at: new Date().toISOString()
};
```

### Arquivos a Criar/Modificar

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `supabase/functions/sync-to-gapagamentos/index.ts` | Criar | Edge Function de sincronização |
| `supabase/config.toml` | Modificar | Adicionar config da função |
| `src/hooks/useSyncToGAPagamentos.ts` | Criar | Hook para chamar a função |
| `src/components/SyncToGAPagamentos.tsx` | Criar | Componente de UI |
| `src/pages/Configuracoes.tsx` | Modificar | Adicionar componente na página |

## Resultado Esperado

Após a implementação:
- Nova seção "Sincronização GA Pagamentos" na página de Configurações
- Botões para sincronizar Empresas, Funcionários ou Tudo
- Barra de progresso em tempo real via SSE
- Relatório de registros inseridos/atualizados
- Campos de vendedor e CNH completos sincronizados
