
# Plano de Correção: 3 Arquivos Restantes

## Arquivos a Corrigir

| Arquivo | Linha | Uso |
|---------|-------|-----|
| `src/pages/Notificacoes.tsx` | Linha 30 | Edge Functions (`whatsapp-send`, `workshop-scheduler`) |
| `src/pages/Funcionarios.tsx` | Linha 19 | Query direta ao banco (`checkCpfDuplicate`) |
| `src/hooks/usePaginatedQuery.ts` | Linha 3 | Hook genérico de paginação |

---

## Alterações

### 1. `src/pages/Notificacoes.tsx`
**Linha 30:**
```typescript
// De:
import { supabase } from "@/integrations/supabase/client";

// Para:
import { supabase } from "@/integrations/supabase/external-client";
```

> **Nota:** Este arquivo usa Edge Functions (`whatsapp-send` e `workshop-scheduler`). Se as Edge Functions estiverem deployadas apenas no Lovable Cloud e não no Supabase externo, essas chamadas falharão. Mas como você decidiu testar primeiro e fazer rollback se necessário, vou migrar para o cliente externo.

---

### 2. `src/pages/Funcionarios.tsx`
**Linha 19:**
```typescript
// De:
import { supabase } from "@/integrations/supabase/client";

// Para:
import { supabase } from "@/integrations/supabase/external-client";
```

---

### 3. `src/hooks/usePaginatedQuery.ts`
**Linha 3:**
```typescript
// De:
import { supabase } from "@/integrations/supabase/client";

// Para:
import { supabase } from "@/integrations/supabase/external-client";
```

---

## Resumo

Após estas correções:
- **100% das importações** do Supabase client apontarão para o `external-client`
- Todos os dados serão lidos/escritos no banco externo
- Nenhum dado será armazenado no Lovable Cloud

## Pontos de Atenção

O arquivo `Notificacoes.tsx` chama Edge Functions:
- `supabase.functions.invoke("whatsapp-send")`
- `supabase.functions.invoke("workshop-scheduler")`

Se essas funções não existirem no Supabase externo, você verá erros. Nesse caso, faremos o rollback apenas dessas chamadas para usar um cliente do Lovable Cloud.
