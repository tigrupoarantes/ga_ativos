
# Plano: Corrigir Chamada da Edge Function FIPE

## Problema Identificado

A Edge Function `consulta-fipe` está deployada no **Lovable Cloud** (projeto `aahtjjolpmrfcxxiouxj`), mas o hook `useFipeConsulta.ts` usa o cliente do **Supabase externo** (`ftksidxyhnvzdsuonwop`) para chamá-la.

| Componente | Projeto | Status |
|------------|---------|--------|
| Edge Function `consulta-fipe` | Lovable Cloud (`aahtjjolpmrfcxxiouxj`) | Funcionando |
| Cliente no hook | Supabase Externo (`ftksidxyhnvzdsuonwop`) | Não tem a função |

## Solução

Modificar o hook `useFipeConsulta.ts` para usar o cliente do **Lovable Cloud** especificamente para chamar Edge Functions, enquanto mantém o cliente externo para operações de banco de dados (tabela `veiculos`).

## Arquivo a Modificar

**`src/hooks/useFipeConsulta.ts`**

## Mudanças

### 1. Importar ambos os clientes

```typescript
// Cliente externo para operações de banco
import { supabase } from "@/integrations/supabase/external-client";

// Cliente Lovable Cloud para Edge Functions
import { supabase as supabaseLovable } from "@/integrations/supabase/client";
```

### 2. Atualizar função consultaFipe

Usar o cliente do Lovable Cloud para invocar as Edge Functions:

```typescript
async function consultaFipe<T>(body: Record<string, unknown>): Promise<T> {
  // Usar cliente Lovable Cloud para chamar Edge Functions
  const { data, error } = await supabaseLovable.functions.invoke("consulta-fipe", {
    body,
  });

  if (error) throw error;
  if (data.error) throw new Error(data.error);
  return data as T;
}
```

### 3. Manter operações de banco no cliente externo

As operações de `update` na tabela `veiculos` continuam usando o cliente externo:

```typescript
// Atualizar veículo no banco externo
const { error } = await supabase
  .from("veiculos")
  .update({...})
  .eq("id", params.veiculoId);
```

## Fluxo Corrigido

```text
┌─────────────────────────────────────────────────────────────────┐
│  FRONTEND                                                       │
│                                                                 │
│  useFipeConsulta.ts                                             │
│       │                                                         │
│       ├── supabaseLovable.functions.invoke("consulta-fipe")     │
│       │         │                                               │
│       │         ▼                                               │
│       │   Lovable Cloud (aahtjjolpmrfcxxiouxj)                  │
│       │         │                                               │
│       │         ▼                                               │
│       │   Edge Function consulta-fipe                           │
│       │         │                                               │
│       │         ▼                                               │
│       │   API FIPE (parallelum.com.br)                          │
│       │                                                         │
│       └── supabase.from("veiculos").update(...)                 │
│                 │                                               │
│                 ▼                                               │
│           Supabase Externo (ftksidxyhnvzdsuonwop)               │
└─────────────────────────────────────────────────────────────────┘
```

## Resumo das Alterações

| Linha | Antes | Depois |
|-------|-------|--------|
| 2 | Import único | Import duplo (externo + Lovable) |
| 32 | `supabase.functions.invoke` | `supabaseLovable.functions.invoke` |
| 94-101 | Manter | Continua usando cliente externo |
| 140-147 | Manter | Continua usando cliente externo |
