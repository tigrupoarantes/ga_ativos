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
  caminhonete: "trucks",
  furgao: "trucks",
  van: "trucks",
  pickup: "trucks",
  cars: "cars",
  motorcycles: "motorcycles",
  trucks: "trucks",
};

interface FipeRequest {
  action: "marcas" | "modelos" | "anos" | "valor" | "valor-por-codigo-ano";
  tipo?: string;
  marcaId?: number | string;
  modeloId?: number | string;
  anoId?: string;
  codigoFipe?: string;
  ano?: number;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: FipeRequest = await req.json();
    const { action, tipo = "cars", marcaId, modeloId, anoId, codigoFipe, ano } = body;

    const tipoApi = tipoMap[tipo.toLowerCase()] || "cars";
    let url = "";
    let data: unknown;

    console.log(`[consulta-fipe] Action: ${action}, Tipo: ${tipoApi}, Marca: ${marcaId}, Modelo: ${modeloId}, Ano: ${anoId}, Codigo: ${codigoFipe}, AnoVeiculo: ${ano}`);

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

      case "valor-por-codigo-ano": {
        // Consulta direta por código FIPE e ano do veículo
        if (!codigoFipe) {
          return new Response(
            JSON.stringify({ error: "codigoFipe é obrigatório" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Normalizar código FIPE para formato 000000-0 (6 dígitos antes do hífen)
        let codigoNormalizado = codigoFipe.trim();
        if (codigoNormalizado.includes("-")) {
          const [prefixo, sufixo] = codigoNormalizado.split("-");
          codigoNormalizado = prefixo.padStart(6, "0") + "-" + sufixo;
        } else {
          // Se não tem hífen, adicionar padding e assumir sufixo 0
          codigoNormalizado = codigoFipe.padStart(6, "0") + "-0";
        }

        console.log(`[consulta-fipe] Código original: ${codigoFipe}, Normalizado: ${codigoNormalizado}`);

        console.log(`[consulta-fipe] Buscando anos para código FIPE: ${codigoNormalizado}`);

        // 1. Buscar anos disponíveis para o código FIPE
        const anosUrl = `${FIPE_API_BASE}/${tipoApi}/${codigoNormalizado}/years`;
        console.log(`[consulta-fipe] URL anos: ${anosUrl}`);
        
        const anosResponse = await fetch(anosUrl);
        
        if (!anosResponse.ok) {
          const errorText = await anosResponse.text();
          console.error(`[consulta-fipe] Erro ao buscar anos: ${anosResponse.status} - ${errorText}`);
          
          // Verificar se é erro da API FIPE (424, 503, etc.) ou código inválido (404)
          if (anosResponse.status === 424 || anosResponse.status === 503 || anosResponse.status === 502) {
            return new Response(
              JSON.stringify({ 
                error: "API FIPE temporariamente indisponível",
                details: "Tente novamente em alguns segundos"
              }),
              { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
          
          return new Response(
            JSON.stringify({ 
              error: "Código FIPE inválido ou não encontrado",
              details: `Código ${codigoFipe} não foi encontrado na tabela FIPE`
            }),
            { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const anos = await anosResponse.json() as Array<{ code: string; name: string }>;
        console.log(`[consulta-fipe] Anos disponíveis:`, anos);

        if (!anos || anos.length === 0) {
          return new Response(
            JSON.stringify({ 
              error: "Nenhum ano disponível para este código FIPE",
              details: `Código ${codigoFipe} não possui anos cadastrados`
            }),
            { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // 2. Encontrar yearId que corresponde ao ano do veículo
        // Anos vêm como: [{ code: "2015-1", name: "2015 Gasolina" }, ...]
        let anoEncontrado = anos.find(a => a.code.startsWith(`${ano}-`));
        
        // Se não encontrou o ano exato, tentar encontrar o mais próximo ou usar o primeiro
        if (!anoEncontrado && ano) {
          // Ordenar por proximidade ao ano desejado
          const anosComDiff = anos.map(a => {
            const anoCode = parseInt(a.code.split('-')[0]);
            return { ...a, diff: Math.abs(anoCode - ano) };
          });
          anosComDiff.sort((a, b) => a.diff - b.diff);
          anoEncontrado = anosComDiff[0];
          console.log(`[consulta-fipe] Ano ${ano} não encontrado, usando ${anoEncontrado.code}`);
        }
        
        if (!anoEncontrado) {
          anoEncontrado = anos[0];
          console.log(`[consulta-fipe] Usando primeiro ano disponível: ${anoEncontrado.code}`);
        }

        // 3. Consultar valor
        const valorUrl = `${FIPE_API_BASE}/${tipoApi}/${codigoNormalizado}/years/${anoEncontrado.code}`;
        console.log(`[consulta-fipe] URL valor: ${valorUrl}`);
        
        const valorResponse = await fetch(valorUrl);
        
        if (!valorResponse.ok) {
          const errorText = await valorResponse.text();
          console.error(`[consulta-fipe] Erro ao buscar valor: ${valorResponse.status} - ${errorText}`);
          return new Response(
            JSON.stringify({ 
              error: "Erro ao consultar valor FIPE",
              details: errorText
            }),
            { status: valorResponse.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const valorData = await valorResponse.json() as {
          brand?: string;
          model?: string;
          modelYear?: number;
          fuel?: string;
          codeFipe?: string;
          price?: string;
          referenceMonth?: string;
        };

        console.log(`[consulta-fipe] Valor obtido:`, valorData);

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
          anoConsultado: anoEncontrado.code,
        };

        console.log(`[consulta-fipe] Retornando:`, data);

        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

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
