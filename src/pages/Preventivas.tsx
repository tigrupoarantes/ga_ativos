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
import { Calendar, Plus, MoreHorizontal, Search, Pencil, Trash2, AlertCircle, CheckCircle, AlertTriangle, Clock } from "lucide-react";
import { usePreventivas, PreventivaInsert } from "@/hooks/usePreventivas";
import { useVeiculos } from "@/hooks/useVeiculos";
import { format, differenceInDays, isPast } from "date-fns";
import { ptBR } from "date-fns/locale";

const statusColors: Record<string, string> = {
  pendente: "bg-blue-500",
  realizada: "bg-green-500",
  vencida: "bg-red-500",
  cancelada: "bg-gray-500",
};

const statusLabels: Record<string, string> = {
  pendente: "Pendente",
  realizada: "Realizada",
  vencida: "Vencida",
  cancelada: "Cancelada",
};

export default function Preventivas() {
  const { preventivas, preventivasVencidas, preventivasProximas, isLoading, createPreventiva, updatePreventiva, deletePreventiva, realizarPreventiva } = usePreventivas();
  const { veiculos } = useVeiculos();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isRealizarDialogOpen, setIsRealizarDialogOpen] = useState(false);
  const [editingPreventiva, setEditingPreventiva] = useState<typeof preventivas[0] | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const [formData, setFormData] = useState<PreventivaInsert>({
    veiculo_id: null,
    tipo_manutencao: "",
    descricao: null,
    periodicidade_km: null,
    periodicidade_dias: null,
    ultima_realizacao: null,
    ultimo_km: null,
    proxima_realizacao: null,
    proximo_km: null,
    status: "pendente",
    observacoes: null,
    active: true,
  });

  const [realizarData, setRealizarData] = useState({
    km_atual: "",
  });

  const getComputedStatus = (preventiva: typeof preventivas[0]) => {
    if (preventiva.status === "realizada" || preventiva.status === "cancelada") {
      return preventiva.status;
    }
    if (preventiva.proxima_realizacao && isPast(new Date(preventiva.proxima_realizacao))) {
      return "vencida";
    }
    if (preventiva.proximo_km && preventiva.veiculos?.km_atual && preventiva.veiculos.km_atual >= preventiva.proximo_km) {
      return "vencida";
    }
    return preventiva.status || "pendente";
  };

  const filteredPreventivas = preventivas.filter((preventiva) => {
    const matchesSearch =
      preventiva.tipo_manutencao.toLowerCase().includes(searchTerm.toLowerCase()) ||
      preventiva.veiculos?.placa.toLowerCase().includes(searchTerm.toLowerCase());
    const computedStatus = getComputedStatus(preventiva);
    const matchesStatus = statusFilter === "all" || computedStatus === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleOpenDialog = (preventiva?: typeof preventivas[0]) => {
    if (preventiva) {
      setEditingPreventiva(preventiva);
      setFormData({
        veiculo_id: preventiva.veiculo_id,
        tipo_manutencao: preventiva.tipo_manutencao,
        descricao: preventiva.descricao,
        periodicidade_km: preventiva.periodicidade_km,
        periodicidade_dias: preventiva.periodicidade_dias,
        ultima_realizacao: preventiva.ultima_realizacao,
        ultimo_km: preventiva.ultimo_km,
        proxima_realizacao: preventiva.proxima_realizacao,
        proximo_km: preventiva.proximo_km,
        status: preventiva.status,
        observacoes: preventiva.observacoes,
        active: preventiva.active,
      });
    } else {
      setEditingPreventiva(null);
      setFormData({
        veiculo_id: null,
        tipo_manutencao: "",
        descricao: null,
        periodicidade_km: null,
        periodicidade_dias: null,
        ultima_realizacao: null,
        ultimo_km: null,
        proxima_realizacao: null,
        proximo_km: null,
        status: "pendente",
        observacoes: null,
        active: true,
      });
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingPreventiva) {
      await updatePreventiva.mutateAsync({ id: editingPreventiva.id, ...formData });
    } else {
      await createPreventiva.mutateAsync(formData);
    }
    setIsDialogOpen(false);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Tem certeza que deseja excluir esta preventiva?")) {
      await deletePreventiva.mutateAsync(id);
    }
  };

  const openRealizarDialog = (preventiva: typeof preventivas[0]) => {
    setEditingPreventiva(preventiva);
    setRealizarData({ km_atual: preventiva.veiculos?.km_atual?.toString() || "" });
    setIsRealizarDialogOpen(true);
  };

  const handleRealizar = async () => {
    if (!editingPreventiva) return;
    await realizarPreventiva.mutateAsync({
      id: editingPreventiva.id,
      km_atual: realizarData.km_atual ? parseInt(realizarData.km_atual) : undefined,
    });
    setIsRealizarDialogOpen(false);
  };

  const getDiasRestantes = (preventiva: typeof preventivas[0]) => {
    if (!preventiva.proxima_realizacao) return null;
    return differenceInDays(new Date(preventiva.proxima_realizacao), new Date());
  };

  const getKmRestantes = (preventiva: typeof preventivas[0]) => {
    if (!preventiva.proximo_km || !preventiva.veiculos?.km_atual) return null;
    return preventiva.proximo_km - preventiva.veiculos.km_atual;
  };

  return (
    <OficinaLayout>
      <div className="space-y-6">
        <PageHeader
          title="Manutenções Preventivas"
          description="Agende e gerencie manutenções preventivas"
          icon={Calendar}
        />

        {/* Alertas */}
        {(preventivasVencidas.length > 0 || preventivasProximas.length > 0) && (
          <div className="grid gap-4 md:grid-cols-2">
            {preventivasVencidas.length > 0 && (
              <Card className="border-red-500 bg-red-500/10">
                <CardContent className="py-4">
                  <div className="flex items-center gap-2 text-red-600">
                    <AlertTriangle className="h-5 w-5" />
                    <span className="font-medium">
                      {preventivasVencidas.length} preventiva(s) vencida(s)
                    </span>
                  </div>
                </CardContent>
              </Card>
            )}
            {preventivasProximas.length > 0 && (
              <Card className="border-yellow-500 bg-yellow-500/10">
                <CardContent className="py-4">
                  <div className="flex items-center gap-2 text-yellow-600">
                    <Clock className="h-5 w-5" />
                    <span className="font-medium">
                      {preventivasProximas.length} preventiva(s) próxima(s) do vencimento
                    </span>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar preventiva..."
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
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="vencida">Vencida</SelectItem>
                  <SelectItem value="realizada">Realizada</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              Agendar Preventiva
            </Button>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">Carregando...</div>
            ) : filteredPreventivas.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="p-4 rounded-full bg-muted mb-4">
                  <AlertCircle className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium mb-2">Nenhuma preventiva agendada</h3>
                <p className="text-muted-foreground max-w-sm">
                  Configure manutenções preventivas para veículos e ativos.
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Veículo</TableHead>
                    <TableHead>Tipo Manutenção</TableHead>
                    <TableHead>Periodicidade</TableHead>
                    <TableHead>Próxima Realização</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPreventivas.map((preventiva) => {
                    const computedStatus = getComputedStatus(preventiva);
                    const diasRestantes = getDiasRestantes(preventiva);
                    const kmRestantes = getKmRestantes(preventiva);

                    return (
                      <TableRow key={preventiva.id}>
                        <TableCell>
                          {preventiva.veiculos ? (
                            <div>
                              <div className="font-medium">{preventiva.veiculos.placa}</div>
                              <div className="text-sm text-muted-foreground">
                                {preventiva.veiculos.marca} {preventiva.veiculos.modelo}
                              </div>
                            </div>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{preventiva.tipo_manutencao}</div>
                          {preventiva.descricao && (
                            <div className="text-sm text-muted-foreground">{preventiva.descricao}</div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {preventiva.periodicidade_dias && (
                              <div className="text-sm">A cada {preventiva.periodicidade_dias} dias</div>
                            )}
                            {preventiva.periodicidade_km && (
                              <div className="text-sm">A cada {preventiva.periodicidade_km.toLocaleString()} km</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {preventiva.proxima_realizacao && (
                              <div className="text-sm">
                                {format(new Date(preventiva.proxima_realizacao), "dd/MM/yyyy", { locale: ptBR })}
                                {diasRestantes !== null && (
                                  <span className={`ml-1 ${diasRestantes < 0 ? "text-red-500" : diasRestantes <= 7 ? "text-yellow-500" : "text-muted-foreground"}`}>
                                    ({diasRestantes < 0 ? `${Math.abs(diasRestantes)}d atrasado` : `${diasRestantes}d restantes`})
                                  </span>
                                )}
                              </div>
                            )}
                            {preventiva.proximo_km && (
                              <div className="text-sm">
                                {preventiva.proximo_km.toLocaleString()} km
                                {kmRestantes !== null && (
                                  <span className={`ml-1 ${kmRestantes < 0 ? "text-red-500" : kmRestantes <= 500 ? "text-yellow-500" : "text-muted-foreground"}`}>
                                    ({kmRestantes < 0 ? `${Math.abs(kmRestantes)}km excedido` : `${kmRestantes}km restantes`})
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={statusColors[computedStatus]}>
                            {statusLabels[computedStatus]}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {computedStatus !== "realizada" && (
                                <DropdownMenuItem onClick={() => openRealizarDialog(preventiva)}>
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                  Marcar como Realizada
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem onClick={() => handleOpenDialog(preventiva)}>
                                <Pencil className="h-4 w-4 mr-2" />
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleDelete(preventiva.id)}
                                className="text-destructive"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Excluir
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Dialog de Criar/Editar */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {editingPreventiva ? "Editar Preventiva" : "Agendar Preventiva"}
              </DialogTitle>
              <DialogDescription>Configure a manutenção preventiva</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
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
                <Label>Tipo de Manutenção *</Label>
                <Input
                  value={formData.tipo_manutencao}
                  onChange={(e) => setFormData({ ...formData, tipo_manutencao: e.target.value })}
                  placeholder="Ex: Troca de óleo, Alinhamento..."
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Descrição</Label>
                <Textarea
                  value={formData.descricao || ""}
                  onChange={(e) => setFormData({ ...formData, descricao: e.target.value || null })}
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Periodicidade (dias)</Label>
                  <Input
                    type="number"
                    value={formData.periodicidade_dias || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, periodicidade_dias: e.target.value ? parseInt(e.target.value) : null })
                    }
                    placeholder="Ex: 180"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Periodicidade (km)</Label>
                  <Input
                    type="number"
                    value={formData.periodicidade_km || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, periodicidade_km: e.target.value ? parseInt(e.target.value) : null })
                    }
                    placeholder="Ex: 10000"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Última Realização</Label>
                  <Input
                    type="date"
                    value={formData.ultima_realizacao || ""}
                    onChange={(e) => setFormData({ ...formData, ultima_realizacao: e.target.value || null })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Último KM</Label>
                  <Input
                    type="number"
                    value={formData.ultimo_km || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, ultimo_km: e.target.value ? parseInt(e.target.value) : null })
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Observações</Label>
                <Textarea
                  value={formData.observacoes || ""}
                  onChange={(e) => setFormData({ ...formData, observacoes: e.target.value || null })}
                  rows={2}
                />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={createPreventiva.isPending || updatePreventiva.isPending}>
                  {editingPreventiva ? "Salvar" : "Agendar"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Dialog de Realizar Preventiva */}
        <Dialog open={isRealizarDialogOpen} onOpenChange={setIsRealizarDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Registrar Realização</DialogTitle>
              <DialogDescription>
                {editingPreventiva?.tipo_manutencao} - {editingPreventiva?.veiculos?.placa}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>KM Atual do Veículo</Label>
                <Input
                  type="number"
                  value={realizarData.km_atual}
                  onChange={(e) => setRealizarData({ ...realizarData, km_atual: e.target.value })}
                  placeholder="Informe o KM atual"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsRealizarDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleRealizar} disabled={realizarPreventiva.isPending}>
                <CheckCircle className="h-4 w-4 mr-2" />
                Confirmar Realização
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </OficinaLayout>
  );
}
