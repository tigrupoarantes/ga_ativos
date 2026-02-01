

# Plano: Corrigir Acesso Service Role no GA360

## Diagnóstico Atualizado

A tabela `companies` está sendo encontrada corretamente. O problema é que a **Edge Function não consegue bypassar o RLS**, mesmo com políticas criadas para `service_role`.

## Causa Provável

A secret `GA360_SUPABASE_SERVICE_KEY` contém a **anon key** em vez da **service_role key**.

Quando você cria um cliente Supabase com a service_role key, ele automaticamente ignora todas as políticas RLS. Isso não está acontecendo, o que indica key incorreta.

## Solução

### Passo 1: Obter a Service Role Key Correta

No projeto GA360 (Supabase Dashboard):
1. Vá em **Settings** > **API**
2. Na seção **Project API keys**, copie a **service_role key** (NÃO a anon/public key)
3. A service_role key é a segunda key, marcada como "secret"

### Passo 2: Atualizar o Secret no Lovable

Você precisa atualizar o secret `GA360_SUPABASE_SERVICE_KEY` com a key correta.

## Verificação Rápida

Para confirmar qual tipo de key está configurada:

| Tipo de Key | Comportamento |
|-------------|---------------|
| anon key | Respeita RLS - precisa de políticas específicas |
| service_role key | Ignora RLS completamente - acesso total |

Se a key atual fosse service_role, não haveria erro de RLS.

## Ação Imediata

1. Acesse o dashboard do projeto GA360
2. Copie a **service_role key** (não a anon key)
3. Atualize o secret `GA360_SUPABASE_SERVICE_KEY` no Lovable com essa key

Após atualizar, a sincronização funcionará sem precisar de políticas RLS adicionais.

