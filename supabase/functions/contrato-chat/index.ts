import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { buildContratoSystemPrompt } from "../_shared/assistants.ts";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { streamChatCompletion } from "../_shared/openai.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { contrato_id, messages, file } = await req.json();

    if (!contrato_id) {
      return jsonResponse({ error: "contrato_id é obrigatório" }, 400);
    }

    const systemPrompt = await buildContratoSystemPrompt(contrato_id, file);

    return await streamChatCompletion({
      messages: [{ role: "system", content: systemPrompt }, ...(messages || [])],
    });
  } catch (error) {
    console.error("Contrato chat error:", error);
    const status =
      error instanceof Error && error.message === "Contrato não encontrado" ? 404 : 500;
    return jsonResponse(
      { error: error instanceof Error ? error.message : "Erro desconhecido" },
      status,
    );
  }
});
