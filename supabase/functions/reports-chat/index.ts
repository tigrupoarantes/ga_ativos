import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Create Supabase client with service role for data access
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch all relevant data from database
    const [
      veiculosResult,
      funcionariosResult,
      assetsResult,
      contratosResult,
      ordensResult,
      pecasResult,
      preventivasResult,
      linhasResult,
      equipesResult,
      empresasResult,
    ] = await Promise.all([
      supabase.from("veiculos").select("*").eq("active", true),
      supabase.from("funcionarios").select("*").eq("active", true),
      supabase.from("assets").select("*, asset_types(name)").eq("active", true),
      supabase.from("contratos").select("*").eq("active", true),
      supabase.from("ordens_servico").select("*, veiculos(placa, marca, modelo)"),
      supabase.from("pecas").select("*").eq("active", true),
      supabase.from("preventivas").select("*, veiculos(placa, marca, modelo)"),
      supabase.from("linhas_telefonicas").select("*, funcionarios(nome)").eq("active", true),
      supabase.from("equipes").select("*").eq("active", true),
      supabase.from("empresas").select("*").eq("active", true),
    ]);

    const veiculos = veiculosResult.data || [];
    const funcionarios = funcionariosResult.data || [];
    const assets = assetsResult.data || [];
    const contratos = contratosResult.data || [];
    const ordens = ordensResult.data || [];
    const pecas = pecasResult.data || [];
    const preventivas = preventivasResult.data || [];
    const linhas = linhasResult.data || [];
    const equipes = equipesResult.data || [];
    const empresas = empresasResult.data || [];

    // Calculate statistics
    const today = new Date().toISOString().split('T')[0];
    const in30Days = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // Veiculos stats
    const veiculosPorStatus = veiculos.reduce((acc: Record<string, number>, v) => {
      acc[v.status || 'sem_status'] = (acc[v.status || 'sem_status'] || 0) + 1;
      return acc;
    }, {});
    const valorTotalFipe = veiculos.reduce((acc, v) => acc + (v.valor_fipe || 0), 0);
    const valorTotalAquisicao = veiculos.reduce((acc, v) => acc + (v.valor_aquisicao || 0), 0);

    // CNH stats
    const cnhsVencidas = funcionarios.filter(f => 
      f.is_condutor && f.cnh_validade && f.cnh_validade < today
    );
    const cnhsVencendo = funcionarios.filter(f => 
      f.is_condutor && f.cnh_validade && f.cnh_validade >= today && f.cnh_validade <= in30Days
    );

    // Contratos stats
    const contratosVencendo = contratos.filter(c => 
      c.data_fim && c.data_fim >= today && c.data_fim <= in30Days
    );
    const contratosVencidos = contratos.filter(c => 
      c.data_fim && c.data_fim < today
    );

    // Ordens stats
    const ordensAbertas = ordens.filter(o => o.status === 'aberta');
    const ordensEmAndamento = ordens.filter(o => o.status === 'em_andamento');
    const ordensFechadas = ordens.filter(o => o.status === 'fechada');
    const custoTotalOrdens = ordens.reduce((acc, o) => acc + (o.custo_total || 0), 0);

    // Pecas stats
    const pecasEstoqueBaixo = pecas.filter(p => 
      p.estoque_minimo && p.quantidade_estoque <= p.estoque_minimo
    );
    const valorTotalEstoque = pecas.reduce((acc, p) => 
      acc + (p.quantidade_estoque * (p.preco_unitario || 0)), 0
    );

    // Preventivas stats
    const preventivasVencidas = preventivas.filter(p => 
      p.proxima_realizacao && p.proxima_realizacao < today
    );
    const preventivasProximas = preventivas.filter(p => {
      const in7Days = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      return p.proxima_realizacao && p.proxima_realizacao >= today && p.proxima_realizacao <= in7Days;
    });

    // Build context with all data
    const systemContext = `Você é um assistente de relatórios do Sistema de Gestão de Ativos da empresa.
Responda APENAS com base nos dados fornecidos no contexto abaixo.
Suas respostas devem ser:
- Em português brasileiro
- Claras, objetivas e bem formatadas
- Formatadas em Markdown quando apropriado (use tabelas, listas, negrito)
- Com números precisos baseados nos dados reais
- Data de hoje: ${new Date().toLocaleDateString('pt-BR')}

Se não tiver dados suficientes para responder, informe educadamente.

═══════════════════════════════════════════════════════════
RESUMO EXECUTIVO DO SISTEMA
═══════════════════════════════════════════════════════════

📊 TOTAIS GERAIS:
- Veículos ativos: ${veiculos.length}
- Funcionários ativos: ${funcionarios.length}
- Ativos de TI: ${assets.length}
- Contratos ativos: ${contratos.length}
- Linhas telefônicas: ${linhas.length}
- Equipes: ${equipes.length}
- Empresas: ${empresas.length}

═══════════════════════════════════════════════════════════
FROTA DE VEÍCULOS
═══════════════════════════════════════════════════════════

📈 Estatísticas:
- Total de veículos: ${veiculos.length}
- Veículos por status: ${JSON.stringify(veiculosPorStatus)}
- Valor total FIPE da frota: R$ ${valorTotalFipe.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
- Valor total de aquisição: R$ ${valorTotalAquisicao.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}

📋 Lista completa de veículos:
${veiculos.map(v => `- ${v.placa}: ${v.marca} ${v.modelo} (${v.ano_modelo || 'ano N/D'}) | Status: ${v.status || 'N/D'} | KM: ${v.km_atual?.toLocaleString() || 'N/D'} | FIPE: R$ ${v.valor_fipe?.toLocaleString('pt-BR') || 'N/D'}`).join('\n')}

═══════════════════════════════════════════════════════════
FUNCIONÁRIOS E CNHs
═══════════════════════════════════════════════════════════

👥 Total de funcionários: ${funcionarios.length}
🚗 Condutores: ${funcionarios.filter(f => f.is_condutor).length}

⚠️ CNHs VENCIDAS (${cnhsVencidas.length}):
${cnhsVencidas.length > 0 ? cnhsVencidas.map(f => `- ${f.nome}: venceu em ${f.cnh_validade}`).join('\n') : 'Nenhuma CNH vencida'}

⏰ CNHs VENCENDO NOS PRÓXIMOS 30 DIAS (${cnhsVencendo.length}):
${cnhsVencendo.length > 0 ? cnhsVencendo.map(f => `- ${f.nome}: vence em ${f.cnh_validade}`).join('\n') : 'Nenhuma CNH vencendo'}

📋 Lista de funcionários:
${funcionarios.map(f => `- ${f.nome} | Cargo: ${f.cargo || 'N/D'} | Depto: ${f.departamento || 'N/D'} | Condutor: ${f.is_condutor ? 'Sim' : 'Não'}`).join('\n')}

═══════════════════════════════════════════════════════════
CONTRATOS
═══════════════════════════════════════════════════════════

📄 Total de contratos: ${contratos.length}
💰 Valor mensal total: R$ ${contratos.reduce((acc, c) => acc + (c.valor_mensal || 0), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}

⚠️ CONTRATOS VENCIDOS (${contratosVencidos.length}):
${contratosVencidos.length > 0 ? contratosVencidos.map(c => `- ${c.numero}: ${c.fornecedor || 'N/D'} - venceu em ${c.data_fim}`).join('\n') : 'Nenhum contrato vencido'}

⏰ CONTRATOS VENCENDO NOS PRÓXIMOS 30 DIAS (${contratosVencendo.length}):
${contratosVencendo.length > 0 ? contratosVencendo.map(c => `- ${c.numero}: ${c.fornecedor || 'N/D'} - vence em ${c.data_fim}`).join('\n') : 'Nenhum contrato vencendo'}

📋 Lista de contratos:
${contratos.map(c => `- ${c.numero}: ${c.fornecedor || 'N/D'} | Tipo: ${c.tipo || 'N/D'} | Valor mensal: R$ ${c.valor_mensal?.toLocaleString('pt-BR') || 'N/D'} | Fim: ${c.data_fim || 'N/D'}`).join('\n')}

═══════════════════════════════════════════════════════════
OFICINA - ORDENS DE SERVIÇO
═══════════════════════════════════════════════════════════

🔧 Resumo de ordens:
- Total de ordens: ${ordens.length}
- Abertas: ${ordensAbertas.length}
- Em andamento: ${ordensEmAndamento.length}
- Fechadas: ${ordensFechadas.length}
- Custo total: R$ ${custoTotalOrdens.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}

📋 Ordens abertas e em andamento:
${[...ordensAbertas, ...ordensEmAndamento].map(o => `- ${o.numero || 'S/N'}: ${o.veiculos?.placa || 'N/D'} | ${o.tipo} | Status: ${o.status} | Custo: R$ ${o.custo_total?.toLocaleString('pt-BR') || '0'}`).join('\n') || 'Nenhuma ordem em aberto'}

═══════════════════════════════════════════════════════════
ESTOQUE DE PEÇAS
═══════════════════════════════════════════════════════════

🔩 Resumo do estoque:
- Total de itens cadastrados: ${pecas.length}
- Valor total em estoque: R$ ${valorTotalEstoque.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}

⚠️ PEÇAS COM ESTOQUE BAIXO (${pecasEstoqueBaixo.length}):
${pecasEstoqueBaixo.length > 0 ? pecasEstoqueBaixo.map(p => `- ${p.nome}: ${p.quantidade_estoque} ${p.unidade || 'un'} (mínimo: ${p.estoque_minimo})`).join('\n') : 'Nenhuma peça com estoque baixo'}

═══════════════════════════════════════════════════════════
MANUTENÇÕES PREVENTIVAS
═══════════════════════════════════════════════════════════

🛠️ Resumo de preventivas:
- Total programado: ${preventivas.length}

⚠️ PREVENTIVAS VENCIDAS (${preventivasVencidas.length}):
${preventivasVencidas.length > 0 ? preventivasVencidas.map(p => `- ${p.veiculos?.placa || 'N/D'}: ${p.tipo_manutencao} - deveria ser em ${p.proxima_realizacao}`).join('\n') : 'Nenhuma preventiva vencida'}

⏰ PREVENTIVAS PRÓXIMAS (7 DIAS) (${preventivasProximas.length}):
${preventivasProximas.length > 0 ? preventivasProximas.map(p => `- ${p.veiculos?.placa || 'N/D'}: ${p.tipo_manutencao} - ${p.proxima_realizacao}`).join('\n') : 'Nenhuma preventiva nos próximos 7 dias'}

═══════════════════════════════════════════════════════════
ATIVOS DE TI
═══════════════════════════════════════════════════════════

💻 Total de ativos: ${assets.length}
${assets.map(a => `- ${a.patrimonio}: ${a.nome} (${a.asset_types?.name || 'Tipo N/D'}) | Status: ${a.status || 'N/D'}`).join('\n')}

═══════════════════════════════════════════════════════════
LINHAS TELEFÔNICAS
═══════════════════════════════════════════════════════════

📱 Total de linhas: ${linhas.length}
${linhas.map(l => `- ${l.numero}: ${l.operadora || 'N/D'} | Plano: ${l.plano || 'N/D'} | Responsável: ${l.funcionarios?.nome || 'Não atribuída'}`).join('\n')}

═══════════════════════════════════════════════════════════`;

    // Call Lovable AI Gateway with streaming
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemContext },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns segundos." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos insuficientes. Entre em contato com o administrador." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "Erro ao processar sua pergunta. Tente novamente." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });

  } catch (error) {
    console.error("Reports chat error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
