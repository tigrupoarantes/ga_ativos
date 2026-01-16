import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useVeiculos } from "@/hooks/useVeiculos";
import { useAtivos } from "@/hooks/useAtivos";
import { useFuncionarios } from "@/hooks/useFuncionarios";
import { useContratos } from "@/hooks/useContratos";
import { useOrdensServico } from "@/hooks/useOrdensServico";
import { usePreventivas } from "@/hooks/usePreventivas";
import { usePecas } from "@/hooks/usePecas";
import { 
  Car, 
  Package, 
  Users, 
  FileText, 
  Wrench, 
  AlertTriangle, 
  Clock,
  TrendingUp,
  Calendar,
  ChevronRight
} from "lucide-react";
import { Link } from "react-router-dom";
import { format, differenceInDays, isPast } from "date-fns";
import { ptBR } from "date-fns/locale";
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

const COLORS = ["hsl(var(--primary))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"];

export default function Index() {
  const { veiculos } = useVeiculos();
  const { ativos } = useAtivos();
  const { funcionarios } = useFuncionarios();
  const { contratos } = useContratos();
  const { ordensServico } = useOrdensServico();
  const { preventivasVencidas, preventivasProximas } = usePreventivas();
  const { pecasEstoqueBaixo } = usePecas();

  // Stats
  const stats = [
    { title: "Veículos", value: veiculos.length, icon: Car, href: "/veiculos", color: "text-blue-500" },
    { title: "Ativos", value: ativos.length, icon: Package, href: "/ativos", color: "text-green-500" },
    { title: "Funcionários", value: funcionarios.length, icon: Users, href: "/funcionarios", color: "text-purple-500" },
    { title: "Contratos", value: contratos.length, icon: FileText, href: "/contratos", color: "text-orange-500" },
  ];

  // Ordens de serviço por status
  const ordensAbertas = ordensServico.filter(o => o.status === "aberta").length;
  const ordensEmAndamento = ordensServico.filter(o => o.status === "em_andamento").length;
  const ordensFechadas = ordensServico.filter(o => o.status === "fechada").length;

  const ordensData = [
    { name: "Abertas", value: ordensAbertas },
    { name: "Em Andamento", value: ordensEmAndamento },
    { name: "Fechadas", value: ordensFechadas },
  ];

  // Veículos por status
  const veiculosData = [
    { status: "Disponível", quantidade: veiculos.filter(v => v.status === "disponivel").length },
    { status: "Em uso", quantidade: veiculos.filter(v => v.status === "em_uso").length },
    { status: "Manutenção", quantidade: veiculos.filter(v => v.status === "manutencao").length },
    { status: "Inativo", quantidade: veiculos.filter(v => v.status === "inativo").length },
  ];

  // CNHs vencendo
  const condutores = funcionarios.filter(f => f.is_condutor && f.cnh_validade);
  const cnhsVencendo = condutores.filter(f => {
    if (!f.cnh_validade) return false;
    const dias = differenceInDays(new Date(f.cnh_validade), new Date());
    return dias <= 30 && dias >= 0;
  });
  const cnhsVencidas = condutores.filter(f => {
    if (!f.cnh_validade) return false;
    return isPast(new Date(f.cnh_validade));
  });

  // Contratos vencendo
  const contratosVencendo = contratos.filter(c => {
    if (!c.data_fim) return false;
    const dias = differenceInDays(new Date(c.data_fim), new Date());
    return dias <= 30 && dias >= 0;
  });

  // Alertas
  const alertas = [
    ...cnhsVencidas.map(f => ({ tipo: "danger", msg: `CNH vencida: ${f.nome}`, link: "/funcionarios" })),
    ...cnhsVencendo.map(f => ({ tipo: "warning", msg: `CNH vencendo: ${f.nome} (${format(new Date(f.cnh_validade!), "dd/MM/yyyy")})`, link: "/funcionarios" })),
    ...contratosVencendo.map(c => ({ tipo: "warning", msg: `Contrato vencendo: ${c.numero} (${format(new Date(c.data_fim!), "dd/MM/yyyy")})`, link: "/contratos" })),
    ...preventivasVencidas.map(p => ({ tipo: "danger", msg: `Preventiva vencida: ${p.tipo_manutencao} - ${p.veiculos?.placa || ""}`, link: "/oficina/preventivas" })),
    ...preventivasProximas.map(p => ({ tipo: "warning", msg: `Preventiva próxima: ${p.tipo_manutencao} - ${p.veiculos?.placa || ""}`, link: "/oficina/preventivas" })),
    ...pecasEstoqueBaixo.map(p => ({ tipo: "warning", msg: `Estoque baixo: ${p.nome} (${p.quantidade_estoque} ${p.unidade})`, link: "/oficina/pecas" })),
  ];

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
          {stats.map((stat) => (
            <Link key={stat.title} to={stat.href}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stat.value}</div>
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
              {ordensServico.length > 0 ? (
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
              {veiculos.length > 0 ? (
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
            {alertas.length > 0 ? (
              <div className="space-y-2">
                {alertas.slice(0, 10).map((alerta, index) => (
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
                {alertas.length > 10 && (
                  <p className="text-sm text-muted-foreground text-center pt-2">
                    E mais {alertas.length - 10} alertas...
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

        {/* Quick Actions */}
        <div className="grid gap-4 md:grid-cols-4">
          <Link to="/veiculos">
            <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
              <CardContent className="flex items-center gap-4 p-6">
                <Car className="h-8 w-8 text-blue-500" />
                <div>
                  <h3 className="font-semibold">Gerenciar Veículos</h3>
                  <p className="text-sm text-muted-foreground">Cadastrar, editar, visualizar</p>
                </div>
              </CardContent>
            </Card>
          </Link>
          <Link to="/oficina">
            <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
              <CardContent className="flex items-center gap-4 p-6">
                <Wrench className="h-8 w-8 text-orange-500" />
                <div>
                  <h3 className="font-semibold">Oficina</h3>
                  <p className="text-sm text-muted-foreground">Ordens e manutenções</p>
                </div>
              </CardContent>
            </Card>
          </Link>
          <Link to="/ativos">
            <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
              <CardContent className="flex items-center gap-4 p-6">
                <Package className="h-8 w-8 text-green-500" />
                <div>
                  <h3 className="font-semibold">Gerenciar Ativos</h3>
                  <p className="text-sm text-muted-foreground">Equipamentos e dispositivos</p>
                </div>
              </CardContent>
            </Card>
          </Link>
          <Link to="/contratos">
            <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
              <CardContent className="flex items-center gap-4 p-6">
                <Calendar className="h-8 w-8 text-purple-500" />
                <div>
                  <h3 className="font-semibold">Contratos</h3>
                  <p className="text-sm text-muted-foreground">Gestão de contratos</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>
    </AppLayout>
  );
}
