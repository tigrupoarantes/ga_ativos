
# Plano de Migração: Atualização das Credenciais do Supabase Externo

## Objetivo
Atualizar o frontend para conectar ao seu Supabase externo em vez do Lovable Cloud.

## Credenciais do Novo Projeto

| Variável | Valor |
|----------|-------|
| **Project URL** | `https://ftksidxyhnvzdsuonwop.supabase.co` |
| **Project ID** | `ftksidxyhnvzdsuonwop` |
| **Anon Key** | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ0a3NpZHh5aG52emRzdW9ud29wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5MTgzNzUsImV4cCI6MjA4NDQ5NDM3NX0.8HWR0HS9EAT-1ld3oLxe4DD8HHp5n5gMmSLa8om6Gbs` |

## Estratégia de Implementação

Como os arquivos `.env` e `client.ts` são gerenciados automaticamente pelo Lovable Cloud, vamos criar uma camada de configuração própria que sobrescreve essas configurações.

### Arquivos a Criar

1. **`src/config/supabase.config.ts`** - Arquivo de configuração com as credenciais do Supabase externo
   
2. **`src/integrations/supabase/external-client.ts`** - Novo cliente Supabase usando as credenciais externas

### Arquivos a Modificar

3. **`src/integrations/supabase/client.ts`** - Redirecionar para usar o cliente externo (workaround para manter compatibilidade com todos os 44+ arquivos que importam deste local)

## Detalhes Técnicos

### Passo 1: Criar arquivo de configuração

Criar `src/config/supabase.config.ts` com as credenciais hardcoded do projeto externo:

```typescript
export const EXTERNAL_SUPABASE_CONFIG = {
  url: "https://ftksidxyhnvzdsuonwop.supabase.co",
  anonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  projectId: "ftksidxyhnvzdsuonwop"
};
```

### Passo 2: Criar cliente externo

Criar `src/integrations/supabase/external-client.ts` que usa as configurações externas:

```typescript
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';
import { EXTERNAL_SUPABASE_CONFIG } from '@/config/supabase.config';

export const supabase = createClient<Database>(
  EXTERNAL_SUPABASE_CONFIG.url,
  EXTERNAL_SUPABASE_CONFIG.anonKey,
  {
    auth: {
      storage: localStorage,
      persistSession: true,
      autoRefreshToken: true,
    }
  }
);
```

### Passo 3: Atualizar client.ts

Modificar `src/integrations/supabase/client.ts` para re-exportar do cliente externo:

```typescript
// Re-export from external client for migration
export { supabase } from './external-client';
```

## Impacto

- **Zero alterações** nos 44+ arquivos que usam o cliente Supabase
- Todos os imports existentes (`import { supabase } from "@/integrations/supabase/client"`) continuarão funcionando
- Fácil reversão caso necessário (basta remover o re-export)

## Considerações de Segurança

- A **Anon Key** é uma chave pública, segura para estar no código frontend
- As políticas RLS no banco garantem a segurança dos dados
- Nunca colocar a **Service Role Key** no frontend

## Edge Functions

As Edge Functions do Supabase externo já foram configuradas nos passos anteriores e usam as secrets configuradas diretamente no dashboard do Supabase externo (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, etc.).

## Próximos Passos Após Esta Migração

1. **Testar autenticação** - Login/logout funcionando
2. **Verificar queries** - Dados sendo carregados corretamente
3. **Testar Edge Functions** - Chat de relatórios e outras funções
4. **Configurar URLs de redirecionamento** - No dashboard do Supabase externo em Authentication > URL Configuration
