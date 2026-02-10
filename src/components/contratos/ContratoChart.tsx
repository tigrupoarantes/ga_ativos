import { useMemo } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ContratoMetrica } from "@/hooks/useContratoMetricas";
import { ContratoConsumo } from "@/hooks/useContratoConsumo";

interface ContratoChartProps {
  metricas: ContratoMetrica[];
  consumos: ContratoConsumo[];
}

const COLORS = [
  "hsl(var(--primary))",
  "#f59e0b",
  "#10b981",
  "#ef4444",
  "#8b5cf6",
  "#06b6d4",
];

export function ContratoChart({ metricas, consumos }: ContratoChartProps) {
  const chartData = useMemo(() => {
    // Group consumos by month
    const monthMap = new Map<string, Record<string, number>>();

    consumos.forEach((c) => {
      const mes = c.mes_referencia.slice(0, 7); // YYYY-MM
      if (!monthMap.has(mes)) monthMap.set(mes, {});
      const entry = monthMap.get(mes)!;

      const metrica = metricas.find((m) => m.id === c.metrica_id);
      if (metrica) {
        entry[`qty_${metrica.nome}`] = c.quantidade;
        entry[`val_${metrica.nome}`] = c.valor_total || 0;
      }
    });

    // Sort by month ascending
    return Array.from(monthMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([mes, data]) => {
        const [y, m] = mes.split("-");
        return {
          mes: `${m}/${y}`,
          ...data,
        };
      });
  }, [metricas, consumos]);

  if (consumos.length === 0) {
    return (
      <Card className="animate-fade-in">
        <CardHeader>
          <CardTitle className="text-lg">Evolução Mensal</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[200px] text-muted-foreground">
            Nenhum dado de consumo registrado ainda. Use o chat abaixo para enviar seu primeiro extrato.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="animate-fade-in">
      <CardHeader>
        <CardTitle className="text-lg">Evolução Mensal</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey="mes" className="text-xs" />
            <YAxis yAxisId="qty" orientation="left" className="text-xs" />
            <YAxis yAxisId="val" orientation="right" className="text-xs" />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--popover))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "0.5rem",
                color: "hsl(var(--popover-foreground))",
              }}
            />
            <Legend />
            {metricas.map((m, i) => (
              <Bar
                key={`bar-${m.id}`}
                yAxisId="val"
                dataKey={`val_${m.nome}`}
                name={`R$ ${m.nome}`}
                fill={COLORS[i % COLORS.length]}
                fillOpacity={0.3}
                radius={[4, 4, 0, 0]}
              />
            ))}
            {metricas.map((m, i) => (
              <Line
                key={`line-${m.id}`}
                yAxisId="qty"
                type="monotone"
                dataKey={`qty_${m.nome}`}
                name={m.nome}
                stroke={COLORS[i % COLORS.length]}
                strokeWidth={2}
                dot={{ r: 4 }}
              />
            ))}
          </ComposedChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
