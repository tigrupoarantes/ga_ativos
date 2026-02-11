import { useState } from "react";
import { friendlyErrorMessage } from "@/lib/error-handler";
import { OficinaLayout } from "@/components/OficinaLayout";
import { PageHeader } from "@/components/PageHeader";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Bell, Send, RefreshCw, MessageSquare, Mail } from "lucide-react";
import { useNotificationJobs } from "@/hooks/useNotificationJobs";
import { supabase } from "@/integrations/supabase/external-client";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const statusColors: Record<string, string> = {
  pendente: "bg-yellow-100 text-yellow-800",
  enviado: "bg-green-100 text-green-800",
  erro: "bg-red-100 text-red-800",
};

const templateLabels: Record<string, string> = {
  km_request: "Solicitação de KM",
  preventiva_alert: "Alerta Preventiva",
  wash_reminder: "Lembrete Lavagem",
  agenda_reminder: "Lembrete Agenda",
};

export default function Notificacoes() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [channelFilter, setChannelFilter] = useState<string>("all");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isScheduling, setIsScheduling] = useState(false);

  const { jobs, isLoading, refetch, stats } = useNotificationJobs({
    status: statusFilter !== "all" ? statusFilter : undefined,
    channel: channelFilter !== "all" ? channelFilter : undefined,
    limit: 100,
  });

  const processQueue = async () => {
    setIsProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke("whatsapp-send", {
        body: { limit: 20 },
      });

      if (error) throw error;

      toast.success(
        `Processados: ${data.processed}, Enviados: ${data.sent}, Erros: ${data.errors}`
      );
      refetch();
    } catch (error) {
      toast.error(friendlyErrorMessage("processar fila de notificações", error));
    } finally {
      setIsProcessing(false);
    }
  };

  const runScheduler = async () => {
    setIsScheduling(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        "workshop-scheduler"
      );

      if (error) throw error;

      toast.success(
        `Scheduler executado: ${data.jobs_created} jobs criados, ${data.preventivas_alerts} alertas preventiva, ${data.agenda_reminders} lembretes`
      );
      refetch();
    } catch (error) {
      toast.error(friendlyErrorMessage("executar agendador", error));
    } finally {
      setIsScheduling(false);
    }
  };

  return (
    <OficinaLayout>
      <div className="space-y-6">
          <PageHeader
            title="Central de Notificações"
            description="Gerencie a fila de mensagens WhatsApp e alertas automáticos"
            icon={Bell}
          />

          {/* Stats Cards */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.total}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-yellow-600">
                  Pendentes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">
                  {stats.pendentes}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-green-600">
                  Enviados
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {stats.enviados}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-red-600">
                  Erros
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {stats.erros}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Ações</CardTitle>
              <CardDescription>
                Execute manualmente o processamento da fila ou o scheduler de
                alertas
              </CardDescription>
            </CardHeader>
            <CardContent className="flex gap-4">
              <Button
                onClick={processQueue}
                disabled={isProcessing}
                className="gap-2"
              >
                <Send className="h-4 w-4" />
                {isProcessing ? "Processando..." : "Processar Fila WhatsApp"}
              </Button>
              <Button
                onClick={runScheduler}
                disabled={isScheduling}
                variant="outline"
                className="gap-2"
              >
                <RefreshCw
                  className={`h-4 w-4 ${isScheduling ? "animate-spin" : ""}`}
                />
                {isScheduling ? "Executando..." : "Executar Scheduler"}
              </Button>
            </CardContent>
          </Card>

          {/* Queue Table */}
          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <CardTitle>Fila de Notificações</CardTitle>
                  <CardDescription>
                    Histórico de mensagens enviadas e pendentes
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="pendente">Pendentes</SelectItem>
                      <SelectItem value="enviado">Enviados</SelectItem>
                      <SelectItem value="erro">Erros</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select
                    value={channelFilter}
                    onValueChange={setChannelFilter}
                  >
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="Canal" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="whatsapp">WhatsApp</SelectItem>
                      <SelectItem value="email">Email</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">
                  Carregando...
                </div>
              ) : jobs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhuma notificação encontrada
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Canal</TableHead>
                      <TableHead>Destinatário</TableHead>
                      <TableHead>Template</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Tentativas</TableHead>
                      <TableHead>Criado em</TableHead>
                      <TableHead>Enviado em</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {jobs.map((job) => (
                      <TableRow key={job.id}>
                        <TableCell>
                          {job.channel === "whatsapp" ? (
                            <div className="flex items-center gap-1">
                              <MessageSquare className="h-4 w-4 text-green-600" />
                              <span>WhatsApp</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1">
                              <Mail className="h-4 w-4 text-blue-600" />
                              <span>Email</span>
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {job.to_phone || job.to_email || "-"}
                        </TableCell>
                        <TableCell>
                          {templateLabels[job.template] || job.template}
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={statusColors[job.status]}
                            variant="secondary"
                          >
                            {job.status}
                          </Badge>
                          {job.last_error && (
                            <span
                              className="ml-2 text-xs text-muted-foreground truncate max-w-[150px] inline-block align-middle"
                              title={job.last_error}
                            >
                              {job.last_error.substring(0, 30)}...
                            </span>
                          )}
                        </TableCell>
                        <TableCell>{job.tries}</TableCell>
                        <TableCell>
                          {format(
                            new Date(job.created_at),
                            "dd/MM/yyyy HH:mm",
                            { locale: ptBR }
                          )}
                        </TableCell>
                        <TableCell>
                          {job.sent_at
                            ? format(
                                new Date(job.sent_at),
                                "dd/MM/yyyy HH:mm",
                                { locale: ptBR }
                              )
                            : "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
      </div>
    </OficinaLayout>
  );
}
