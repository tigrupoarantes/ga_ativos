import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Settings, Shield, Users, Bell, Database, Plug, Building2, Plus, Search, Upload, Bug, Lightbulb } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";
import { SmtpConfigForm } from "@/components/SmtpConfigForm";
import { WhatsAppConfigForm } from "@/components/WhatsAppConfigForm";
import { SyncToGA360 } from "@/components/SyncToGA360";
import { SyncToGAPagamentos } from "@/components/SyncToGAPagamentos";
import { useEmpresas } from "@/hooks/useEmpresas";
import { CompanyCard } from "@/components/admin/CompanyCard";
import { CompanyFormDialog } from "@/components/admin/CompanyFormDialog";
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog";
import { ImportAreasDialog } from "@/components/admin/ImportAreasDialog";
import { useQueryClient } from "@tanstack/react-query";
import { useBugReports } from "@/hooks/useBugReports";
import { BugReportDialog } from "@/components/feedback/BugReportDialog";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";

export default function Configuracoes() {
  const { userRole } = useAuth();
  const queryClient = useQueryClient();
  const isAdmin = userRole === "admin" || userRole === "diretor";
  
  // State for companies management
  const { empresas, isLoading, createEmpresa, updateEmpresa, deleteEmpresa } = useEmpresas();
  const { reports, isLoading: reportsLoading, updateReport, deleteReport } = useBugReports();
  const [search, setSearch] = useState("");
  const [companyDialogOpen, setCompanyDialogOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<typeof empresas[0] | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [companyToDelete, setCompanyToDelete] = useState<typeof empresas[0] | null>(null);
  const [importAreasDialogOpen, setImportAreasDialogOpen] = useState(false);
  const [bugDialogOpen, setBugDialogOpen] = useState(false);

  const statusConfig: Record<string, { label: string; className: string }> = {
    aberto: { label: "Aberto", className: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-300" },
    em_analise: { label: "Em Análise", className: "bg-blue-500/10 text-blue-700 dark:text-blue-300" },
    resolvido: { label: "Resolvido", className: "bg-green-500/10 text-green-700 dark:text-green-300" },
    recusado: { label: "Recusado", className: "bg-red-500/10 text-red-700 dark:text-red-300" },
  };

  const filteredEmpresas = empresas.filter(
    (e) =>
      e.nome?.toLowerCase().includes(search.toLowerCase()) ||
      e.cnpj?.toLowerCase().includes(search.toLowerCase())
  );

  const handleAddCompany = () => {
    setEditingCompany(null);
    setCompanyDialogOpen(true);
  };

  const handleEditCompany = (empresa: typeof empresas[0]) => {
    setEditingCompany(empresa);
    setCompanyDialogOpen(true);
  };

  const handleDeleteCompanyClick = (empresa: typeof empresas[0]) => {
    setCompanyToDelete(empresa);
    setDeleteDialogOpen(true);
  };

  const handleCompanySubmit = async (data: {
    nome: string;
    razao_social: string;
    cnpj: string;
    endereco: string;
    telefone: string;
    email: string;
    logo_url: string;
    color: string;
    is_auditable: boolean;
  }) => {
    if (editingCompany) {
      await updateEmpresa.mutateAsync({
        id: editingCompany.id,
        nome: data.nome,
        razao_social: data.razao_social || undefined,
        cnpj: data.cnpj || undefined,
        endereco: data.endereco || undefined,
        telefone: data.telefone || undefined,
        email: data.email || undefined,
        logo_url: data.logo_url || undefined,
        color: data.color || undefined,
        is_auditable: data.is_auditable,
      });
    } else {
      await createEmpresa.mutateAsync({
        nome: data.nome,
        razao_social: data.razao_social || undefined,
        cnpj: data.cnpj || undefined,
        endereco: data.endereco || undefined,
        telefone: data.telefone || undefined,
        email: data.email || undefined,
        logo_url: data.logo_url || undefined,
        color: data.color || undefined,
        is_auditable: data.is_auditable,
      });
    }
    setCompanyDialogOpen(false);
    setEditingCompany(null);
  };

  const handleConfirmDeleteCompany = async () => {
    if (companyToDelete) {
      await deleteEmpresa.mutateAsync(companyToDelete.id);
      setDeleteDialogOpen(false);
      setCompanyToDelete(null);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <PageHeader
          title="Configurações"
          description="Configure as preferências do sistema"
          icon={Settings}
        />

        <Tabs defaultValue="geral" className="space-y-6">
          <TabsList>
            <TabsTrigger value="geral">Geral</TabsTrigger>
            {isAdmin && <TabsTrigger value="empresas">Empresas</TabsTrigger>}
            <TabsTrigger value="notificacoes">Notificações</TabsTrigger>
            {isAdmin && <TabsTrigger value="seguranca">Segurança</TabsTrigger>}
            {isAdmin && <TabsTrigger value="sistema">Sistema</TabsTrigger>}
            {isAdmin && <TabsTrigger value="integracoes">Integrações</TabsTrigger>}
          </TabsList>

          <TabsContent value="geral" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Preferências Gerais</CardTitle>
                <CardDescription>
                  Configure suas preferências pessoais
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Tema Escuro</Label>
                    <p className="text-sm text-muted-foreground">
                      Ativar modo escuro para a interface
                    </p>
                  </div>
                  <Switch />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Exibição Compacta</Label>
                    <p className="text-sm text-muted-foreground">
                      Reduzir espaçamento entre elementos
                    </p>
                  </div>
                  <Switch />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Empresas Tab - Organizational Structure integrated */}
          {isAdmin && (
            <TabsContent value="empresas" className="space-y-6">
              {/* Header with search and add button */}
              <div className="flex items-center justify-between gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar empresas..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10 w-[300px]"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" onClick={() => setImportAreasDialogOpen(true)}>
                    <Upload className="h-4 w-4 mr-2" />
                    Importar Centros de Custo
                  </Button>
                  <Button onClick={handleAddCompany}>
                    <Plus className="h-4 w-4 mr-2" />
                    Nova Empresa
                  </Button>
                </div>
              </div>

              {/* Grid of Company Cards */}
              {isLoading ? (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-64 w-full" />
                  ))}
                </div>
              ) : filteredEmpresas.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground">
                  <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium">Nenhuma empresa encontrada</p>
                  <p className="text-sm">
                    {search ? "Tente outra busca" : "Clique em 'Nova Empresa' para começar"}
                  </p>
                </div>
              ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {filteredEmpresas.map((empresa) => (
                    <CompanyCard
                      key={empresa.id}
                      empresa={empresa}
                      onEdit={() => handleEditCompany(empresa)}
                      onDelete={() => handleDeleteCompanyClick(empresa)}
                    />
                  ))}
                </div>
              )}
            </TabsContent>
          )}

          <TabsContent value="notificacoes" className="space-y-6 animate-fade-in">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  <CardTitle>Notificações</CardTitle>
                </div>
                <CardDescription>
                  Configure como você recebe notificações
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Notificações por Email</Label>
                    <p className="text-sm text-muted-foreground">
                      Receber alertas importantes por email
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Vencimento de Contratos</Label>
                    <p className="text-sm text-muted-foreground">
                      Alertas de contratos próximos ao vencimento
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Vencimento de CNH</Label>
                    <p className="text-sm text-muted-foreground">
                      Alertas de CNH próximos ao vencimento
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Manutenções Programadas</Label>
                    <p className="text-sm text-muted-foreground">
                      Lembretes de manutenções preventivas
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </CardContent>
            </Card>

            {/* Bug Reports Section */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Bug className="h-5 w-5" />
                    <CardTitle>Bugs e Melhorias</CardTitle>
                  </div>
                  <Button size="sm" onClick={() => setBugDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Novo Report
                  </Button>
                </div>
                <CardDescription>
                  Reporte bugs ou sugira melhorias para o sistema
                </CardDescription>
              </CardHeader>
              <CardContent>
                {reportsLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ) : reports.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">
                    Nenhum report enviado ainda
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10">Tipo</TableHead>
                        <TableHead>Título</TableHead>
                        <TableHead>Prioridade</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Data</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reports.map((report) => {
                        const status = statusConfig[report.status] || statusConfig.aberto;
                        return (
                          <TableRow key={report.id}>
                            <TableCell>
                              {report.type === "bug" ? (
                                <Bug className="h-4 w-4 text-destructive" />
                              ) : (
                                <Lightbulb className="h-4 w-4 text-yellow-500" />
                              )}
                            </TableCell>
                            <TableCell className="font-medium">{report.title}</TableCell>
                            <TableCell className="capitalize text-sm">{report.priority}</TableCell>
                            <TableCell>
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border border-transparent ${status.className}`}>
                                {status.label}
                              </span>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {format(new Date(report.created_at), "dd/MM/yyyy")}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            <BugReportDialog open={bugDialogOpen} onOpenChange={setBugDialogOpen} />
          </TabsContent>

          {isAdmin && (
            <TabsContent value="seguranca" className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    <CardTitle>Segurança e Permissões</CardTitle>
                  </div>
                  <CardDescription>
                    Gerencie acessos e permissões do sistema
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-6 md:grid-cols-2">
                    <Link to="/permissoes">
                      <Card className="cursor-pointer card-hover">
                        <CardContent className="p-6 flex items-start gap-4">
                          <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <Shield className="h-6 w-6 text-primary" />
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold">Permissões de Módulos</h3>
                            <p className="text-sm text-muted-foreground mt-1">
                              Configure quais perfis podem acessar cada módulo
                            </p>
                            <span className="text-sm text-primary font-medium mt-2 inline-block">Gerenciar →</span>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                    <Link to="/usuarios">
                      <Card className="cursor-pointer card-hover">
                        <CardContent className="p-6 flex items-start gap-4">
                          <div className="h-12 w-12 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
                            <Users className="h-6 w-6 text-accent" />
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold">Usuários</h3>
                            <p className="text-sm text-muted-foreground mt-1">
                              Gerencie usuários e seus perfis de acesso
                            </p>
                            <span className="text-sm text-primary font-medium mt-2 inline-block">Gerenciar →</span>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {isAdmin && (
            <TabsContent value="sistema" className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Database className="h-5 w-5" />
                    <CardTitle>Sistema</CardTitle>
                  </div>
                  <CardDescription>
                    Configurações avançadas do sistema
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Modo de Manutenção</Label>
                      <p className="text-sm text-muted-foreground">
                        Bloquear acesso durante manutenções
                      </p>
                    </div>
                    <Switch />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Logs Detalhados</Label>
                      <p className="text-sm text-muted-foreground">
                        Registrar todas as ações dos usuários
                      </p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {isAdmin && (
            <TabsContent value="integracoes" className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Plug className="h-5 w-5" />
                    <CardTitle>Integrações</CardTitle>
                  </div>
                  <CardDescription>
                    Configure integrações com serviços externos
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Gerencie as credenciais e configurações de serviços integrados ao sistema.
                  </p>
                </CardContent>
              </Card>

              {/* GA360 Sync */}
              <SyncToGA360 />

              {/* GA Pagamentos Sync */}
              <SyncToGAPagamentos />

              {/* SMTP Configuration */}
              <SmtpConfigForm />

              {/* WhatsApp Configuration */}
              <WhatsAppConfigForm />
            </TabsContent>
          )}
        </Tabs>
      </div>

      {/* Company Form Dialog */}
      <CompanyFormDialog
        open={companyDialogOpen}
        onOpenChange={(open) => {
          setCompanyDialogOpen(open);
          if (!open) setEditingCompany(null);
        }}
        onSubmit={handleCompanySubmit}
        initialData={editingCompany ? {
          nome: editingCompany.nome || "",
          razao_social: editingCompany.razao_social || "",
          cnpj: editingCompany.cnpj || "",
          endereco: editingCompany.endereco || "",
          telefone: editingCompany.telefone || "",
          email: editingCompany.email || "",
          logo_url: (editingCompany as any).logo_url || "",
          color: (editingCompany as any).color || "#0B3D91",
          is_auditable: (editingCompany as any).is_auditable || false,
        } : undefined}
        isEditing={!!editingCompany}
        isLoading={createEmpresa.isPending || updateEmpresa.isPending}
      />

      {/* Confirm Delete Dialog */}
      <ConfirmDeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleConfirmDeleteCompany}
        itemName={companyToDelete?.nome || ""}
        itemType="empresa"
        isLoading={deleteEmpresa.isPending}
      />

      {/* Global Import Areas Dialog */}
      <ImportAreasDialog
        open={importAreasDialogOpen}
        onOpenChange={setImportAreasDialogOpen}
        empresas={empresas}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["areas"] });
        }}
      />
    </AppLayout>
  );
}
