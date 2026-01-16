import { OficinaLayout } from "@/components/OficinaLayout";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Wrench, ClipboardList, Package, Calendar, Plus, AlertCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { useDashboardStats } from "@/hooks/useDashboardStats";
import { useOrdensServico } from "@/hooks/useOrdensServico";
import { usePreventivas } from "@/hooks/usePreventivas";

export default function Oficina() {
  const { stats, isLoading: statsLoading } = useDashboardStats();
  const { ordensServico, isLoading: ordensLoading } = useOrdensServico();
  const { preventivasProximas, isLoading: prevLoading } = usePreventivas();

  const isLoading = statsLoading || ordensLoading || prevLoading;

  const statsList = [
    {
      title: "Ordens Abertas",
      value: stats.ordens_aberta + stats.ordens_em_andamento,
      icon: ClipboardList,
      color: "text-status-warning",
      bgColor: "bg-status-warning/10",
      href: "/oficina/ordens",
    },
    {
      title: "Preventivas Pendentes",
      value: stats.preventivas_vencidas + stats.preventivas_proximas,
      icon: Calendar,
      color: "text-status-info",
      bgColor: "bg-status-info/10",
      href: "/oficina/preventivas",
    },
    {
      title: "Peças Estoque Baixo",
      value: stats.pecas_estoque_baixo,
      icon: Package,
      color: "text-status-success",
      bgColor: "bg-status-success/10",
      href: "/oficina/pecas",
    },
  ];

  // Últimas 5 ordens de serviço
  const recentOrdens = ordensServico.slice(0, 5);

  return (
    <OficinaLayout>
      <div className="space-y-6">
        <PageHeader
          title="Oficina"
          description="Gerencie ordens de serviço e manutenções"
          icon={Wrench}
        />

        <div className="grid gap-4 md:grid-cols-3">
          {statsList.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <Link to={stat.href} key={index}>
                <Card className="cursor-pointer hover:bg-accent/50 transition-colors">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                    <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                      <Icon className={`h-4 w-4 ${stat.color}`} />
                    </div>
                  </CardHeader>
                  <CardContent>
                    {isLoading ? (
                      <Skeleton className="h-8 w-12" />
                    ) : (
                      <div className="text-2xl font-bold">{stat.value}</div>
                    )}
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5" />
                Ordens de Serviço Recentes
              </CardTitle>
              <CardDescription>
                Últimas ordens de serviço registradas
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : recentOrdens.length > 0 ? (
                <div className="space-y-2">
                  {recentOrdens.map((ordem) => (
                    <div key={ordem.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <div>
                        <p className="font-medium text-sm">{ordem.numero || ordem.id.slice(0, 8)}</p>
                        <p className="text-xs text-muted-foreground">{ordem.tipo} - {ordem.status}</p>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded ${
                        ordem.status === "aberta" ? "bg-yellow-500/20 text-yellow-700" :
                        ordem.status === "em_andamento" ? "bg-blue-500/20 text-blue-700" :
                        "bg-green-500/20 text-green-700"
                      }`}>
                        {ordem.status}
                      </span>
                    </div>
                  ))}
                  <Link to="/oficina/ordens" className="block pt-2">
                    <Button variant="outline" className="w-full">Ver todas</Button>
                  </Link>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <div className="p-4 rounded-full bg-muted mb-4">
                    <AlertCircle className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-medium mb-2">Nenhuma ordem de serviço</h3>
                  <p className="text-muted-foreground mb-4">
                    Crie sua primeira ordem de serviço
                  </p>
                  <Link to="/oficina/ordens">
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Nova Ordem
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Manutenções Preventivas
              </CardTitle>
              <CardDescription>
                Próximas manutenções agendadas
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : preventivasProximas.length > 0 ? (
                <div className="space-y-2">
                  {preventivasProximas.slice(0, 5).map((prev) => (
                    <div key={prev.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <div>
                        <p className="font-medium text-sm">{prev.tipo_manutencao}</p>
                        <p className="text-xs text-muted-foreground">{(prev as any).veiculos?.placa || "Sem veículo"}</p>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {prev.proxima_realizacao ? new Date(prev.proxima_realizacao).toLocaleDateString("pt-BR") : "-"}
                      </span>
                    </div>
                  ))}
                  <Link to="/oficina/preventivas" className="block pt-2">
                    <Button variant="outline" className="w-full">Ver todas</Button>
                  </Link>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <div className="p-4 rounded-full bg-muted mb-4">
                    <Calendar className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-medium mb-2">Nenhuma preventiva agendada</h3>
                  <p className="text-muted-foreground mb-4">
                    Configure manutenções preventivas
                  </p>
                  <Link to="/oficina/preventivas">
                    <Button variant="outline">
                      <Plus className="h-4 w-4 mr-2" />
                      Agendar Preventiva
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </OficinaLayout>
  );
}
