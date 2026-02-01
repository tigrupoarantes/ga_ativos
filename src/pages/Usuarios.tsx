import { useState, useEffect } from "react";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, Search, Check, X, Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/external-client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface UserRole {
  id: string;
  user_id: string;
  email: string;
  role: string;
  is_approved: boolean;
  created_at: string;
}

const roleLabels: Record<string, string> = {
  assistente: "Assistente",
  coordenador: "Coordenador",
  diretor: "Diretor",
  admin: "Administrador",
};

const roleColors: Record<string, string> = {
  assistente: "bg-muted text-muted-foreground",
  coordenador: "bg-status-info/10 text-status-info",
  diretor: "bg-status-warning/10 text-status-warning",
  admin: "bg-primary/10 text-primary",
};

export default function Usuarios() {
  const [users, setUsers] = useState<UserRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    const { data, error } = await supabase
      .from("user_roles")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Erro ao carregar usuários");
      return;
    }

    setUsers(data || []);
    setIsLoading(false);
  };

  const updateUserRole = async (userId: string, newRole: string) => {
    const { error } = await supabase
      .from("user_roles")
      .update({ role: newRole })
      .eq("id", userId);

    if (error) {
      toast.error("Erro ao atualizar perfil");
      return;
    }

    setUsers(prev =>
      prev.map(u => (u.id === userId ? { ...u, role: newRole } : u))
    );
    toast.success("Perfil atualizado");
  };

  const toggleApproval = async (userId: string, currentApproval: boolean) => {
    const { error } = await supabase
      .from("user_roles")
      .update({ is_approved: !currentApproval })
      .eq("id", userId);

    if (error) {
      toast.error("Erro ao atualizar aprovação");
      return;
    }

    setUsers(prev =>
      prev.map(u => (u.id === userId ? { ...u, is_approved: !currentApproval } : u))
    );
    toast.success(currentApproval ? "Usuário desativado" : "Usuário aprovado");
  };

  const filteredUsers = users.filter(
    (u) => u.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AppLayout>
      <div className="space-y-6">
        <PageHeader
          title="Usuários"
          description="Gerencie os usuários e seus perfis de acesso"
          icon={Users}
        />

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 w-[300px]"
              />
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Perfil</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.email}</TableCell>
                      <TableCell>
                        <Select
                          value={user.role}
                          onValueChange={(value) => updateUserRole(user.id, value)}
                        >
                          <SelectTrigger className="w-[150px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="assistente">Assistente</SelectItem>
                            <SelectItem value="coordenador">Coordenador</SelectItem>
                            <SelectItem value="diretor">Diretor</SelectItem>
                            <SelectItem value="admin">Administrador</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={cn(
                            user.is_approved
                              ? "bg-status-success/10 text-status-success"
                              : "bg-status-error/10 text-status-error"
                          )}
                        >
                          {user.is_approved ? "Aprovado" : "Pendente"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => toggleApproval(user.id, user.is_approved || false)}
                          title={user.is_approved ? "Desativar" : "Aprovar"}
                        >
                          {user.is_approved ? (
                            <X className="h-4 w-4 text-destructive" />
                          ) : (
                            <Check className="h-4 w-4 text-status-success" />
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredUsers.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                        Nenhum usuário encontrado
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
