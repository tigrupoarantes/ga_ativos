import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface Preventiva {
  id: string;
  tipo_manutencao: string;
  veiculo_id: string;
  proximo_km: number | null;
  proxima_realizacao: string | null;
  status: string;
  veiculo?: {
    placa: string;
    km_atual: number;
    funcionario_id: string | null;
    funcionario?: {
      nome: string;
      telefone: string | null;
      whatsapp_phone_e164: string | null;
      whatsapp_opt_in: boolean;
    };
  };
}

interface WashPlan {
  id: string;
  vehicle_id: string;
  wash_type: string;
  frequency_days: number | null;
  status: string;
  veiculo?: {
    placa: string;
    funcionario_id: string | null;
    funcionario?: {
      nome: string;
      telefone: string | null;
      whatsapp_phone_e164: string | null;
      whatsapp_opt_in: boolean;
    };
  };
}

interface ServiceAppointment {
  id: string;
  vehicle_id: string;
  service_type: string;
  scheduled_at: string;
  status: string;
  veiculo?: {
    placa: string;
    funcionario_id: string | null;
    funcionario?: {
      nome: string;
      telefone: string | null;
      whatsapp_phone_e164: string | null;
      whatsapp_opt_in: boolean;
    };
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const results = {
      preventivas_checked: 0,
      preventivas_alerts: 0,
      wash_alerts: 0,
      agenda_reminders: 0,
      jobs_created: 0,
      errors: [] as string[],
    };

    console.log("Starting workshop scheduler...");

    // 1. Check preventivas approaching KM threshold (within 1000 km)
    const { data: preventivas, error: prevError } = await supabase
      .from("preventivas")
      .select(`
        id,
        tipo_manutencao,
        veiculo_id,
        proximo_km,
        proxima_realizacao,
        status,
        veiculo:veiculos!preventivas_veiculo_id_fkey (
          placa,
          km_atual,
          funcionario_id,
          funcionario:funcionarios!veiculos_funcionario_id_fkey (
            nome,
            telefone,
            whatsapp_phone_e164,
            whatsapp_opt_in
          )
        )
      `)
      .eq("active", true)
      .eq("status", "pendente");

    if (prevError) {
      console.error("Error fetching preventivas:", prevError);
      results.errors.push(`Preventivas fetch error: ${prevError.message}`);
    } else if (preventivas) {
      results.preventivas_checked = preventivas.length;

      for (const prev of preventivas as unknown as Preventiva[]) {
        const veiculo = prev.veiculo;
        if (!veiculo) continue;

        const kmAtual = veiculo.km_atual || 0;
        const proximoKm = prev.proximo_km;

        // Check if within 1000 km of next maintenance
        if (proximoKm && kmAtual >= proximoKm - 1000) {
          const funcionario = veiculo.funcionario;
          const phone =
            funcionario?.whatsapp_phone_e164 || funcionario?.telefone;

          if (phone && funcionario?.whatsapp_opt_in !== false) {
            // Create notification job
            const { error: jobError } = await supabase
              .from("notification_jobs")
              .insert({
                channel: "whatsapp",
                to_phone: phone,
                template: "preventiva_alert",
                payload: {
                  vehicle_placa: veiculo.placa,
                  maintenance_type: prev.tipo_manutencao,
                  km_remaining: proximoKm - kmAtual,
                  employee_name: funcionario.nome,
                },
              });

            if (jobError) {
              results.errors.push(
                `Failed to create preventiva job: ${jobError.message}`
              );
            } else {
              results.preventivas_alerts++;
              results.jobs_created++;
            }
          }
        }

        // Also check date-based preventivas
        if (prev.proxima_realizacao) {
          const proximaData = new Date(prev.proxima_realizacao);
          const hoje = new Date();
          const diffDays = Math.ceil(
            (proximaData.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24)
          );

          if (diffDays <= 7 && diffDays >= 0) {
            const funcionario = veiculo.funcionario;
            const phone =
              funcionario?.whatsapp_phone_e164 || funcionario?.telefone;

            if (phone && funcionario?.whatsapp_opt_in !== false) {
              const { error: jobError } = await supabase
                .from("notification_jobs")
                .insert({
                  channel: "whatsapp",
                  to_phone: phone,
                  template: "preventiva_alert",
                  payload: {
                    vehicle_placa: veiculo.placa,
                    maintenance_type: prev.tipo_manutencao,
                    days_remaining: diffDays,
                    employee_name: funcionario.nome,
                  },
                });

              if (!jobError) {
                results.preventivas_alerts++;
                results.jobs_created++;
              }
            }
          }
        }
      }
    }

    // 2. Check agenda for tomorrow (D-1 reminders)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStart = new Date(tomorrow.setHours(0, 0, 0, 0)).toISOString();
    const tomorrowEnd = new Date(tomorrow.setHours(23, 59, 59, 999)).toISOString();

    const { data: appointments, error: apptError } = await supabase
      .from("service_appointments")
      .select(`
        id,
        vehicle_id,
        service_type,
        scheduled_at,
        status,
        veiculo:veiculos!service_appointments_vehicle_id_fkey (
          placa,
          funcionario_id,
          funcionario:funcionarios!veiculos_funcionario_id_fkey (
            nome,
            telefone,
            whatsapp_phone_e164,
            whatsapp_opt_in
          )
        )
      `)
      .gte("scheduled_at", tomorrowStart)
      .lte("scheduled_at", tomorrowEnd)
      .in("status", ["agendada", "confirmada"])
      .eq("active", true);

    if (apptError) {
      console.error("Error fetching appointments:", apptError);
      results.errors.push(`Appointments fetch error: ${apptError.message}`);
    } else if (appointments) {
      for (const appt of appointments as unknown as ServiceAppointment[]) {
        const veiculo = appt.veiculo;
        if (!veiculo) continue;

        const funcionario = veiculo.funcionario;
        const phone =
          funcionario?.whatsapp_phone_e164 || funcionario?.telefone;

        if (phone && funcionario?.whatsapp_opt_in !== false) {
          const scheduledDate = new Date(appt.scheduled_at);

          const { error: jobError } = await supabase
            .from("notification_jobs")
            .insert({
              channel: "whatsapp",
              to_phone: phone,
              template: "agenda_reminder",
              payload: {
                vehicle_placa: veiculo.placa,
                service_type: appt.service_type,
                scheduled_date: scheduledDate.toLocaleDateString("pt-BR"),
                scheduled_time: scheduledDate.toLocaleTimeString("pt-BR", {
                  hour: "2-digit",
                  minute: "2-digit",
                }),
                employee_name: funcionario.nome,
              },
            });

          if (jobError) {
            results.errors.push(
              `Failed to create reminder job: ${jobError.message}`
            );
          } else {
            results.agenda_reminders++;
            results.jobs_created++;
          }
        }
      }
    }

    // 3. Check wash plans for today's queue
    const { data: washPlans, error: washError } = await supabase
      .from("wash_plans")
      .select(`
        id,
        vehicle_id,
        wash_type,
        frequency_days,
        status,
        veiculo:veiculos!wash_plans_vehicle_id_fkey (
          placa,
          funcionario_id,
          funcionario:funcionarios!veiculos_funcionario_id_fkey (
            nome,
            telefone,
            whatsapp_phone_e164,
            whatsapp_opt_in
          )
        )
      `)
      .eq("status", "ativo")
      .eq("active", true);

    if (washError) {
      console.error("Error fetching wash plans:", washError);
      results.errors.push(`Wash plans fetch error: ${washError.message}`);
    } else if (washPlans) {
      const today = new Date();
      const dayOfWeek = today.getDay();

      for (const plan of washPlans as unknown as WashPlan[]) {
        const veiculo = plan.veiculo;
        if (!veiculo) continue;

        // Check if there's already a wash scheduled for today
        const todayStart = new Date(today.setHours(0, 0, 0, 0)).toISOString();
        const todayEnd = new Date(today.setHours(23, 59, 59, 999)).toISOString();

        const { data: existingWash } = await supabase
          .from("service_appointments")
          .select("id")
          .eq("vehicle_id", plan.vehicle_id)
          .eq("service_type", "lavagem")
          .gte("scheduled_at", todayStart)
          .lte("scheduled_at", todayEnd)
          .limit(1);

        if (existingWash && existingWash.length > 0) {
          // Already has a wash today, send reminder
          const funcionario = veiculo.funcionario;
          const phone =
            funcionario?.whatsapp_phone_e164 || funcionario?.telefone;

          if (phone && funcionario?.whatsapp_opt_in !== false) {
            const { error: jobError } = await supabase
              .from("notification_jobs")
              .insert({
                channel: "whatsapp",
                to_phone: phone,
                template: "wash_reminder",
                payload: {
                  vehicle_placa: veiculo.placa,
                  wash_type: plan.wash_type,
                  employee_name: funcionario.nome,
                },
              });

            if (!jobError) {
              results.wash_alerts++;
              results.jobs_created++;
            }
          }
        }
      }
    }

    console.log("Workshop scheduler complete:", results);

    return new Response(JSON.stringify(results), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in workshop-scheduler:", error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
