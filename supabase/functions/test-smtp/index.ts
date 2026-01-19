import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TestSmtpRequest {
  host: string;
  port: number;
  secure: boolean;
  username: string;
  password_encrypted: string;
  from_email: string;
  from_name: string;
  test_email: string;
}

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Iniciando teste de conexão SMTP...");

    const config: TestSmtpRequest = await req.json();

    // Validate required fields
    if (!config.host || !config.username || !config.password_encrypted || !config.from_email || !config.test_email) {
      throw new Error("Campos obrigatórios não preenchidos");
    }

    // Trim and validate host to prevent malformed hostnames
    const host = config.host.trim();
    const port = Number(config.port) || 587;
    
    console.log(`Testando servidor SMTP: ${host}:${port} (secure: ${config.secure})`);

    // For port 587 with STARTTLS, we need to import denomailer dynamically
    // and configure it properly for STARTTLS vs implicit TLS
    const { SMTPClient } = await import("https://deno.land/x/denomailer@1.6.0/mod.ts");

    // Determine TLS settings based on port and user preference
    // Port 465 = implicit TLS (tls: true)
    // Port 587 = STARTTLS (tls: false, library handles upgrade)
    // Port 25 = no encryption (tls: false)
    const useTls = port === 465 ? true : config.secure;

    console.log(`Configuração TLS: ${useTls ? 'TLS direto' : 'STARTTLS ou sem criptografia'}`);

    // Create SMTP client with timeout
    const client = new SMTPClient({
      connection: {
        hostname: host,
        port: port,
        tls: useTls,
        auth: {
          username: config.username,
          password: config.password_encrypted,
        },
      },
      debug: {
        log: true,
        allowUnsecure: !useTls && port !== 465,
        encodeLB: false,
        noStartTLS: false,
      },
    });

    // Send test email
    const now = new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
    
    console.log(`Enviando email de teste para: ${config.test_email}`);
    
    await client.send({
      from: `${config.from_name || "Sistema de Gestão"} <${config.from_email}>`,
      to: [config.test_email],
      subject: "✅ Teste de Configuração SMTP",
      content: `Este é um email de teste enviado em ${now}.`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
            .success-icon { font-size: 48px; margin-bottom: 10px; }
            .info { background: white; padding: 15px; border-radius: 8px; margin-top: 20px; }
            .info-item { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; }
            .info-item:last-child { border-bottom: none; }
            .label { color: #666; }
            .value { font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="success-icon">✅</div>
              <h1 style="margin: 0;">Configuração SMTP Validada!</h1>
            </div>
            <div class="content">
              <p>Parabéns! Sua configuração SMTP está funcionando corretamente.</p>
              <p>Este email foi enviado automaticamente para validar as configurações do servidor de email.</p>
              
              <div class="info">
                <h3 style="margin-top: 0;">Detalhes da Configuração:</h3>
                <div class="info-item">
                  <span class="label">Servidor:</span>
                  <span class="value">${host}:${port}</span>
                </div>
                <div class="info-item">
                  <span class="label">TLS/SSL:</span>
                  <span class="value">${useTls ? "TLS Direto" : "STARTTLS"}</span>
                </div>
                <div class="info-item">
                  <span class="label">Remetente:</span>
                  <span class="value">${config.from_name} &lt;${config.from_email}&gt;</span>
                </div>
                <div class="info-item">
                  <span class="label">Data do Teste:</span>
                  <span class="value">${now}</span>
                </div>
              </div>
              
              <p style="margin-top: 20px; color: #666; font-size: 14px;">
                Agora você pode salvar as configurações e o sistema estará pronto para enviar emails 
                de recuperação de senha, notificações e alertas.
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    await client.close();

    console.log("Email de teste enviado com sucesso!");

    return new Response(
      JSON.stringify({ success: true, message: "Email de teste enviado com sucesso" }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Erro no teste SMTP:", error);
    
    let errorMessage = error.message;
    
    // Provide more helpful error messages
    if (error.message.includes("auth") || error.message.includes("535") || error.message.includes("Authentication")) {
      errorMessage = "Falha na autenticação. Verifique usuário e senha. Para Gmail, use uma 'Senha de App'.";
    } else if (error.message.includes("connect") || error.message.includes("hostname") || error.message.includes("lookup")) {
      errorMessage = "Não foi possível conectar ao servidor. Verifique o endereço do host.";
    } else if (error.message.includes("TLS") || error.message.includes("SSL") || error.message.includes("BadResource") || error.message.includes("startTls")) {
      errorMessage = "Erro de conexão segura. Para porta 587, desative 'Conexão Segura (TLS)'. Para porta 465, ative-a.";
    } else if (error.message.includes("timeout") || error.message.includes("ETIMEDOUT")) {
      errorMessage = "Tempo limite excedido. Verifique se a porta está correta e acessível.";
    } else if (error.message.includes("invalid cmd")) {
      errorMessage = "Erro de protocolo SMTP. Tente alterar a configuração de TLS/SSL.";
    }
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});