import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Construction, Fuel, DollarSign } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  useCustosDashboard,
  formatCurrencyFrota,
  formatPeriodoFrota,
  type DespesaComLote,
} from "@/hooks/useCustosVeiculos";

type Dimensao = "placa" | "condutor" | "empresa";

interface MonthlyCost {
  mes: string;
  pedagio: number;
  combustivel: number;
  sortKey: string;
}

const DIMENSAO_LABEL: Record<Dimensao, string> = {
  placa: "Veículo",
  condutor: "Condutor",
  empresa: "Empresa",
};

export function CustosDashboard() {
  const { data, isLoading } = useCustosDashboard();
  const [dimensao, setDimensao] = useState<Dimensao>("placa");
  const [filtroValor, setFiltroValor] = useState("all");

  const handleDimensaoChange = (dim: Dimensao) => {
    setDimensao(dim);
    setFiltroValor("all");
  };

  const opcoes = useMemo(() => {
    if (!data) return [];
    if (dimensao === "placa") return data.placas;
    if (dimensao === "condutor") return data.condutores;
    return data.empresas;
  }, [data, dimensao]);

  const getValor = (d: DespesaComLote): number => {
    if (dimensao === "empresa" && filtroValor !== "all") {
      if (d.rateio_1_empresa === filtroValor && d.rateio_1_valor != null) return d.rateio_1_valor;
      if (d.rateio_2_empresa === filtroValor && d.rateio_2_valor != null) return d.rateio_2_valor;
    }
    return d.valor;
  };

  const { monthlyData, totalPedagio, totalCombustivel, totalGeral } = useMemo(() => {
    if (!data) return { monthlyData: [], totalPedagio: 0, totalCombustivel: 0, totalGeral: 0 };

    const filtered = data.despesas.filter((d) => {
      if (filtroValor === "all") return true;
      if (dimensao === "placa") return d.veiculo_placa === filtroValor;
      if (dimensao === "condutor") return d.condutor === filtroValor;
      return d.rateio_1_empresa === filtroValor || d.rateio_2_empresa === filtroValor;
    });

    const byMonth: Record<string, MonthlyCost> = {};
    for (const d of filtered) {
      if (!d.lote) continue;
      const mesLabel = formatPeriodoFrota(d.lote.periodo_referencia);
      const sortKey = d.lote.periodo_referencia.slice(0, 7);
      if (!byMonth[mesLabel]) {
        byMonth[mesLabel] = { mes: mesLabel, pedagio: 0, combustivel: 0, sortKey };
      }
      const valor = getValor(d);
      if (d.lote.tipo === "pedagio") byMonth[mesLabel].pedagio += valor;
      else if (d.lote.tipo === "combustivel") byMonth[mesLabel].combustivel += valor;
    }

    const monthlyData = Object.values(byMonth).sort((a, b) => a.sortKey.localeCompare(b.sortKey));
    const totalPedagio = monthlyData.reduce((s, m) => s + m.pedagio, 0);
    const totalCombustivel = monthlyData.reduce((s, m) => s + m.combustivel, 0);
    const totalGeral = totalPedagio + totalCombustivel;

    return { monthlyData, totalPedagio, totalCombustivel, totalGeral };
  }, [data, dimensao, filtroValor]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-[320px]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pedágios</p>
                <p className="text-xl font-bold">{formatCurrencyFrota(totalPedagio)}</p>
              </div>
              <Construction className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Combustível</p>
                <p className="text-xl font-bold">{formatCurrencyFrota(totalCombustivel)}</p>
              </div>
              <Fuel className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Geral</p>
                <p className="text-xl font-bold">{formatCurrencyFrota(totalGeral)}</p>
              </div>
              <DollarSign className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm text-muted-foreground">Filtrar por:</span>
            <div className="flex gap-1">
              {(["placa", "condutor", "empresa"] as Dimensao[]).map((dim) => (
                <Button
                  key={dim}
                  size="sm"
                  variant={dimensao === dim ? "default" : "outline"}
                  onClick={() => handleDimensaoChange(dim)}
                >
                  {DIMENSAO_LABEL[dim]}
                </Button>
              ))}
            </div>
            <Select value={filtroValor} onValueChange={setFiltroValor}>
              <SelectTrigger className="w-[240px]">
                <SelectValue placeholder={`Todos os ${DIMENSAO_LABEL[dimensao].toLowerCase()}s`} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {opcoes.map((op) => (
                  <SelectItem key={op} value={op}>{op}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Monthly Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Custos Mensais — Pedágio vs Combustível</CardTitle>
        </CardHeader>
        <CardContent>
          {monthlyData.length === 0 ? (
            <div className="flex items-center justify-center h-[280px] text-muted-foreground text-sm">
              Nenhum dado para exibir
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={monthlyData} margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="mes"
                  fontSize={12}
                  tick={{ fill: "hsl(var(--muted-foreground))" }}
                />
                <YAxis
                  fontSize={11}
                  tick={{ fill: "hsl(var(--muted-foreground))" }}
                  tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip formatter={(value: number) => formatCurrencyFrota(value)} />
                <Legend />
                <Bar dataKey="pedagio" name="Pedágio" fill="#f97316" radius={[4, 4, 0, 0]} />
                <Bar dataKey="combustivel" name="Combustível" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
