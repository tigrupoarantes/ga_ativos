import { useState } from "react";
import { VehicleLayout } from "@/components/VehicleLayout";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Upload,
  Search,
  Eye,
  Trash2,
  Fuel,
  Construction,
  DollarSign,
  Package,
} from "lucide-react";
import {
  useLotesDespesa,
  useCustosFrotaStats,
  useUpdateLoteStatus,
  useDeleteLote,
  formatCurrencyFrota,
  formatPeriodoFrota,
  TIPO_LABEL,
  STATUS_LABEL,
  STATUS_COLOR,
  type LoteDespesaVeiculo,
  type LoteStatus,
} from "@/hooks/useCustosVeiculos";
import { ImportCustoFrotaDialog } from "@/components/frota/ImportCustoFrotaDialog";
import { LoteDespesaDetalheDialog } from "@/components/frota/LoteDespesaDetalheDialog";
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog";
import { CustosDashboard } from "@/components/frota/CustosDashboard";

const TIPO_ICON: Record<string, React.ReactNode> = {
  pedagio: <Construction className="h-4 w-4" />,
  combustivel: <Fuel className="h-4 w-4" />,
  outros: <Package className="h-4 w-4" />,
};

const TIPO_COLOR: Record<string, string> = {
  pedagio: "bg-orange-100 text-orange-700 border-orange-200",
  combustivel: "bg-blue-100 text-blue-700 border-blue-200",
  outros: "bg-gray-100 text-gray-700 border-gray-200",
};

export default function CustosVeiculos() {
  const [importOpen, setImportOpen] = useState(false);
  const [detalheOpen, setDetalheOpen] = useState(false);
  const [loteSelecionado, setLoteSelecionado] = useState<LoteDespesaVeiculo | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [loteParaExcluir, setLoteParaExcluir] = useState<LoteDespesaVeiculo | null>(null);
  const [search, setSearch] = useState("");

  const { data: lotes = [], isLoading } = useLotesDespesa();
  const { data: stats } = useCustosFrotaStats();
  const updateStatus = useUpdateLoteStatus();
  const deleteLote = useDeleteLote();

  const lotesFiltrados = lotes.filter((l) => {
    if (!search) return true;
    const term = search.toLowerCase();
    return (
      (l.fornecedor ?? "").toLowerCase().includes(term) ||
      (l.nota_fiscal ?? "").toLowerCase().includes(term) ||
      TIPO_LABEL[l.tipo].toLowerCase().includes(term)
    );
  });

  const handleVerDetalhe = (lote: LoteDespesaVeiculo) => {
    setLoteSelecionado(lote);
    setDetalheOpen(true);
  };

  const handleDeleteClick = (lote: LoteDespesaVeiculo) => {
    setLoteParaExcluir(lote);
    setDeleteOpen(true);
  };

  const handleConfirmDelete = () => {
    if (loteParaExcluir) {
      deleteLote.mutate(loteParaExcluir.id);
      setDeleteOpen(false);
      setLoteParaExcluir(null);
    }
  };

  return (
    <VehicleLayout>
      <div className="space-y-6">
        <PageHeader
          title="Custos de Frota"
          description="Pedágios, combustível e outros custos operacionais por veículo"
          actions={
            <Button onClick={() => setImportOpen(true)}>
              <Upload className="h-4 w-4 mr-2" />
              Importar Custos
            </Button>
          }
        />

        <Tabs defaultValue="dashboard">
          <TabsList>
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="importacoes">Importações</TabsTrigger>
          </TabsList>

          {/* ── Tab: Dashboard ─────────────────────────────────────── */}
          <TabsContent value="dashboard" className="mt-6">
            <CustosDashboard />
          </TabsContent>

          {/* ── Tab: Importações ───────────────────────────────────── */}
          <TabsContent value="importacoes" className="mt-6">
            <div className="space-y-6">
              {/* Stats Cards */}
              <div className="grid gap-4 md:grid-cols-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Total Pedágios</p>
                        <p className="text-xl font-bold">{formatCurrencyFrota(stats?.totalPedagio ?? 0)}</p>
                      </div>
                      <Construction className="h-8 w-8 text-orange-500" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Total Combustível</p>
                        <p className="text-xl font-bold">{formatCurrencyFrota(stats?.totalCombustivel ?? 0)}</p>
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
                        <p className="text-xl font-bold">{formatCurrencyFrota(stats?.totalGeral ?? 0)}</p>
                      </div>
                      <DollarSign className="h-8 w-8 text-green-500" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Lotes Importados</p>
                        <p className="text-2xl font-bold">{stats?.totalLotes ?? 0}</p>
                      </div>
                      <Package className="h-8 w-8 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Search */}
              <div className="relative max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por fornecedor, NF ou tipo..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Table */}
              <div className="border rounded-lg">
                <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/30">
                  <p className="text-sm text-muted-foreground">
                    {lotesFiltrados.length} lote{lotesFiltrados.length !== 1 ? "s" : ""}
                  </p>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Período</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Fornecedor</TableHead>
                      <TableHead>NF</TableHead>
                      <TableHead className="text-right">Veículos</TableHead>
                      <TableHead className="text-right">Valor Total</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-[120px]">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <TableRow key={i}>
                          {Array.from({ length: 8 }).map((_, j) => (
                            <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                          ))}
                        </TableRow>
                      ))
                    ) : lotesFiltrados.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-10 text-muted-foreground">
                          {search ? "Nenhum lote encontrado para a busca." : "Nenhum custo importado ainda. Clique em \"Importar Custos\" para começar."}
                        </TableCell>
                      </TableRow>
                    ) : (
                      lotesFiltrados.map((lote) => (
                        <TableRow key={lote.id}>
                          <TableCell className="font-medium text-sm">
                            {formatPeriodoFrota(lote.periodo_referencia)}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={`text-xs gap-1 ${TIPO_COLOR[lote.tipo]}`}>
                              {TIPO_ICON[lote.tipo]}
                              {TIPO_LABEL[lote.tipo]}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">{lote.fornecedor ?? "—"}</TableCell>
                          <TableCell className="text-xs text-muted-foreground font-mono">
                            {lote.nota_fiscal ?? "—"}
                          </TableCell>
                          <TableCell className="text-right text-sm">{lote.qtd_veiculos}</TableCell>
                          <TableCell className="text-right text-sm font-medium">
                            {formatCurrencyFrota(lote.valor_total)}
                          </TableCell>
                          <TableCell>
                            <Select
                              value={lote.status}
                              onValueChange={(v) =>
                                updateStatus.mutate({ id: lote.id, status: v as LoteStatus })
                              }
                            >
                              <SelectTrigger className="h-7 text-xs w-28">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="importado">Importado</SelectItem>
                                <SelectItem value="aprovado">Aprovado</SelectItem>
                                <SelectItem value="pago">Pago</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleVerDetalhe(lote)}
                                title="Ver detalhes"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteClick(lote)}
                                title="Excluir lote"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <ImportCustoFrotaDialog open={importOpen} onOpenChange={setImportOpen} />

      <LoteDespesaDetalheDialog
        lote={loteSelecionado}
        open={detalheOpen}
        onOpenChange={setDetalheOpen}
      />

      <ConfirmDeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onConfirm={handleConfirmDelete}
        itemName={loteParaExcluir ? `${TIPO_LABEL[loteParaExcluir.tipo]} — ${loteParaExcluir.fornecedor ?? ""}` : ""}
        itemType="lote de custos"
        isLoading={deleteLote.isPending}
      />
    </VehicleLayout>
  );
}
