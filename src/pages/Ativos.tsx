import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { useAtivos, useTiposAtivos } from "@/hooks/useAtivos";
import { useFuncionariosCombobox } from "@/hooks/useSelectOptions";
import { useEmpresas } from "@/hooks/useEmpresas";
import { FuncionarioCombobox } from "@/components/FuncionarioCombobox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Search, Edit, Trash2, Package, History } from "lucide-react";
import { cn } from "@/lib/utils";
import { NotebookForm } from "@/components/NotebookForm";
import { HistoricoAtivoDialog } from "@/components/HistoricoAtivoDialog";
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog";
import { useQueryClient } from "@tanstack/react-query";

const statusColors: Record<string, string> = {
  disponivel: "bg-status-success/10 text-status-success",
  em_uso: "bg-status-info/10 text-status-info",
  manutencao: "bg-status-warning/10 text-status-warning",
  baixado: "bg-status-error/10 text-status-error",
};

export default function Ativos() {
  const queryClient = useQueryClient();
  const { ativos, isLoading, createAtivo, updateAtivo, deleteAtivo } = useAtivos();
  const { tipos } = useTiposAtivos();
  const { funcionarios } = useFuncionariosCombobox();
  const { empresas } = useEmpresas();
  const [search, setSearch] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [historicoAtivoId, setHistoricoAtivoId] = useState<string | null>(null);
  const [historicoAtivoNome, setHistoricoAtivoNome] = useState<string | undefined>(undefined);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ id: string; nome: string } | null>(null);
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
  });

  const filteredAtivos = ativos.filter(
    (a) =>
      a.nome?.toLowerCase().includes(search.toLowerCase()) ||
      a.patrimonio?.toLowerCase().includes(search.toLowerCase()) ||
      a.marca?.toLowerCase().includes(search.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      await updateAtivo.mutateAsync({ id: editingId, ...formData });
    } else {
      await createAtivo.mutateAsync(formData);
    }
    setIsDialogOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setEditingId(null);
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

  // Verificar se o tipo selecionado é Notebook
  const tipoSelecionado = tipos.find((t) => t.id === formData.tipo_id);
  const isNotebook = tipoSelecionado?.name?.toLowerCase().includes("notebook");

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
            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar ativos..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10 w-[300px]"
                />
              </div>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Ativo
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>
                    {editingId ? "Editar Ativo" : isNotebook ? "Novo Notebook" : "Novo Ativo"}
                  </DialogTitle>
                </DialogHeader>
                
                {/* Formulário específico para Notebook (sem edição) */}
                {!editingId && isNotebook ? (
                  <NotebookForm
                    onSuccess={handleFormSuccess}
                    onCancel={() => setIsDialogOpen(false)}
                  />
                ) : (
                  /* Formulário padrão para outros tipos e edição */
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="patrimonio">Patrimônio *</Label>
                        <Input
                          id="patrimonio"
                          value={formData.patrimonio}
                          onChange={(e) => setFormData({ ...formData, patrimonio: e.target.value })}
                          required
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
                      <Button type="submit" disabled={createAtivo.isPending || updateAtivo.isPending}>
                        {editingId ? "Salvar" : "Criar"}
                      </Button>
                    </DialogFooter>
                  </form>
                )}
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : (
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
                  {filteredAtivos.map((ativo) => (
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
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(ativo)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteClick(ativo)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredAtivos.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        Nenhum ativo encontrado
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
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
    </AppLayout>
  );
}
