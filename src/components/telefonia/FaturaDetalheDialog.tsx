import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Download, Users, List, AlertTriangle, RefreshCw } from "lucide-react";
import {
  useFaturaDetalhe,
  computeRateio,
  formatCurrency,
  formatPeriod,
  useRevincularFaturaLinhas,
  type FaturaTelefonia,
} from "@/hooks/useFaturasTelefonia";

interface FaturaDetalheDialogProps {
  fatura: FaturaTelefonia | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

async function exportToExcel(
  fatura: FaturaTelefonia,
  linhasRows: object[],
  rateioRows: object[]
) {
  const { utils, writeFile } = await import("xlsx");
  const wb = utils.book_new();

  // Aba 1: Por Linha
  const ws1 = utils.json_to_sheet(linhasRows);
  ws1["!cols"] = [
    { wch: 15 }, // Número
    { wch: 25 }, // Funcionário
    { wch: 20 }, // Equipe
    { wch: 20 }, // Área
    { wch: 12 }, // CC
    { wch: 12 }, // Mensalidade
    { wch: 12 }, // Ligações
    { wch: 12 }, // Dados
    { wch: 12 }, // Serviços
    { wch: 14 }, // Compartilhado
    { wch: 12 }, // Total
  ];
  utils.book_append_sheet(wb, ws1, "Por Linha");

  // Aba 2: Rateio
  const ws2 = utils.json_to_sheet(rateioRows);
  ws2["!cols"] = [
    { wch: 25 }, // Equipe
    { wch: 25 }, // Área
    { wch: 12 }, // CC
    { wch: 10 }, // Qtd Linhas
    { wch: 14 }, // Total
  ];
  utils.book_append_sheet(wb, ws2, "Rateio");

  const period = formatPeriod(fatura.periodo_inicio, fatura.periodo_fim);
  writeFile(wb, `Fatura_Telefonia_${period.replace(/\//g, "-")}.xlsx`);
}

export function FaturaDetalheDialog({ fatura, open, onOpenChange }: FaturaDetalheDialogProps) {
  const [tab, setTab] = useState("linhas");
  const { data: linhas = [], isLoading, error: linhasError } = useFaturaDetalhe(fatura?.id ?? null);
  const rateio = computeRateio(linhas);
  const revincular = useRevincularFaturaLinhas();

  const handleExport = async () => {
    if (!fatura) return;

    const linhasRows = linhas.map((l) => ({
      "Número": l.numero_linha,
      "Funcionário": l.linhas_telefonicas?.funcionario?.nome ?? "(sem vínculo)",
      "Equipe": l.linhas_telefonicas?.funcionario?.equipe?.nome ?? "-",
      "Área": l.linhas_telefonicas?.funcionario?.area?.name ?? "-",
      "Centro de Custo": l.linhas_telefonicas?.funcionario?.area?.cost_center ?? "-",
      "Mensalidade (R$)": l.valor_mensalidade,
      "Ligações (R$)": l.valor_ligacoes,
      "Dados (R$)": l.valor_dados,
      "Serviços (R$)": l.valor_servicos,
      "Compartilhado (R$)": l.valor_compartilhado,
      "Total (R$)": l.valor_total,
    }));

    const rateioRows = rateio.map((r) => ({
      "Equipe": r.equipeNome,
      "Área": r.areaNome,
      "Centro de Custo": r.costCenter,
      "Qtd Linhas": r.qtdLinhas,
      "Mensalidade (R$)": r.valorMensalidade,
      "Ligações (R$)": r.valorLigacoes,
      "Dados (R$)": r.valorDados,
      "Serviços (R$)": r.valorServicos,
      "Compartilhado (R$)": r.valorCompartilhado,
      "Total (R$)": r.valorTotal,
    }));

    await exportToExcel(fatura, linhasRows, rateioRows);
  };

  if (!fatura) return null;

  const totalLinhas = linhas.reduce((s, l) => s + l.valor_total, 0);
  const totalRateio = rateio.reduce((s, r) => s + r.valorTotal, 0);
  const semVinculo = linhas.filter((l) => !l.linha_id).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between pr-8">
            <DialogTitle className="text-base">
              Fatura Claro —{" "}
              {formatPeriod(fatura.periodo_inicio, fatura.periodo_fim)} —{" "}
              <span className="text-blue-600">{formatCurrency(fatura.valor_total)}</span>
            </DialogTitle>
            <div className="flex items-center gap-2">
              {semVinculo > 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => revincular.mutate(fatura.id)}
                  disabled={revincular.isPending}
                >
                  {revincular.isPending ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Vinculando...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Revincular linhas
                    </>
                  )}
                </Button>
              )}
              <Button size="sm" variant="outline" onClick={handleExport} disabled={isLoading}>
                <Download className="mr-2 h-4 w-4" />
                Exportar Excel
              </Button>
            </div>
          </div>
        </DialogHeader>

        {linhasError && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-xs font-mono">
              Erro ao carregar linhas: {(linhasError as Error).message}
            </AlertDescription>
          </Alert>
        )}

        {semVinculo > 0 && (
          <div className="flex items-center gap-2 rounded-md bg-amber-50 border border-amber-200 px-3 py-2 text-sm text-amber-700">
            <AlertTriangle className="h-4 w-4 flex-shrink-0" />
            {semVinculo} linha{semVinculo > 1 ? "s" : ""} sem vínculo com funcionário cadastrado.
            Verifique em <strong>Linhas Telefônicas</strong>.
          </div>
        )}

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="linhas" className="flex items-center gap-2">
              <List className="h-4 w-4" />
              Por Linha ({fatura.qtd_linhas})
            </TabsTrigger>
            <TabsTrigger value="rateio" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Rateio por Equipe
            </TabsTrigger>
          </TabsList>

          {/* ─── Aba: Por Linha ─── */}
          <TabsContent value="linhas" className="mt-3">
            {isLoading ? (
              <div className="space-y-2">
                {[...Array(8)].map((_, i) => (
                  <Skeleton key={i} className="h-8 w-full" />
                ))}
              </div>
            ) : (
              <div className="rounded-md border overflow-auto max-h-[50vh]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Número</TableHead>
                      <TableHead>Funcionário</TableHead>
                      <TableHead>Equipe</TableHead>
                      <TableHead className="text-right">Mensalidade</TableHead>
                      <TableHead className="text-right">Ligações</TableHead>
                      <TableHead className="text-right">Dados</TableHead>
                      <TableHead className="text-right">Serviços</TableHead>
                      <TableHead className="text-right">Compart.</TableHead>
                      <TableHead className="text-right font-semibold">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {linhas.map((l) => {
                      const funcionario = l.linhas_telefonicas?.funcionario;
                      const semVinculoLinha = !l.linha_id;
                      return (
                        <TableRow
                          key={l.id}
                          className={semVinculoLinha ? "bg-amber-50/60" : undefined}
                        >
                          <TableCell className="font-mono text-xs">
                            {l.numero_linha}
                            {semVinculoLinha && (
                              <Badge variant="outline" className="ml-2 text-[10px] border-amber-400 text-amber-600">
                                sem vínculo
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-sm">
                            {funcionario?.nome ?? <span className="text-muted-foreground">—</span>}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {funcionario?.equipe?.nome ?? "—"}
                          </TableCell>
                          <TableCell className="text-right text-xs">
                            {formatCurrency(l.valor_mensalidade)}
                          </TableCell>
                          <TableCell className="text-right text-xs">
                            {formatCurrency(l.valor_ligacoes)}
                          </TableCell>
                          <TableCell className="text-right text-xs">
                            {formatCurrency(l.valor_dados)}
                          </TableCell>
                          <TableCell className="text-right text-xs">
                            {formatCurrency(l.valor_servicos)}
                          </TableCell>
                          <TableCell className="text-right text-xs">
                            {formatCurrency(l.valor_compartilhado)}
                          </TableCell>
                          <TableCell className="text-right text-xs font-semibold">
                            {formatCurrency(l.valor_total)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {/* Totais */}
                    <TableRow className="font-semibold bg-muted/40 border-t-2">
                      <TableCell colSpan={3}>Total</TableCell>
                      <TableCell className="text-right text-xs">
                        {formatCurrency(linhas.reduce((s, l) => s + l.valor_mensalidade, 0))}
                      </TableCell>
                      <TableCell className="text-right text-xs">
                        {formatCurrency(linhas.reduce((s, l) => s + l.valor_ligacoes, 0))}
                      </TableCell>
                      <TableCell className="text-right text-xs">
                        {formatCurrency(linhas.reduce((s, l) => s + l.valor_dados, 0))}
                      </TableCell>
                      <TableCell className="text-right text-xs">
                        {formatCurrency(linhas.reduce((s, l) => s + l.valor_servicos, 0))}
                      </TableCell>
                      <TableCell className="text-right text-xs">
                        {formatCurrency(linhas.reduce((s, l) => s + l.valor_compartilhado, 0))}
                      </TableCell>
                      <TableCell className="text-right text-xs font-bold text-blue-600">
                        {formatCurrency(totalLinhas)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>

          {/* ─── Aba: Rateio ─── */}
          <TabsContent value="rateio" className="mt-3">
            {isLoading ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-8 w-full" />
                ))}
              </div>
            ) : (
              <div className="rounded-md border overflow-auto max-h-[50vh]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Equipe</TableHead>
                      <TableHead>Área</TableHead>
                      <TableHead>CC</TableHead>
                      <TableHead className="text-right">Linhas</TableHead>
                      <TableHead className="text-right">Mensalidade</TableHead>
                      <TableHead className="text-right">Ligações</TableHead>
                      <TableHead className="text-right">Dados</TableHead>
                      <TableHead className="text-right">Serviços</TableHead>
                      <TableHead className="text-right font-semibold">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rateio.map((r, idx) => (
                      <TableRow
                        key={idx}
                        className={r.equipeNome === "Sem equipe" ? "bg-amber-50/60" : undefined}
                      >
                        <TableCell className="font-medium text-sm">{r.equipeNome}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{r.areaNome}</TableCell>
                        <TableCell>
                          {r.costCenter !== "-" ? (
                            <Badge variant="outline" className="text-xs font-mono">
                              {r.costCenter}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-xs">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right text-sm">{r.qtdLinhas}</TableCell>
                        <TableCell className="text-right text-xs">
                          {formatCurrency(r.valorMensalidade)}
                        </TableCell>
                        <TableCell className="text-right text-xs">
                          {formatCurrency(r.valorLigacoes)}
                        </TableCell>
                        <TableCell className="text-right text-xs">
                          {formatCurrency(r.valorDados)}
                        </TableCell>
                        <TableCell className="text-right text-xs">
                          {formatCurrency(r.valorServicos)}
                        </TableCell>
                        <TableCell className="text-right text-xs font-semibold">
                          {formatCurrency(r.valorTotal)}
                        </TableCell>
                      </TableRow>
                    ))}
                    {/* Totais */}
                    <TableRow className="font-semibold bg-muted/40 border-t-2">
                      <TableCell colSpan={3}>Total</TableCell>
                      <TableCell className="text-right text-sm">
                        {rateio.reduce((s, r) => s + r.qtdLinhas, 0)}
                      </TableCell>
                      <TableCell className="text-right text-xs">
                        {formatCurrency(rateio.reduce((s, r) => s + r.valorMensalidade, 0))}
                      </TableCell>
                      <TableCell className="text-right text-xs">
                        {formatCurrency(rateio.reduce((s, r) => s + r.valorLigacoes, 0))}
                      </TableCell>
                      <TableCell className="text-right text-xs">
                        {formatCurrency(rateio.reduce((s, r) => s + r.valorDados, 0))}
                      </TableCell>
                      <TableCell className="text-right text-xs">
                        {formatCurrency(rateio.reduce((s, r) => s + r.valorServicos, 0))}
                      </TableCell>
                      <TableCell className="text-right text-xs font-bold text-blue-600">
                        {formatCurrency(totalRateio)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
