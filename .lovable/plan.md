

# Plano: Corrigir Sincronização GA360

## Problema Identificado

A Edge Function `sync-to-ga360` está usando credenciais incorretas para o banco de origem:

```text
Linha 31-34 (ATUAL):
sourceSupabase = createClient(
  Deno.env.get("SUPABASE_URL"),           → Lovable Cloud ❌
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
)
```

Isso causa o erro "Could not find table 'public.empresas'" porque a tabela existe no **Supabase Externo**, não no Lovable Cloud.

---

## Arquitetura Corrigida

```text
┌──────────────────────────────────────┐          ┌────────────────────────────────┐
│      SUPABASE EXTERNO (ORIGEM)       │          │          GA360 (DESTINO)       │
│     ftksidxyhnvzdsuonwop             │  ─────>  │      zveqhxaiwghexfobjaek      │
│                                      │   sync   │                                │
│  - empresas ✓                        │          │  - empresas                    │
│  - funcionarios ✓                    │          │  - funcionarios                │
│  - veiculos                          │          │                                │
│  - ativos                            │          │                                │
└──────────────────────────────────────┘          └────────────────────────────────┘
  EXTERNAL_SUPABASE_URL                            GA360_SUPABASE_URL
  EXTERNAL_SUPABASE_SERVICE_KEY                    GA360_SUPABASE_SERVICE_KEY
```

---

## Alterações Necessárias

### 1. Adicionar Novas Secrets

| Secret | Valor |
|--------|-------|
| `EXTERNAL_SUPABASE_URL` | `https://ftksidxyhnvzdsuonwop.supabase.co` |
| `EXTERNAL_SUPABASE_SERVICE_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (fornecida) |

### 2. Atualizar Edge Function

**Arquivo:** `supabase/functions/sync-to-ga360/index.ts`

**Mudança nas linhas 30-45:**

```typescript
// ANTES (incorreto)
const sourceSupabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

// DEPOIS (corrigido)
const externalUrl = Deno.env.get("EXTERNAL_SUPABASE_URL");
const externalKey = Deno.env.get("EXTERNAL_SUPABASE_SERVICE_KEY");

if (!externalUrl || !externalKey) {
  return new Response(
    JSON.stringify({ error: 'Credenciais do Supabase externo não configuradas' }),
    { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

const sourceSupabase = createClient(externalUrl, externalKey);
```

---

## Resumo de Alterações

| Item | Ação |
|------|------|
| Secret `EXTERNAL_SUPABASE_URL` | Criar |
| Secret `EXTERNAL_SUPABASE_SERVICE_KEY` | Criar |
| `supabase/functions/sync-to-ga360/index.ts` | Atualizar linhas 30-34 |

---

## Resultado Esperado

Após as alterações, a sincronização irá:
1. Ler empresas e funcionários do **Supabase Externo** (ftksidxyhnvzdsuonwop)
2. Gravar/atualizar no **GA360** (zveqhxaiwghexfobjaek)
3. Usar CNPJ como chave única para empresas
4. Usar CPF como chave única para funcionários

