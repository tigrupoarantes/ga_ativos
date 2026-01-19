import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ConfirmRequest {
  token: string;
  password: string;
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Iniciando confirmação de reset de senha...");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { token, password }: ConfirmRequest = await req.json();

    if (!token || !password) {
      throw new Error("Token e senha são obrigatórios");
    }

    // Validate password
    if (password.length < 8) {
      throw new Error("A senha deve ter pelo menos 8 caracteres");
    }
    if (!/[A-Z]/.test(password)) {
      throw new Error("A senha deve conter pelo menos uma letra maiúscula");
    }
    if (!/[a-z]/.test(password)) {
      throw new Error("A senha deve conter pelo menos uma letra minúscula");
    }
    if (!/[0-9]/.test(password)) {
      throw new Error("A senha deve conter pelo menos um número");
    }

    console.log("Buscando token no banco...");

    // Find and validate token
    const { data: tokenData, error: tokenError } = await supabase
      .from("password_reset_tokens")
      .select("*")
      .eq("token", token)
      .maybeSingle();

    if (tokenError) {
      console.error("Erro ao buscar token:", tokenError);
      throw new Error("Erro ao processar solicitação");
    }

    if (!tokenData) {
      console.log("Token não encontrado");
      throw new Error("Link inválido ou expirado. Solicite um novo link de recuperação.");
    }

    // Check if token is expired
    if (new Date(tokenData.expires_at) < new Date()) {
      console.log("Token expirado");
      throw new Error("Link expirado. Solicite um novo link de recuperação.");
    }

    // Check if token was already used
    if (tokenData.used_at) {
      console.log("Token já utilizado");
      throw new Error("Este link já foi utilizado. Solicite um novo link de recuperação.");
    }

    console.log(`Token válido. Atualizando senha do usuário: ${tokenData.user_id}`);

    // Update user password using admin API
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      tokenData.user_id,
      { password }
    );

    if (updateError) {
      console.error("Erro ao atualizar senha:", updateError);
      throw new Error("Erro ao atualizar senha. Tente novamente.");
    }

    console.log("Senha atualizada com sucesso. Marcando token como usado...");

    // Mark token as used
    const { error: markError } = await supabase
      .from("password_reset_tokens")
      .update({ used_at: new Date().toISOString() })
      .eq("id", tokenData.id);

    if (markError) {
      console.error("Erro ao marcar token como usado:", markError);
      // Don't throw here, password was already updated successfully
    }

    console.log("Reset de senha concluído com sucesso!");

    return new Response(
      JSON.stringify({ success: true, message: "Senha atualizada com sucesso" }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Erro na confirmação de reset:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
