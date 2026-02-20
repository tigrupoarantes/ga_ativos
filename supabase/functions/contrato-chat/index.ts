import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as XLSX from "https://esm.sh/xlsx@0.18.5";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { contrato_id, messages, file } = await req.json();

    const supabaseUrl = Deno.env.get("EXTERNAL_SUPABASE_URL") || Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("EXTERNAL_SUPABASE_SERVICE_KEY") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const aiGatewayApiKey = Deno.env.get("AI_GATEWAY_API_KEY") || Deno.env.get("LOVABLE_API_KEY");
    if (!aiGatewayApiKey) {
      return new Response(
        JSON.stringify({ error: "AI gateway API key is not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch contract data
    const { data: contrato } = await supabase
      .from("contratos")
      .select("*")
      .eq("id", contrato_id)
      .single();

    if (!contrato) {
      return new Response(JSON.stringify({ error: "Contrato não encontrado" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch metricas
    const { data: metricas } = await supabase
      .from("contrato_metricas")
      .select("*")
      .eq("contrato_id", contrato_id)
      .eq("active", true);

    // Fetch historical consumption
    const { data: consumos } = await supabase
      .from("contrato_consumo")
      .select("*")
      .eq("contrato_id", contrato_id)
      .order("mes_referencia", { ascending: false })
      .limit(100);

    // Parse Excel file if provided
    let excelData = "";
    if (file?.base64) {
      try {
        const binaryStr = atob(file.base64);
        const bytes = new Uint8Array(binaryStr.length);
        for (let i = 0; i < binaryStr.length; i++) {
          bytes[i] = binaryStr.charCodeAt(i);
        }

        const workbook = XLSX.read(bytes, { type: "array" });
        const sheets: string[] = [];

        for (const sheetName of workbook.SheetNames.slice(0, 3)) {
          const sheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });
          const limited = (jsonData as any[][]).slice(0, 100);
          sheets.push(`\n--- Aba: ${sheetName} ---\n${limited.map((row: any[]) => row.join(" | ")).join("\n")}`);
        }

        excelData = `\n\n═══ DADOS DO ARQUIVO EXCEL: ${file.name} ═══${sheets.join("\n")}`;
      } catch (e) {
        console.error("Error parsing Excel:", e);
        excelData = "\n\n⚠️ Erro ao processar o arquivo Excel. Verifique se é um arquivo .xlsx ou .xls válido.";
      }
    }

    // Build system prompt with contract context
    const metricasDesc = (metricas || []).map((m: any) =>
      `- ${m.nome} (unidade: ${m.unidade}, valor unitário: R$ ${m.valor_unitario || 'N/D'}, meta mensal: ${m.meta_mensal || 'N/D'})`
    ).join("\n");

    const historicoDesc = (consumos || []).slice(0, 24).map((c: any) => {
      const metrica = (metricas || []).find((m: any) => m.id === c.metrica_id);
      return `- ${c.mes_referencia}: ${metrica?.nome || 'Métrica'} = ${c.quantidade} ${metrica?.unidade || ''} | R$ ${c.valor_total || 0}`;
    }).join("\n");

    const systemPrompt = `Você é um assistente especializado em análise de contratos corporativos.
Responda SEMPRE em português brasileiro, de forma clara e formatada em Markdown.
Data de hoje: ${new Date().toLocaleDateString('pt-BR')}

═══ CONTRATO ATUAL ═══
- Número: ${contrato.numero}
- Descrição: ${contrato.descricao || 'N/D'}
- Tipo: ${contrato.tipo || 'N/D'}
- Fornecedor: ${contrato.fornecedor || 'N/D'}
- Valor mensal: R$ ${contrato.valor_mensal || 'N/D'}
- Vigência: ${contrato.data_inicio || 'N/D'} a ${contrato.data_fim || 'N/D'}
- Status: ${contrato.status || 'N/D'}

═══ MÉTRICAS CONFIGURADAS ═══
${metricasDesc || 'Nenhuma métrica configurada'}

═══ HISTÓRICO DE CONSUMO ═══
${historicoDesc || 'Nenhum consumo registrado'}
${excelData}

INSTRUÇÕES IMPORTANTES:
1. Se o usuário enviou um arquivo Excel, analise os dados e extraia as informações relevantes.
2. Identifique o mês de referência, quantidades por métrica, e valores.
3. Ao final da análise do Excel, SEMPRE forneça um resumo estruturado assim:

**📊 Dados Extraídos:**
| Métrica | Quantidade | Valor |
|---------|-----------|-------|
| ... | ... | ... |

**Mês de referência:** MM/AAAA

E pergunte: "Deseja que eu salve esses dados no sistema?"

4. Se o usuário pedir para salvar, responda com o JSON de tool_call no formato:
\`\`\`json
{"action":"save_consumo","data":[{"metrica_nome":"...","mes_referencia":"YYYY-MM-01","quantidade":0,"valor_total":0}]}
\`\`\`

5. Compare com meses anteriores quando possível e forneça insights sobre tendências.`;

    // Call AI Gateway
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${aiGatewayApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes para IA." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(JSON.stringify({ error: "Erro ao processar." }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });

  } catch (error) {
    console.error("Contrato chat error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
