import { useEffect, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { useAtivos, useTiposAtivos } from "@/hooks/useAtivos";
import { useFuncionariosCombobox } from "@/hooks/useSelectOptions";
import { useEmpresas } from "@/hooks/useEmpresas";
import { FuncionarioCombobox } from "@/components/FuncionarioCombobox";
import { DynamicAssetForm, FormFieldConfig } from "@/components/DynamicAssetForm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Search, Edit, Trash2, Package, History, ArrowLeft, Undo2, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { HistoricoAtivoDialog } from "@/components/HistoricoAtivoDialog";
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog";
import { useQueryClient } from "@tanstack/react-query";
import { ImportCelularesDialog } from "@/components/ImportCelularesDialog";
import { DataTablePagination } from "@/components/DataTablePagination";
import { GerarContratoDialog } from "@/components/GerarContratoDialog";

const statusColors: Record<string, string> = {
  disponivel: "bg-status-success/10 text-status-success",
  em_uso: "bg-status-info/10 text-status-info",
  manutencao: "bg-status-warning/10 text-status-warning",
  baixado: "bg-status-error/10 text-status-error",
};

const PAGE_SIZE = 25;

export default function Ativos() {
  const queryClient = useQueryClient();
  const { ativos, isLoading, createAtivo, updateAtivo, deleteAtivo, devolverAtivo } = useAtivos();
  const { tipos } = useTiposAtivos();
  const { funcionarios } = useFuncionariosCombobox();
  const { empresas } = useEmpresas();
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterTipo, setFilterTipo] = useState("all");
  const [page, setPage] = useState(1);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedTipoId, setSelectedTipoId] = useState<string | null>(null);
  const [historicoAtivoId, setHistoricoAtivoId] = useState<string | null>(null);
  const [historicoAtivoNome, setHistoricoAtivoNome] = useState<string | undefined>(undefined);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ id: string; nome: string } | null>(null);
  const [contratoDialogAtivo, setContratoDialogAtivo] = useState<typeof ativos[0] | null>(null);
  const [formData, setFormData] = useState({
    patrimonio: "",
    nome: "",
    descricao: "",
    tipo_id: "",
    marca: "",
    modelo: "",
    numero_serie: "",
    imei: "",
    chip_linha: "",
    status: "disponivel",
    funcionario_id: "",
    empresa_id: "",
    data_aquisicao: "",
    valor_aquisicao: "",
  });

  const filteredAtivos = ativos.filter((a) => {
    const matchSearch =
      a.nome?.toLowerCase().includes(search.toLowerCase()) ||
      a.patrimonio?.toLowerCase().includes(search.toLowerCase()) ||
      a.numero_serie?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "all" || a.status === filterStatus;
    const matchTipo = filterTipo === "all" || a.tipo_id === filterTipo;
    return matchSearch && matchStatus && matchTipo;
  });

  const totalCount = filteredAtivos.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const paginatedAtivos = filteredAtivos.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [search, filterStatus, filterTipo]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  // Obter tipo selecionado e seus campos de formulário
  const tipoSelecionado = tipos.find((t) => t.id === selectedTipoId);
  const rawFormFields = (tipoSelecionado as any)?.form_fields;
  const formFields: FormFieldConfig[] = Array.isArray(rawFormFields) ? rawFormFields : [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Determinar status automaticamente baseado no funcionário
    const autoStatus = formData.funcionario_id ? "em_uso" : "disponivel";
    
    // Sanitizar campos UUID vazios para null e converter tipos
    const sanitizedData = {
      ...formData,
      funcionario_id: formData.funcionario_id || null,
      empresa_id: formData.empresa_id || null,
      tipo_id: formData.tipo_id || null,
      valor_aquisicao: formData.valor_aquisicao ? parseFloat(formData.valor_aquisicao) : null,
      data_aquisicao: formData.data_aquisicao || null,
      status: autoStatus,
    };
    
    if (editingId) {
      await updateAtivo.mutateAsync({ id: editingId, ...sanitizedData });
    } else {
      await createAtivo.mutateAsync(sanitizedData);
    }
    setIsDialogOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setEditingId(null);
    setSelectedTipoId(null);
    setFormData({
      patrimonio: "",
      nome: "",
      descricao: "",
      tipo_id: "",
      marca: "",
      modelo: "",
      numero_serie: "",
      imei: "",
      chip_linha: "",
      status: "disponivel",
      funcionario_id: "",
      empresa_id: "",
      data_aquisicao: "",
      valor_aquisicao: "",
    });
  };

  const handleEdit = (ativo: typeof ativos[0]) => {
    setEditingId(ativo.id);
    setFormData({
      patrimonio: ativo.patrimonio || "",
      nome: ativo.nome || "",
      descricao: ativo.descricao || "",
      tipo_id: ativo.tipo_id || "",
      marca: ativo.marca || "",
      modelo: ativo.modelo || "",
      numero_serie: ativo.numero_serie || "",
      imei: ativo.imei || "",
      chip_linha: ativo.chip_linha || "",
      status: ativo.status || "disponivel",
      funcionario_id: ativo.funcionario_id || "",
      empresa_id: ativo.empresa_id || "",
      data_aquisicao: ativo.data_aquisicao || "",
      valor_aquisicao: ativo.valor_aquisicao?.toString() || "",
    });
    setIsDialogOpen(true);
  };

  const handleDeleteClick = (ativo: typeof ativos[0]) => {
    setItemToDelete({ id: ativo.id, nome: ativo.nome });
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (itemToDelete) {
      await deleteAtivo.mutateAsync(itemToDelete.id);
      setDeleteDialogOpen(false);
      setItemToDelete(null);
    }
  };

  const handleFormSuccess = () => {
    setIsDialogOpen(false);
    resetForm();
    queryClient.invalidateQueries({ queryKey: ["ativos"] });
  };

  const handleOpenHistorico = (ativo: typeof ativos[0]) => {
    setHistoricoAtivoId(ativo.id);
    setHistoricoAtivoNome(ativo.nome);
  };

  const handleDevolverAtivo = async (ativo: typeof ativos[0]) => {
    await devolverAtivo.mutateAsync(ativo.id);
  };

  const handleDialogClose = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      resetForm();
    }
  };

  // Renderizar conteúdo do dialog baseado no estado
  const renderDialogContent = () => {
    // Modo de edição: formulário completo
    if (editingId) {
      return (
        <>
          <DialogHeader>
            <DialogTitle>Editar Ativo</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="patrimonio">Patrimônio *</Label>
                <Input
                  id="patrimonio"
                  value={formData.patrimonio}
                  onChange={(e) => setFormData({ ...formData, patrimonio: e.target.value })}
                  required
                  disabled
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nome">Nome *</Label>
                <Input
                  id="nome"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tipo_id">Tipo</Label>
                <Select value={formData.tipo_id} onValueChange={(v) => setFormData({ ...formData, tipo_id: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {tipos.map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="disponivel">Disponível</SelectItem>
                    <SelectItem value="em_uso">Em Uso</SelectItem>
                    <SelectItem value="manutencao">Manutenção</SelectItem>
                    <SelectItem value="baixado">Baixado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="marca">Marca</Label>
                <Input
                  id="marca"
                  value={formData.marca}
                  onChange={(e) => setFormData({ ...formData, marca: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="modelo">Modelo</Label>
                <Input
                  id="modelo"
                  value={formData.modelo}
                  onChange={(e) => setFormData({ ...formData, modelo: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="numero_serie">Número de Série</Label>
                <Input
                  id="numero_serie"
                  value={formData.numero_serie}
                  onChange={(e) => setFormData({ ...formData, numero_serie: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="imei">IMEI</Label>
                <Input
                  id="imei"
                  value={formData.imei}
                  onChange={(e) => setFormData({ ...formData, imei: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="data_aquisicao">Data de Aquisição</Label>
                <Input
                  id="data_aquisicao"
                  type="date"
                  value={formData.data_aquisicao}
                  onChange={(e) => setFormData({ ...formData, data_aquisicao: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="valor_aquisicao">Valor de Aquisição (R$)</Label>
                <Input
                  id="valor_aquisicao"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.valor_aquisicao}
                  onChange={(e) => setFormData({ ...formData, valor_aquisicao: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="funcionario_id">Funcionário</Label>
                <FuncionarioCombobox
                  value={formData.funcionario_id}
                  onValueChange={(v) => setFormData({ ...formData, funcionario_id: v })}
                  funcionarios={funcionarios}
                  placeholder="Buscar por nome ou CPF"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="empresa_id">Empresa</Label>
                <Select value={formData.empresa_id} onValueChange={(v) => setFormData({ ...formData, empresa_id: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {empresas.map((e) => (
                      <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={updateAtivo.isPending}>
                Salvar
              </Button>
            </DialogFooter>
          </form>
        </>
      );
    }

    // Modo de criação - Etapa 1: Seleção do tipo
    if (!selectedTipoId) {
      return (
        <>
          <DialogHeader>
            <DialogTitle>Novo Ativo</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Selecione o Tipo de Ativo</Label>
              <Select onValueChange={setSelectedTipoId}>
                <SelectTrigger>
                  <SelectValue placeholder="Escolha o tipo de ativo..." />
                </SelectTrigger>
                <SelectContent>
                  {tipos.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="font-mono text-xs">
                          {(t as any).prefix || "---"}
                        </Badge>
                        {t.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                O formulário de cadastro será exibido de acordo com o tipo selecionado.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
          </DialogFooter>
        </>
      );
    }

    // Modo de criação - Etapa 2: Formulário dinâmico
    return (
      <>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setSelectedTipoId(null)}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            Novo {tipoSelecionado?.name || "Ativo"}
          </DialogTitle>
        </DialogHeader>
        <DynamicAssetForm
          tipoId={selectedTipoId}
          tipoNome={tipoSelecionado?.name || "Ativo"}
          formFields={formFields || []}
          onSuccess={handleFormSuccess}
          onCancel={() => setSelectedTipoId(null)}
        />
      </>
    );
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <PageHeader
          title="Ativos"
          description="Gerencie todos os ativos da organização"
          icon={Package}
        />

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar ativos..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10 w-[220px]"
                />
              </div>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  <SelectItem value="disponivel">Disponível</SelectItem>
                  <SelectItem value="em_uso">Em Uso</SelectItem>
                  <SelectItem value="manutencao">Manutenção</SelectItem>
                  <SelectItem value="baixado">Baixado</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterTipo} onValueChange={setFilterTipo}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os tipos</SelectItem>
                  {tipos.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <ImportCelularesDialog />
              <Dialog open={isDialogOpen} onOpenChange={handleDialogClose}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Novo Ativo
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  {renderDialogContent()}
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Patrimônio</TableHead>
                      <TableHead>Nome</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Marca/Modelo</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Responsável</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedAtivos.map((ativo) => (
                      <TableRow key={ativo.id}>
                        <TableCell className="font-medium">{ativo.patrimonio}</TableCell>
                        <TableCell>{ativo.nome}</TableCell>
                        <TableCell>{(ativo as any).tipo?.name || "-"}</TableCell>
                        <TableCell>{ativo.marca} {ativo.modelo}</TableCell>
                        <TableCell>
                          <Badge className={cn("capitalize", statusColors[ativo.status || "disponivel"])}>
                            {ativo.status?.replace("_", " ")}
                          </Badge>
                        </TableCell>
                        <TableCell>{(ativo as any).funcionario?.nome || "-"}</TableCell>
                        <TableCell className="text-right">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            title="Histórico de movimentação"
                            onClick={() => handleOpenHistorico(ativo)}
                          >
                            <History className="h-4 w-4 text-muted-foreground" />
                          </Button>
                          {(ativo as any).funcionario?.nome && (
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Devolver ativo"
                              onClick={() => handleDevolverAtivo(ativo)}
                              disabled={devolverAtivo.isPending}
                            >
                              <Undo2 className="h-4 w-4 text-orange-500" />
                            </Button>
                          )}
                          {(() => {
                            const tipoNome = ((ativo as any).tipo?.name ?? "").toLowerCase();
                            const isComodato = tipoNome.includes("celular") || tipoNome.includes("notebook") || tipoNome.includes("microinform");
                            if (!isComodato || ativo.status !== "em_uso" || !(ativo as any).funcionario?.nome) return null;
                            return (
                              <Button
                                variant="ghost"
                                size="icon"
                                title="Gerar contrato de comodato"
                                onClick={() => setContratoDialogAtivo(ativo)}
                              >
                                <FileText className="h-4 w-4 text-blue-500" />
                              </Button>
                            );
                          })()}
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(ativo)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteClick(ativo)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {paginatedAtivos.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          Nenhum ativo encontrado
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
                {totalCount > PAGE_SIZE && (
                  <DataTablePagination
                    page={page}
                    totalPages={totalPages}
                    totalCount={totalCount}
                    pageSize={PAGE_SIZE}
                    onPageChange={setPage}
                  />
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <HistoricoAtivoDialog
        ativoId={historicoAtivoId}
        ativoNome={historicoAtivoNome}
        open={!!historicoAtivoId}
        onOpenChange={(open) => {
          if (!open) {
            setHistoricoAtivoId(null);
            setHistoricoAtivoNome(undefined);
          }
        }}
      />

      <ConfirmDeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleConfirmDelete}
        itemName={itemToDelete?.nome || ""}
        itemType="ativo"
        isLoading={deleteAtivo.isPending}
      />

      <GerarContratoDialog
        ativo={contratoDialogAtivo as any}
        open={!!contratoDialogAtivo}
        onOpenChange={(open) => { if (!open) setContratoDialogAtivo(null); }}
      />
    </AppLayout>
  );
}
