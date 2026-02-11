

# Migrar IA para Lovable AI (gratuito)

O projeto ja possui o **LOVABLE_API_KEY** configurado automaticamente pelo Lovable Cloud. Vamos migrar as duas edge functions (`contrato-chat` e `reports-chat`) para usar o gateway gratuito do Lovable AI em vez da OpenAI, eliminando a necessidade de creditos na OpenAI.

## O que muda

- **Endpoint**: De `https://api.openai.com/v1/chat/completions` para `https://ai.gateway.lovable.dev/v1/chat/completions`
- **Modelo**: De `gpt-4o-mini` para `google/gemini-3-flash-preview` (rapido e gratuito)
- **Autenticacao**: De `OPENAI_API_KEY` para `LOVABLE_API_KEY` (ja configurado)
- **Hooks do frontend**: Precisam apontar para o Lovable Cloud (`aahtjjolpmrfcxxiouxj`) para chamar as edge functions, pois e la que o `LOVABLE_API_KEY` esta disponivel. Os dados do banco continuam sendo buscados do Supabase externo via `EXTERNAL_SUPABASE_URL`.

## Arquivos a serem alterados

### 1. `supabase/functions/contrato-chat/index.ts`
- Trocar `OPENAI_API_KEY` por `LOVABLE_API_KEY`
- Trocar URL da OpenAI pelo gateway Lovable AI
- Trocar modelo para `google/gemini-3-flash-preview`
- Remover logica de buscar token da tabela `app_config`
- Manter busca de dados do contrato via Supabase externo

### 2. `supabase/functions/reports-chat/index.ts`
- Mesmas alteracoes: `LOVABLE_API_KEY`, gateway Lovable AI, modelo `google/gemini-3-flash-preview`
- Remover logica de `app_config`
- Manter busca de dados via Supabase externo

### 3. `src/hooks/useContratoChat.ts`
- Alterar `CHAT_URL` para apontar para o Lovable Cloud: `` `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/contrato-chat` ``
- Usar `VITE_SUPABASE_PUBLISHABLE_KEY` na autorizacao

### 4. `src/hooks/useReportsChat.ts`
- Mesma alteracao: apontar para Lovable Cloud
- Usar `VITE_SUPABASE_PUBLISHABLE_KEY` na autorizacao

## O que NAO muda

- Os prompts do sistema (system prompts) permanecem iguais
- A logica de streaming SSE permanece igual
- Os dados continuam sendo buscados do Supabase externo
- O componente `AIConfigForm` pode ser removido futuramente (nao sera mais necessario configurar token)

## Secao Tecnica

As edge functions continuarao conectando ao Supabase externo para buscar dados (contratos, veiculos, funcionarios, etc.) usando `EXTERNAL_SUPABASE_URL` e `EXTERNAL_SUPABASE_SERVICE_KEY`. Apenas a chamada ao modelo de IA muda do endpoint OpenAI para o gateway Lovable AI.

Tratamento de erros 429 (rate limit) e 402 (creditos) sera mantido, pois o Lovable AI tambem pode retornar esses codigos.

