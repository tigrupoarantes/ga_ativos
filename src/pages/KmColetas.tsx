import { useState } from "react";
import { OficinaLayout } from "@/components/OficinaLayout";
import { useOdometerReports } from "@/hooks/useOdometerReports";
import { useVeiculos } from "@/hooks/useVeiculos";
import { useFuncionarios } from "@/hooks/useFuncionarios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Gauge, AlertTriangle, CheckCircle, XCircle, Filter, Smartphone, PenLine, MessageSquare } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { RequestKmWhatsAppButton } from "@/components/RequestKmWhatsAppButton";

const validationStatusConfig = {
  ok: { label: "OK", variant: "default" as const, icon: CheckCircle, className: "bg-green-500/10 text-green-600 border-green-500/20" },
  suspeito: { label: "Suspeito", variant: "secondary" as const, icon: AlertTriangle, className: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20" },
  rejeitado: { label: "Rejeitado", variant: "destructive" as const, icon: XCircle, className: "bg-red-500/10 text-red-600 border-red-500/20" },
};

const sourceConfig = {
  manual: { label: "Manual", icon: PenLine, className: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
  whatsapp: { label: "WhatsApp", icon: Smartphone, className: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" },
};

export default function KmColetas() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [filterVehicle, setFilterVehicle] = useState<string>("");
  const [filterSource, setFilterSource] = useState<string>("");
  
  const [formData, setFormData] = useState({
    vehicle_id: "",
    employee_id: "",
    reported_km: "",
  });

  const { reports, isLoading, createReport } = useOdometerReports({
    vehicleId: filterVehicle || undefined,
    source: filterSource || undefined,
  });
  const { veiculos } = useVeiculos();
  const { funcionarios } = useFuncionarios();

  // Condutores ativos
  const condutores = funcionarios.filter(f => f.is_condutor && f.active);

  // Veículos com motorista para solicitação WhatsApp
  const veiculosComMotorista = veiculos.filter(v => v.funcionario_id && v.active);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.vehicle_id || !formData.employee_id || !formData.reported_km) {
      return;
    }

    await createReport.mutateAsync({
      vehicle_id: formData.vehicle_id,
      employee_id: formData.employee_id,
      reported_km: parseInt(formData.reported_km),
      source: "manual",
    });

    setFormData({ vehicle_id: "", employee_id: "", reported_km: "" });
    setDialogOpen(false);
  };

  // Estatísticas
  const totalReports = reports.length;
  const reportsToday = reports.filter(r => {
    const today = new Date().toDateString();
    return new Date(r.reported_at).toDateString() === today;
  }).length;
  const suspectReports = reports.filter(r => r.validation_status === "suspeito").length;

  return (
    <OficinaLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold">Coletas de KM</h2>
            <p className="text-sm text-muted-foreground">
              Histórico de leituras de hodômetro dos veículos
            </p>
          </div>

          <div className="flex gap-2">
            {/* Solicitar KM via WhatsApp */}
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Solicitar KM
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Solicitar KM via WhatsApp</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Selecione um veículo para enviar solicitação de KM ao motorista responsável:
                  </p>
                  <div className="max-h-[300px] overflow-y-auto space-y-2">
                    {veiculosComMotorista.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        Nenhum veículo com motorista atribuído
                      </p>
                    ) : (
                      veiculosComMotorista.map((v) => {
                        const motorista = funcionarios.find(f => f.id === v.funcionario_id);
                        return (
                          <div
                            key={v.id}
                            className="flex items-center justify-between p-3 border rounded-lg"
                          >
                            <div>
                              <div className="font-medium">{v.placa}</div>
                              <div className="text-sm text-muted-foreground">
                                {motorista?.nome || "Sem motorista"}
                              </div>
                            </div>
                            <RequestKmWhatsAppButton
                              vehicleId={v.id}
                              vehiclePlaca={v.placa}
                              employeeName={motorista?.nome}
                              employeePhone={motorista?.telefone || undefined}
                            />
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Lançar KM
                </Button>
              </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Lançar Leitura de KM</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Veículo *</Label>
                  <Select
                    value={formData.vehicle_id}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, vehicle_id: value }))}
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
                  <Label>Motorista *</Label>
                  <Select
                    value={formData.employee_id}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, employee_id: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o motorista" />
                    </SelectTrigger>
                    <SelectContent>
                      {condutores.map((f) => (
                        <SelectItem key={f.id} value={f.id}>
                          {f.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>KM Atual *</Label>
                  <Input
                    type="number"
                    placeholder="Ex: 45000"
                    value={formData.reported_km}
                    onChange={(e) => setFormData(prev => ({ ...prev, reported_km: e.target.value }))}
                  />
                </div>

                <div className="flex gap-2 justify-end">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={createReport.isPending}>
                    {createReport.isPending ? "Salvando..." : "Salvar"}
                  </Button>
                </div>
              </form>
            </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total de Leituras</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Gauge className="h-5 w-5 text-primary" />
                <span className="text-2xl font-bold">{totalReports}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Leituras Hoje</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span className="text-2xl font-bold">{reportsToday}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Leituras Suspeitas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
                <span className="text-2xl font-bold">{suspectReports}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              <CardTitle className="text-sm font-medium">Filtros</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              <div className="w-full sm:w-auto">
                <Select value={filterVehicle} onValueChange={setFilterVehicle}>
                  <SelectTrigger className="w-full sm:w-[200px]">
                    <SelectValue placeholder="Todos os veículos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Todos os veículos</SelectItem>
                    {veiculos.map((v) => (
                      <SelectItem key={v.id} value={v.id}>
                        {v.placa}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="w-full sm:w-auto">
                <Select value={filterSource} onValueChange={setFilterSource}>
                  <SelectTrigger className="w-full sm:w-[200px]">
                    <SelectValue placeholder="Todas as origens" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Todas as origens</SelectItem>
                    <SelectItem value="manual">Manual</SelectItem>
                    <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {(filterVehicle || filterSource) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setFilterVehicle("");
                    setFilterSource("");
                  }}
                >
                  Limpar filtros
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data/Hora</TableHead>
                  <TableHead>Veículo</TableHead>
                  <TableHead>Motorista</TableHead>
                  <TableHead className="text-right">KM Informado</TableHead>
                  <TableHead>Origem</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Carregando...
                    </TableCell>
                  </TableRow>
                ) : reports.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Nenhuma leitura encontrada
                    </TableCell>
                  </TableRow>
                ) : (
                  reports.map((report) => {
                    const statusConfig = validationStatusConfig[report.validation_status];
                    const srcConfig = sourceConfig[report.source];
                    const StatusIcon = statusConfig.icon;
                    const SourceIcon = srcConfig.icon;

                    return (
                      <TableRow key={report.id}>
                        <TableCell>
                          <div className="text-sm">
                            {format(new Date(report.reported_at), "dd/MM/yyyy", { locale: ptBR })}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {format(new Date(report.reported_at), "HH:mm", { locale: ptBR })}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{report.veiculo?.placa}</div>
                          <div className="text-xs text-muted-foreground">
                            {report.veiculo?.marca} {report.veiculo?.modelo}
                          </div>
                        </TableCell>
                        <TableCell>{report.funcionario?.nome || "-"}</TableCell>
                        <TableCell className="text-right font-mono font-medium">
                          {report.reported_km.toLocaleString("pt-BR")} km
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={srcConfig.className}>
                            <SourceIcon className="h-3 w-3 mr-1" />
                            {srcConfig.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={statusConfig.className}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {statusConfig.label}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </OficinaLayout>
  );
}
