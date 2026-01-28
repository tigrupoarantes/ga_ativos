import { useState } from "react";
import { OficinaLayout } from "@/components/OficinaLayout";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ClipboardList, Plus, MoreHorizontal, Search, Pencil, Trash2, CheckCircle, AlertCircle } from "lucide-react";
import { useOrdensServico, OrdemServicoInsert } from "@/hooks/useOrdensServico";
import { useVeiculos } from "@/hooks/useVeiculos";
import { useFuncionarios } from "@/hooks/useFuncionarios";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog";

const statusColors: Record<string, string> = {
  aberta: "bg-blue-500",
  em_andamento: "bg-yellow-500",
  aguardando_pecas: "bg-orange-500",
  fechada: "bg-green-500",
  cancelada: "bg-gray-500",
};

const statusLabels: Record<string, string> = {
  aberta: "Aberta",
  em_andamento: "Em Andamento",
  aguardando_pecas: "Aguardando Peças",
  fechada: "Fechada",
  cancelada: "Cancelada",
};

const tipoLabels: Record<string, string> = {
  corretiva: "Corretiva",
  preventiva: "Preventiva",
  revisao: "Revisão",
};

const prioridadeLabels: Record<string, string> = {
  baixa: "Baixa",
  normal: "Normal",
  alta: "Alta",
  urgente: "Urgente",
};

