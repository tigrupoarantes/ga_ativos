import { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Package,
  Users,
  History,
  Settings,
  FolderKanban,
  LogOut,
  User,
  ArrowLeftRight,
  Shield,
  UserCog
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { NotificationBell } from "@/components/NotificationBell";
import { useCurrentUserPermissions } from "@/hooks/useModulePermissions";

interface AppLayoutProps {
  children: ReactNode;
}

// Menu reorganizado conforme PRD - Sistema de Gestão de Ativos
const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/", module: "dashboard" },
  { icon: Package, label: "Ativos", path: "/ativos", module: "ativos" },
  { icon: FolderKanban, label: "Tipos de Ativos", path: "/tipos-ativos", module: "tipos_ativos" },
  { icon: Users, label: "Funcionários", path: "/funcionarios", module: "funcionarios" },
  { icon: ArrowLeftRight, label: "Atribuições", path: "/atribuicoes", module: "atribuicoes" },
  { icon: History, label: "Histórico", path: "/historico", module: "historico" },
  { icon: Settings, label: "Configurações", path: "/configuracoes", module: "configuracoes" },
];

// Menu administrativo - apenas para admins
const adminItems = [
  { icon: UserCog, label: "Usuários", path: "/usuarios", module: "admin" },
  { icon: Shield, label: "Permissões", path: "/permissoes", module: "admin" },
];

function NavContent() {
  const location = useLocation();
  const { user, userRole, signOut } = useAuth();
  const { allowedModules, isAdmin, isLoading } = useCurrentUserPermissions();

  const getRoleLabel = (role: string | null) => {
    const labels = {
      assistente: 'Assistente',
      coordenador: 'Coordenador',
      diretor: 'Diretor',
      admin: 'Administrador',
    };
    return role ? labels[role as keyof typeof labels] : 'Usuário';
  };

  // Filter navigation items based on user permissions
  const filteredNavItems = navItems.filter(item => {
    // Admins see everything
    if (isAdmin) return true;
    // Filter by allowed modules
    return allowedModules.includes(item.module);
  });

  // Show admin items only for admins
  const filteredAdminItems = isAdmin ? adminItems : [];

  return (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 border-b border-sidebar-border px-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary">
          <Package className="h-5 w-5 text-primary-foreground" />
        </div>
        <span className="text-lg font-semibold text-foreground tracking-tight">
          Gestão de Ativos
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-6 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-4">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : (
          <>
            {filteredNavItems.map((item, index) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path ||
                (item.path === "/atribuicoes" && location.pathname.startsWith("/atribuicoes"));

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-300 ease-out",
                    "animate-fade-in",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  )}
                  style={{ animationDelay: `${index * 30}ms` }}
                >
                  <Icon className="h-5 w-5 flex-shrink-0" />
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })}

            {/* Admin Section */}
            {filteredAdminItems.length > 0 && (
              <>
                <div className="pt-4 pb-2 px-3">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Administração
                  </span>
                </div>
                {filteredAdminItems.map((item, index) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path;

                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={cn(
                        "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-300 ease-out",
                        "animate-fade-in",
                        isActive
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                      )}
                      style={{ animationDelay: `${(navItems.length + index) * 30}ms` }}
                    >
                      <Icon className="h-5 w-5 flex-shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </Link>
                  );
                })}
              </>
            )}
          </>
        )}
      </nav>

      {/* User info */}
      <div className="mt-auto border-t border-sidebar-border p-4 space-y-3">
        <div className="flex items-center gap-3 px-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
            <User className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">
              {user?.email?.split('@')[0]}
            </p>
            <p className="text-xs text-muted-foreground">{getRoleLabel(userRole)}</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground hover:bg-sidebar-accent rounded-xl"
          onClick={signOut}
        >
          <LogOut className="w-4 h-4" />
          Sair
        </Button>
      </div>
    </div>
  );
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="flex h-screen w-full bg-background">
      {/* Sidebar - sempre visível */}
      <aside className="flex w-64 flex-col border-r border-border bg-sidebar shadow-sm">
        <NavContent />
      </aside>

      {/* Header com notificações */}
      <div className="flex flex-1 flex-col">
        <header className="flex h-14 items-center justify-end border-b border-border bg-background px-6">
          <NotificationBell />
        </header>

        {/* Main content */}
        <main className="flex-1 overflow-auto">
          <div className="mx-auto max-w-7xl p-6 lg:p-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
