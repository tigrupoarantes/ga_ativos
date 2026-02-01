import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { History, Filter, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/external-client";
import { Skeleton } from "@/components/ui/skeleton";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function Historico() {
  const { data: activities = [], isLoading } = useQuery({
    queryKey: ["activity-history"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activity_history")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;
      return data;
    },
  });

  const getActionColor = (action: string) => {
    switch (action) {
      case "create":
        return "text-status-success bg-status-success/10";
      case "update":
        return "text-status-info bg-status-info/10";
      case "delete":
        return "text-status-error bg-status-error/10";
      default:
        return "text-muted-foreground bg-muted";
    }
  };

  const getActionLabel = (action: string) => {
    switch (action) {
      case "create":
        return "Criou";
      case "update":
        return "Atualizou";
      case "delete":
        return "Excluiu";
      default:
        return action;
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <PageHeader
          title="Histórico"
          description="Visualize todas as atividades do sistema"
          icon={History}
        />

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar atividades..."
                className="pl-10 w-[300px]"
              />
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : activities.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="p-4 rounded-full bg-muted mb-4">
                  <History className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium mb-2">Nenhuma atividade registrada</h3>
                <p className="text-muted-foreground max-w-sm">
                  As atividades do sistema aparecerão aqui quando forem realizadas.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {activities.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-start gap-4 p-4 rounded-lg border"
                  >
                    <div className={`px-2 py-1 rounded text-xs font-medium ${getActionColor(activity.action)}`}>
                      {getActionLabel(activity.action)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium">{activity.description}</p>
                      <p className="text-sm text-muted-foreground">
                        {activity.entity_type} • {activity.user_email || "Sistema"}
                      </p>
                    </div>
                    <div className="text-sm text-muted-foreground whitespace-nowrap">
                      {activity.created_at && format(parseISO(activity.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
