import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface NotificationJob {
  id: string;
  channel: string;
  to_phone: string | null;
  template: string;
  payload: Record<string, unknown> | null;
  tries: number;
}

// Message templates
const templates: Record<string, (payload: Record<string, unknown>) => string> = {
  km_request: (payload) =>
    `Olá ${payload.employee_name || ""}! 🚗\n\nPor favor, informe o KM atual do veículo *${payload.vehicle_placa || ""}*.\n\nResponda apenas com o número da quilometragem.\n\nExemplo: 45000`,
  
  preventiva_alert: (payload) =>
    `⚠️ *Alerta de Manutenção Preventiva*\n\nVeículo: ${payload.vehicle_placa || ""}\nTipo: ${payload.maintenance_type || ""}\n${payload.km_remaining ? `KM restante: ${payload.km_remaining}` : ""}\n${payload.days_remaining ? `Dias restantes: ${payload.days_remaining}` : ""}\n\nAgende a manutenção o mais breve possível.`,
  
  wash_reminder: (payload) =>
    `🚿 *Lembrete de Lavagem*\n\nVeículo: ${payload.vehicle_placa || ""}\nTipo: ${payload.wash_type || "simples"}\n\nO veículo está agendado para lavagem hoje.`,
  
  agenda_reminder: (payload) =>
    `📅 *Lembrete de Agendamento*\n\nVeículo: ${payload.vehicle_placa || ""}\nServiço: ${payload.service_type || ""}\nData: ${payload.scheduled_date || ""}\nHora: ${payload.scheduled_time || ""}\n\nNão esqueça do seu agendamento amanhã!`,
};

async function sendWhatsAppMessage(
  phone: string,
  message: string,
  accessToken: string,
  phoneNumberId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Format phone to E.164 if needed
    let formattedPhone = phone.replace(/\D/g, "");
    if (!formattedPhone.startsWith("55") && formattedPhone.length <= 11) {
      formattedPhone = "55" + formattedPhone;
    }

    const response = await fetch(
      `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: formattedPhone,
          type: "text",
          text: { body: message },
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error("WhatsApp API error:", errorData);
      return {
        success: false,
        error: errorData.error?.message || "Failed to send message",
      };
    }

    const result = await response.json();
    console.log("WhatsApp message sent:", result);
    return { success: true };
  } catch (error) {
    console.error("Error sending WhatsApp message:", error);
    return { success: false, error: String(error) };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const whatsappToken = Deno.env.get("WHATSAPP_ACCESS_TOKEN");
    const whatsappPhoneId = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if WhatsApp is configured
    const isWhatsAppConfigured = whatsappToken && whatsappPhoneId;

    // Parse request body for optional filters
    let jobId: string | null = null;
    let limit = 10;

    try {
      const body = await req.json();
      jobId = body.jobId || null;
      limit = body.limit || 10;
    } catch {
      // No body, process queue
    }

    // Fetch pending jobs
    let query = supabase
      .from("notification_jobs")
      .select("*")
      .eq("status", "pendente")
      .eq("channel", "whatsapp")
      .order("created_at", { ascending: true });

    if (jobId) {
      query = query.eq("id", jobId);
    } else {
      query = query.limit(limit);
    }

    const { data: jobs, error: fetchError } = await query;

    if (fetchError) {
      console.error("Error fetching jobs:", fetchError);
      throw fetchError;
    }

    if (!jobs || jobs.length === 0) {
      return new Response(
        JSON.stringify({ message: "No pending jobs", processed: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Processing ${jobs.length} notification jobs`);

    const results = {
      processed: 0,
      sent: 0,
      errors: 0,
      details: [] as { id: string; status: string; error?: string }[],
    };

    for (const job of jobs as NotificationJob[]) {
      console.log(`Processing job ${job.id} - template: ${job.template}`);

      // Get message from template
      const templateFn = templates[job.template];
      if (!templateFn) {
        await supabase
          .from("notification_jobs")
          .update({
            status: "erro",
            last_error: `Template not found: ${job.template}`,
            tries: job.tries + 1,
          })
          .eq("id", job.id);

        results.errors++;
        results.details.push({
          id: job.id,
          status: "erro",
          error: `Template not found: ${job.template}`,
        });
        continue;
      }

      const message = templateFn(job.payload || {});

      if (!job.to_phone) {
        await supabase
          .from("notification_jobs")
          .update({
            status: "erro",
            last_error: "No phone number provided",
            tries: job.tries + 1,
          })
          .eq("id", job.id);

        results.errors++;
        results.details.push({
          id: job.id,
          status: "erro",
          error: "No phone number provided",
        });
        continue;
      }

      // If WhatsApp is not configured, simulate success for testing
      if (!isWhatsAppConfigured) {
        console.log(
          `[SIMULATION] Would send to ${job.to_phone}: ${message.substring(0, 50)}...`
        );

        await supabase
          .from("notification_jobs")
          .update({
            status: "enviado",
            sent_at: new Date().toISOString(),
            tries: job.tries + 1,
            last_error: "SIMULATED - WhatsApp not configured",
          })
          .eq("id", job.id);

        results.sent++;
        results.details.push({ id: job.id, status: "enviado (simulado)" });
        continue;
      }

      // Send via WhatsApp API
      const sendResult = await sendWhatsAppMessage(
        job.to_phone,
        message,
        whatsappToken,
        whatsappPhoneId
      );

      if (sendResult.success) {
        await supabase
          .from("notification_jobs")
          .update({
            status: "enviado",
            sent_at: new Date().toISOString(),
            tries: job.tries + 1,
          })
          .eq("id", job.id);

        results.sent++;
        results.details.push({ id: job.id, status: "enviado" });
      } else {
        await supabase
          .from("notification_jobs")
          .update({
            status: job.tries >= 2 ? "erro" : "pendente",
            last_error: sendResult.error,
            tries: job.tries + 1,
          })
          .eq("id", job.id);

        if (job.tries >= 2) {
          results.errors++;
          results.details.push({
            id: job.id,
            status: "erro",
            error: sendResult.error,
          });
        }
      }

      results.processed++;
    }

    console.log("Processing complete:", results);

    return new Response(JSON.stringify(results), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in whatsapp-send:", error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
