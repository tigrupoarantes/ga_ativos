import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { History, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/external-client";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTablePagination } from "@/components/DataTablePagination";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

const PAGE_SIZE = 25;

export default function Historico() {
  const [search, setSearch] = useState("");
  const [filterAction, setFilterAction] = useState("all");
  const [page, setPage] = useState(1);

  const { data: activities = [], isLoading } = useQuery({
    queryKey: ["activity-history"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activity_history")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);

      if (error) throw error;
      return data;
    },
  });

  const filtered = activities.filter((a) => {
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      a.description?.toLowerCase().includes(q) ||
      a.entity_type?.toLowerCase().includes(q) ||
      a.user_email?.toLowerCase().includes(q);
    const matchAction = filterAction === "all" || a.action === filterAction;
    return matchSearch && matchAction;
  });

  const totalCount = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const getActionColor = (action: string) => {
    switch (action) {
      case "create": return "text-status-success bg-status-success/10";
      case "update": return "text-status-info bg-status-info/10";
      case "delete": return "text-status-error bg-status-error/10";
      default: return "text-muted-foreground bg-muted";
    }
  };

  const getActionLabel = (action: string) => {
    switch (action) {
      case "create": return "Criou";
      case "update": return "Atualizou";
      case "delete": return "Excluiu";
      default: return action;
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
          <CardHeader className="flex flex-row items-center gap-3 space-y-0 pb-4 flex-wrap">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por descrição, tipo ou usuário..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="pl-10 w-[320px]"
              />
            </div>
            <Select value={filterAction} onValueChange={(v) => { setFilterAction(v); setPage(1); }}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Tipo de ação" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as ações</SelectItem>
                <SelectItem value="create">Criou</SelectItem>
                <SelectItem value="update">Atualizou</SelectItem>
                <SelectItem value="delete">Excluiu</SelectItem>
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="p-4 rounded-full bg-muted mb-4">
                  <History className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium mb-2">Nenhuma atividade encontrada</h3>
                <p className="text-muted-foreground max-w-sm">
                  Tente ajustar os filtros ou a busca.
                </p>
              </div>
            ) : (
              <>
                <p className="text-sm text-muted-foreground mb-4">
                  {totalCount} {totalCount === 1 ? "atividade encontrada" : "atividades encontradas"}
                </p>
                <div className="space-y-3 animate-in fade-in-0 duration-200">
                  {paginated.map((activity) => (
                    <div
                      key={activity.id}
                      className="flex items-start gap-4 p-4 rounded-lg border transition-colors hover:bg-muted/40"
                    >
                      <div className={`px-2 py-1 rounded text-xs font-medium shrink-0 ${getActionColor(activity.action)}`}>
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
                {totalCount > PAGE_SIZE && (
                  <div className="mt-4">
                    <DataTablePagination
                      page={page}
                      totalPages={totalPages}
                      totalCount={totalCount}
                      pageSize={PAGE_SIZE}
                      onPageChange={setPage}
                    />
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
