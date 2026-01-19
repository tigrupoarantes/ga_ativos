import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ResetRequest {
  email: string;
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Iniciando solicitação de reset de senha...");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { email }: ResetRequest = await req.json();

    if (!email) {
      throw new Error("Email é obrigatório");
    }

    const normalizedEmail = email.toLowerCase().trim();
    console.log(`Buscando usuário com email: ${normalizedEmail}`);

    // Find user by email using auth.users via admin API
    const { data: { users }, error: userError } = await supabase.auth.admin.listUsers();
    
    if (userError) {
      console.error("Erro ao buscar usuários:", userError);
      throw new Error("Erro ao processar solicitação");
    }

    const user = users?.find(u => u.email?.toLowerCase() === normalizedEmail);

    if (!user) {
      // Don't reveal if user exists or not for security
      console.log("Usuário não encontrado, mas retornando sucesso por segurança");
      return new Response(
        JSON.stringify({ success: true, message: "Se o email existir, você receberá um link de recuperação" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`Usuário encontrado: ${user.id}`);

    // Check rate limiting - max 3 requests per hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { data: recentTokens, error: countError } = await supabase
      .from("password_reset_tokens")
      .select("id")
      .eq("email", normalizedEmail)
      .gte("created_at", oneHourAgo);

    if (countError) {
      console.error("Erro ao verificar rate limit:", countError);
    }

    if (recentTokens && recentTokens.length >= 3) {
      console.log("Rate limit excedido para este email");
      throw new Error("Muitas solicitações. Aguarde 1 hora antes de tentar novamente.");
    }

    // Generate secure token
    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

    console.log("Salvando token no banco...");

    // Save token
    const { error: insertError } = await supabase
      .from("password_reset_tokens")
      .insert({
        user_id: user.id,
        email: normalizedEmail,
        token,
        expires_at: expiresAt.toISOString(),
      });

    if (insertError) {
      console.error("Erro ao salvar token:", insertError);
      throw new Error("Erro ao processar solicitação");
    }

    // Get the app URL from request headers or use default
    const origin = req.headers.get("origin") || "https://ativosarantes.lovable.app";
    const resetLink = `${origin}/reset-password?token=${token}`;

    console.log(`Link de reset gerado: ${resetLink}`);

    // Fetch SMTP config
    const { data: smtpConfig, error: smtpError } = await supabase
      .from("smtp_config")
      .select("*")
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();

    if (smtpError || !smtpConfig) {
      console.error("Configuração SMTP não encontrada:", smtpError);
      throw new Error("Configuração de email não encontrada. Configure o SMTP nas configurações do sistema.");
    }

    // Send email using the send-email function logic
    const { SMTPClient } = await import("https://deno.land/x/denomailer@1.6.0/mod.ts");

    const client = new SMTPClient({
      connection: {
        hostname: smtpConfig.host,
        port: smtpConfig.port,
        tls: smtpConfig.secure,
        auth: {
          username: smtpConfig.username,
          password: smtpConfig.password_encrypted,
        },
      },
      debug: {
        log: true,
        allowUnsecure: true,
        encodeLB: false,
        noStartTLS: true,
      },
    });

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Recuperação de Senha</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f5;">
        <table role="presentation" style="width: 100%; border-collapse: collapse;">
          <tr>
            <td align="center" style="padding: 40px 0;">
              <table role="presentation" style="width: 100%; max-width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                <tr>
                  <td style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%); border-radius: 12px 12px 0 0;">
                    <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">Sistema de Gestão de Ativos</h1>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 40px;">
                    <h2 style="margin: 0 0 20px; color: #1e3a5f; font-size: 20px; font-weight: 600;">Recuperação de Senha</h2>
                    <p style="margin: 0 0 20px; color: #52525b; font-size: 16px; line-height: 1.6;">
                      Olá,
                    </p>
                    <p style="margin: 0 0 20px; color: #52525b; font-size: 16px; line-height: 1.6;">
                      Recebemos uma solicitação para redefinir a senha da sua conta. Se você não fez esta solicitação, pode ignorar este email.
                    </p>
                    <p style="margin: 0 0 30px; color: #52525b; font-size: 16px; line-height: 1.6;">
                      Para redefinir sua senha, clique no botão abaixo:
                    </p>
                    <table role="presentation" style="width: 100%; border-collapse: collapse;">
                      <tr>
                        <td align="center">
                          <a href="${resetLink}" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%); color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; border-radius: 8px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">
                            Redefinir Senha
                          </a>
                        </td>
                      </tr>
                    </table>
                    <p style="margin: 30px 0 0; color: #71717a; font-size: 14px; line-height: 1.6;">
                      <strong>Importante:</strong> Este link expira em <strong>1 hora</strong>. Após esse período, você precisará solicitar um novo link.
                    </p>
                    <p style="margin: 20px 0 0; color: #71717a; font-size: 14px; line-height: 1.6;">
                      Se o botão não funcionar, copie e cole o link abaixo no seu navegador:
                    </p>
                    <p style="margin: 10px 0 0; color: #3b82f6; font-size: 12px; word-break: break-all;">
                      ${resetLink}
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 20px 40px; background-color: #f4f4f5; border-radius: 0 0 12px 12px;">
                    <p style="margin: 0; color: #71717a; font-size: 12px; text-align: center;">
                      Este é um email automático. Por favor, não responda.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    console.log("Enviando email de recuperação...");

    await client.send({
      from: `${smtpConfig.from_name} <${smtpConfig.from_email}>`,
      to: [normalizedEmail],
      subject: "Recuperação de Senha - Sistema de Gestão de Ativos",
      content: `Recuperação de Senha\n\nClique no link para redefinir sua senha: ${resetLink}\n\nEste link expira em 1 hora.`,
      html: htmlContent,
    });

    await client.close();

    console.log("Email de recuperação enviado com sucesso!");

    return new Response(
      JSON.stringify({ success: true, message: "Email de recuperação enviado com sucesso" }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Erro na solicitação de reset:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
