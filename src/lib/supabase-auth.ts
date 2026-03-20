import { supabase } from "@/integrations/supabase/external-client";

export async function getSupabaseAccessToken(): Promise<string | null> {
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    console.error("Error getting Supabase session:", error);
    return null;
  }

  return data.session?.access_token ?? null;
}
