import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Settings, Shield, Users, Bell, Database } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";
import { SmtpConfigForm } from "@/components/SmtpConfigForm";
import { EmpresasInlineManager } from "@/components/EmpresasInlineManager";

export default function Configuracoes() {
  const { userRole } = useAuth();
  const isAdmin = userRole === "admin" || userRole === "diretor";

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
            <TabsTrigger value="notificacoes">Notificações</TabsTrigger>
            {isAdmin && <TabsTrigger value="seguranca">Segurança</TabsTrigger>}
            {isAdmin && <TabsTrigger value="sistema">Sistema</TabsTrigger>}
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

            {/* Inline Empresas Management for Admins */}
            {isAdmin && <EmpresasInlineManager />}
          </TabsContent>

          <TabsContent value="notificacoes" className="space-y-6">
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
                  <div className="grid gap-4 md:grid-cols-2">
                    <Link to="/permissoes">
                      <Card className="cursor-pointer hover:bg-accent transition-colors">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base flex items-center gap-2">
                            <Shield className="h-4 w-4" />
                            Permissões de Módulos
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-muted-foreground">
                            Configure quais perfis podem acessar cada módulo
                          </p>
                        </CardContent>
                      </Card>
                    </Link>
                    <Link to="/usuarios">
                      <Card className="cursor-pointer hover:bg-accent transition-colors">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base flex items-center gap-2">
                            <Users className="h-4 w-4" />
                            Usuários
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-muted-foreground">
                            Gerencie usuários e seus perfis de acesso
                          </p>
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

              {/* SMTP Configuration */}
              <SmtpConfigForm />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </AppLayout>
  );
}
