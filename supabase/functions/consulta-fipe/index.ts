import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const FIPE_API_BASE = "https://fipe.parallelum.com.br/api/v2";

// Mapeamento de tipos
const tipoMap: Record<string, string> = {
  carro: "cars",
  carros: "cars",
  moto: "motorcycles",
  motos: "motorcycles",
  caminhao: "trucks",
  caminhoes: "trucks",
  cars: "cars",
  motorcycles: "motorcycles",
  trucks: "trucks",
};

interface FipeRequest {
  action: "marcas" | "modelos" | "anos" | "valor" | "valor-por-codigo";
  tipo?: string;
  marcaId?: number | string;
  modeloId?: number | string;
  anoId?: string;
  codigoFipe?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: FipeRequest = await req.json();
    const { action, tipo = "cars", marcaId, modeloId, anoId, codigoFipe } = body;

    const tipoApi = tipoMap[tipo.toLowerCase()] || "cars";
    let url = "";
    let data: unknown;

    console.log(`[consulta-fipe] Action: ${action}, Tipo: ${tipoApi}, Marca: ${marcaId}, Modelo: ${modeloId}, Ano: ${anoId}, Codigo: ${codigoFipe}`);

    switch (action) {
      case "marcas":
        url = `${FIPE_API_BASE}/${tipoApi}/brands`;
        break;

      case "modelos":
        if (!marcaId) {
          return new Response(
            JSON.stringify({ error: "marcaId é obrigatório para listar modelos" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        url = `${FIPE_API_BASE}/${tipoApi}/brands/${marcaId}/models`;
        break;

      case "anos":
        if (!marcaId || !modeloId) {
          return new Response(
            JSON.stringify({ error: "marcaId e modeloId são obrigatórios para listar anos" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        url = `${FIPE_API_BASE}/${tipoApi}/brands/${marcaId}/models/${modeloId}/years`;
        break;

      case "valor":
        if (!marcaId || !modeloId || !anoId) {
          return new Response(
            JSON.stringify({ error: "marcaId, modeloId e anoId são obrigatórios para consultar valor" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        url = `${FIPE_API_BASE}/${tipoApi}/brands/${marcaId}/models/${modeloId}/years/${anoId}`;
        break;

      case "valor-por-codigo":
        // A API Parallelum NÃO suporta busca direta por código FIPE
        // Retornamos erro explicativo para o usuário
        if (!codigoFipe) {
          return new Response(
            JSON.stringify({ error: "codigoFipe é obrigatório para consultar por código" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Tentativa: usar API alternativa via webscraping ou API que suporte código FIPE
        // Como não há API pública gratuita confiável, informamos o usuário
        console.log(`[consulta-fipe] Busca por código FIPE não suportada diretamente pela API Parallelum`);
        
        return new Response(
          JSON.stringify({ 
            error: "Busca por código FIPE não disponível",
            details: "A API FIPE (Parallelum) não suporta busca direta por código. Use a consulta por Marca/Modelo/Ano no cadastro do veículo.",
            suggestion: "Abra o cadastro do veículo e use o botão 'Consultar FIPE' para selecionar marca, modelo e ano."
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );

      default:
        return new Response(
          JSON.stringify({ error: "Ação inválida" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

    console.log(`[consulta-fipe] Fetching: ${url}`);

    const response = await fetch(url);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[consulta-fipe] API Error: ${response.status} - ${errorText}`);
      return new Response(
        JSON.stringify({ error: `Erro na API FIPE: ${response.status}`, details: errorText }),
        { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    data = await response.json();

    // Para ação de valor, processar e formatar resposta
    if (action === "valor") {
      const valorData = data as {
        brand?: string;
        model?: string;
        modelYear?: number;
        fuel?: string;
        codeFipe?: string;
        price?: string;
        referenceMonth?: string;
      };

      // Extrair valor numérico
      const valorStr = valorData.price || "";
      const valorNumerico = parseFloat(
        valorStr.replace("R$", "").replace(/\./g, "").replace(",", ".").trim()
      );

      data = {
        marca: valorData.brand,
        modelo: valorData.model,
        anoModelo: valorData.modelYear,
        combustivel: valorData.fuel,
        codigoFipe: valorData.codeFipe,
        valor: valorData.price,
        valorNumerico: isNaN(valorNumerico) ? null : valorNumerico,
        mesReferencia: valorData.referenceMonth,
      };
    }

    console.log(`[consulta-fipe] Success, returning data`);

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error(`[consulta-fipe] Error:`, error);
    const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
    return new Response(
      JSON.stringify({ error: "Erro interno", details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
