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
import { Plus, Search, Edit, Trash2, Package, History, ArrowLeft, Undo2, FileText, X, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { HistoricoAtivoDialog } from "@/components/HistoricoAtivoDialog";
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog";
import { useQueryClient } from "@tanstack/react-query";
import { ImportCelularesDialog } from "@/components/ImportCelularesDialog";
import { DataTablePagination } from "@/components/DataTablePagination";
import { GerarContratoDialog } from "@/components/GerarContratoDialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

const statusColors: Record<string, string> = {
  disponivel: "bg-status-success/10 text-status-success",
  em_uso: "bg-status-info/10 text-status-info",
  manutencao: "bg-status-warning/10 text-status-warning",
  baixado: "bg-status-error/10 text-status-error",
};

const PAGE_SIZE = 25;

function normalizeSearchValue(value: string | null | undefined) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export default function Ativos() {
  const queryClient = useQueryClient();
  const { ativos, isLoading, createAtivo, updateAtivo, deleteAtivo, devolverAtivo } = useAtivos();
  const { tipos } = useTiposAtivos();
  const { funcionarios } = useFuncionariosCombobox();
  const { empresas } = useEmpresas();
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterTipo, setFilterTipo] = useState("all");
  const [filterEmpresa, setFilterEmpresa] = useState("all");
  const [filterFuncionario, setFilterFuncionario] = useState("");
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
    const q = normalizeSearchValue(search);
    const searchableValues = [
      a.nome,
      a.patrimonio,
      a.descricao,
      a.numero_serie,
      a.marca,
      a.modelo,
      a.imei,
      a.chip_linha,
      a.status,
      (a as any).funcionario?.nome,
      (a as any).funcionario?.email,
      (a as any).funcionario?.cpf,
      (a as any).empresa?.nome,
      (a as any).tipo?.name,
    ];
    const matchSearch =
      !q ||
      searchableValues.some((value) => normalizeSearchValue(value).includes(q));
    const matchStatus = filterStatus === "all" || a.status === filterStatus;
    const matchTipo = filterTipo === "all" || a.tipo_id === filterTipo;
    const matchEmpresa = filterEmpresa === "all" || a.empresa_id === filterEmpresa;
    const matchFuncionario = !filterFuncionario || a.funcionario_id === filterFuncionario;
    return matchSearch && matchStatus && matchTipo && matchEmpresa && matchFuncionario;
  });

  const totalCount = filteredAtivos.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const paginatedAtivos = filteredAtivos.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [search, filterStatus, filterTipo, filterEmpresa, filterFuncionario]);

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
          <CardHeader className="space-y-3 pb-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-3 flex-wrap flex-1">
                {/* Linha 1: busca + status + tipo */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por ativo, patrimônio, série, marca, modelo, funcionário, empresa, tipo, IMEI ou chip..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10 w-[360px]"
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
              <div className="flex items-center gap-2 shrink-0">
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
            </div>
            {/* Linha 2: empresa + funcionário */}
            <div className="flex items-center gap-3 flex-wrap">
              <Select value={filterEmpresa} onValueChange={setFilterEmpresa}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Empresa" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as empresas</SelectItem>
                  {empresas.map((e) => (
                    <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="relative">
                <FuncionarioCombobox
                  value={filterFuncionario}
                  onValueChange={setFilterFuncionario}
                  funcionarios={funcionarios}
                  placeholder="Filtrar por funcionário..."
                />
                {filterFuncionario && (
                  <button
                    onClick={() => setFilterFuncionario("")}
                    className="absolute right-8 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
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
                <p className="text-sm text-muted-foreground mb-3">
                  {totalCount} {totalCount === 1 ? "ativo encontrado" : "ativos encontrados"}
                </p>
                <Table className="animate-in fade-in-0 duration-200">
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
                    {paginatedAtivos.map((ativo) => {
                      const tipoNome = ((ativo as any).tipo?.name ?? "").toLowerCase();
                      const isComodato = tipoNome.includes("celular") || tipoNome.includes("notebook") || tipoNome.includes("microinform");
                      const temFuncionario = !!(ativo as any).funcionario?.nome;
                      const podeGerарContrato = isComodato && ativo.status === "em_uso" && temFuncionario;
                      return (
                        <TableRow key={ativo.id} className="transition-colors hover:bg-muted/40">
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
                            <div className="flex items-center justify-end gap-1">
                              {/* Menu ... com ações secundárias */}
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => handleOpenHistorico(ativo)}>
                                    <History className="h-4 w-4 mr-2" />
                                    Histórico de movimentação
                                  </DropdownMenuItem>
                                  {temFuncionario && (
                                    <DropdownMenuItem
                                      onClick={() => handleDevolverAtivo(ativo)}
                                      disabled={devolverAtivo.isPending}
                                    >
                                      <Undo2 className="h-4 w-4 mr-2 text-orange-500" />
                                      Devolver ativo
                                    </DropdownMenuItem>
                                  )}
                                  {podeGerарContrato && (
                                    <DropdownMenuItem onClick={() => setContratoDialogAtivo(ativo)}>
                                      <FileText className="h-4 w-4 mr-2 text-blue-500" />
                                      Gerar contrato de comodato
                                    </DropdownMenuItem>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                              {/* Ações primárias diretas */}
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(ativo)}>
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Editar ativo</TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDeleteClick(ativo)}>
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Excluir ativo</TooltipContent>
                              </Tooltip>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
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
