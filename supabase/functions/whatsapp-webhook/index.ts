import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface WhatsAppMessage {
  from: string;
  text?: { body: string };
  timestamp: string;
}

interface WebhookPayload {
  object: string;
  entry?: Array<{
    id: string;
    changes?: Array<{
      value: {
        messages?: WhatsAppMessage[];
        contacts?: Array<{ wa_id: string; profile: { name: string } }>;
      };
    }>;
  }>;
}

// Parse KM from message text
function parseKmFromMessage(text: string): number | null {
  // Patterns: "45000", "45.000", "45000km", "km 45000", "KM: 45.000"
  const patterns = [
    /(\d{1,3}(?:\.\d{3})*)\s*(?:km|KM)?/i,
    /(?:km|KM)[:\s]*(\d{1,3}(?:\.\d{3})*)/i,
    /(\d{4,6})/,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      // Remove dots (thousands separator) and parse
      const km = parseInt(match[1].replace(/\./g, ""), 10);
      if (km >= 0 && km <= 9999999) {
        return km;
      }
    }
  }

  return null;
}

// Validate KM reading
function validateKm(newKm: number, currentKm: number | null): "ok" | "suspeito" | "rejeitado" {
  if (currentKm === null) {
    return "ok";
  }

  const diff = newKm - currentKm;

  // KM decreased significantly - suspicious
  if (diff < -100) {
    return "rejeitado";
  }

  // KM decreased slightly (could be rounding) - suspicious
  if (diff < 0) {
    return "suspeito";
  }

  // KM increased too much in a short period (>5000 km) - suspicious
  if (diff > 5000) {
    return "suspeito";
  }

  return "ok";
}

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const url = new URL(req.url);

  // Webhook verification (GET request from WhatsApp)
  if (req.method === "GET") {
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");

    const verifyToken = Deno.env.get("WHATSAPP_VERIFY_TOKEN") || "ga_km_webhook";

    if (mode === "subscribe" && token === verifyToken) {
      console.log("Webhook verified successfully");
      return new Response(challenge, { status: 200, headers: corsHeaders });
    }

    return new Response("Forbidden", { status: 403, headers: corsHeaders });
  }

  // Handle incoming messages (POST request)
  if (req.method === "POST") {
    try {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      const payload: WebhookPayload = await req.json();
      console.log("Received webhook payload:", JSON.stringify(payload, null, 2));

      if (payload.object !== "whatsapp_business_account") {
        return new Response(JSON.stringify({ status: "ignored" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const messages: WhatsAppMessage[] = [];
      for (const entry of payload.entry || []) {
        for (const change of entry.changes || []) {
          if (change.value.messages) {
            messages.push(...change.value.messages);
          }
        }
      }

      for (const message of messages) {
        if (!message.text?.body) continue;

        const phoneNumber = message.from;
        const messageText = message.text.body.trim();
        const km = parseKmFromMessage(messageText);

        console.log(`Processing message from ${phoneNumber}: "${messageText}" -> KM: ${km}`);

        if (km === null) {
          console.log("Could not parse KM from message");
          continue;
        }

        // Find employee by phone number
        const { data: employee } = await supabase
          .from("funcionarios")
          .select("id, nome")
          .eq("active", true)
          .or(`telefone.ilike.%${phoneNumber.slice(-8)}%`)
          .single();

        if (!employee) {
          console.log(`Employee not found for phone: ${phoneNumber}`);
          continue;
        }

        // Find vehicle assigned to this employee
        const { data: vehicle } = await supabase
          .from("veiculos")
          .select("id, placa, km_atual")
          .eq("funcionario_id", employee.id)
          .eq("active", true)
          .single();

        if (!vehicle) {
          console.log(`No vehicle assigned to employee: ${employee.nome}`);
          continue;
        }

        // Validate the KM reading
        const validationStatus = validateKm(km, vehicle.km_atual);

        // Insert odometer report
        const { error: insertError } = await supabase
          .from("vehicle_odometer_reports")
          .insert({
            vehicle_id: vehicle.id,
            employee_id: employee.id,
            reported_km: km,
            source: "whatsapp",
            raw_message: messageText,
            validation_status: validationStatus,
          });

        if (insertError) {
          console.error("Error inserting odometer report:", insertError);
        } else {
          console.log(
            `KM report saved: Vehicle ${vehicle.placa}, KM ${km}, Status ${validationStatus}`
          );
        }
      }

      return new Response(JSON.stringify({ status: "processed" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (error: unknown) {
      console.error("Webhook error:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      return new Response(JSON.stringify({ error: errorMessage }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  return new Response("Method not allowed", { status: 405, headers: corsHeaders });
});
