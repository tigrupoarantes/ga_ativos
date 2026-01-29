import { useState } from "react";
import { OficinaLayout } from "@/components/OficinaLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Plus,
  MoreHorizontal,
  Edit,
  Trash2,
  Pause,
  Play,
  CalendarPlus,
  CheckCircle,
  Droplets,
  Car,
  Clock,
} from "lucide-react";
import { useWashPlans, WashPlanInsert } from "@/hooks/useWashPlans";
import { useServiceAppointments } from "@/hooks/useServiceAppointments";
import { useVeiculos } from "@/hooks/useVeiculos";
import { format, isToday, startOfDay, endOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";

const washTypeLabels: Record<string, string> = {
  simples: "Lavagem Simples",
  completa: "Lavagem Completa",
  interna: "Lavagem Interna",
  motor: "Lavagem de Motor",
  higienizacao: "Higienização",
};

const weekdayLabels = [
  "Domingo",
  "Segunda",
  "Terça",
  "Quarta",
  "Quinta",
  "Sexta",
  "Sábado",
];

const statusColors: Record<string, string> = {
  ativo: "bg-green-500/10 text-green-700 border-green-200",
  pausado: "bg-yellow-500/10 text-yellow-700 border-yellow-200",
  cancelado: "bg-red-500/10 text-red-700 border-red-200",
};

export default function Lavagens() {
  const [activeTab, setActiveTab] = useState("planos");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<any>(null);
  const [formData, setFormData] = useState<Partial<WashPlanInsert>>({
    wash_type: "simples",
    status: "ativo",
  });

  const { washPlans, isLoading: loadingPlans, createWashPlan, updateWashPlan, deleteWashPlan, pauseWashPlan, activateWashPlan } = useWashPlans();
  const { appointments, isLoading: loadingAppointments, concludeAppointment, createAppointment, isUpdating } = useServiceAppointments();
  const { veiculos } = useVeiculos();

  // Filtrar apenas lavagens de hoje
  const todayStart = startOfDay(new Date()).toISOString();
  const todayEnd = endOfDay(new Date()).toISOString();
  
  const todayWashAppointments = appointments.filter(
    (a) =>
      a.service_type === "lavagem" && 
      a.scheduled_at >= todayStart && 
      a.scheduled_at <= todayEnd &&
      a.status !== "concluida" &&
      a.status !== "cancelada"
  );

  const handleOpenDialog = (plan?: any) => {
    if (plan) {
      setEditingPlan(plan);
      setFormData({
        vehicle_id: plan.vehicle_id,
        wash_type: plan.wash_type,
        frequency_days: plan.frequency_days,
        preferred_weekday: plan.preferred_weekday,
        estimated_minutes: plan.estimated_minutes,
        notes: plan.notes,
        status: plan.status,
      });
    } else {
      setEditingPlan(null);
      setFormData({
        wash_type: "simples",
        status: "ativo",
      });
    }
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.vehicle_id) {
      return;
    }

    if (editingPlan) {
      await updateWashPlan.mutateAsync({
        id: editingPlan.id,
        ...formData,
      });
    } else {
      await createWashPlan.mutateAsync(formData as WashPlanInsert);
    }
    setDialogOpen(false);
  };

  const handleGenerateAppointment = async (plan: any) => {
    const scheduledAt = new Date();
    scheduledAt.setHours(9, 0, 0, 0); // Agendar para 9h

    await createAppointment({
      vehicle_id: plan.vehicle_id,
      service_type: "lavagem",
      origin: "wash_plan",
      scheduled_at: scheduledAt.toISOString(),
      status: "agendada",
      priority: "normal",
      wash_plan_id: plan.id,
      notes: `Lavagem ${washTypeLabels[plan.wash_type] || plan.wash_type}`,
    });
  };

  const handleConcludeWash = async (appointmentId: string) => {
    await concludeAppointment(appointmentId);
  };

  return (
    <OficinaLayout>
      <div className="space-y-6">
        {/* Header com estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Planos Ativos</CardTitle>
              <Droplets className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {washPlans.filter(p => p.status === "ativo").length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Fila do Dia</CardTitle>
              <Car className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{todayWashAppointments.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Concluídas Hoje</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {appointments.filter(
                  a => a.service_type === "lavagem" && 
                  a.status === "concluida" &&
                  a.scheduled_at >= todayStart
                ).length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="flex items-center justify-between">
            <TabsList>
              <TabsTrigger value="planos">Planos de Lavagem</TabsTrigger>
              <TabsTrigger value="fila">Fila do Dia</TabsTrigger>
            </TabsList>
            {activeTab === "planos" && (
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                Novo Plano
              </Button>
            )}
          </div>

          {/* Aba Planos */}
          <TabsContent value="planos" className="mt-4">
            {loadingPlans ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : washPlans.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Droplets className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Nenhum plano de lavagem</h3>
                  <p className="text-muted-foreground mb-4">
                    Crie planos de lavagem recorrentes para os veículos
                  </p>
                  <Button onClick={() => handleOpenDialog()}>
                    <Plus className="h-4 w-4 mr-2" />
                    Criar Plano
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Veículo</TableHead>
                      <TableHead>Tipo de Lavagem</TableHead>
                      <TableHead>Frequência</TableHead>
                      <TableHead>Dia Preferencial</TableHead>
                      <TableHead>Tempo Est.</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {washPlans.map((plan) => (
                      <TableRow key={plan.id}>
                        <TableCell className="font-medium">
                          {plan.veiculo ? (
                            <div>
                              <span className="font-semibold">{plan.veiculo.placa}</span>
                              <span className="text-muted-foreground ml-2 text-sm">
                                {plan.veiculo.marca} {plan.veiculo.modelo}
                              </span>
                            </div>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell>{washTypeLabels[plan.wash_type] || plan.wash_type}</TableCell>
                        <TableCell>
                          {plan.frequency_days ? `A cada ${plan.frequency_days} dias` : "-"}
                        </TableCell>
                        <TableCell>
                          {plan.preferred_weekday !== null
                            ? weekdayLabels[plan.preferred_weekday]
                            : "-"}
                        </TableCell>
                        <TableCell>
                          {plan.estimated_minutes ? `${plan.estimated_minutes} min` : "-"}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={statusColors[plan.status]}>
                            {plan.status.charAt(0).toUpperCase() + plan.status.slice(1)}
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
                              <DropdownMenuItem onClick={() => handleGenerateAppointment(plan)}>
                                <CalendarPlus className="h-4 w-4 mr-2" />
                                Gerar Agendamento
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleOpenDialog(plan)}>
                                <Edit className="h-4 w-4 mr-2" />
                                Editar
                              </DropdownMenuItem>
                              {plan.status === "ativo" ? (
                                <DropdownMenuItem onClick={() => pauseWashPlan.mutate(plan.id)}>
                                  <Pause className="h-4 w-4 mr-2" />
                                  Pausar
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem onClick={() => activateWashPlan.mutate(plan.id)}>
                                  <Play className="h-4 w-4 mr-2" />
                                  Ativar
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => deleteWashPlan.mutate(plan.id)}
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
              </div>
            )}
          </TabsContent>

          {/* Aba Fila do Dia */}
          <TabsContent value="fila" className="mt-4">
            {loadingAppointments ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : todayWashAppointments.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Clock className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Nenhuma lavagem na fila</h3>
                  <p className="text-muted-foreground">
                    Não há lavagens agendadas para hoje
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Veículo</TableHead>
                      <TableHead>Horário</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Observações</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {todayWashAppointments.map((appointment) => (
                      <TableRow key={appointment.id}>
                        <TableCell className="font-medium">
                          {appointment.veiculos ? (
                            <div>
                              <span className="font-semibold">{appointment.veiculos.placa}</span>
                              <span className="text-muted-foreground ml-2 text-sm">
                                {appointment.veiculos.marca} {appointment.veiculos.modelo}
                              </span>
                            </div>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell>
                          {format(new Date(appointment.scheduled_at), "HH:mm", { locale: ptBR })}
                        </TableCell>
                        <TableCell>Lavagem</TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={
                              appointment.status === "agendada"
                                ? "bg-blue-500/10 text-blue-700 border-blue-200"
                                : appointment.status === "confirmada"
                                ? "bg-green-500/10 text-green-700 border-green-200"
                                : appointment.status === "em_execucao"
                                ? "bg-yellow-500/10 text-yellow-700 border-yellow-200"
                                : ""
                            }
                          >
                            {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1).replace("_", " ")}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-xs truncate">
                          {appointment.notes || "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            onClick={() => handleConcludeWash(appointment.id)}
                            disabled={isUpdating}
                          >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Concluir
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Dialog de Criar/Editar Plano */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {editingPlan ? "Editar Plano de Lavagem" : "Novo Plano de Lavagem"}
              </DialogTitle>
              <DialogDescription>
                Configure a rotina de lavagem para um veículo
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="vehicle_id">Veículo *</Label>
                <Select
                  value={formData.vehicle_id || ""}
                  onValueChange={(value) =>
                    setFormData({ ...formData, vehicle_id: value })
                  }
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

              <div className="grid gap-2">
                <Label htmlFor="wash_type">Tipo de Lavagem *</Label>
                <Select
                  value={formData.wash_type || "simples"}
                  onValueChange={(value) =>
                    setFormData({ ...formData, wash_type: value as any })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="simples">Lavagem Simples</SelectItem>
                    <SelectItem value="completa">Lavagem Completa</SelectItem>
                    <SelectItem value="interna">Lavagem Interna</SelectItem>
                    <SelectItem value="motor">Lavagem de Motor</SelectItem>
                    <SelectItem value="higienizacao">Higienização</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="frequency_days">Frequência (dias)</Label>
                  <Input
                    id="frequency_days"
                    type="number"
                    min="1"
                    placeholder="Ex: 7"
                    value={formData.frequency_days || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        frequency_days: e.target.value ? parseInt(e.target.value) : null,
                      })
                    }
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="preferred_weekday">Dia Preferencial</Label>
                  <Select
                    value={formData.preferred_weekday?.toString() || ""}
                    onValueChange={(value) =>
                      setFormData({
                        ...formData,
                        preferred_weekday: value ? parseInt(value) : null,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {weekdayLabels.map((day, index) => (
                        <SelectItem key={index} value={index.toString()}>
                          {day}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="estimated_minutes">Tempo Estimado (minutos)</Label>
                <Input
                  id="estimated_minutes"
                  type="number"
                  min="1"
                  placeholder="Ex: 30"
                  value={formData.estimated_minutes || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      estimated_minutes: e.target.value ? parseInt(e.target.value) : null,
                    })
                  }
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="notes">Observações</Label>
                <Textarea
                  id="notes"
                  placeholder="Observações adicionais..."
                  value={formData.notes || ""}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!formData.vehicle_id || createWashPlan.isPending || updateWashPlan.isPending}
              >
                {editingPlan ? "Salvar" : "Criar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </OficinaLayout>
  );
}
