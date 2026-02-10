import { useParams, useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { useContratos } from "@/hooks/useContratos";
import { useContratoMetricas } from "@/hooks/useContratoMetricas";
import { useContratoConsumo } from "@/hooks/useContratoConsumo";
import { ContratoKPIs } from "@/components/contratos/ContratoKPIs";
import { ContratoChart } from "@/components/contratos/ContratoChart";
import { ContratoChat } from "@/components/contratos/ContratoChat";
import { MetricasForm } from "@/components/contratos/MetricasForm";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, FileText, Calendar, Building2, DollarSign } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

const statusColors: Record<string, string> = {
  ativo: "bg-green-500/10 text-green-700 dark:text-green-300",
  vencido: "bg-red-500/10 text-red-700 dark:text-red-300",
  cancelado: "bg-muted text-muted-foreground",
  renovacao: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-300",
};

export default function ContratoDetalhe() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { contratos, isLoading: loadingContratos } = useContratos();
  const { metricas, isLoading: loadingMetricas, createMetrica, deleteMetrica } = useContratoMetricas(id);
  const { consumos, isLoading: loadingConsumos, invalidate } = useContratoConsumo(id);

  const contrato = contratos.find((c) => c.id === id);

  if (loadingContratos) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <Skeleton className="h-10 w-64" />
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-28" />)}
          </div>
          <Skeleton className="h-[300px]" />
        </div>
      </AppLayout>
    );
  }

  if (!contrato) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center h-[50vh] gap-4">
          <p className="text-muted-foreground">Contrato não encontrado</p>
          <Button variant="outline" onClick={() => navigate("/contratos")}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
          </Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/contratos")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">Contrato {contrato.numero}</h1>
              <Badge className={cn("capitalize", statusColors[contrato.status || "ativo"])}>
                {contrato.status}
              </Badge>
            </div>
            <p className="text-muted-foreground">{contrato.descricao || contrato.fornecedor || "Sem descrição"}</p>
          </div>
        </div>

        {/* Contract info cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { icon: Building2, label: "Fornecedor", value: contrato.fornecedor || "N/D", color: "bg-blue-500/10 text-blue-600" },
            { icon: FileText, label: "Tipo", value: contrato.tipo || "N/D", color: "bg-violet-500/10 text-violet-600" },
            { icon: Calendar, label: "Vigência", value: contrato.data_fim ? format(parseISO(contrato.data_fim), "dd/MM/yyyy", { locale: ptBR }) : "N/D", color: "bg-orange-500/10 text-orange-600" },
            { icon: DollarSign, label: "Valor Mensal", value: contrato.valor_mensal ? `R$ ${contrato.valor_mensal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "N/D", color: "bg-green-500/10 text-green-600" },
          ].map((item, i) => (
            <Card key={i} className="animate-fade-in" style={{ animationDelay: `${i * 50}ms` }}>
              <CardContent className="p-4 flex items-center gap-3">
                <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center", item.color)}>
                  <item.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                  <p className="text-sm font-semibold capitalize">{item.value}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Metricas config */}
        <Card className="animate-fade-in">
          <CardHeader>
            <CardTitle className="text-lg">Modelo de Cobrança</CardTitle>
          </CardHeader>
          <CardContent>
            <MetricasForm
              metricas={metricas}
              contratoId={id!}
              onAdd={(m) => createMetrica.mutate(m)}
              onDelete={(mId) => deleteMetrica.mutate(mId)}
              isAdding={createMetrica.isPending}
            />
          </CardContent>
        </Card>

        {/* KPIs */}
        <ContratoKPIs metricas={metricas} consumos={consumos} />

        {/* Chart */}
        <ContratoChart metricas={metricas} consumos={consumos} />

        {/* Chat IA */}
        <ContratoChat
          contratoId={id!}
          contratoNumero={contrato.numero}
          onDataSaved={invalidate}
        />
      </div>
    </AppLayout>
  );
}
