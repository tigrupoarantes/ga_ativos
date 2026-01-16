import { OficinaLayout } from "@/components/OficinaLayout";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Wrench, ClipboardList, Package, Calendar, Plus, AlertCircle } from "lucide-react";
import { Link } from "react-router-dom";

export default function Oficina() {
  const stats = [
    {
      title: "Ordens Abertas",
      value: 0,
      icon: ClipboardList,
      color: "text-status-warning",
      bgColor: "bg-status-warning/10",
      href: "/oficina/ordens",
    },
    {
      title: "Preventivas Pendentes",
      value: 0,
      icon: Calendar,
      color: "text-status-info",
      bgColor: "bg-status-info/10",
      href: "/oficina/preventivas",
    },
    {
      title: "Peças em Estoque",
      value: 0,
      icon: Package,
      color: "text-status-success",
      bgColor: "bg-status-success/10",
      href: "/oficina/pecas",
    },
  ];

  return (
    <OficinaLayout>
      <div className="space-y-6">
        <PageHeader
          title="Oficina"
          description="Gerencie ordens de serviço e manutenções"
          icon={Wrench}
        />

        <div className="grid gap-4 md:grid-cols-3">
          {stats.map((stat, index) => {
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
                    <div className="text-2xl font-bold">{stat.value}</div>
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
            </CardContent>
          </Card>
        </div>
      </div>
    </OficinaLayout>
  );
}
