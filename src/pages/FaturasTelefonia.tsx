import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Plus,
  FileText,
  MoreHorizontal,
  Eye,
  Trash2,
  CheckCircle2,
  Clock,
  DollarSign,
  Phone,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useFaturasTelefonia,
  useUpdateFaturaStatus,
  useDeleteFatura,
  formatCurrency,
  formatPeriod,
  type FaturaTelefonia,
  type FaturaStatus,
} from "@/hooks/useFaturasTelefonia";
import { ImportFaturaDialog } from "@/components/telefonia/ImportFaturaDialog";
import { FaturaDetalheDialog } from "@/components/telefonia/FaturaDetalheDialog";

const STATUS_LABELS: Record<FaturaStatus, string> = {
  importada: "Importada",
  aprovada: "Aprovada",
  paga: "Paga",
};

const STATUS_COLORS: Record<FaturaStatus, string> = {
  importada: "bg-blue-100 text-blue-700 border-blue-200",
  aprovada: "bg-green-100 text-green-700 border-green-200",
  paga: "bg-gray-100 text-gray-600 border-gray-200",
};

export default function FaturasTelefonia() {
  const { data: faturas = [], isLoading } = useFaturasTelefonia();
  const updateStatus = useUpdateFaturaStatus();
  const deleteFatura = useDeleteFatura();

  const [importOpen, setImportOpen] = useState(false);
  const [detalheOpen, setDetalheOpen] = useState(false);
  const [selectedFatura, setSelectedFatura] = useState<FaturaTelefonia | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<FaturaTelefonia | null>(null);

  const totalGasto = faturas.reduce((sum, fatura) => sum + fatura.valor_total, 0);
  const totalLinhas = faturas.reduce((sum, fatura) => sum + fatura.qtd_linhas, 0);
  const mediaPorFatura = faturas.length > 0 ? totalGasto / faturas.length : 0;

  const handleVerDetalhe = (fatura: FaturaTelefonia) => {
    setSelectedFatura(fatura);
    setDetalheOpen(true);
  };

  const handleUpdateStatus = (fatura: FaturaTelefonia, status: FaturaStatus) => {
    updateStatus.mutate({ id: fatura.id, status });
  };

  const handleDelete = () => {
    if (deleteConfirm) {
      deleteFatura.mutate(deleteConfirm.id);
      setDeleteConfirm(null);
    }
  };

  return (
    <AppLayout>
      <PageHeader
        title="Faturas de Telefonia"
        description="Importacao e rateio de faturas por linha e departamento"
        actions={
          <Button onClick={() => setImportOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Importar Fatura
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mb-6">
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100">
              <DollarSign className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total importado</p>
              <p className="text-xl font-bold">{formatCurrency(totalGasto)}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-100">
              <Phone className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total de linhas</p>
              <p className="text-xl font-bold">{totalLinhas}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100">
              <FileText className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Media por fatura</p>
              <p className="text-xl font-bold">{formatCurrency(mediaPorFatura)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-2">
              {[...Array(5)].map((_, index) => (
                <Skeleton key={index} className="h-12 w-full" />
              ))}
            </div>
          ) : faturas.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
              <FileText className="h-10 w-10 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">
                Nenhuma fatura importada ainda.
              </p>
              <Button size="sm" onClick={() => setImportOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Importar primeira fatura
              </Button>
            </div>
          ) : (
            <div className="overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Periodo</TableHead>
                    <TableHead>Operadora</TableHead>
                    <TableHead>No Fatura</TableHead>
                    <TableHead className="text-right">Linhas</TableHead>
                    <TableHead className="text-right">Valor Total</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Acoes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {faturas.map((fatura) => (
                    <TableRow
                      key={fatura.id}
                      className="cursor-pointer hover:bg-muted/40"
                      onClick={() => handleVerDetalhe(fatura)}
                    >
                      <TableCell className="font-medium">
                        {formatPeriod(fatura.periodo_inicio, fatura.periodo_fim)}
                      </TableCell>
                      <TableCell>{fatura.operadora}</TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {fatura.numero_fatura ?? "-"}
                      </TableCell>
                      <TableCell className="text-right">{fatura.qtd_linhas}</TableCell>
                      <TableCell className="text-right font-semibold">
                        {formatCurrency(fatura.valor_total)}
                      </TableCell>
                      <TableCell className="text-sm">
                        {fatura.data_vencimento
                          ? new Date(`${fatura.data_vencimento}T12:00:00`).toLocaleDateString("pt-BR")
                          : "-"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn("text-xs", STATUS_COLORS[fatura.status as FaturaStatus])}
                        >
                          {STATUS_LABELS[fatura.status as FaturaStatus] ?? fatura.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={(event) => event.stopPropagation()}
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={(event) => {
                                event.stopPropagation();
                                handleVerDetalhe(fatura);
                              }}
                            >
                              <Eye className="mr-2 h-4 w-4" />
                              Ver detalhes / Rateio
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {fatura.status !== "aprovada" && (
                              <DropdownMenuItem
                                onClick={(event) => {
                                  event.stopPropagation();
                                  handleUpdateStatus(fatura, "aprovada");
                                }}
                              >
                                <CheckCircle2 className="mr-2 h-4 w-4 text-green-600" />
                                Marcar como Aprovada
                              </DropdownMenuItem>
                            )}
                            {fatura.status !== "paga" && (
                              <DropdownMenuItem
                                onClick={(event) => {
                                  event.stopPropagation();
                                  handleUpdateStatus(fatura, "paga");
                                }}
                              >
                                <DollarSign className="mr-2 h-4 w-4 text-blue-600" />
                                Marcar como Paga
                              </DropdownMenuItem>
                            )}
                            {fatura.status !== "importada" && (
                              <DropdownMenuItem
                                onClick={(event) => {
                                  event.stopPropagation();
                                  handleUpdateStatus(fatura, "importada");
                                }}
                              >
                                <Clock className="mr-2 h-4 w-4" />
                                Reverter para Importada
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={(event) => {
                                event.stopPropagation();
                                setDeleteConfirm(fatura);
                              }}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <ImportFaturaDialog open={importOpen} onOpenChange={setImportOpen} />

      <FaturaDetalheDialog
        fatura={selectedFatura}
        open={detalheOpen}
        onOpenChange={(open) => {
          setDetalheOpen(open);
          if (!open) setSelectedFatura(null);
        }}
      />

      <AlertDialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir fatura?</AlertDialogTitle>
            <AlertDialogDescription>
              A fatura de{" "}
              {deleteConfirm &&
                formatPeriod(deleteConfirm.periodo_inicio, deleteConfirm.periodo_fim)}{" "}
              ({deleteConfirm && formatCurrency(deleteConfirm.valor_total)}) sera removida
              permanentemente, incluindo todas as linhas associadas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={handleDelete}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
