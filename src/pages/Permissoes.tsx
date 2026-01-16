import { useState, useEffect } from "react";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Permission {
  id: string;
  module: string;
  role: string;
  can_view: boolean;
  can_edit: boolean;
}

const modules = [
  { key: "dashboard", label: "Dashboard" },
  { key: "ativos", label: "Ativos" },
  { key: "tipos_ativos", label: "Tipos de Ativos" },
  { key: "funcionarios", label: "Funcionários" },
  { key: "empresas", label: "Empresas" },
  { key: "veiculos", label: "Veículos" },
  { key: "oficina", label: "Oficina" },
  { key: "telefonia", label: "Telefonia" },
  { key: "contratos", label: "Contratos" },
  { key: "historico", label: "Histórico" },
  { key: "configuracoes", label: "Configurações" },
];

const roles = [
  { key: "assistente", label: "Assistente" },
  { key: "coordenador", label: "Coordenador" },
  { key: "diretor", label: "Diretor" },
];

export default function Permissoes() {
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchPermissions();
  }, []);

  const fetchPermissions = async () => {
    const { data, error } = await supabase
      .from("module_permissions")
      .select("*");

    if (error) {
      toast.error("Erro ao carregar permissões");
      return;
    }

    // Initialize missing permissions
    const existingKeys = new Set(data?.map(p => `${p.module}-${p.role}`) || []);
    const missingPermissions: Partial<Permission>[] = [];

    modules.forEach(module => {
      roles.forEach(role => {
        if (!existingKeys.has(`${module.key}-${role.key}`)) {
          missingPermissions.push({
            module: module.key,
            role: role.key,
            can_view: false,
            can_edit: false,
          });
        }
      });
    });

    if (missingPermissions.length > 0) {
      const insertData = missingPermissions.map(p => ({
        module: p.module!,
        role: p.role!,
        can_view: p.can_view ?? false,
        can_edit: p.can_edit ?? false,
      }));
      const { data: newData, error: insertError } = await supabase
        .from("module_permissions")
        .insert(insertData)
        .select();

      if (!insertError && newData) {
        setPermissions([...(data || []), ...newData]);
      } else {
        setPermissions(data || []);
      }
    } else {
      setPermissions(data || []);
    }

    setIsLoading(false);
  };

  const updatePermission = async (
    module: string,
    role: string,
    field: "can_view" | "can_edit",
    value: boolean
  ) => {
    const permission = permissions.find(p => p.module === module && p.role === role);
    if (!permission) return;

    // If enabling can_edit, also enable can_view
    const updates: { can_view?: boolean; can_edit?: boolean } = { [field]: value };
    if (field === "can_edit" && value) {
      updates.can_view = true;
    }
    // If disabling can_view, also disable can_edit
    if (field === "can_view" && !value) {
      updates.can_edit = false;
    }

    const { error } = await supabase
      .from("module_permissions")
      .update(updates)
      .eq("id", permission.id);

    if (error) {
      toast.error("Erro ao atualizar permissão");
      return;
    }

    setPermissions(prev =>
      prev.map(p =>
        p.id === permission.id ? { ...p, ...updates } : p
      )
    );
    toast.success("Permissão atualizada");
  };

  const getPermission = (module: string, role: string) => {
    return permissions.find(p => p.module === module && p.role === role);
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <PageHeader
          title="Permissões"
          description="Configure as permissões de acesso por perfil"
          icon={Shield}
        />

        <Card>
          <CardHeader>
            <CardTitle>Matriz de Permissões</CardTitle>
            <CardDescription>
              Defina quais perfis podem visualizar e editar cada módulo. Administradores têm acesso total.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[200px]">Módulo</TableHead>
                      {roles.map((role) => (
                        <TableHead key={role.key} className="text-center min-w-[140px]">
                          <div>{role.label}</div>
                          <div className="flex justify-center gap-4 text-xs text-muted-foreground mt-1">
                            <span>Ver</span>
                            <span>Editar</span>
                          </div>
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {modules.map((module) => (
                      <TableRow key={module.key}>
                        <TableCell className="font-medium">{module.label}</TableCell>
                        {roles.map((role) => {
                          const permission = getPermission(module.key, role.key);
                          return (
                            <TableCell key={role.key} className="text-center">
                              <div className="flex justify-center gap-4">
                                <Switch
                                  checked={permission?.can_view || false}
                                  onCheckedChange={(value) =>
                                    updatePermission(module.key, role.key, "can_view", value)
                                  }
                                />
                                <Switch
                                  checked={permission?.can_edit || false}
                                  onCheckedChange={(value) =>
                                    updatePermission(module.key, role.key, "can_edit", value)
                                  }
                                />
                              </div>
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
