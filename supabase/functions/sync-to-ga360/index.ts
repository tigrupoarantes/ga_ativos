import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'text/event-stream',
  'Cache-Control': 'no-cache',
  'Connection': 'keep-alive',
};

interface SyncResult {
  empresas: { inserted: number; updated: number; errors: string[] };
  funcionarios: { inserted: number; updated: number; errors: string[] };
}

interface ProgressEvent {
  type: 'progress' | 'complete' | 'error';
  phase?: 'empresas' | 'funcionarios';
  current?: number;
  total?: number;
  message?: string;
  success?: boolean;
  result?: SyncResult;
  summary?: {
    empresas: string;
    funcionarios: string;
    totalErrors: number;
  };
}

function sendEvent(controller: ReadableStreamDefaultController, event: ProgressEvent) {
  const data = `data: ${JSON.stringify(event)}\n\n`;
  controller.enqueue(new TextEncoder().encode(data));
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { syncType = 'all' } = await req.json().catch(() => ({ syncType: 'all' }));
    
    // Validate syncType
    if (!['empresas', 'funcionarios', 'all'].includes(syncType)) {
      return new Response(
        JSON.stringify({ error: 'syncType deve ser "empresas", "funcionarios" ou "all"' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Cliente para o banco ORIGEM (Supabase Externo - Ativos Arantes)
    const externalUrl = Deno.env.get("EXTERNAL_SUPABASE_URL");
    const externalKey = Deno.env.get("EXTERNAL_SUPABASE_SERVICE_KEY");

    if (!externalUrl || !externalKey) {
      return new Response(
        JSON.stringify({ error: 'Credenciais do Supabase externo não configuradas' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const sourceSupabase = createClient(externalUrl, externalKey);

    // Cliente para o banco DESTINO (GA360)
    const ga360Url = Deno.env.get("GA360_SUPABASE_URL");
    const ga360Key = Deno.env.get("GA360_SUPABASE_SERVICE_KEY");

    if (!ga360Url || !ga360Key) {
      return new Response(
        JSON.stringify({ error: 'Credenciais do GA360 não configuradas' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const targetSupabase = createClient(ga360Url, ga360Key);

    // Create SSE stream
    const stream = new ReadableStream({
      async start(controller) {
        const result: SyncResult = {
          empresas: { inserted: 0, updated: 0, errors: [] },
          funcionarios: { inserted: 0, updated: 0, errors: [] }
        };

        // Mapa de empresa_id origem -> company_id destino (via CNPJ)
        const empresaIdMap = new Map<string, string>();

        try {
          // ========== SYNC EMPRESAS -> COMPANIES ==========
          if (syncType === 'empresas' || syncType === 'all') {
            console.log('Iniciando sincronização de empresas -> companies...');
            
            // Buscar empresas ativas do banco origem
            const { data: empresasOrigem, error: empresasError } = await sourceSupabase
              .from('empresas')
              .select('*')
              .eq('active', true);

            if (empresasError) {
              console.error('Erro ao buscar empresas origem:', empresasError);
              result.empresas.errors.push(`Erro ao buscar empresas: ${empresasError.message}`);
            } else if (empresasOrigem) {
              const totalEmpresas = empresasOrigem.length;
              console.log(`Encontradas ${totalEmpresas} empresas para sincronizar`);
              
              sendEvent(controller, {
                type: 'progress',
                phase: 'empresas',
                current: 0,
                total: totalEmpresas,
                message: `Iniciando sincronização de ${totalEmpresas} empresas...`
              });
              
              for (let i = 0; i < empresasOrigem.length; i++) {
                const empresa = empresasOrigem[i];
                try {
                  if (!empresa.cnpj) {
                    result.empresas.errors.push(`Empresa ${empresa.nome} sem CNPJ - ignorada`);
                    continue;
                  }

                  // Verificar se company já existe no destino por CNPJ
                  const { data: existingCompany, error: checkError } = await targetSupabase
                    .from('companies')
                    .select('id')
                    .eq('cnpj', empresa.cnpj)
                    .maybeSingle();

                  if (checkError) {
                    result.empresas.errors.push(`Erro ao verificar empresa ${empresa.cnpj}: ${checkError.message}`);
                    continue;
                  }

                  // Mapear campos: empresas (origem) -> companies (destino)
                  const companyData = {
                    name: empresa.nome,
                    cnpj: empresa.cnpj,
                    is_active: empresa.active ?? true,
                    logo_url: empresa.logo_url,
                    color: empresa.color,
                    external_id: empresa.external_id,
                    is_auditable: empresa.is_auditable ?? false
                  };

                  if (existingCompany) {
                    // Atualizar company existente
                    const { error: updateError } = await targetSupabase
                      .from('companies')
                      .update(companyData)
                      .eq('id', existingCompany.id);

                    if (updateError) {
                      result.empresas.errors.push(`Erro ao atualizar empresa ${empresa.cnpj}: ${updateError.message}`);
                    } else {
                      result.empresas.updated++;
                      empresaIdMap.set(empresa.id, existingCompany.id);
                    }
                  } else {
                    // Inserir nova company
                    const { data: newCompany, error: insertError } = await targetSupabase
                      .from('companies')
                      .insert(companyData)
                      .select('id')
                      .single();

                    if (insertError) {
                      result.empresas.errors.push(`Erro ao inserir empresa ${empresa.cnpj}: ${insertError.message}`);
                    } else if (newCompany) {
                      result.empresas.inserted++;
                      empresaIdMap.set(empresa.id, newCompany.id);
                    }
                  }
                } catch (err) {
                  result.empresas.errors.push(`Erro inesperado empresa ${empresa.nome}: ${String(err)}`);
                }

                // Send progress every record
                sendEvent(controller, {
                  type: 'progress',
                  phase: 'empresas',
                  current: i + 1,
                  total: totalEmpresas,
                  message: `Processando empresa ${i + 1} de ${totalEmpresas}: ${empresa.nome}`
                });
              }
            }
          }

          // ========== SYNC FUNCIONARIOS ==========
          if (syncType === 'funcionarios' || syncType === 'all') {
            console.log('Iniciando sincronização de funcionários...');

            // Se não sincronizou empresas, precisamos buscar o mapeamento
            if (syncType === 'funcionarios' && empresaIdMap.size === 0) {
              // Buscar todas empresas do origem para montar mapeamento
              const { data: empresasOrigem } = await sourceSupabase
                .from('empresas')
                .select('id, cnpj')
                .eq('active', true);

              if (empresasOrigem) {
                for (const emp of empresasOrigem) {
                  if (emp.cnpj) {
                    // Buscar na tabela companies do destino
                    const { data: destCompany } = await targetSupabase
                      .from('companies')
                      .select('id')
                      .eq('cnpj', emp.cnpj)
                      .maybeSingle();
                    
                    if (destCompany) {
                      empresaIdMap.set(emp.id, destCompany.id);
                    }
                  }
                }
              }
            }

            // Buscar funcionários ativos do banco origem com empresa
            const { data: funcionariosOrigem, error: funcError } = await sourceSupabase
              .from('funcionarios')
              .select('*, empresas!funcionarios_empresa_id_fkey(cnpj)')
              .eq('active', true);

            if (funcError) {
              console.error('Erro ao buscar funcionários origem:', funcError);
              result.funcionarios.errors.push(`Erro ao buscar funcionários: ${funcError.message}`);
            } else if (funcionariosOrigem) {
              const totalFuncionarios = funcionariosOrigem.length;
              console.log(`Encontrados ${totalFuncionarios} funcionários para sincronizar`);

              sendEvent(controller, {
                type: 'progress',
                phase: 'funcionarios',
                current: 0,
                total: totalFuncionarios,
                message: `Iniciando sincronização de ${totalFuncionarios} funcionários...`
              });

              for (let i = 0; i < funcionariosOrigem.length; i++) {
                const func = funcionariosOrigem[i];
                try {
                  if (!func.cpf) {
                    result.funcionarios.errors.push(`Funcionário ${func.nome} sem CPF - ignorado`);
                    continue;
                  }

                  // Resolver empresa_id no destino (agora company_id)
                  let targetCompanyId: string | null = null;
                  if (func.empresa_id) {
                    targetCompanyId = empresaIdMap.get(func.empresa_id) || null;
                    
                    // Se não encontrou no mapa, buscar por CNPJ na tabela companies
                    if (!targetCompanyId && func.empresas?.cnpj) {
                      const { data: destCompany } = await targetSupabase
                        .from('companies')
                        .select('id')
                        .eq('cnpj', func.empresas.cnpj)
                        .maybeSingle();
                      
                      if (destCompany) {
                        targetCompanyId = destCompany.id;
                        empresaIdMap.set(func.empresa_id, destCompany.id);
                      }
                    }
                  }

                  // Verificar se funcionário já existe no destino por CPF
                  const { data: existingFunc, error: checkError } = await targetSupabase
                    .from('external_employees')
                    .select('id')
                    .eq('cpf', func.cpf)
                    .maybeSingle();

                  if (checkError) {
                    result.funcionarios.errors.push(`Erro ao verificar funcionário ${func.cpf}: ${checkError.message}`);
                    continue;
                  }

                  // Mapeamento para external_employees
                  const employeeData = {
                    external_id: func.id,
                    source_system: 'gestao_ativos',
                    company_id: targetCompanyId,
                    full_name: func.nome,
                    email: func.email,
                    phone: func.telefone,
                    department: func.departamento,
                    position: func.cargo,
                    cpf: func.cpf,
                    is_active: func.active ?? true,
                    is_condutor: func.is_condutor ?? false,
                    synced_at: new Date().toISOString()
                  };

                  if (existingFunc) {
                    // Atualizar funcionário existente
                    const { error: updateError } = await targetSupabase
                      .from('external_employees')
                      .update(employeeData)
                      .eq('id', existingFunc.id);

                    if (updateError) {
                      result.funcionarios.errors.push(`Erro ao atualizar funcionário ${func.cpf}: ${updateError.message}`);
                    } else {
                      result.funcionarios.updated++;
                    }
                  } else {
                    // Inserir novo funcionário
                    const { error: insertError } = await targetSupabase
                      .from('external_employees')
                      .insert(employeeData);

                    if (insertError) {
                      result.funcionarios.errors.push(`Erro ao inserir funcionário ${func.cpf}: ${insertError.message}`);
                    } else {
                      result.funcionarios.inserted++;
                    }
                  }
                } catch (err) {
                  result.funcionarios.errors.push(`Erro inesperado funcionário ${func.nome}: ${String(err)}`);
                }

                // Send progress every 5 records to reduce overhead
                if ((i + 1) % 5 === 0 || i === funcionariosOrigem.length - 1) {
                  sendEvent(controller, {
                    type: 'progress',
                    phase: 'funcionarios',
                    current: i + 1,
                    total: totalFuncionarios,
                    message: `Processando funcionário ${i + 1} de ${totalFuncionarios}`
                  });
                }
              }
            }
          }

          console.log('Sincronização concluída:', result);

          // Send completion event
          sendEvent(controller, {
            type: 'complete',
            success: true,
            result,
            summary: {
              empresas: `${result.empresas.inserted} inseridas, ${result.empresas.updated} atualizadas`,
              funcionarios: `${result.funcionarios.inserted} inseridos, ${result.funcionarios.updated} atualizados`,
              totalErrors: result.empresas.errors.length + result.funcionarios.errors.length
            }
          });

        } catch (error) {
          console.error('Erro na sincronização:', error);
          sendEvent(controller, {
            type: 'error',
            message: `Erro interno na sincronização: ${String(error)}`
          });
        } finally {
          controller.close();
        }
      }
    });

    return new Response(stream, { headers: corsHeaders });

  } catch (error) {
    console.error('Erro na sincronização:', error);
    return new Response(
      JSON.stringify({ error: 'Erro interno na sincronização', details: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
