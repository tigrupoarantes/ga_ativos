import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { useContratos } from "@/hooks/useContratos";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Search, Edit, Trash2, FileText, AlertCircle, Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { format, differenceInDays, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog";

const statusColors: Record<string, string> = {
  ativo: "bg-status-success/10 text-status-success",
  vencido: "bg-status-error/10 text-status-error",
  cancelado: "bg-muted text-muted-foreground",
  renovacao: "bg-status-warning/10 text-status-warning",
};

export default function Contratos() {
  const { contratos, isLoading, createContrato, updateContrato, deleteContrato } = useContratos();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ id: string; numero: string } | null>(null);
  const [formData, setFormData] = useState({
    numero: "",
    descricao: "",
    tipo: "",
    fornecedor: "",
    data_inicio: "",
    data_fim: "",
    valor_mensal: "",
    valor_total: "",
    status: "ativo",
    observacoes: "",
  });

  const filteredContratos = contratos.filter(
    (c) =>
      c.numero?.toLowerCase().includes(search.toLowerCase()) ||
      c.fornecedor?.toLowerCase().includes(search.toLowerCase()) ||
      c.descricao?.toLowerCase().includes(search.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      ...formData,
      valor_mensal: formData.valor_mensal ? parseFloat(formData.valor_mensal) : null,
      valor_total: formData.valor_total ? parseFloat(formData.valor_total) : null,
    };
    if (editingId) {
      await updateContrato.mutateAsync({ id: editingId, ...data });
    } else {
      await createContrato.mutateAsync(data);
    }
    setIsDialogOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({
      numero: "",
      descricao: "",
      tipo: "",
      fornecedor: "",
      data_inicio: "",
      data_fim: "",
      valor_mensal: "",
      valor_total: "",
      status: "ativo",
      observacoes: "",
    });
  };

  const handleEdit = (contrato: typeof contratos[0]) => {
    setEditingId(contrato.id);
    setFormData({
      numero: contrato.numero || "",
      descricao: contrato.descricao || "",
      tipo: contrato.tipo || "",
      fornecedor: contrato.fornecedor || "",
      data_inicio: contrato.data_inicio || "",
      data_fim: contrato.data_fim || "",
      valor_mensal: contrato.valor_mensal?.toString() || "",
      valor_total: contrato.valor_total?.toString() || "",
      status: contrato.status || "ativo",
      observacoes: contrato.observacoes || "",
    });
    setIsDialogOpen(true);
  };

  const handleDeleteClick = (contrato: typeof contratos[0]) => {
    setItemToDelete({ id: contrato.id, numero: contrato.numero });
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (itemToDelete) {
      await deleteContrato.mutateAsync(itemToDelete.id);
      setDeleteDialogOpen(false);
      setItemToDelete(null);
    }
  };

  const getDaysToExpire = (dataFim: string | null) => {
    if (!dataFim) return null;
    return differenceInDays(parseISO(dataFim), new Date());
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <PageHeader
          title="Contratos"
          description="Gerencie os contratos da organização"
          icon={FileText}
        />

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar contratos..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 w-[300px]"
              />
            </div>
            <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Contrato
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>{editingId ? "Editar Contrato" : "Novo Contrato"}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="numero">Número *</Label>
                      <Input
                        id="numero"
                        value={formData.numero}
                        onChange={(e) => setFormData({ ...formData, numero: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="tipo">Tipo</Label>
                      <Select value={formData.tipo} onValueChange={(v) => setFormData({ ...formData, tipo: v })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                    <SelectItem value="outsourcing_impressao">Outsourcing Impressão</SelectItem>
                          <SelectItem value="software_erp">Software ERP</SelectItem>
                          <SelectItem value="software_licenca">Software Licença</SelectItem>
                          <SelectItem value="telefonia">Telefonia</SelectItem>
                          <SelectItem value="servico">Serviço</SelectItem>
                          <SelectItem value="fornecimento">Fornecimento</SelectItem>
                          <SelectItem value="locacao">Locação</SelectItem>
                          <SelectItem value="manutencao">Manutenção</SelectItem>
                          <SelectItem value="outro">Outro</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-2 space-y-2">
                      <Label htmlFor="descricao">Descrição</Label>
                      <Input
                        id="descricao"
                        value={formData.descricao}
                        onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="fornecedor">Fornecedor</Label>
                      <Input
                        id="fornecedor"
                        value={formData.fornecedor}
                        onChange={(e) => setFormData({ ...formData, fornecedor: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="status">Status</Label>
                      <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ativo">Ativo</SelectItem>
                          <SelectItem value="vencido">Vencido</SelectItem>
                          <SelectItem value="cancelado">Cancelado</SelectItem>
                          <SelectItem value="renovacao">Em Renovação</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="data_inicio">Data Início</Label>
                      <Input
                        id="data_inicio"
                        type="date"
                        value={formData.data_inicio}
                        onChange={(e) => setFormData({ ...formData, data_inicio: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="data_fim">Data Fim</Label>
                      <Input
                        id="data_fim"
                        type="date"
                        value={formData.data_fim}
                        onChange={(e) => setFormData({ ...formData, data_fim: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="valor_mensal">Valor Mensal (R$)</Label>
                      <Input
                        id="valor_mensal"
                        type="number"
                        step="0.01"
                        value={formData.valor_mensal}
                        onChange={(e) => setFormData({ ...formData, valor_mensal: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="valor_total">Valor Total (R$)</Label>
                      <Input
                        id="valor_total"
                        type="number"
                        step="0.01"
                        value={formData.valor_total}
                        onChange={(e) => setFormData({ ...formData, valor_total: e.target.value })}
                      />
                    </div>
                    <div className="col-span-2 space-y-2">
                      <Label htmlFor="observacoes">Observações</Label>
                      <Textarea
                        id="observacoes"
                        value={formData.observacoes}
                        onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                    <Button type="submit" disabled={createContrato.isPending || updateContrato.isPending}>
                      {editingId ? "Salvar" : "Criar"}
                    </Button>
                  </DialogFooter>
                </form>
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
                    <TableHead>Número</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Fornecedor</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead>Valor Mensal</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredContratos.map((contrato) => {
                    const daysToExpire = getDaysToExpire(contrato.data_fim);
                    return (
                      <TableRow key={contrato.id}>
                        <TableCell className="font-medium">{contrato.numero}</TableCell>
                        <TableCell>{contrato.descricao || "-"}</TableCell>
                        <TableCell>{contrato.fornecedor || "-"}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {contrato.data_fim ? format(parseISO(contrato.data_fim), "dd/MM/yyyy", { locale: ptBR }) : "-"}
                            {daysToExpire !== null && daysToExpire <= 30 && daysToExpire > 0 && (
                              <AlertCircle className="h-4 w-4 text-status-warning" />
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {contrato.valor_mensal
                            ? `R$ ${contrato.valor_mensal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
                            : "-"}
                        </TableCell>
                        <TableCell>
                          <Badge className={cn("capitalize", statusColors[contrato.status || "ativo"])}>
                            {contrato.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" onClick={() => navigate(`/contratos/${contrato.id}`)} title="Ver detalhe">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(contrato)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteClick(contrato)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {filteredContratos.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        Nenhum contrato encontrado
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <ConfirmDeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleConfirmDelete}
        itemName={itemToDelete?.numero || ""}
        itemType="contrato"
        isLoading={deleteContrato.isPending}
      />
    </AppLayout>
  );
}
