

# Plano: Migrar reports-chat para OpenAI API

## Resumo da Mudança

Vamos atualizar a Edge Function `reports-chat` para usar sua API da OpenAI diretamente, substituindo o Lovable AI Gateway.

---

## O que vai mudar

| Antes (Atual) | Depois (OpenAI) |
|---------------|-----------------|
| Lovable AI Gateway | OpenAI API direta |
| `LOVABLE_API_KEY` | `OPENAI_API_KEY` |
| `google/gemini-3-flash-preview` | `gpt-4o-mini` ou `gpt-4o` |
| URL: ai.gateway.lovable.dev | URL: api.openai.com |

---

## Passo a Passo

### Passo 1: Adicionar Secret da OpenAI

Você precisará cadastrar sua chave de API da OpenAI como um **Secret** no projeto:
- Nome: `OPENAI_API_KEY`
- Valor: Sua chave (começa com `sk-...`)

### Passo 2: Atualizar a Edge Function

Modificar o arquivo `supabase/functions/reports-chat/index.ts`:

1. **Trocar a variável de ambiente**: De `LOVABLE_API_KEY` para `OPENAI_API_KEY`
2. **Atualizar o endpoint**: De `https://ai.gateway.lovable.dev/v1/chat/completions` para `https://api.openai.com/v1/chat/completions`
3. **Ajustar o modelo**: Usar `gpt-4o-mini` (mais barato e rápido) ou `gpt-4o` (mais poderoso)

### Passo 3: Deploy da Função

Após as alterações, a função será reimplantada automaticamente no Lovable Cloud.

---

## Código da Alteração

A mudança principal será nas linhas 17-19 e 239-252:

```typescript
// ANTES:
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
if (!LOVABLE_API_KEY) {
  throw new Error("LOVABLE_API_KEY is not configured");
}
// ...
const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
  headers: {
    Authorization: `Bearer ${LOVABLE_API_KEY}`,
  },
  body: JSON.stringify({
    model: "google/gemini-3-flash-preview",
    // ...
  }),
});

// DEPOIS:
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
if (!OPENAI_API_KEY) {
  throw new Error("OPENAI_API_KEY is not configured");
}
// ...
const response = await fetch("https://api.openai.com/v1/chat/completions", {
  headers: {
    Authorization: `Bearer ${OPENAI_API_KEY}`,
  },
  body: JSON.stringify({
    model: "gpt-4o-mini", // ou "gpt-4o" para respostas mais complexas
    // ...
  }),
});
```

---

## Escolha do Modelo OpenAI

| Modelo | Custo | Velocidade | Qualidade | Recomendação |
|--------|-------|------------|-----------|--------------|
| `gpt-4o-mini` | Baixo | Rápido | Muito boa | **Recomendado para este caso** |
| `gpt-4o` | Médio | Médio | Excelente | Para análises complexas |
| `gpt-4-turbo` | Alto | Médio | Excelente | Contexto maior |

**Recomendo `gpt-4o-mini`** pois é suficiente para consultas de dados e tem ótimo custo-benefício.

---

## Resultado Esperado

Após a implementação, o chat de relatórios continuará funcionando normalmente, mas agora usando sua conta da OpenAI diretamente. Você poderá monitorar o uso e custos no dashboard da OpenAI.