export default function OrdensServico() {
  const { ordensServico, isLoading, createOrdem, updateOrdem, deleteOrdem, fecharOrdem } = useOrdensServico();
  const { veiculos } = useVeiculos();
  const { funcionarios } = useFuncionarios();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isFecharDialogOpen, setIsFecharDialogOpen] = useState(false);
  const [editingOrdem, setEditingOrdem] = useState<typeof ordensServico[0] | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ id: string; numero: string } | null>(null);

  const [formData, setFormData] = useState<OrdemServicoInsert>({
    veiculo_id: null,
    tipo: "corretiva",
    status: "aberta",
    prioridade: "normal",
    descricao: null,
    km_entrada: null,
    responsavel_id: null,
    solicitante_id: null,
    data_previsao: null,
    observacoes: null,
    active: true,
    diagnostico: null,
    solucao: null,
    km_saida: null,
    data_abertura: null,
    data_fechamento: null,
    custo_pecas: null,
    custo_mao_obra: null,
    custo_total: null,
    preventiva_id: null,
  });

  const [fecharData, setFecharData] = useState({
    solucao: "",
    km_saida: "",
  });

  const filteredOrdens = ordensServico.filter((ordem) => {
    const matchesSearch =
      ordem.numero?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ordem.veiculos?.placa.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ordem.descricao?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || ordem.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleOpenDialog = (ordem?: typeof ordensServico[0]) => {
    if (ordem) {
      setEditingOrdem(ordem);
      setFormData({
        veiculo_id: ordem.veiculo_id,
        tipo: ordem.tipo || "corretiva",
        status: ordem.status || "aberta",
        prioridade: ordem.prioridade || "normal",
        descricao: ordem.descricao,
        km_entrada: ordem.km_entrada,
        responsavel_id: ordem.responsavel_id,
        solicitante_id: ordem.solicitante_id,
        data_previsao: ordem.data_previsao,
        observacoes: ordem.observacoes,
        active: ordem.active,
        diagnostico: ordem.diagnostico,
        solucao: ordem.solucao,
        km_saida: ordem.km_saida,
        data_abertura: ordem.data_abertura,
        data_fechamento: ordem.data_fechamento,
        custo_pecas: ordem.custo_pecas,
        custo_mao_obra: ordem.custo_mao_obra,
        custo_total: ordem.custo_total,
        preventiva_id: ordem.preventiva_id,
      });
    } else {
      setEditingOrdem(null);
      setFormData({
        veiculo_id: null,
        tipo: "corretiva",
        status: "aberta",
        prioridade: "normal",
        descricao: null,
        km_entrada: null,
        responsavel_id: null,
        solicitante_id: null,
        data_previsao: null,
        observacoes: null,
        active: true,
        diagnostico: null,
        solucao: null,
        km_saida: null,
        data_abertura: null,
        data_fechamento: null,
        custo_pecas: null,
        custo_mao_obra: null,
        custo_total: null,
        preventiva_id: null,
      });
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingOrdem) {
      await updateOrdem.mutateAsync({ id: editingOrdem.id, ...formData });
    } else {
      await createOrdem.mutateAsync(formData);
    }
    setIsDialogOpen(false);
  };

  const handleDeleteClick = (ordem: typeof ordensServico[0]) => {
    setItemToDelete({ id: ordem.id, numero: ordem.numero || "" });
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (itemToDelete) {
      await deleteOrdem.mutateAsync(itemToDelete.id);
      setDeleteDialogOpen(false);
      setItemToDelete(null);
    }
  };

  const handleFechar = async () => {
    if (!editingOrdem) return;
    await fecharOrdem.mutateAsync({
      id: editingOrdem.id,
      solucao: fecharData.solucao || undefined,
      km_saida: fecharData.km_saida ? parseInt(fecharData.km_saida) : undefined,
    });
    setIsFecharDialogOpen(false);
    setFecharData({ solucao: "", km_saida: "" });
  };

  const openFecharDialog = (ordem: typeof ordensServico[0]) => {
    setEditingOrdem(ordem);
    setFecharData({ solucao: "", km_saida: "" });
    setIsFecharDialogOpen(true);
  };

  return (
    <OficinaLayout>
      <div className="space-y-6">
        <PageHeader
          title="Ordens de Serviço"
          description="Gerencie todas as ordens de serviço"
          icon={ClipboardList}
        />

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar ordem..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-[300px]"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filtrar por status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  <SelectItem value="aberta">Aberta</SelectItem>
                  <SelectItem value="em_andamento">Em Andamento</SelectItem>
                  <SelectItem value="aguardando_pecas">Aguardando Peças</SelectItem>
                  <SelectItem value="fechada">Fechada</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Ordem
            </Button>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">Carregando...</div>
            ) : filteredOrdens.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="p-4 rounded-full bg-muted mb-4">
                  <AlertCircle className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium mb-2">Nenhuma ordem de serviço</h3>
                <p className="text-muted-foreground max-w-sm">
                  As ordens de serviço aparecerão aqui quando você criar a primeira.
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Número</TableHead>
                    <TableHead>Veículo</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Prioridade</TableHead>
                    <TableHead>Data Abertura</TableHead>
                    <TableHead>Responsável</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrdens.map((ordem) => (
                    <TableRow key={ordem.id}>
                      <TableCell className="font-mono">{ordem.numero}</TableCell>
                      <TableCell>
                        {ordem.veiculos ? (
                          <div>
                            <div className="font-medium">{ordem.veiculos.placa}</div>
                            <div className="text-sm text-muted-foreground">
                              {ordem.veiculos.marca} {ordem.veiculos.modelo}
                            </div>
                          </div>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell>{tipoLabels[ordem.tipo || "corretiva"]}</TableCell>
                      <TableCell>
                        <Badge className={statusColors[ordem.status || "aberta"]}>
                          {statusLabels[ordem.status || "aberta"]}
                        </Badge>
                      </TableCell>
                      <TableCell>{prioridadeLabels[ordem.prioridade || "normal"]}</TableCell>
                      <TableCell>
                        {ordem.data_abertura
                          ? format(new Date(ordem.data_abertura), "dd/MM/yyyy HH:mm", { locale: ptBR })
                          : "-"}
                      </TableCell>
                      <TableCell>{ordem.responsavel?.nome || "-"}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleOpenDialog(ordem)}>
                              <Pencil className="h-4 w-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                            {ordem.status !== "fechada" && (
                              <DropdownMenuItem onClick={() => openFecharDialog(ordem)}>
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Fechar Ordem
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              onClick={() => handleDeleteClick(ordem)}
                              className="text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Dialog de Criar/Editar */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingOrdem ? "Editar Ordem de Serviço" : "Nova Ordem de Serviço"}
              </DialogTitle>
              <DialogDescription>
                Preencha os dados da ordem de serviço
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Veículo *</Label>
                  <Select
                    value={formData.veiculo_id || ""}
                    onValueChange={(value) => setFormData({ ...formData, veiculo_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o veículo" />
                    </SelectTrigger>
                    <SelectContent>
                      {veiculos.map((v) => (
                        <SelectItem key={v.id} value={v.id}>
                          {v.placa} - {v.marca} {v.modelo}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Tipo *</Label>
                  <Select
                    value={formData.tipo || "corretiva"}
                    onValueChange={(value) => setFormData({ ...formData, tipo: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="corretiva">Corretiva</SelectItem>
                      <SelectItem value="preventiva">Preventiva</SelectItem>
                      <SelectItem value="revisao">Revisão</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={formData.status || "aberta"}
                    onValueChange={(value) => setFormData({ ...formData, status: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="aberta">Aberta</SelectItem>
                      <SelectItem value="em_andamento">Em Andamento</SelectItem>
                      <SelectItem value="aguardando_pecas">Aguardando Peças</SelectItem>
                      <SelectItem value="fechada">Fechada</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Prioridade</Label>
                  <Select
                    value={formData.prioridade || "normal"}
                    onValueChange={(value) => setFormData({ ...formData, prioridade: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="baixa">Baixa</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="alta">Alta</SelectItem>
                      <SelectItem value="urgente">Urgente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Responsável</Label>
                  <Select
                    value={formData.responsavel_id || "none"}
                    onValueChange={(value) =>
                      setFormData({ ...formData, responsavel_id: value === "none" ? null : value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhum</SelectItem>
                      {funcionarios.map((f) => (
                        <SelectItem key={f.id} value={f.id}>
                          {f.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>KM Entrada</Label>
                  <Input
                    type="number"
                    value={formData.km_entrada || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, km_entrada: e.target.value ? parseInt(e.target.value) : null })
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Descrição do Problema</Label>
                <Textarea
                  value={formData.descricao || ""}
                  onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label>Observações</Label>
                <Textarea
                  value={formData.observacoes || ""}
                  onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                  rows={2}
                />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={createOrdem.isPending || updateOrdem.isPending}>
                  {editingOrdem ? "Salvar" : "Criar"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Dialog de Fechar Ordem */}
        <Dialog open={isFecharDialogOpen} onOpenChange={setIsFecharDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Fechar Ordem de Serviço</DialogTitle>
              <DialogDescription>
                {editingOrdem?.numero} - {editingOrdem?.veiculos?.placa}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Solução Aplicada</Label>
                <Textarea
                  value={fecharData.solucao}
                  onChange={(e) => setFecharData({ ...fecharData, solucao: e.target.value })}
                  rows={3}
                  placeholder="Descreva a solução aplicada..."
                />
              </div>
              <div className="space-y-2">
                <Label>KM Saída</Label>
                <Input
                  type="number"
                  value={fecharData.km_saida}
                  onChange={(e) => setFecharData({ ...fecharData, km_saida: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsFecharDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleFechar} disabled={fecharOrdem.isPending}>
                <CheckCircle className="h-4 w-4 mr-2" />
                Fechar Ordem
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <ConfirmDeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleConfirmDelete}
        itemName={itemToDelete?.numero || ""}
        itemType="ordem de serviço"
        isLoading={deleteOrdem.isPending}
      />
    </OficinaLayout>
  );
}
