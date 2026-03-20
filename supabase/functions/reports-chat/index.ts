import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { buildReportsSystemPrompt } from "../_shared/assistants.ts";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { streamChatCompletion } from "../_shared/openai.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();
    const systemContext = await buildReportsSystemPrompt();

    return await streamChatCompletion({
      messages: [{ role: "system", content: systemContext }, ...(messages || [])],
    });
  } catch (error) {
    console.error("Reports chat error:", error);
    return jsonResponse(
      { error: error instanceof Error ? error.message : "Erro desconhecido" },
      500,
    );
  }
});
