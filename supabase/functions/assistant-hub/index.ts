import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  buildContratoSystemPrompt,
  buildReportsSystemPrompt,
} from "../_shared/assistants.ts";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { streamChatCompletion } from "../_shared/openai.ts";
import { createServiceSupabaseClient } from "../_shared/supabase.ts";

type AssistantRoute = "contratos" | "reports" | "frota" | "oficina";
type AiRunStatus = "running" | "completed" | "failed" | "cancelled";
type AiToolCallStatus =
  | "requested"
  | "confirmed"
  | "executing"
  | "completed"
  | "failed"
  | "denied";

interface SaveConsumoItem {
  metrica_nome: string;
  mes_referencia: string;
  quantidade: number;
  valor_total: number;
}

function normalizeMetricName(value: string) {
  return value.trim().toLowerCase();
}

function sanitizeErrorMessage(value: string | null | undefined) {
  if (!value) return null;
  return value.slice(0, 300);
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
    return JSON.parse(atob(padded)) as Record<string, unknown>;
  } catch (error) {
    console.error("decodeJwtPayload error:", error);
    return null;
  }
}

function getRequestUserId(req: Request): string | null {
  const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  const payload = decodeJwtPayload(authHeader.slice("Bearer ".length).trim());
  return typeof payload?.sub === "string" ? payload.sub : null;
}

function isContratoNotFoundError(error: unknown) {
  return error instanceof Error && error.message.toLowerCase().includes("contrato");
}

function detectAssistantRoute(input: {
  route?: string;
  contrato_id?: string;
  messages?: Array<{ content?: string }>;
}): AssistantRoute {
  if (input.route === "contratos" || input.contrato_id) return "contratos";
  if (input.route === "reports" || input.route === "frota" || input.route === "oficina") {
    return input.route;
  }

  const lastMessage = input.messages?.[input.messages.length - 1]?.content?.toLowerCase() || "";

  if (lastMessage.includes("contrato")) return "contratos";
  if (
    lastMessage.includes("veiculo") ||
    lastMessage.includes("veiculo") ||
    lastMessage.includes("frota") ||
    lastMessage.includes("placa") ||
    lastMessage.includes("quilometr") ||
    lastMessage.includes("hodometro") ||
    lastMessage.includes("multa")
  ) {
    return "frota";
  }
  if (
    lastMessage.includes("oficina") ||
    lastMessage.includes("ordem de serv") ||
    lastMessage.includes("preventiva") ||
    lastMessage.includes("peca") ||
    lastMessage.includes("lavagem") ||
    lastMessage.includes("manutenc")
  ) {
    return "oficina";
  }

  return "reports";
}

async function logAudit(payload: {
  acao: string;
  entidade: string;
  entidade_id: string;
  usuario?: string | null;
  extra?: Record<string, unknown>;
}) {
  try {
    const supabase = createServiceSupabaseClient();
    const { error } = await supabase.from("audit_log").insert({
      acao: payload.acao,
      entidade: payload.entidade,
      entidade_id: payload.entidade_id,
      payload: payload.extra ?? null,
      usuario: payload.usuario ?? "assistant-hub",
    });

    if (error) {
      console.error("audit_log insert error:", error);
    }
  } catch (error) {
    console.error("audit_log unexpected error:", error);
  }
}

async function startAiRun(input: {
  route: AssistantRoute;
  user_id?: string | null;
  model?: string | null;
  message_count?: number;
  has_file?: boolean;
  tool_action?: string | null;
  entity_type?: string | null;
  entity_id?: string | null;
  metadata?: Record<string, unknown> | null;
}) {
  const runId = crypto.randomUUID();
  const agentKeyByRoute: Record<AssistantRoute, string> = {
    reports: "assistant-reports",
    contratos: "assistant-contratos",
    frota: "assistant-frota",
    oficina: "assistant-oficina",
  };

  const supabase = createServiceSupabaseClient();
  const { error } = await supabase.from("ai_runs").insert({
    id: runId,
    route: input.route,
    agent_key: agentKeyByRoute[input.route],
    user_id: input.user_id ?? null,
    model: input.model ?? null,
    provider: "openai",
    message_count: input.message_count ?? 0,
    has_file: input.has_file ?? false,
    tool_action: input.tool_action ?? null,
    entity_type: input.entity_type ?? null,
    entity_id: input.entity_id ?? null,
    metadata: input.metadata ?? null,
    status: "running",
  });

  if (error) {
    console.error("startAiRun error:", error);
  }

  return runId;
}

