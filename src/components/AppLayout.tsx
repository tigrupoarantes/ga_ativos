import { ReactNode, useMemo } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
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
  UserCog,
  Car,
  ChevronLeft,
  Home,
  Wrench,
  ClipboardList,
  ShieldCheck,
  Building2,
  UsersRound
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { NotificationBell } from "@/components/NotificationBell";
import { useCurrentUserPermissions } from "@/hooks/useModulePermissions";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

// Mapeamento de rotas para labels e hierarquia
const routeConfig: Record<string, { label: string; parent?: string }> = {
  "/": { label: "Dashboard" },
  "/ativos": { label: "Ativos", parent: "/" },
  "/tipos-ativos": { label: "Tipos de Ativos", parent: "/" },
  "/funcionarios": { label: "Funcionários", parent: "/" },
  "/veiculos": { label: "Veículos", parent: "/" },
  "/atribuicoes": { label: "Atribuições", parent: "/" },
  "/historico": { label: "Histórico", parent: "/" },
  "/configuracoes": { label: "Configurações", parent: "/" },
  "/usuarios": { label: "Usuários", parent: "/" },
  "/permissoes": { label: "Permissões", parent: "/" },
  "/empresas": { label: "Empresas", parent: "/" },
  "/equipes": { label: "Equipes", parent: "/" },
  "/contratos": { label: "Contratos", parent: "/" },
  "/telefonia": { label: "Telefonia", parent: "/" },
  "/oficina": { label: "Oficina", parent: "/" },
  "/oficina/ordens": { label: "Ordens de Serviço", parent: "/oficina" },
  "/oficina/pecas": { label: "Peças", parent: "/oficina" },
  "/oficina/preventivas": { label: "Preventivas", parent: "/oficina" },
};

interface AppLayoutProps {
  children: ReactNode;
}

// Menu reorganizado conforme PRD - Sistema de Gestão de Ativos
const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/", module: "dashboard" },
  { icon: Package, label: "Ativos", path: "/ativos", module: "ativos" },
  { icon: FolderKanban, label: "Tipos de Ativos", path: "/tipos-ativos", module: "tipos_ativos" },
  { icon: Users, label: "Funcionários", path: "/funcionarios", module: "funcionarios" },
  { icon: Car, label: "Veículos", path: "/veiculos", module: "veiculos" },
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
  const navigate = useNavigate();
  const location = useLocation();
  
  // Não mostrar botão voltar na página inicial (dashboard)
  const showBackButton = location.pathname !== "/";

  // Construir breadcrumbs baseado na rota atual
  const breadcrumbs = useMemo(() => {
    const path = location.pathname;
    const crumbs: { path: string; label: string }[] = [];
    
    // Encontra a rota atual ou a mais próxima
    let currentPath = path;
    let config = routeConfig[currentPath];
    
    // Se não encontrar exatamente, tenta encontrar a rota pai
    if (!config) {
      const segments = path.split('/').filter(Boolean);
      for (let i = segments.length; i >= 0; i--) {
        const testPath = '/' + segments.slice(0, i).join('/');
        if (routeConfig[testPath]) {
          currentPath = testPath;
          config = routeConfig[testPath];
          break;
        }
      }
    }
    
    // Constrói a hierarquia de breadcrumbs
    while (config) {
      crumbs.unshift({ path: currentPath, label: config.label });
      if (config.parent) {
        currentPath = config.parent;
        config = routeConfig[currentPath];
      } else {
        break;
      }
    }
    
    return crumbs;
  }, [location.pathname]);

  const handleBack = () => {
    if (window.history.length > 2) {
      navigate(-1);
    } else {
      navigate("/");
    }
  };

  return (
    <div className="flex h-screen w-full bg-background">
      {/* Sidebar - sempre visível */}
      <aside className="flex w-64 flex-col border-r border-border bg-sidebar shadow-sm flex-shrink-0">
        <NavContent />
      </aside>

      {/* Header com breadcrumb e notificações */}
      <div className="flex flex-1 flex-col min-w-0">
        <header className="flex h-14 items-center justify-between border-b border-border bg-background px-6">
          <div className="flex items-center gap-3 min-w-0">
            {showBackButton && (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleBack}
                className="h-8 w-8 text-muted-foreground hover:text-foreground flex-shrink-0"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
            )}
            
            {/* Breadcrumb */}
            <Breadcrumb className="hidden sm:flex">
              <BreadcrumbList>
                {breadcrumbs.map((crumb, index) => (
                  <BreadcrumbItem key={crumb.path}>
                    {index < breadcrumbs.length - 1 ? (
                      <>
                        <BreadcrumbLink asChild>
                          <Link to={crumb.path} className="flex items-center gap-1.5">
                            {index === 0 && <Home className="h-3.5 w-3.5" />}
                            <span>{crumb.label}</span>
                          </Link>
                        </BreadcrumbLink>
                        <BreadcrumbSeparator />
                      </>
                    ) : (
                      <BreadcrumbPage className="flex items-center gap-1.5">
                        {breadcrumbs.length === 1 && <Home className="h-3.5 w-3.5" />}
                        <span>{crumb.label}</span>
                      </BreadcrumbPage>
                    )}
                  </BreadcrumbItem>
                ))}
              </BreadcrumbList>
            </Breadcrumb>

            {/* Mobile: apenas página atual */}
            <span className="sm:hidden text-sm font-medium text-foreground truncate">
              {breadcrumbs[breadcrumbs.length - 1]?.label || "Dashboard"}
            </span>
          </div>
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
