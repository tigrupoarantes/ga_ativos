import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/external-client";
import { useAuth } from "@/contexts/AuthContext";

export function useCurrentUserPermissions() {
  const { userRole } = useAuth();

  const { data: permissions, isLoading } = useQuery({
    queryKey: ["module-permissions", userRole],
    queryFn: async () => {
      if (!userRole) return [];
      
      const { data, error } = await supabase
        .from("module_permissions")
        .select("*")
        .eq("role", userRole);

      if (error) throw error;
      return data || [];
    },
    enabled: !!userRole,
  });

  const allowedModules = permissions?.filter(p => p.can_view).map(p => p.module) || [];
  const isAdmin = userRole === 'admin';

  return {
    permissions,
    allowedModules,
    isAdmin,
    isLoading,
  };
}
