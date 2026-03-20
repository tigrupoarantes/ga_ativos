import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export function createServiceSupabaseClient() {
  const supabaseUrl =
    Deno.env.get("EXTERNAL_SUPABASE_URL") || Deno.env.get("SUPABASE_URL");
  const supabaseServiceKey =
    Deno.env.get("EXTERNAL_SUPABASE_SERVICE_KEY") ||
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error("Supabase service credentials are not configured");
  }

  return createClient(supabaseUrl, supabaseServiceKey);
}
