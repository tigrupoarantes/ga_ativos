import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Download } from "lucide-react";
import {
  useLoteDetalhe,
  formatCurrencyFrota,
  formatPeriodoFrota,
  TIPO_LABEL,
  STATUS_LABEL,
  STATUS_COLOR,
  type LoteDespesaVeiculo,
} from "@/hooks/useCustosVeiculos";

interface LoteDespesaDetalheDialogProps {
  lote: LoteDespesaVeiculo | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

async function exportToExcel(lote: LoteDespesaVeiculo, rows: object[]) {
  const { utils, writeFile } = await import("xlsx");
  const wb = utils.book_new();
  const ws = utils.json_to_sheet(rows);
  ws["!cols"] = [
    { wch: 12 }, // Placa
    { wch: 25 }, // Veículo
    { wch: 25 }, // Condutor
    { wch: 14 }, // Valor
    { wch: 20 }, // Rateio 1 Empresa
    { wch: 12 }, // Rateio 1 Valor
    { wch: 20 }, // Rateio 2 Empresa
    { wch: 12 }, // Rateio 2 Valor
  ];
  utils.book_append_sheet(wb, ws, "Despesas");
  const periodo = formatPeriodoFrota(lote.periodo_referencia).replace(/\//g, "-");
  writeFile(wb, `Custos_Frota_${lote.tipo}_${periodo}.xlsx`);
}

export function LoteDespesaDetalheDialog({ lote, open, onOpenChange }: LoteDespesaDetalheDialogProps) {
  const { data: despesas = [], isLoading } = useLoteDetalhe(lote?.id ?? null);

  const handleExport = async () => {
    if (!lote) return;
    const rows = despesas.map((d) => ({
      "Placa": d.veiculo_placa,
      "Veículo": d.veiculo ? `${d.veiculo.marca ?? ""} ${d.veiculo.modelo ?? ""}`.trim() : "(não cadastrado)",
      "Condutor": d.condutor ?? "—",
      "Valor (R$)": d.valor,
      "Rateio 1 Empresa": d.rateio_1_empresa ?? "—",
      "Rateio 1 Valor (R$)": d.rateio_1_valor ?? "",
      "Rateio 2 Empresa": d.rateio_2_empresa ?? "—",
      "Rateio 2 Valor (R$)": d.rateio_2_valor ?? "",
    }));
    await exportToExcel(lote, rows);
  };

  if (!lote) return null;

  const totalValor = despesas.reduce((s, d) => s + d.valor, 0);
  const semVinculo = despesas.filter((d) => !d.veiculo).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between pr-8">
            <DialogTitle className="text-base">
              {TIPO_LABEL[lote.tipo]} — {lote.fornecedor ?? "—"} —{" "}
              <span className="text-blue-600">{formatPeriodoFrota(lote.periodo_referencia)}</span>
              {lote.nota_fiscal && (
                <span className="ml-2 text-sm text-muted-foreground font-normal">NF {lote.nota_fiscal}</span>
              )}
            </DialogTitle>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={STATUS_COLOR[lote.status]}>
                {STATUS_LABEL[lote.status]}
              </Badge>
              <Button size="sm" variant="outline" onClick={handleExport} disabled={isLoading}>
                <Download className="mr-2 h-4 w-4" />
                Exportar Excel
              </Button>
            </div>
          </div>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-2">
            {[...Array(8)].map((_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        ) : (
          <div className="rounded-md border overflow-auto max-h-[55vh]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Placa</TableHead>
                  <TableHead>Veículo</TableHead>
                  <TableHead>Condutor</TableHead>
                  <TableHead>Rateio 1</TableHead>
                  <TableHead>Rateio 2</TableHead>
                  <TableHead className="text-right font-semibold">Valor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {despesas.map((d) => (
                  <TableRow key={d.id} className={!d.veiculo ? "bg-amber-50/60" : undefined}>
                    <TableCell className="font-mono text-xs font-medium">
                      {d.veiculo_placa}
                      {!d.veiculo && (
                        <Badge variant="outline" className="ml-1 text-[10px] border-amber-400 text-amber-600">
                          sem cadastro
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {d.veiculo
                        ? `${d.veiculo.marca ?? ""} ${d.veiculo.modelo ?? ""}`.trim() || "—"
                        : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {d.condutor ?? "—"}
                    </TableCell>
                    <TableCell className="text-xs">
                      {d.rateio_1_empresa ? (
                        <span>
                          <span className="font-medium">{d.rateio_1_empresa}</span>
                          {d.rateio_1_valor && (
                            <span className="text-muted-foreground ml-1">
                              {formatCurrencyFrota(d.rateio_1_valor)}
                            </span>
                          )}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs">
                      {d.rateio_2_empresa ? (
                        <span>
                          <span className="font-medium">{d.rateio_2_empresa}</span>
                          {d.rateio_2_valor && (
                            <span className="text-muted-foreground ml-1">
                              {formatCurrencyFrota(d.rateio_2_valor)}
                            </span>
                          )}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right text-xs font-semibold">
                      {formatCurrencyFrota(d.valor)}
                    </TableCell>
                  </TableRow>
                ))}
                {/* Totais */}
                <TableRow className="font-semibold bg-muted/40 border-t-2">
                  <TableCell colSpan={5}>
                    Total — {despesas.length} veículo{despesas.length !== 1 ? "s" : ""}
                    {semVinculo > 0 && (
                      <span className="ml-2 text-xs text-amber-600 font-normal">
                        ({semVinculo} sem cadastro)
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right text-xs font-bold text-blue-600">
                    {formatCurrencyFrota(totalValor)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
