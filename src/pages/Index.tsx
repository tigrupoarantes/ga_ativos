import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDashboardStats } from "@/hooks/useDashboardStats";
import { useDashboardFinancial } from "@/hooks/useDashboardFinancial";
import {
  Car,
  Package,
  Users,
  FileText,
  AlertTriangle,
  TrendingDown,
  DollarSign,
  ChevronRight,
  Wrench,
  Phone,
  ShieldAlert,
  BarChart3,
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
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { isMobileDevice } from "@/hooks/use-mobile";

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

const STATUS_COLORS: Record<string, string> = {
  "Em uso": "#3b82f6",
  "Disponível": "#22c55e",
  "Manutenção": "#f59e0b",
  "Baixado": "#ef4444",
  "Inativo": "#6b7280",
};

function fmt(value: number | null | undefined) {
  if (value == null) return "R$ 0";
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

function fmtFull(value: number | null | undefined) {
  if (value == null) return "R$ 0,00";
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function diffDays(dateStr: string): number {
  const target = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

// Card financeiro reutilizável
function FinCard({ label, value, sub, color = "text-foreground", icon: Icon }: {
  label: string; value: string; sub?: string; color?: string; icon?: any;
}) {
  return (
    <Card className="shadow-none">
      <CardContent className="pt-4 pb-3 px-4">
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">{label}</p>
          {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
        </div>
        <p className={`text-xl font-bold ${color}`}>{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </CardContent>
    </Card>
  );
}

export default function Index() {
  const { stats: legacyStats, alerts, isLoading: legacyLoading } = useDashboardStats();
  const { stats, isLoading } = useDashboardFinancial();
  const { isMotorista, loading, hasRole } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && isMotorista && !hasRole("assistente") && isMobileDevice()) {
      navigate("/motorista", { replace: true });
    }
  }, [isMotorista, loading, hasRole, navigate]);

  // Alertas (mantém lógica existente)
  const alertasList: Array<{ tipo: string; msg: string; link: string }> = [];
  if (alerts.cnhs_vencidas) {
    alerts.cnhs_vencidas.forEach((f) => {
      const dias = f.cnh_validade ? Math.abs(diffDays(f.cnh_validade)) : null;
      alertasList.push({ tipo: "danger", msg: `CNH vencida: ${f.nome} (há ${dias} dias)`, link: "/funcionarios" });
    });
  }
  if (alerts.cnhs_vencendo) {
    alerts.cnhs_vencendo.forEach((f) => {
      const dias = f.cnh_validade ? diffDays(f.cnh_validade) : null;
      alertasList.push({ tipo: "warning", msg: `CNH vencendo: ${f.nome} (em ${dias} dias)`, link: "/funcionarios" });
    });
  }
  if (alerts.contratos_vencendo) {
    alerts.contratos_vencendo.forEach((c) => {
      const dias = c.data_fim ? diffDays(c.data_fim) : null;
      alertasList.push({ tipo: "warning", msg: `Contrato vencendo: ${c.numero} (em ${dias} dias)`, link: "/contratos" });
    });
  }
  if (alerts.preventivas_vencidas) {
    alerts.preventivas_vencidas.forEach((p) => {
      const dias = p.proxima_realizacao ? Math.abs(diffDays(p.proxima_realizacao)) : null;
      alertasList.push({ tipo: "danger", msg: `Preventiva vencida: ${p.tipo_manutencao} - ${p.placa} (há ${dias} dias)`, link: "/oficina/preventivas" });
    });
  }
  if (alerts.preventivas_proximas) {
    alerts.preventivas_proximas.forEach((p) => {
      const dias = p.proxima_realizacao ? diffDays(p.proxima_realizacao) : null;
      alertasList.push({ tipo: "warning", msg: `Preventiva próxima: ${p.tipo_manutencao} - ${p.placa} (em ${dias} dias)`, link: "/oficina/preventivas" });
    });
  }
  if (alerts.pecas_estoque_baixo) {
    alerts.pecas_estoque_baixo.forEach((p) => {
      alertasList.push({ tipo: "warning", msg: `Estoque baixo: ${p.nome} (${p.quantidade_estoque} ${p.unidade || ""})`, link: "/oficina/pecas" });
    });
  }

  const totalAlertas = (stats?.cnhs_vencidas || 0) + (stats?.contratos_vencendo || 0) +
    (stats?.preventivas_vencidas || 0) + (stats?.pecas_estoque_baixo || 0) + (stats?.ordens_abertas || 0);

  // Dados para gráficos
  const ativosStatusData = [
    { name: "Em uso", value: stats?.ativos_em_uso || 0 },
    { name: "Disponível", value: stats?.ativos_disponiveis || 0 },
    { name: "Manutenção", value: stats?.ativos_manutencao || 0 },
    { name: "Baixado", value: stats?.ativos_baixados || 0 },
  ].filter((d) => d.value > 0);

  const veiculosStatusData = [
    { name: "Em uso", value: stats?.veiculos_em_uso || 0 },
    { name: "Disponível", value: stats?.veiculos_disponiveis || 0 },
    { name: "Manutenção", value: stats?.veiculos_manutencao || 0 },
    { name: "Baixado", value: stats?.veiculos_baixados || 0 },
  ].filter((d) => d.value > 0);

  const ativosPorTipoData = (stats?.ativos_por_tipo || []).map((t: any) => ({
    tipo: t.tipo || "Outros",
    quantidade: t.quantidade,
    valor: t.valor_aquisicao,
  }));

  const veiculosPorTipoData = (stats?.veiculos_por_tipo || []).map((t: any) => ({
    tipo: t.tipo || "Outros",
    quantidade: t.quantidade,
    valor: t.valor_aquisicao,
  }));

  const loading_ = isLoading || legacyLoading;

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground">Visão executiva do patrimônio corporativo</p>
          </div>
          {totalAlertas > 0 && (
            <Badge variant="destructive" className="text-sm px-3 py-1">
              <AlertTriangle className="h-4 w-4 mr-1" />
              {totalAlertas} {totalAlertas === 1 ? "alerta" : "alertas"}
            </Badge>
          )}
        </div>

        {/* Resumo Geral — Cards de visão CEO */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <Link to="/ativos">
            <Card className="shadow-none hover:bg-muted/50 transition-colors cursor-pointer">
              <CardContent className="pt-4 pb-3 px-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">Patrimônio (Ativos)</p>
                  <Package className="h-4 w-4 text-green-500" />
                </div>
                <p className="text-2xl font-bold">{loading_ ? <Skeleton className="h-8 w-16" /> : stats?.ativos_total || 0}</p>
                <p className="text-xs text-muted-foreground">{fmt(stats?.ativos_valor_aquisicao)} investidos</p>
              </CardContent>
            </Card>
          </Link>
          <Link to="/veiculos">
            <Card className="shadow-none hover:bg-muted/50 transition-colors cursor-pointer">
              <CardContent className="pt-4 pb-3 px-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">Frota (Veículos)</p>
                  <Car className="h-4 w-4 text-blue-500" />
                </div>
                <p className="text-2xl font-bold">{loading_ ? <Skeleton className="h-8 w-16" /> : stats?.veiculos_total || 0}</p>
                <p className="text-xs text-muted-foreground">{fmt(stats?.veiculos_valor_aquisicao)} investidos</p>
              </CardContent>
            </Card>
          </Link>
          <Link to="/funcionarios">
            <Card className="shadow-none hover:bg-muted/50 transition-colors cursor-pointer">
              <CardContent className="pt-4 pb-3 px-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">Funcionários</p>
                  <Users className="h-4 w-4 text-purple-500" />
                </div>
                <p className="text-2xl font-bold">{loading_ ? <Skeleton className="h-8 w-16" /> : stats?.total_funcionarios || 0}</p>
                <p className="text-xs text-muted-foreground">{stats?.cnhs_vencidas || 0} CNHs vencidas</p>
              </CardContent>
            </Card>
          </Link>
          <Link to="/contratos">
            <Card className="shadow-none hover:bg-muted/50 transition-colors cursor-pointer">
              <CardContent className="pt-4 pb-3 px-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">Contratos</p>
                  <FileText className="h-4 w-4 text-orange-500" />
                </div>
                <p className="text-2xl font-bold">{loading_ ? <Skeleton className="h-8 w-16" /> : stats?.total_contratos || 0}</p>
                <p className="text-xs text-muted-foreground">{stats?.contratos_vencendo || 0} vencendo</p>
              </CardContent>
            </Card>
          </Link>
          <Link to="/oficina">
            <Card className="shadow-none hover:bg-muted/50 transition-colors cursor-pointer">
              <CardContent className="pt-4 pb-3 px-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">Oficina</p>
                  <Wrench className="h-4 w-4 text-amber-500" />
                </div>
                <p className="text-2xl font-bold">{loading_ ? <Skeleton className="h-8 w-16" /> : stats?.ordens_abertas || 0}</p>
                <p className="text-xs text-muted-foreground">OS abertas</p>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Tabs: Ativos | Frota | Alertas */}
        <Tabs defaultValue="ativos">
          <TabsList>
            <TabsTrigger value="ativos">
              <Package className="h-4 w-4 mr-2" />
              Patrimônio
            </TabsTrigger>
            <TabsTrigger value="frota">
              <Car className="h-4 w-4 mr-2" />
              Frota
            </TabsTrigger>
            <TabsTrigger value="alertas">
              <AlertTriangle className="h-4 w-4 mr-2" />
              Alertas
              {totalAlertas > 0 && (
                <Badge variant="destructive" className="ml-2 text-xs px-1.5">{totalAlertas}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* ========== TAB PATRIMÔNIO ========== */}
          <TabsContent value="ativos" className="space-y-4 mt-4">
            {/* Cards financeiros de ativos */}
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
              <FinCard
                label="Valor de Aquisição"
                value={fmt(stats?.ativos_valor_aquisicao)}
                sub={`${stats?.ativos_total || 0} ativos cadastrados`}
                icon={DollarSign}
              />
              <FinCard
                label="Valor Contábil Líquido"
                value={fmt(stats?.ativos_valor_contabil)}
                color="text-primary"
                sub="Após depreciação"
                icon={BarChart3}
              />
              <FinCard
                label="Depreciação Acumulada"
                value={fmt(stats?.ativos_depreciacao_acumulada)}
                color="text-red-600"
                sub={`${fmtFull(stats?.ativos_depreciacao_mensal)}/mês`}
                icon={TrendingDown}
              />
              <FinCard
                label="Atenção"
                value={`${stats?.ativos_sem_valor || 0} sem valor`}
                sub={`${stats?.ativos_totalmente_depreciados || 0} totalmente depreciados`}
                color="text-amber-600"
                icon={ShieldAlert}
              />
            </div>

            {/* Gráficos lado a lado */}
            <div className="grid gap-4 md:grid-cols-2">
              {/* Distribuição por status */}
              <Card className="shadow-none">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Ativos por Status</CardTitle>
                </CardHeader>
                <CardContent>
                  {ativosStatusData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie
                          data={ativosStatusData}
                          innerRadius={50}
                          outerRadius={80}
                          paddingAngle={4}
                          dataKey="value"
                          label={({ name, value }) => `${name}: ${value}`}
                        >
                          {ativosStatusData.map((entry, index) => (
                            <Cell key={index} fill={STATUS_COLORS[entry.name] || COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <RechartsTooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">
                      Nenhum ativo cadastrado
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Valor por tipo */}
              <Card className="shadow-none">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Valor Investido por Tipo</CardTitle>
                </CardHeader>
                <CardContent>
                  {ativosPorTipoData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={ativosPorTipoData}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="tipo" fontSize={11} />
                        <YAxis fontSize={11} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                        <RechartsTooltip formatter={(v: number) => fmtFull(v)} />
                        <Bar dataKey="valor" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">
                      Sem dados de valor por tipo
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ========== TAB FROTA ========== */}
          <TabsContent value="frota" className="space-y-4 mt-4">
            {/* Cards financeiros de frota */}
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
              <FinCard
                label="Valor de Aquisição"
                value={fmt(stats?.veiculos_valor_aquisicao)}
                sub={`${stats?.veiculos_total || 0} veículos`}
                icon={DollarSign}
              />
              <FinCard
                label="Valor FIPE (Mercado)"
                value={fmt(stats?.veiculos_valor_fipe)}
                color="text-blue-600"
                sub="Valor de mercado atual"
                icon={Car}
              />
              <FinCard
                label="Valor Contábil Líquido"
                value={fmt(stats?.veiculos_valor_contabil)}
                color="text-primary"
                sub="Após depreciação"
                icon={BarChart3}
              />
              <FinCard
                label="Depreciação Acumulada"
                value={fmt(stats?.veiculos_depreciacao_acumulada)}
                color="text-red-600"
                sub={`${fmtFull(stats?.veiculos_depreciacao_mensal)}/mês`}
                icon={TrendingDown}
              />
            </div>

            {/* Gráficos lado a lado */}
            <div className="grid gap-4 md:grid-cols-2">
              {/* Distribuição por status */}
              <Card className="shadow-none">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Veículos por Status</CardTitle>
                </CardHeader>
                <CardContent>
                  {veiculosStatusData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie
                          data={veiculosStatusData}
                          innerRadius={50}
                          outerRadius={80}
                          paddingAngle={4}
                          dataKey="value"
                          label={({ name, value }) => `${name}: ${value}`}
                        >
                          {veiculosStatusData.map((entry, index) => (
                            <Cell key={index} fill={STATUS_COLORS[entry.name] || COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <RechartsTooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">
                      Nenhum veículo cadastrado
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Valor por tipo de veículo */}
              <Card className="shadow-none">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Valor Investido por Tipo</CardTitle>
                </CardHeader>
                <CardContent>
                  {veiculosPorTipoData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={veiculosPorTipoData}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="tipo" fontSize={11} />
                        <YAxis fontSize={11} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                        <RechartsTooltip formatter={(v: number) => fmtFull(v)} />
                        <Bar dataKey="valor" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">
                      Sem dados de valor por tipo
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Comparativo FIPE vs Contábil */}
            {stats?.veiculos_valor_fipe > 0 && stats?.veiculos_valor_contabil > 0 && (
              <Card className="shadow-none">
                <CardContent className="pt-4 pb-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Comparativo: Valor FIPE vs. Valor Contábil da Frota</span>
                    <Badge variant={stats.veiculos_valor_fipe > stats.veiculos_valor_contabil ? "default" : "destructive"}>
                      {stats.veiculos_valor_fipe > stats.veiculos_valor_contabil
                        ? `FIPE ${fmt(stats.veiculos_valor_fipe - stats.veiculos_valor_contabil)} acima do contábil`
                        : `Contábil ${fmt(stats.veiculos_valor_contabil - stats.veiculos_valor_fipe)} acima do FIPE`}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ========== TAB ALERTAS ========== */}
          <TabsContent value="alertas" className="mt-4">
            <Card className="shadow-none">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Alertas e Vencimentos
                </CardTitle>
              </CardHeader>
              <CardContent>
                {alertasList.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <ShieldAlert className="h-10 w-10 mx-auto mb-2 opacity-40" />
                    <p>Nenhum alerta no momento</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[400px] overflow-y-auto">
                    {alertasList.map((alerta, i) => (
                      <Link
                        key={i}
                        to={alerta.link}
                        className={`flex items-center justify-between p-3 rounded-lg text-sm transition-colors ${
                          alerta.tipo === "danger"
                            ? "bg-red-500/10 hover:bg-red-500/20 text-red-700 dark:text-red-400"
                            : "bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-400"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 shrink-0" />
                          <span>{alerta.msg}</span>
                        </div>
                        <ChevronRight className="h-4 w-4 shrink-0 opacity-50" />
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
