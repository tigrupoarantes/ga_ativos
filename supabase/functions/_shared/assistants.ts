import * as XLSX from "https://esm.sh/xlsx@0.18.5";
import { createServiceSupabaseClient } from "./supabase.ts";

interface UploadedFile {
  name: string;
  base64: string;
}

function parseExcelFile(file: UploadedFile | undefined): string {
  if (!file?.base64) return "";

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
      const limited = (jsonData as unknown[][]).slice(0, 100);
      sheets.push(
        `\n--- Aba: ${sheetName} ---\n${limited.map((row) => row.join(" | ")).join("\n")}`,
      );
    }

    return `\n\n=== DADOS DO ARQUIVO EXCEL: ${file.name} ===${sheets.join("\n")}`;
  } catch (error) {
    console.error("Error parsing Excel:", error);
    return "\n\nAviso: erro ao processar o arquivo Excel. Verifique se é um arquivo .xlsx ou .xls válido.";
  }
}

export async function buildReportsSystemPrompt(): Promise<string> {
  const supabase = createServiceSupabaseClient();

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

  const today = new Date().toISOString().split("T")[0];
  const in30Days = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  const veiculosPorStatus = veiculos.reduce((acc: Record<string, number>, v) => {
    const status = v.status || "sem_status";
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});

  const valorTotalFipe = veiculos.reduce((acc, v) => acc + (v.valor_fipe || 0), 0);
  const valorTotalAquisicao = veiculos.reduce(
    (acc, v) => acc + (v.valor_aquisicao || 0),
    0,
  );
  const cnhsVencidas = funcionarios.filter(
    (f) => f.is_condutor && f.cnh_validade && f.cnh_validade < today,
  );
  const cnhsVencendo = funcionarios.filter(
    (f) =>
      f.is_condutor &&
      f.cnh_validade &&
      f.cnh_validade >= today &&
      f.cnh_validade <= in30Days,
  );
  const contratosVencendo = contratos.filter(
    (c) => c.data_fim && c.data_fim >= today && c.data_fim <= in30Days,
  );
  const contratosVencidos = contratos.filter(
    (c) => c.data_fim && c.data_fim < today,
  );
  const ordensAbertas = ordens.filter((o) => o.status === "aberta");
  const ordensEmAndamento = ordens.filter((o) => o.status === "em_andamento");
  const ordensFechadas = ordens.filter((o) => o.status === "fechada");
  const custoTotalOrdens = ordens.reduce((acc, o) => acc + (o.custo_total || 0), 0);
  const pecasEstoqueBaixo = pecas.filter(
    (p) => p.estoque_minimo && p.quantidade_estoque <= p.estoque_minimo,
  );
  const valorTotalEstoque = pecas.reduce(
    (acc, p) => acc + p.quantidade_estoque * (p.preco_unitario || 0),
    0,
  );
  const preventivasVencidas = preventivas.filter(
    (p) => p.proxima_realizacao && p.proxima_realizacao < today,
  );
  const preventivasProximas = preventivas.filter((p) => {
    const in7Days = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];
    return (
      p.proxima_realizacao &&
      p.proxima_realizacao >= today &&
      p.proxima_realizacao <= in7Days
    );
  });

  return `Você é um assistente de relatórios do Sistema de Gestão de Ativos da empresa.
Responda apenas com base nos dados fornecidos no contexto abaixo.
Responda em português brasileiro, com números precisos, clareza e boa formatação em Markdown quando útil.
Data de hoje: ${new Date().toLocaleDateString("pt-BR")}

RESUMO EXECUTIVO:
- Veículos ativos: ${veiculos.length}
- Funcionários ativos: ${funcionarios.length}
- Ativos de TI: ${assets.length}
- Contratos ativos: ${contratos.length}
- Linhas telefônicas: ${linhas.length}
- Equipes: ${equipes.length}
- Empresas: ${empresas.length}

FROTA:
- Veículos por status: ${JSON.stringify(veiculosPorStatus)}
- Valor total FIPE: R$ ${valorTotalFipe.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
- Valor total de aquisição: R$ ${valorTotalAquisicao.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
${veiculos.map((v) => `- ${v.placa}: ${v.marca} ${v.modelo} | Status: ${v.status || "N/D"} | KM: ${v.km_atual?.toLocaleString() || "N/D"} | FIPE: R$ ${v.valor_fipe?.toLocaleString("pt-BR") || "N/D"}`).join("\n")}

FUNCIONÁRIOS E CNHs:
- Total: ${funcionarios.length}
- Condutores: ${funcionarios.filter((f) => f.is_condutor).length}
- CNHs vencidas (${cnhsVencidas.length}):
${cnhsVencidas.length > 0 ? cnhsVencidas.map((f) => `- ${f.nome}: venceu em ${f.cnh_validade}`).join("\n") : "Nenhuma"}
- CNHs vencendo nos próximos 30 dias (${cnhsVencendo.length}):
${cnhsVencendo.length > 0 ? cnhsVencendo.map((f) => `- ${f.nome}: vence em ${f.cnh_validade}`).join("\n") : "Nenhuma"}

CONTRATOS:
- Total: ${contratos.length}
- Valor mensal total: R$ ${contratos.reduce((acc, c) => acc + (c.valor_mensal || 0), 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
- Vencidos (${contratosVencidos.length}):
${contratosVencidos.length > 0 ? contratosVencidos.map((c) => `- ${c.numero}: ${c.fornecedor || "N/D"} - venceu em ${c.data_fim}`).join("\n") : "Nenhum"}
- Vencendo em 30 dias (${contratosVencendo.length}):
${contratosVencendo.length > 0 ? contratosVencendo.map((c) => `- ${c.numero}: ${c.fornecedor || "N/D"} - vence em ${c.data_fim}`).join("\n") : "Nenhum"}

OFICINA:
- Total de ordens: ${ordens.length}
- Abertas: ${ordensAbertas.length}
- Em andamento: ${ordensEmAndamento.length}
- Fechadas: ${ordensFechadas.length}
- Custo total: R$ ${custoTotalOrdens.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}

PEÇAS:
- Total de itens: ${pecas.length}
- Valor em estoque: R$ ${valorTotalEstoque.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
- Estoque baixo (${pecasEstoqueBaixo.length}):
${pecasEstoqueBaixo.length > 0 ? pecasEstoqueBaixo.map((p) => `- ${p.nome}: ${p.quantidade_estoque} ${p.unidade || "un"} (mínimo: ${p.estoque_minimo})`).join("\n") : "Nenhuma"}

PREVENTIVAS:
- Total programado: ${preventivas.length}
- Vencidas (${preventivasVencidas.length}):
${preventivasVencidas.length > 0 ? preventivasVencidas.map((p) => `- ${p.veiculos?.placa || "N/D"}: ${p.tipo_manutencao} - deveria ser em ${p.proxima_realizacao}`).join("\n") : "Nenhuma"}
- Próximas 7 dias (${preventivasProximas.length}):
${preventivasProximas.length > 0 ? preventivasProximas.map((p) => `- ${p.veiculos?.placa || "N/D"}: ${p.tipo_manutencao} - ${p.proxima_realizacao}`).join("\n") : "Nenhuma"}

ATIVOS DE TI:
${assets.map((a) => `- ${a.patrimonio}: ${a.nome} (${a.asset_types?.name || "Tipo N/D"}) | Status: ${a.status || "N/D"}`).join("\n")}

LINHAS TELEFÔNICAS:
${linhas.map((l) => `- ${l.numero}: ${l.operadora || "N/D"} | Plano: ${l.plano || "N/D"} | Responsável: ${l.funcionarios?.nome || "Não atribuída"}`).join("\n")}`;
}

