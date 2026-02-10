import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { ContratoMetrica } from "@/hooks/useContratoMetricas";
import { ContratoConsumo } from "@/hooks/useContratoConsumo";

interface ContratoKPIsProps {
  metricas: ContratoMetrica[];
  consumos: ContratoConsumo[];
}

export function ContratoKPIs({ metricas, consumos }: ContratoKPIsProps) {
  const kpiData = useMemo(() => {
    return metricas.map((metrica) => {
      const metricaConsumos = consumos
        .filter((c) => c.metrica_id === metrica.id)
        .sort((a, b) => b.mes_referencia.localeCompare(a.mes_referencia));

      const atual = metricaConsumos[0];
      const anterior = metricaConsumos[1];

      let variacao: number | null = null;
      if (atual && anterior && anterior.quantidade > 0) {
        variacao = ((atual.quantidade - anterior.quantidade) / anterior.quantidade) * 100;
      }

      const custoAtual = atual?.valor_total ?? (atual ? atual.quantidade * (metrica.valor_unitario || 0) : 0);

      return {
        metrica,
        quantidadeAtual: atual?.quantidade ?? 0,
        custoAtual,
        variacao,
        mesAtual: atual?.mes_referencia,
      };
    });
  }, [metricas, consumos]);

  // Total cost KPI
  const custoTotal = kpiData.reduce((sum, k) => sum + k.custoAtual, 0);

  if (metricas.length === 0) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {kpiData.map((kpi, index) => (
        <Card
          key={kpi.metrica.id}
          className="card-hover animate-fade-in-up"
          style={{ animationDelay: `${index * 100}ms` }}
        >
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {kpi.metrica.nome}
                </p>
                <p className="text-2xl font-bold">
                  {kpi.quantidadeAtual.toLocaleString("pt-BR")}
                  <span className="text-sm font-normal text-muted-foreground ml-1">
                    {kpi.metrica.unidade}
                  </span>
                </p>
                <p className="text-sm text-muted-foreground">
                  R$ {kpi.custoAtual.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </p>
              </div>
              {kpi.variacao !== null && (
                <div
                  className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${
                    kpi.variacao > 0
                      ? "bg-red-500/10 text-red-700 dark:text-red-300"
                      : kpi.variacao < 0
                      ? "bg-green-500/10 text-green-700 dark:text-green-300"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {kpi.variacao > 0 ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : kpi.variacao < 0 ? (
                    <TrendingDown className="h-3 w-3" />
                  ) : (
                    <Minus className="h-3 w-3" />
                  )}
                  {Math.abs(kpi.variacao).toFixed(1)}%
                </div>
              )}
            </div>
            {kpi.metrica.meta_mensal && (
              <div className="mt-3">
                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                  <span>Meta</span>
                  <span>{((kpi.quantidadeAtual / kpi.metrica.meta_mensal) * 100).toFixed(0)}%</span>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min((kpi.quantidadeAtual / kpi.metrica.meta_mensal) * 100, 100)}%`,
                    }}
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ))}

      {/* Total cost card */}
      <Card
        className="card-hover animate-fade-in-up"
        style={{ animationDelay: `${kpiData.length * 100}ms` }}
      >
        <CardContent className="p-5">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Custo Total
            </p>
            <p className="text-2xl font-bold text-primary">
              R$ {custoTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-muted-foreground">Último período registrado</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