async function finishAiRun(input: {
  run_id: string;
  status: AiRunStatus;
  error_code?: string | null;
  error_message?: string | null;
  metadata?: Record<string, unknown> | null;
}) {
  const supabase = createServiceSupabaseClient();
  const { error } = await supabase
    .from("ai_runs")
    .update({
      status: input.status,
      finished_at: new Date().toISOString(),
      error_code: input.error_code ?? null,
      error_message: sanitizeErrorMessage(input.error_message),
      metadata: input.metadata ?? null,
    })
    .eq("id", input.run_id);

  if (error) {
    console.error("finishAiRun error:", error);
  }
}

async function startToolCall(input: {
  run_id: string;
  tool_name: string;
  status?: AiToolCallStatus;
  user_id?: string | null;
  entity_type?: string | null;
  entity_id?: string | null;
  input_summary?: Record<string, unknown> | null;
}) {
  const toolCallId = crypto.randomUUID();
  const supabase = createServiceSupabaseClient();

  const { error } = await supabase.from("ai_tool_calls").insert({
    id: toolCallId,
    run_id: input.run_id,
    tool_name: input.tool_name,
    status: input.status ?? "requested",
    user_id: input.user_id ?? null,
    entity_type: input.entity_type ?? null,
    entity_id: input.entity_id ?? null,
    input_summary: input.input_summary ?? null,
  });

  if (error) {
    console.error("startToolCall error:", error);
  }

  return toolCallId;
}

async function finishToolCall(input: {
  tool_call_id: string;
  status: AiToolCallStatus;
  result_summary?: Record<string, unknown> | null;
  error_code?: string | null;
  error_message?: string | null;
}) {
  const supabase = createServiceSupabaseClient();
  const { error } = await supabase
    .from("ai_tool_calls")
    .update({
      status: input.status,
      finished_at: new Date().toISOString(),
      result_summary: input.result_summary ?? null,
      error_code: input.error_code ?? null,
      error_message: sanitizeErrorMessage(input.error_message),
    })
    .eq("id", input.tool_call_id);

  if (error) {
    console.error("finishToolCall error:", error);
  }
}

async function requireWriteRole(req: Request): Promise<boolean> {
  const userId = getRequestUserId(req);
  if (!userId) return false;

  const supabase = createServiceSupabaseClient();
  const { data, error } = await supabase
    .from("user_roles")
    .select("role, is_approved")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("requireWriteRole error:", error);
    return false;
  }

  if (!data?.is_approved) return false;
  return data.role === "admin" || data.role === "diretor" || data.role === "coordenador";
}

async function failToolAndRun(input: {
  runId: string;
  toolCallId: string;
  toolStatus: AiToolCallStatus;
  httpStatus: number;
  errorCode: string;
  errorMessage: string;
  body: Record<string, unknown>;
}) {
  await finishToolCall({
    tool_call_id: input.toolCallId,
    status: input.toolStatus,
    error_code: input.errorCode,
    error_message: input.errorMessage,
  });

  await finishAiRun({
    run_id: input.runId,
    status: "failed",
    error_code: input.errorCode,
    error_message: input.errorMessage,
    metadata: { http_status: input.httpStatus },
  });

  return jsonResponse(input.body, input.httpStatus);
}

