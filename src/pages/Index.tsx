import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useDashboardStats } from "@/hooks/useDashboardStats";
import {
  Car,
  Package,
  Users,
  FileText,
  Wrench,
  AlertTriangle,
  Clock,
  TrendingUp,
  ChevronRight
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { format } from "date-fns";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";

const COLORS = ["hsl(var(--primary))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"];

export default function Index() {
  const { stats, alerts, isLoading } = useDashboardStats();
  const { isMotorista, loading } = useAuth();
  const navigate = useNavigate();

  // Motoristas são redirecionados para a tela mobile de registro de KM
  useEffect(() => {
    if (!loading && isMotorista) {
      navigate("/motorista", { replace: true });
    }
  }, [isMotorista, loading, navigate]);

  // Stats cards usando dados agregados
  const statsCards = [
    { title: "Veículos", value: stats.total_veiculos, icon: Car, href: "/veiculos", color: "text-blue-500" },
    { title: "Ativos", value: stats.total_ativos, icon: Package, href: "/ativos", color: "text-green-500" },
    { title: "Funcionários", value: stats.total_funcionarios, icon: Users, href: "/funcionarios", color: "text-purple-500" },
    { title: "Contratos", value: stats.total_contratos, icon: FileText, href: "/contratos", color: "text-orange-500" },
  ];

  // Ordens de serviço por status
  const ordensData = [
    { name: "Abertas", value: stats.ordens_aberta },
    { name: "Em Andamento", value: stats.ordens_em_andamento },
    { name: "Fechadas", value: stats.ordens_fechada },
  ];

  // Veículos por status
  const veiculosData = [
    { status: "Disponível", quantidade: stats.veiculos_disponivel },
    { status: "Em uso", quantidade: stats.veiculos_em_uso },
    { status: "Manutenção", quantidade: stats.veiculos_manutencao },
    { status: "Inativo", quantidade: stats.veiculos_inativo },
  ];

  // Montar lista de alertas
  const alertasList: Array<{ tipo: string; msg: string; link: string }> = [];

  // CNHs vencidas
  if (alerts.cnhs_vencidas) {
    alerts.cnhs_vencidas.forEach((f) => {
      alertasList.push({ tipo: "danger", msg: `CNH vencida: ${f.nome}`, link: "/funcionarios" });
    });
  }

  // CNHs vencendo
  if (alerts.cnhs_vencendo) {
    alerts.cnhs_vencendo.forEach((f) => {
      alertasList.push({
        tipo: "warning",
        msg: `CNH vencendo: ${f.nome} (${f.cnh_validade ? format(new Date(f.cnh_validade), "dd/MM/yyyy") : ""})`,
        link: "/funcionarios",
      });
    });
  }

  // Contratos vencendo
  if (alerts.contratos_vencendo) {
    alerts.contratos_vencendo.forEach((c) => {
      alertasList.push({
        tipo: "warning",
        msg: `Contrato vencendo: ${c.numero} (${c.data_fim ? format(new Date(c.data_fim), "dd/MM/yyyy") : ""})`,
        link: "/contratos",
      });
    });
  }

  // Preventivas vencidas
  if (alerts.preventivas_vencidas) {
    alerts.preventivas_vencidas.forEach((p) => {
      alertasList.push({
        tipo: "danger",
        msg: `Preventiva vencida: ${p.tipo_manutencao} - ${p.placa || ""}`,
        link: "/oficina/preventivas",
      });
    });
  }

  // Preventivas próximas
  if (alerts.preventivas_proximas) {
    alerts.preventivas_proximas.forEach((p) => {
      alertasList.push({
        tipo: "warning",
        msg: `Preventiva próxima: ${p.tipo_manutencao} - ${p.placa || ""}`,
        link: "/oficina/preventivas",
      });
    });
  }

  // Peças com estoque baixo
  if (alerts.pecas_estoque_baixo) {
    alerts.pecas_estoque_baixo.forEach((p) => {
      alertasList.push({
        tipo: "warning",
        msg: `Estoque baixo: ${p.nome} (${p.quantidade_estoque} ${p.unidade || ""})`,
        link: "/oficina/pecas",
      });
    });
  }

  const totalOrdens = stats.ordens_aberta + stats.ordens_em_andamento + stats.ordens_fechada;
  const totalVeiculos = stats.total_veiculos;

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Visão geral do sistema de gestão</p>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {statsCards.map((stat) => (
            <Link key={stat.title} to={stat.href}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <Skeleton className="h-8 w-16" />
                  ) : (
                    <div className="text-2xl font-bold">{stat.value}</div>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Ordens de Serviço */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Wrench className="h-5 w-5" />
                  Ordens de Serviço
                </CardTitle>
                <CardDescription>Distribuição por status</CardDescription>
              </div>
              <Link to="/oficina">
                <Button variant="ghost" size="sm">
                  Ver todas <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center h-[200px]">
                  <Skeleton className="h-32 w-32 rounded-full" />
                </div>
              ) : totalOrdens > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={ordensData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {ordensData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex flex-col items-center justify-center h-[200px] text-muted-foreground">
                  <Wrench className="h-8 w-8 mb-2" />
                  <p>Nenhuma ordem de serviço</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Veículos por Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Car className="h-5 w-5" />
                Veículos por Status
              </CardTitle>
              <CardDescription>Distribuição da frota</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center h-[200px]">
                  <Skeleton className="h-40 w-full" />
                </div>
              ) : totalVeiculos > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={veiculosData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="status" fontSize={12} />
                    <YAxis fontSize={12} />
                    <Tooltip />
                    <Bar dataKey="quantidade" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex flex-col items-center justify-center h-[200px] text-muted-foreground">
                  <Car className="h-8 w-8 mb-2" />
                  <p>Nenhum veículo cadastrado</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Alertas */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Alertas e Vencimentos
            </CardTitle>
            <CardDescription>Itens que requerem atenção</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : alertasList.length > 0 ? (
              <div className="space-y-2">
                {alertasList.slice(0, 10).map((alerta, index) => (
                  <Link key={index} to={alerta.link}>
                    <div className={`flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors ${
                      alerta.tipo === "danger" ? "bg-destructive/10" : "bg-yellow-500/10"
                    }`}>
                      {alerta.tipo === "danger" ? (
                        <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
                      ) : (
                        <Clock className="h-4 w-4 text-yellow-500 shrink-0" />
                      )}
                      <span className="text-sm">{alerta.msg}</span>
                      <ChevronRight className="h-4 w-4 ml-auto text-muted-foreground" />
                    </div>
                  </Link>
                ))}
                {alertasList.length > 10 && (
                  <p className="text-sm text-muted-foreground text-center pt-2">
                    E mais {alertasList.length - 10} alertas...
                  </p>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <TrendingUp className="h-8 w-8 mb-2 text-green-500" />
                <p>Nenhum alerta no momento</p>
                <p className="text-sm">Tudo está em dia!</p>
              </div>
            )}
          </CardContent>
        </Card>

      </div>
    </AppLayout>
  );
}
