const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface OcrResponse {
  extractedKm: number | null;
  confidence: "high" | "medium" | "low";
  rawResponse: string;
}

function extractKmFromText(text: string): number | null {
  // Remove espaços entre dígitos ("53 197" → "53197") e procura sequência de 4-7 dígitos
  // Usa lookahead/lookbehind para não exigir word-boundary (funciona com "53197km")
  const compactText = text.replace(/(\d)\s+(\d)/g, "$1$2");
  const numMatch = compactText.match(/(?<!\d)(\d{4,7})(?!\d)/);
  return numMatch ? parseInt(numMatch[1], 10) : null;
}

function parseGeminiResponse(text: string): OcrResponse {
  // Tenta extrair JSON do texto (suporta multi-linha e markdown code blocks)
  const jsonMatch = text.match(/\{[\s\S]*?\}/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      const rawKm = parsed.km;
      // Aceita número ou string numérica (ex: "53197" ou 53197)
      const km =
        typeof rawKm === "number"
          ? Math.round(rawKm)
          : typeof rawKm === "string" && rawKm.trim() !== ""
          ? parseInt(rawKm.replace(/\D/g, ""), 10) || null
          : null;
      const confidence = (["high", "medium", "low"].includes(parsed.confidence)
        ? parsed.confidence
        : "low") as "high" | "medium" | "low";

      // Se km veio preenchido, retorna direto
      if (km !== null) {
        return { extractedKm: km, confidence, rawResponse: parsed.raw_text || text };
      }

      // km é null mas pode ter raw_text com os dígitos visíveis ("53 197")
      if (parsed.raw_text) {
        const fallbackKm = extractKmFromText(parsed.raw_text);
        if (fallbackKm !== null) {
          return { extractedKm: fallbackKm, confidence: "low", rawResponse: parsed.raw_text };
        }
      }
    } catch {
      // Continua para fallback com o texto bruto
    }
  }

  // Fallback final: extrai direto do texto da resposta
  const fallbackKm = extractKmFromText(text);
  if (fallbackKm !== null) {
    return { extractedKm: fallbackKm, confidence: "low", rawResponse: text };
  }

  return { extractedKm: null, confidence: "low", rawResponse: text };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { imageBase64, vehicleId, vehiclePlaca } = await req.json();

    if (!imageBase64) {
      return new Response(
        JSON.stringify({ error: "imageBase64 é obrigatório" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const apiKey = Deno.env.get("GEMINI_API_KEY");

    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "GEMINI_API_KEY não configurada" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Normaliza a imagem: remove prefixo data URI se existir e determina mime type
    let base64Data = imageBase64;
    let mimeType = "image/jpeg";
    if (imageBase64.startsWith("data:")) {
      const [header, data] = imageBase64.split(",");
      base64Data = data;
      const mimeMatch = header.match(/data:([^;]+)/);
      if (mimeMatch) mimeType = mimeMatch[1];
    }

    const placaInfo = vehiclePlaca ? `Placa do veículo: ${vehiclePlaca}` : "";

    const prompt = `Você é um assistente especializado em leitura de hodômetros de veículos.

Analise cuidadosamente esta foto de um hodômetro/velocímetro de veículo.
Extraia a leitura total de quilometragem (KM) mostrada no display do hodômetro.
${placaInfo}

Retorne APENAS um objeto JSON válido neste formato exato (sem markdown, sem explicações):
{"km": <número inteiro ou null se ilegível>, "confidence": "high" ou "medium" ou "low", "raw_text": "<dígitos ou texto visível>"}

Regras importantes:
- km deve ser um número inteiro SEM pontos ou vírgulas (ex: "45.230" vira 45230)
- confidence é "high" se claramente legível, "medium" se parcialmente visível, "low" se ilegível
- Se não conseguir identificar o hodômetro, retorne km como null
- Ignore a velocidade atual, foque apenas no contador total de KM`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: prompt },
                {
                  inline_data: {
                    mime_type: mimeType,
                    data: base64Data,
                  },
                },
              ],
            },
          ],
          generationConfig: {
            maxOutputTokens: 150,
            temperature: 0.1,
          },
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error("Gemini API error:", response.status, errText);
      return new Response(
        JSON.stringify({
          error: "Erro no serviço de IA",
          extractedKm: null,
          confidence: "low",
          rawResponse: errText,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const aiResult = await response.json();
    const messageContent: string =
      aiResult.candidates?.[0]?.content?.parts?.[0]?.text || "";

    console.log("Gemini response:", messageContent);

    const parsed = parseGeminiResponse(messageContent);

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("odometer-ocr error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Erro desconhecido",
        extractedKm: null,
        confidence: "low",
        rawResponse: "",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
