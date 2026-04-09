import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RefreshCw, TrendingDown, AlertCircle, CheckCircle2, Clock } from "lucide-react";
import {
  useVeiculoDepreciationData,
  useRecalculateVeiculoDepreciation,
  useVeiculoDepreciationHistory,
} from "@/hooks/useVeiculoDepreciation";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Props {
  vehicleId: string;
}

function fmt(value: number | null | undefined) {
  if (value == null) return "-";
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtDate(date: string | null | undefined) {
  if (!date) return "-";
  try { return format(new Date(date), "dd/MM/yyyy", { locale: ptBR }); }
  catch { return date; }
}

export function VeiculoDepreciacaoTab({ vehicleId }: Props) {
  const { data, isLoading } = useVeiculoDepreciationData(vehicleId);
  const { data: history, isLoading: loadingHistory } = useVeiculoDepreciationHistory(vehicleId);
  const recalculate = useRecalculateVeiculoDepreciation();

  if (isLoading) {
    return <div className="space-y-4"><Skeleton className="h-32 w-full" /><Skeleton className="h-32 w-full" /></div>;
  }

  if (!data) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>Dados de depreciação não disponíveis</p>
      </div>
    );
  }

  const baseValue = data.valor_aquisicao || data.valor_fipe;
  if (data.is_depreciable === false || !baseValue || baseValue <= 0) {
    return (
      <div className="space-y-4">
        <div className="text-center py-8">
          <AlertCircle className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-50" />
          <Badge variant="outline" className="text-sm">Não depreciável</Badge>
          <p className="text-sm text-muted-foreground mt-2">
            {!data.valor_aquisicao || data.valor_aquisicao <= 0
              ? "Pendente de dados financeiros — informe o valor de aquisição."
              : !data.data_aquisicao
              ? "Pendente de data de aquisição."
              : "Este veículo não está configurado para depreciação."}
          </p>
        </div>
        <div className="flex justify-center">
          <Button variant="outline" size="sm" onClick={() => recalculate.mutate(vehicleId)} disabled={recalculate.isPending}>
            <RefreshCw className={`h-4 w-4 mr-2 ${recalculate.isPending ? "animate-spin" : ""}`} />
            Tentar calcular
          </Button>
        </div>
      </div>
    );
  }

  const usefulLife = 60; // fallback
  const monthsElapsed = data.monthly_depreciation && data.accumulated_depreciation && data.monthly_depreciation > 0
    ? Math.round(data.accumulated_depreciation / data.monthly_depreciation) : 0;
  const monthsRemaining = Math.max(0, usefulLife - monthsElapsed);
  const percentDepreciated = data.depreciable_value && data.depreciable_value > 0
    ? Math.min(100, Math.round((data.accumulated_depreciation || 0) / data.depreciable_value * 100)) : 0;
  const isFullyDepreciated = percentDepreciated >= 100;
  const isStopped = data.status === "baixado" || !!data.depreciation_stop_date;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingDown className="h-5 w-5 text-muted-foreground" />
          <span className="font-medium">Depreciação Linear</span>
          {isFullyDepreciated && <Badge className="bg-orange-500/10 text-orange-600">Totalmente depreciado</Badge>}
          {isStopped && !isFullyDepreciated && <Badge className="bg-red-500/10 text-red-600">Depreciação parada</Badge>}
          {!isFullyDepreciated && !isStopped && (
            <Badge className="bg-green-500/10 text-green-600">
              <CheckCircle2 className="h-3 w-3 mr-1" />Em depreciação
            </Badge>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={() => recalculate.mutate(vehicleId)} disabled={recalculate.isPending}>
          <RefreshCw className={`h-4 w-4 mr-2 ${recalculate.isPending ? "animate-spin" : ""}`} />
          Recalcular
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card className="shadow-none">
          <CardContent className="pt-4 pb-3 px-4">
            <p className="text-xs text-muted-foreground">
              {data.valor_aquisicao ? "Valor de Aquisição" : "Valor Base (FIPE)"}
            </p>
            <p className="text-lg font-semibold">{fmt(baseValue)}</p>
          </CardContent>
        </Card>
        <Card className="shadow-none">
          <CardContent className="pt-4 pb-3 px-4">
            <p className="text-xs text-muted-foreground">Valor Residual ({data.residual_percent ?? 0}%)</p>
            <p className="text-lg font-semibold">{fmt(data.residual_value)}</p>
          </CardContent>
        </Card>
        <Card className="shadow-none">
          <CardContent className="pt-4 pb-3 px-4">
            <p className="text-xs text-muted-foreground">Valor Depreciável</p>
            <p className="text-lg font-semibold">{fmt(data.depreciable_value)}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card className="shadow-none">
          <CardContent className="pt-4 pb-3 px-4">
            <p className="text-xs text-muted-foreground">Depreciação Mensal</p>
            <p className="text-lg font-semibold text-orange-600">{fmt(data.monthly_depreciation)}</p>
          </CardContent>
        </Card>
        <Card className="shadow-none">
          <CardContent className="pt-4 pb-3 px-4">
            <p className="text-xs text-muted-foreground">Depreciação Acumulada</p>
            <p className="text-lg font-semibold text-red-600">{fmt(data.accumulated_depreciation)}</p>
          </CardContent>
        </Card>
        <Card className="shadow-none border-2 border-primary/20">
          <CardContent className="pt-4 pb-3 px-4">
            <p className="text-xs text-muted-foreground">Valor Contábil Líquido</p>
            <p className="text-lg font-bold text-primary">{fmt(data.valor_contabil)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Comparativo FIPE */}
      {data.valor_fipe && data.valor_contabil && (
        <div className="border rounded-lg p-3 flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Valor FIPE atual</span>
          <div className="flex items-center gap-3">
            <span className="font-medium">{fmt(data.valor_fipe)}</span>
            <Badge variant={data.valor_fipe > data.valor_contabil ? "default" : "destructive"} className="text-xs">
              {data.valor_fipe > data.valor_contabil
                ? `+${fmt(data.valor_fipe - data.valor_contabil)} acima do contábil`
                : `${fmt(data.valor_contabil - data.valor_fipe)} abaixo do contábil`}
            </Badge>
          </div>
        </div>
      )}

      {/* Barra de progresso */}
      <div className="space-y-1">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{monthsElapsed} meses decorridos</span>
          <span>{monthsRemaining} meses restantes</span>
        </div>
        <div className="w-full bg-muted rounded-full h-2.5">
          <div
            className={`h-2.5 rounded-full transition-all ${isFullyDepreciated ? "bg-orange-500" : "bg-primary"}`}
            style={{ width: `${percentDepreciated}%` }}
          />
        </div>
        <p className="text-xs text-center text-muted-foreground">{percentDepreciated}% depreciado</p>
      </div>

      {/* Detalhes */}
      <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm border rounded-lg p-4">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Data de aquisição</span>
          <span>{fmtDate(data.data_aquisicao)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Início depreciação</span>
          <span>{fmtDate(data.depreciation_start_date || data.data_aquisicao)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Tipo veículo</span>
          <span className="capitalize">{data.tipo || "-"}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Último cálculo</span>
          <span>{fmtDate(data.depreciation_last_calculated_at)}</span>
        </div>
      </div>

      {/* Histórico */}
      {history && history.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <p className="text-sm font-medium">Histórico de cálculos</p>
          </div>
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Data</TableHead>
                  <TableHead className="text-xs">Meses</TableHead>
                  <TableHead className="text-xs">Acumulada</TableHead>
                  <TableHead className="text-xs">Valor Líquido</TableHead>
                  <TableHead className="text-xs">Motivo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.slice(0, 10).map((h) => (
                  <TableRow key={h.id}>
                    <TableCell className="text-xs">{fmtDate(h.calculated_at)}</TableCell>
                    <TableCell className="text-xs">{h.months_elapsed}</TableCell>
                    <TableCell className="text-xs">{fmt(h.accumulated_depreciation)}</TableCell>
                    <TableCell className="text-xs font-medium">{fmt(h.book_value)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{h.calculation_reason || "-"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
}