async function buildFrotaSystemPrompt() {
  const supabase = createServiceSupabaseClient();
  const [veiculosResult, odometerResult, multasResult] = await Promise.all([
    supabase
      .from("veiculos")
      .select("id, placa, marca, modelo, status, km_atual, valor_fipe, valor_aquisicao, funcionario:funcionarios!veiculos_funcionario_id_fkey(nome)")
      .eq("active", true),
    supabase
      .from("vehicle_odometer_reports")
      .select("vehicle_id, reported_at, reported_km, source, validation_status")
      .order("reported_at", { ascending: false })
      .limit(50),
    supabase
      .from("veiculos_multas")
      .select("id, veiculo_placa, data_infracao, descricao_infracao, valor_multa, status")
      .order("data_infracao", { ascending: false })
      .limit(50),
  ]);

  const veiculos = veiculosResult.data || [];
  const odometerReports = odometerResult.data || [];
  const multas = multasResult.data || [];
  const veiculosPorStatus = veiculos.reduce((acc: Record<string, number>, item) => {
    const key = item.status || "sem_status";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  return `Voce e um assistente especialista em frota corporativa.
Responda em portugues brasileiro usando apenas o contexto abaixo.
Nao invente dados e nao execute nenhuma alteracao.
Data de hoje: ${new Date().toLocaleDateString("pt-BR")}

RESUMO:
- Veiculos ativos: ${veiculos.length}
- Veiculos por status: ${JSON.stringify(veiculosPorStatus)}
- Leituras recentes de KM: ${odometerReports.length}
- Leituras suspeitas: ${odometerReports.filter((item) => item.validation_status === "suspeito").length}
- Multas recentes: ${multas.length}
- Multas pendentes: ${multas.filter((item) => item.status === "PENDENTE").length}

VEICULOS:
${veiculos.map((item) => `- ${item.placa}: ${item.marca} ${item.modelo} | Status: ${item.status || "N/D"} | KM: ${item.km_atual?.toLocaleString("pt-BR") || "N/D"} | Responsavel: ${item.funcionario?.nome || "Nao atribuido"} | FIPE: R$ ${item.valor_fipe?.toLocaleString("pt-BR") || "N/D"}`).join("\n")}

ULTIMAS LEITURAS:
${odometerReports.slice(0, 20).map((item) => {
  const veiculo = veiculos.find((v) => v.id === item.vehicle_id);
  return `- ${veiculo?.placa || "Veiculo"} | ${item.reported_at || "N/D"} | KM ${item.reported_km?.toLocaleString("pt-BR") || "N/D"} | Origem: ${item.source || "N/D"} | Validacao: ${item.validation_status || "N/D"}`;
}).join("\n") || "Nenhuma leitura recente"}

MULTAS:
${multas.slice(0, 20).map((item) => `- ${item.veiculo_placa || "N/D"} | ${item.data_infracao || "N/D"} | ${item.descricao_infracao || "N/D"} | Status: ${item.status || "N/D"} | Valor: R$ ${item.valor_multa?.toLocaleString("pt-BR") || "N/D"}`).join("\n") || "Nenhuma multa recente"}

INSTRUCOES:
1. Priorize status da frota, excecoes de quilometragem e multas.
2. Se faltar dado, diga isso explicitamente.
3. Nao gere tool calls neste modo.`;
}

async function buildOficinaSystemPrompt() {
  const supabase = createServiceSupabaseClient();
  const [ordensResult, preventivasResult, pecasResult, washPlansResult] = await Promise.all([
    supabase
      .from("ordens_servico")
      .select("id, numero, status, custo_total, custo_pecas, data_entrada, previsao_conclusao, veiculos(placa, marca, modelo)")
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("preventivas")
      .select("id, tipo_manutencao, status, proxima_realizacao, proximo_km, veiculos(placa, marca, modelo, km_atual)")
      .eq("active", true)
      .limit(100),
    supabase
      .from("pecas")
      .select("id, nome, quantidade_estoque, estoque_minimo, preco_unitario, unidade")
      .eq("active", true)
      .limit(100),
    supabase
      .from("wash_plans")
      .select("id, status, wash_type, frequency_days, veiculo:veiculos(placa, marca, modelo)")
      .eq("active", true)
      .limit(100),
  ]);

  const ordens = ordensResult.data || [];
  const preventivas = preventivasResult.data || [];
  const pecas = pecasResult.data || [];
  const washPlans = washPlansResult.data || [];
  const hoje = new Date().toISOString().split("T")[0];

  return `Voce e um assistente especialista em oficina e manutencao.
Responda em portugues brasileiro usando apenas o contexto abaixo.
Nao invente dados e nao execute nenhuma alteracao.
Data de hoje: ${new Date().toLocaleDateString("pt-BR")}

RESUMO:
- Total de ordens: ${ordens.length}
- Ordens abertas: ${ordens.filter((item) => item.status === "aberta").length}
- Ordens em andamento: ${ordens.filter((item) => item.status === "em_andamento").length}
- Ordens fechadas: ${ordens.filter((item) => item.status === "fechada").length}
- Custo total de ordens: R$ ${ordens.reduce((acc, item) => acc + (item.custo_total || 0), 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
- Preventivas ativas: ${preventivas.length}
- Preventivas vencidas: ${preventivas.filter((item) => item.proxima_realizacao && item.proxima_realizacao < hoje).length}
- Pecas em estoque baixo: ${pecas.filter((item) => item.estoque_minimo && item.quantidade_estoque <= item.estoque_minimo).length}
- Planos de lavagem: ${washPlans.length}

ORDENS RECENTES:
${ordens.slice(0, 20).map((item) => `- ${item.numero || item.id} | ${item.veiculos?.placa || "N/D"} ${item.veiculos?.marca || ""} ${item.veiculos?.modelo || ""} | Status: ${item.status || "N/D"} | Entrada: ${item.data_entrada || "N/D"} | Previsao: ${item.previsao_conclusao || "N/D"} | Custo: R$ ${item.custo_total?.toLocaleString("pt-BR") || "N/D"}`).join("\n") || "Nenhuma ordem registrada"}

PREVENTIVAS:
${preventivas.slice(0, 20).map((item) => `- ${item.veiculos?.placa || "N/D"} | ${item.tipo_manutencao || "N/D"} | Status: ${item.status || "N/D"} | Proxima data: ${item.proxima_realizacao || "N/D"} | Proximo KM: ${item.proximo_km?.toLocaleString("pt-BR") || "N/D"} | KM atual: ${item.veiculos?.km_atual?.toLocaleString("pt-BR") || "N/D"}`).join("\n") || "Nenhuma preventiva registrada"}

PECAS:
${pecas.slice(0, 20).map((item) => `- ${item.nome} | Estoque: ${item.quantidade_estoque} ${item.unidade || "un"} | Minimo: ${item.estoque_minimo || 0} | Preco unitario: R$ ${item.preco_unitario?.toLocaleString("pt-BR") || "N/D"}`).join("\n") || "Nenhuma peca registrada"}

LAVAGENS:
${washPlans.slice(0, 20).map((item) => `- ${item.veiculo?.placa || "N/D"} | Tipo: ${item.wash_type || "N/D"} | Frequencia: ${item.frequency_days || 0} dias | Status: ${item.status || "N/D"}`).join("\n") || "Nenhum plano de lavagem registrado"}

INSTRUCOES:
1. Priorize riscos operacionais, itens vencidos e gargalos.
2. Destaque estoque baixo, preventivas vencidas e ordens abertas.
3. Nao gere tool calls neste modo.`;
}

async function buildSystemPrompt(route: AssistantRoute, body: Record<string, unknown>) {
  if (route === "contratos") {
    return await buildContratoSystemPrompt(body.contrato_id as string, body.file as { name: string; base64: string } | undefined);
  }
  if (route === "frota") {
    return await buildFrotaSystemPrompt();
  }
  if (route === "oficina") {
    return await buildOficinaSystemPrompt();
  }
  return await buildReportsSystemPrompt();
}

async function executeSaveConsumoTool(input: {
  req: Request;
  runId: string;
  userId: string | null;
  contrato_id?: string;
  payload?: { data?: SaveConsumoItem[] };
}) {
  const items = input.payload?.data;
  const toolCallId = await startToolCall({
    run_id: input.runId,
    tool_name: "save_consumo",
    status: "executing",
    user_id: input.userId,
    entity_type: "contrato",
    entity_id: input.contrato_id ?? null,
    input_summary: {
      contrato_id: input.contrato_id ?? null,
      total_itens: Array.isArray(items) ? items.length : 0,
      metricas: Array.isArray(items) ? items.map((item) => item.metrica_nome).slice(0, 10) : [],
    },
  });

  const canWrite = await requireWriteRole(input.req);
  if (!canWrite) {
    await logAudit({
      acao: "assistant_tool_denied",
      entidade: "contrato_consumo",
      entidade_id: input.contrato_id ?? crypto.randomUUID(),
      usuario: input.userId,
      extra: { tool_name: "save_consumo", motivo: "forbidden" },
    });

    return await failToolAndRun({
      runId: input.runId,
      toolCallId,
      toolStatus: "denied",
      httpStatus: 403,
      errorCode: "forbidden",
      errorMessage: "Voce nao tem permissao para salvar consumo neste contrato.",
      body: { error: "Voce nao tem permissao para salvar consumo neste contrato." },
    });
  }

  if (!input.contrato_id) {
    return await failToolAndRun({
      runId: input.runId,
      toolCallId,
      toolStatus: "failed",
      httpStatus: 400,
      errorCode: "missing_contrato_id",
      errorMessage: "contrato_id e obrigatorio para save_consumo",
      body: { error: "contrato_id e obrigatorio para save_consumo" },
    });
  }

  if (!Array.isArray(items) || items.length === 0) {
    return await failToolAndRun({
      runId: input.runId,
      toolCallId,
      toolStatus: "failed",
      httpStatus: 400,
      errorCode: "missing_payload_data",
      errorMessage: "payload.data e obrigatorio para save_consumo",
      body: { error: "payload.data e obrigatorio para save_consumo" },
    });
  }

  const supabase = createServiceSupabaseClient();
  const { data: metricas, error: metricasError } = await supabase
    .from("contrato_metricas")
    .select("id, nome, contrato_id")
    .eq("contrato_id", input.contrato_id)
    .eq("active", true);

  if (metricasError) {
    console.error("Save consumo metric lookup error:", metricasError);
    return await failToolAndRun({
      runId: input.runId,
      toolCallId,
      toolStatus: "failed",
      httpStatus: 500,
      errorCode: "metric_lookup_failed",
      errorMessage: "Erro ao consultar metricas do contrato",
      body: { error: "Erro ao consultar metricas do contrato" },
    });
  }

  const metricasByName = new Map(
    (metricas || []).map((metrica) => [normalizeMetricName(metrica.nome), metrica]),
  );
  const unresolved = items.filter(
    (item) => !metricasByName.has(normalizeMetricName(item.metrica_nome)),
  );

  if (unresolved.length > 0) {
    return await failToolAndRun({
      runId: input.runId,
      toolCallId,
      toolStatus: "failed",
      httpStatus: 400,
      errorCode: "unresolved_metricas",
      errorMessage: "Nao foi possivel localizar todas as metricas do contrato.",
      body: {
        error: "Nao foi possivel localizar todas as metricas do contrato para salvar o consumo.",
        unresolved_metricas: unresolved.map((item) => item.metrica_nome),
      },
    });
  }

  const rows = items.map((item) => {
    const metrica = metricasByName.get(normalizeMetricName(item.metrica_nome))!;
    return {
      contrato_id: input.contrato_id,
      metrica_id: metrica.id,
      mes_referencia: item.mes_referencia,
      quantidade: item.quantidade,
      valor_total: item.valor_total,
      fonte: "assistant_hub",
      observacoes: "Salvo via assistant-hub com confirmacao do usuario",
    };
  });

  const { data: savedRows, error: upsertError } = await supabase
    .from("contrato_consumo")
    .upsert(rows, { onConflict: "metrica_id,mes_referencia" })
    .select("id, metrica_id, mes_referencia, quantidade, valor_total");

  if (upsertError) {
    console.error("Save consumo upsert error:", upsertError);
    return await failToolAndRun({
      runId: input.runId,
      toolCallId,
      toolStatus: "failed",
      httpStatus: 500,
      errorCode: "save_consumo_upsert_failed",
      errorMessage: "Erro ao salvar consumo no contrato",
      body: { error: "Erro ao salvar consumo no contrato" },
    });
  }

  await finishToolCall({
    tool_call_id: toolCallId,
    status: "completed",
    result_summary: {
      total_itens: rows.length,
      saved_ids: (savedRows || []).map((row) => row.id).slice(0, 20),
    },
  });

  await finishAiRun({
    run_id: input.runId,
    status: "completed",
    metadata: { http_status: 200, tool_name: "save_consumo", total_itens: rows.length },
  });

  await logAudit({
    acao: "assistant_save_consumo",
    entidade: "contrato_consumo",
    entidade_id: input.contrato_id,
    usuario: input.userId,
    extra: {
      run_id: input.runId,
      total_itens: rows.length,
    },
  });

  return jsonResponse({
    ok: true,
    message: `Salvei ${rows.length} registro(s) de consumo no contrato com sucesso.`,
    run_id: input.runId,
    saved: savedRows || [],
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const userId = getRequestUserId(req);
  let runId: string | null = null;

  try {
    const body = await req.json();
    const isToolAction = body.tool_action === "save_consumo";
    const route = isToolAction ? "contratos" : detectAssistantRoute(body);
    const messages = Array.isArray(body.messages) ? body.messages : [];
    const contratoId = typeof body.contrato_id === "string" ? body.contrato_id : null;

    runId = await startAiRun({
      route,
      user_id: userId,
      model: isToolAction ? null : "gpt-4o-mini",
      message_count: messages.length,
      has_file: !!body.file,
      tool_action: isToolAction ? body.tool_action : null,
      entity_type: contratoId ? "contrato" : route === "frota" ? "veiculos" : route === "oficina" ? "oficina" : null,
      entity_id: contratoId,
      metadata: { is_tool_action: isToolAction },
    });

    if (isToolAction) {
      return await executeSaveConsumoTool({
        req,
        runId,
        userId,
        contrato_id: body.contrato_id,
        payload: body.tool_payload,
      });
    }

    if (messages.length === 0) {
      await finishAiRun({
        run_id: runId,
        status: "failed",
        error_code: "missing_messages",
        error_message: "messages e obrigatorio",
        metadata: { http_status: 400 },
      });
      return jsonResponse({ error: "messages e obrigatorio" }, 400);
    }

    const systemPrompt = await buildSystemPrompt(route, body);
    const response = await streamChatCompletion({
      messages: [{ role: "system", content: systemPrompt }, ...messages],
    });

    if (response.ok) {
      await finishAiRun({
        run_id: runId,
        status: "completed",
        metadata: { http_status: 200, route, has_file: !!body.file },
      });

      await logAudit({
        acao: "assistant_chat_request",
        entidade: "assistant_hub",
        entidade_id: runId,
        usuario: userId,
        extra: { route, run_id: runId, message_count: messages.length, has_file: !!body.file },
      });
    } else {
      await finishAiRun({
        run_id: runId,
        status: "failed",
        error_code: `provider_${response.status}`,
        error_message: "Erro ao processar sua solicitacao com a IA.",
        metadata: { http_status: response.status, route },
      });
    }

    response.headers.set("x-ai-route", route);
    response.headers.set("x-ai-run-id", runId);
    return response;
  } catch (error) {
    console.error("Assistant hub error:", error);

    if (runId) {
      await finishAiRun({
        run_id: runId,
        status: "failed",
        error_code: isContratoNotFoundError(error) ? "contrato_not_found" : "assistant_hub_error",
        error_message: error instanceof Error ? error.message : "Erro desconhecido",
        metadata: { http_status: isContratoNotFoundError(error) ? 404 : 500 },
      });
    }

    const status = isContratoNotFoundError(error) ? 404 : 500;
    return jsonResponse(
      { error: error instanceof Error ? error.message : "Erro desconhecido" },
      status,
    );
  }
});
