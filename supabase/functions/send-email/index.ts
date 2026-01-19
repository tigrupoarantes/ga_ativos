import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailRequest {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Iniciando envio de email...");

    // Get Supabase client with service role
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch SMTP config from database
    const { data: config, error: configError } = await supabase
      .from("smtp_config")
      .select("*")
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();

    if (configError) {
      console.error("Erro ao buscar configuração SMTP:", configError);
      throw new Error("Erro ao buscar configuração SMTP");
    }

    if (!config) {
      console.error("Configuração SMTP não encontrada ou inativa");
      throw new Error("Configuração SMTP não encontrada. Configure o SMTP nas configurações do sistema.");
    }

    console.log(`Usando servidor SMTP: ${config.host}:${config.port}`);

    // Parse request body
    const { to, subject, html, text }: EmailRequest = await req.json();

    if (!to || !subject || !html) {
      throw new Error("Campos obrigatórios: to, subject, html");
    }

    // Create SMTP client
    const client = new SMTPClient({
      connection: {
        hostname: config.host,
        port: config.port,
        tls: config.secure,
        auth: {
          username: config.username,
          password: config.password_encrypted,
        },
      },
    });

    // Send email
    const recipients = Array.isArray(to) ? to : [to];
    console.log(`Enviando email para: ${recipients.join(", ")}`);

    await client.send({
      from: `${config.from_name} <${config.from_email}>`,
      to: recipients,
      subject,
      content: text || "",
      html,
    });

    await client.close();

    console.log("Email enviado com sucesso!");

    return new Response(
      JSON.stringify({ success: true, message: "Email enviado com sucesso" }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Erro ao enviar email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
