import { useState } from "react";
import { OficinaLayout } from "@/components/OficinaLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { Calendar, Plus, MoreHorizontal, Check, RefreshCw, X, Filter } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog";
import {
  useServiceAppointments,
  ServiceAppointment,
  ServiceAppointmentInsert,
  ServiceType,
  AppointmentStatus,
  AppointmentPriority,
} from "@/hooks/useServiceAppointments";
import { useVeiculos } from "@/hooks/useVeiculos";
import { useFuncionarios } from "@/hooks/useFuncionarios";

const SERVICE_TYPE_LABELS: Record<ServiceType, string> = {
  preventiva: "Preventiva",
  revisao: "Revisão",
  corretiva: "Corretiva",
  lavagem: "Lavagem",
};

const STATUS_LABELS: Record<AppointmentStatus, string> = {
  agendada: "Agendada",
  confirmada: "Confirmada",
  em_execucao: "Em Execução",
  concluida: "Concluída",
  reagendada: "Reagendada",
  cancelada: "Cancelada",
  faltou: "Faltou",
};

const STATUS_COLORS: Record<AppointmentStatus, string> = {
  agendada: "bg-blue-500/20 text-blue-700 border-blue-500/30",
  confirmada: "bg-green-500/20 text-green-700 border-green-500/30",
  em_execucao: "bg-yellow-500/20 text-yellow-700 border-yellow-500/30",
  concluida: "bg-emerald-500/20 text-emerald-700 border-emerald-500/30",
  reagendada: "bg-orange-500/20 text-orange-700 border-orange-500/30",
  cancelada: "bg-red-500/20 text-red-700 border-red-500/30",
  faltou: "bg-gray-500/20 text-gray-700 border-gray-500/30",
};

const PRIORITY_LABELS: Record<AppointmentPriority, string> = {
  baixa: "Baixa",
  normal: "Normal",
  alta: "Alta",
  urgente: "Urgente",
};

const PRIORITY_COLORS: Record<AppointmentPriority, string> = {
  baixa: "bg-slate-500/20 text-slate-700",
  normal: "bg-blue-500/20 text-blue-700",
  alta: "bg-orange-500/20 text-orange-700",
  urgente: "bg-red-500/20 text-red-700",
};

