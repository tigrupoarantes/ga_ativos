// External Supabase client for migration to external project
// This client uses credentials from the external Supabase project

import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';
import { EXTERNAL_SUPABASE_CONFIG } from '@/config/supabase.config';

export const supabaseExternal = createClient<Database>(
  EXTERNAL_SUPABASE_CONFIG.url,
  EXTERNAL_SUPABASE_CONFIG.anonKey,
  {
    auth: {
      storage: localStorage,
      persistSession: true,
      autoRefreshToken: true,
    }
  }
);

// Re-export as 'supabase' for easy migration
export const supabase = supabaseExternal;
