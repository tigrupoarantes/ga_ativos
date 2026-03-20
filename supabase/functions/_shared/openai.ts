import { corsHeaders, jsonResponse } from "./cors.ts";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface StreamChatCompletionParams {
  model?: string;
  messages: ChatMessage[];
}

export async function streamChatCompletion({
  model = "gpt-4o-mini",
  messages,
}: StreamChatCompletionParams): Promise<Response> {
  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) {
    return jsonResponse({ error: "OpenAI API key is not configured" }, 500);
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
      stream: true,
    }),
  });

  if (!response.ok) {
    if (response.status === 429) {
      return jsonResponse(
        { error: "Limite de requisições excedido. Tente novamente em alguns segundos." },
        429,
      );
    }

    if (response.status === 402) {
      return jsonResponse({ error: "Créditos insuficientes para IA." }, 402);
    }

    const errorText = await response.text();
    console.error("OpenAI API error:", response.status, errorText);
    return jsonResponse(
      { error: "Erro ao processar sua solicitação com a IA." },
      500,
    );
  }

  return new Response(response.body, {
    headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
  });
}