export default function Agenda() {
  const [showFilters, setShowFilters] = useState(false);
  const [filterType, setFilterType] = useState<ServiceType | "all">("all");
  const [filterStatus, setFilterStatus] = useState<AppointmentStatus | "all">("all");
  const [filterVehicle, setFilterVehicle] = useState<string>("all");
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<ServiceAppointment | null>(null);
  const [rescheduleDialogOpen, setRescheduleDialogOpen] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [appointmentToReschedule, setAppointmentToReschedule] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [appointmentToDelete, setAppointmentToDelete] = useState<ServiceAppointment | null>(null);

  // Form state
  const [formData, setFormData] = useState<Partial<ServiceAppointmentInsert>>({
    vehicle_id: "",
    service_type: "preventiva",
    scheduled_at: "",
    priority: "normal",
    assigned_to_employee_id: null,
    notes: "",
  });

  const filters = {
    service_type: filterType !== "all" ? filterType : undefined,
    status: filterStatus !== "all" ? filterStatus : undefined,
    vehicle_id: filterVehicle !== "all" ? filterVehicle : undefined,
  };

  const {
    appointments,
    isLoading,
    createAppointment,
    updateAppointment,
    deleteAppointment,
    concludeAppointment,
    rescheduleAppointment,
    cancelAppointment,
    isCreating,
    isUpdating,
  } = useServiceAppointments(filters);

  const { veiculos } = useVeiculos();
  const { funcionarios } = useFuncionarios();

  const resetForm = () => {
    setFormData({
      vehicle_id: "",
      service_type: "preventiva",
      scheduled_at: "",
      priority: "normal",
      assigned_to_employee_id: null,
      notes: "",
    });
    setEditingAppointment(null);
  };

  const handleOpenDialog = (appointment?: ServiceAppointment) => {
    if (appointment) {
      setEditingAppointment(appointment);
      setFormData({
        vehicle_id: appointment.vehicle_id,
        service_type: appointment.service_type,
        scheduled_at: appointment.scheduled_at.slice(0, 16),
        priority: appointment.priority || "normal",
        assigned_to_employee_id: appointment.assigned_to_employee_id,
        notes: appointment.notes || "",
      });
    } else {
      resetForm();
    }
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.vehicle_id || !formData.scheduled_at) return;

    const payload: ServiceAppointmentInsert = {
      vehicle_id: formData.vehicle_id,
      service_type: formData.service_type as ServiceType,
      scheduled_at: new Date(formData.scheduled_at).toISOString(),
      priority: formData.priority as AppointmentPriority,
      assigned_to_employee_id: formData.assigned_to_employee_id || null,
      notes: formData.notes || null,
    };

    if (editingAppointment) {
      await updateAppointment({ id: editingAppointment.id, ...payload });
    } else {
      await createAppointment(payload);
    }
    setDialogOpen(false);
    resetForm();
  };

  const handleReschedule = async () => {
    if (!appointmentToReschedule || !rescheduleDate) return;
    await rescheduleAppointment(appointmentToReschedule, new Date(rescheduleDate).toISOString());
    setRescheduleDialogOpen(false);
    setAppointmentToReschedule(null);
    setRescheduleDate("");
  };

  const handleDelete = async () => {
    if (!appointmentToDelete) return;
    await deleteAppointment(appointmentToDelete.id);
    setDeleteDialogOpen(false);
    setAppointmentToDelete(null);
  };

  const activeFiltersCount = [filterType, filterStatus, filterVehicle].filter(f => f !== "all").length;

  return (
    <OficinaLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Calendar className="h-6 w-6" />
              Agenda da Oficina
            </h2>
            <p className="text-muted-foreground">
              Gerencie agendamentos de revisões, preventivas e lavagens
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="relative"
            >
              <Filter className="h-4 w-4 mr-2" />
              Filtros
              {activeFiltersCount > 0 && (
                <Badge className="ml-2 h-5 w-5 p-0 flex items-center justify-center text-xs">
                  {activeFiltersCount}
                </Badge>
              )}
            </Button>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Agendamento
            </Button>
          </div>
        </div>

        {/* Filters */}
        {showFilters && (
          <Card>
            <CardContent className="pt-6">
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label>Tipo de Serviço</Label>
                  <Select value={filterType} onValueChange={(v) => setFilterType(v as ServiceType | "all")}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      {Object.entries(SERVICE_TYPE_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as AppointmentStatus | "all")}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      {Object.entries(STATUS_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Veículo</Label>
                  <Select value={filterVehicle} onValueChange={setFilterVehicle}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      {veiculos.map((v) => (
                        <SelectItem key={v.id} value={v.id}>
                          {v.placa} - {v.marca} {v.modelo}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {activeFiltersCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-4"
                  onClick={() => {
                    setFilterType("all");
                    setFilterStatus("all");
                    setFilterVehicle("all");
                  }}
                >
                  Limpar filtros
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* Table */}
        <Card>
          <CardHeader>
            <CardTitle>Agendamentos</CardTitle>
            <CardDescription>
              {appointments.length} agendamento(s) encontrado(s)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : appointments.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Nenhum agendamento encontrado</h3>
                <p className="text-muted-foreground mb-4">
                  Crie seu primeiro agendamento para começar
                </p>
                <Button onClick={() => handleOpenDialog()}>
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Agendamento
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Veículo</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Data/Hora</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Prioridade</TableHead>
                      <TableHead>Responsável</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {appointments.map((appointment) => (
                      <TableRow key={appointment.id}>
                        <TableCell className="font-medium">
                          {appointment.veiculos?.placa || "-"}
                          <div className="text-xs text-muted-foreground">
                            {appointment.veiculos?.marca} {appointment.veiculos?.modelo}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {SERVICE_TYPE_LABELS[appointment.service_type]}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {format(new Date(appointment.scheduled_at), "dd/MM/yyyy", { locale: ptBR })}
                          <div className="text-xs text-muted-foreground">
                            {format(new Date(appointment.scheduled_at), "HH:mm")}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={STATUS_COLORS[appointment.status]}>
                            {STATUS_LABELS[appointment.status]}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {appointment.priority && (
                            <Badge variant="secondary" className={PRIORITY_COLORS[appointment.priority]}>
                              {PRIORITY_LABELS[appointment.priority]}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {appointment.assigned_employee?.nome || "-"}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleOpenDialog(appointment)}>
                                Editar
                              </DropdownMenuItem>
                              {appointment.status !== "concluida" && appointment.status !== "cancelada" && (
                                <>
                                  <DropdownMenuItem
                                    onClick={() => concludeAppointment(appointment.id)}
                                  >
                                    <Check className="h-4 w-4 mr-2" />
                                    Concluir
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setAppointmentToReschedule(appointment.id);
                                      setRescheduleDialogOpen(true);
                                    }}
                                  >
                                    <RefreshCw className="h-4 w-4 mr-2" />
                                    Reagendar
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => cancelAppointment(appointment.id)}
                                  >
                                    <X className="h-4 w-4 mr-2" />
                                    Cancelar
                                  </DropdownMenuItem>
                                </>
                              )}
                              <DropdownMenuItem
                                onClick={() => {
                                  setAppointmentToDelete(appointment);
                                  setDeleteDialogOpen(true);
                                }}
                                className="text-destructive"
                              >
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

        {/* Create/Edit Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>
                {editingAppointment ? "Editar Agendamento" : "Novo Agendamento"}
              </DialogTitle>
              <DialogDescription>
                Preencha os dados do agendamento
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="vehicle">Veículo *</Label>
                <Select
                  value={formData.vehicle_id}
                  onValueChange={(v) => setFormData({ ...formData, vehicle_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um veículo" />
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
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="type">Tipo de Serviço *</Label>
                  <Select
                    value={formData.service_type}
                    onValueChange={(v) => setFormData({ ...formData, service_type: v as ServiceType })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(SERVICE_TYPE_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="priority">Prioridade</Label>
                  <Select
                    value={formData.priority}
                    onValueChange={(v) => setFormData({ ...formData, priority: v as AppointmentPriority })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(PRIORITY_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="scheduled_at">Data e Hora *</Label>
                <Input
                  id="scheduled_at"
                  type="datetime-local"
                  value={formData.scheduled_at}
                  onChange={(e) => setFormData({ ...formData, scheduled_at: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="assigned">Responsável</Label>
                <Select
                  value={formData.assigned_to_employee_id || "none"}
                  onValueChange={(v) => setFormData({ ...formData, assigned_to_employee_id: v === "none" ? null : v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um responsável" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum</SelectItem>
                    {funcionarios.map((f) => (
                      <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Observações</Label>
                <Textarea
                  id="notes"
                  value={formData.notes || ""}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Observações adicionais..."
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!formData.vehicle_id || !formData.scheduled_at || isCreating || isUpdating}
              >
                {isCreating || isUpdating ? "Salvando..." : "Salvar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Reschedule Dialog */}
        <Dialog open={rescheduleDialogOpen} onOpenChange={setRescheduleDialogOpen}>
          <DialogContent className="sm:max-w-[400px]">
            <DialogHeader>
              <DialogTitle>Reagendar</DialogTitle>
              <DialogDescription>
                Selecione a nova data e hora para o agendamento
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Label htmlFor="newDate">Nova Data e Hora</Label>
              <Input
                id="newDate"
                type="datetime-local"
                value={rescheduleDate}
                onChange={(e) => setRescheduleDate(e.target.value)}
                className="mt-2"
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setRescheduleDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleReschedule} disabled={!rescheduleDate || isUpdating}>
                {isUpdating ? "Salvando..." : "Reagendar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Dialog */}
        <ConfirmDeleteDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          onConfirm={handleDelete}
          itemName={appointmentToDelete?.veiculos?.placa || "agendamento"}
          itemType="Agendamento"
        />
      </div>
    </OficinaLayout>
  );
}
