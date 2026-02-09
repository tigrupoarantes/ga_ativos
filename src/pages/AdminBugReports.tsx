import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { useBugReports, BugReport } from "@/hooks/useBugReports";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
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
import { Bug, Lightbulb, AlertCircle, ChevronDown, ChevronRight, Trash2 } from "lucide-react";
import { format } from "date-fns";

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  aberto: { label: "Aberto", variant: "default" },
  em_analise: { label: "Em Análise", variant: "secondary" },
  resolvido: { label: "Resolvido", variant: "outline" },
  recusado: { label: "Recusado", variant: "destructive" },
};

const priorityConfig: Record<string, { label: string; className: string }> = {
  baixa: { label: "Baixa", className: "bg-muted text-muted-foreground" },
  media: { label: "Média", className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200" },
  alta: { label: "Alta", className: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200" },
  critica: { label: "Crítica", className: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200" },
};

export default function AdminBugReports() {
  const { reports, isLoading, updateReport, deleteReport } = useBugReports();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string>("todos");
  const [filterStatus, setFilterStatus] = useState<string>("todos");
  const [editingNotes, setEditingNotes] = useState<Record<string, string>>({});

  const filtered = reports.filter((r) => {
    if (filterType !== "todos" && r.type !== filterType) return false;
    if (filterStatus !== "todos" && r.status !== filterStatus) return false;
    return true;
  });

  const abertos = reports.filter((r) => r.status === "aberto").length;
  const bugs = reports.filter((r) => r.type === "bug").length;
  const melhorias = reports.filter((r) => r.type === "melhoria").length;

  const handleStatusChange = (id: string, status: string) => {
    updateReport.mutate({ id, status });
  };

  const handleSaveNotes = (id: string) => {
    updateReport.mutate({ id, admin_notes: editingNotes[id] ?? "" });
  };

  const toggleExpand = (report: BugReport) => {
    if (expandedId === report.id) {
      setExpandedId(null);
    } else {
      setExpandedId(report.id);
      setEditingNotes((prev) => ({ ...prev, [report.id]: report.admin_notes || "" }));
    }
  };

  return (
    <AppLayout>
      <PageHeader title="Bugs e Melhorias" subtitle="Gerencie reports enviados pelos usuários" />

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Abertos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-500" />
              <span className="text-2xl font-bold">{abertos}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Bugs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Bug className="h-5 w-5 text-destructive" />
              <span className="text-2xl font-bold">{bugs}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Melhorias</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-yellow-500" />
              <span className="text-2xl font-bold">{melhorias}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-4">
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="bug">Bugs</SelectItem>
            <SelectItem value="melhoria">Melhorias</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="aberto">Aberto</SelectItem>
            <SelectItem value="em_analise">Em Análise</SelectItem>
            <SelectItem value="resolvido">Resolvido</SelectItem>
            <SelectItem value="recusado">Recusado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8"></TableHead>
                <TableHead className="w-10">Tipo</TableHead>
                <TableHead>Título</TableHead>
                <TableHead>Usuário</TableHead>
                <TableHead>Prioridade</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Data</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    Nenhum report encontrado
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((report) => {
                  const isExpanded = expandedId === report.id;
                  const priority = priorityConfig[report.priority] || priorityConfig.media;
                  const status = statusConfig[report.status] || statusConfig.aberto;

                  return (
                    <>
                      <TableRow
                        key={report.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => toggleExpand(report)}
                      >
                        <TableCell>
                          {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </TableCell>
                        <TableCell>
                          {report.type === "bug" ? (
                            <Bug className="h-4 w-4 text-destructive" />
                          ) : (
                            <Lightbulb className="h-4 w-4 text-yellow-500" />
                          )}
                        </TableCell>
                        <TableCell className="font-medium">{report.title}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {report.user_email || "—"}
                        </TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${priority.className}`}>
                            {priority.label}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant={status.variant}>{status.label}</Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {format(new Date(report.created_at), "dd/MM/yyyy")}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteReport.mutate(report.id);
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>

                      {isExpanded && (
                        <TableRow key={report.id + "-detail"}>
                          <TableCell colSpan={8} className="bg-muted/30 p-4">
                            <div className="space-y-3">
                              <div>
                                <p className="text-sm font-medium mb-1">Descrição</p>
                                <p className="text-sm text-muted-foreground">{report.description}</p>
                              </div>
                              {report.page_url && (
                                <div>
                                  <p className="text-sm font-medium mb-1">Página</p>
                                  <p className="text-sm text-muted-foreground">{report.page_url}</p>
                                </div>
                              )}
                              <div className="flex gap-4 items-end">
                                <div className="flex-1 space-y-1">
                                  <p className="text-sm font-medium">Notas do Admin</p>
                                  <Textarea
                                    value={editingNotes[report.id] ?? ""}
                                    onChange={(e) =>
                                      setEditingNotes((prev) => ({ ...prev, [report.id]: e.target.value }))
                                    }
                                    placeholder="Adicionar notas internas..."
                                    rows={2}
                                  />
                                </div>
                                <div className="space-y-1">
                                  <p className="text-sm font-medium">Status</p>
                                  <Select
                                    value={report.status}
                                    onValueChange={(v) => handleStatusChange(report.id, v)}
                                  >
                                    <SelectTrigger className="w-36">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="aberto">Aberto</SelectItem>
                                      <SelectItem value="em_analise">Em Análise</SelectItem>
                                      <SelectItem value="resolvido">Resolvido</SelectItem>
                                      <SelectItem value="recusado">Recusado</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <Button size="sm" onClick={() => handleSaveNotes(report.id)}>
                                  Salvar Notas
                                </Button>
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </AppLayout>
  );
}