export async function buildContratoSystemPrompt(
  contratoId: string,
  file?: UploadedFile,
): Promise<string> {
  const supabase = createServiceSupabaseClient();

  const { data: contrato } = await supabase
    .from("contratos")
    .select("*")
    .eq("id", contratoId)
    .single();

  if (!contrato) {
    throw new Error("Contrato não encontrado");
  }

  const { data: metricas } = await supabase
    .from("contrato_metricas")
    .select("*")
    .eq("contrato_id", contratoId)
    .eq("active", true);

  const { data: consumos } = await supabase
    .from("contrato_consumo")
    .select("*")
    .eq("contrato_id", contratoId)
    .order("mes_referencia", { ascending: false })
    .limit(100);

  const metricasDesc = (metricas || [])
    .map(
      (m: any) =>
        `- ${m.nome} (unidade: ${m.unidade}, valor unitário: R$ ${m.valor_unitario || "N/D"}, meta mensal: ${m.meta_mensal || "N/D"})`,
    )
    .join("\n");

  const historicoDesc = (consumos || [])
    .slice(0, 24)
    .map((c: any) => {
      const metrica = (metricas || []).find((m: any) => m.id === c.metrica_id);
      return `- ${c.mes_referencia}: ${metrica?.nome || "Métrica"} = ${c.quantidade} ${metrica?.unidade || ""} | R$ ${c.valor_total || 0}`;
    })
    .join("\n");

  return `Você é um assistente especializado em análise de contratos corporativos.
Responda sempre em português brasileiro, de forma clara e com Markdown quando ajudar.
Data de hoje: ${new Date().toLocaleDateString("pt-BR")}

CONTRATO ATUAL:
- Número: ${contrato.numero}
- Descrição: ${contrato.descricao || "N/D"}
- Tipo: ${contrato.tipo || "N/D"}
- Fornecedor: ${contrato.fornecedor || "N/D"}
- Valor mensal: R$ ${contrato.valor_mensal || "N/D"}
- Vigência: ${contrato.data_inicio || "N/D"} a ${contrato.data_fim || "N/D"}
- Status: ${contrato.status || "N/D"}

MÉTRICAS CONFIGURADAS:
${metricasDesc || "Nenhuma métrica configurada"}

HISTÓRICO DE CONSUMO:
${historicoDesc || "Nenhum consumo registrado"}
${parseExcelFile(file)}

INSTRUÇÕES:
1. Se o usuário enviou Excel, extraia mês de referência, quantidades por métrica e valores.
2. Sempre que fizer análise de arquivo, entregue um resumo estruturado com tabela.
3. Se o usuário pedir para salvar, devolva a intenção em JSON no formato:
\`\`\`json
{"action":"save_consumo","data":[{"metrica_nome":"...","mes_referencia":"YYYY-MM-01","quantidade":0,"valor_total":0}]}
\`\`\`
4. Compare com meses anteriores quando possível e destaque tendências.`;
}

export function detectAssistantRoute(input: {
  route?: string;
  contrato_id?: string;
  messages?: Array<{ content?: string }>;
}): "contratos" | "reports" {
  if (input.route === "contratos" || input.contrato_id) {
    return "contratos";
  }

  const lastMessage = input.messages?.[input.messages.length - 1]?.content?.toLowerCase() || "";
  if (lastMessage.includes("contrato")) {
    return "contratos";
  }

  return "reports";
}
