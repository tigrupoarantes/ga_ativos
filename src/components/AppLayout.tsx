import { ReactNode, useMemo, useState } from "react";
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
  Shield,
  UserCog,
  Car,
  ChevronLeft,
  ChevronDown,
  Home,
  Rocket,
  Phone,
  MessageSquare,
  Wrench,
  FileText,
  Boxes,
  UsersRound,
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

// Mapeamento de rotas para labels e hierarquia
const routeConfig: Record<string, { label: string; parent?: string }> = {
  "/": { label: "Dashboard" },
  "/ativos": { label: "Ativos", parent: "/" },
  "/tipos-ativos": { label: "Tipos de Ativos", parent: "/" },
  "/funcionarios": { label: "Funcionários", parent: "/" },
  "/veiculos": { label: "Veículos", parent: "/" },
  "/historico": { label: "Histórico", parent: "/" },
  "/configuracoes": { label: "Configurações", parent: "/" },
  "/usuarios": { label: "Usuários", parent: "/" },
  "/permissoes": { label: "Permissões", parent: "/" },
  "/empresas": { label: "Empresas", parent: "/" },
  "/equipes": { label: "Equipes", parent: "/" },
  "/contratos": { label: "Contratos", parent: "/" },
  "/telefonia": { label: "Telefonia", parent: "/" },
  "/linhas-telefonicas": { label: "Linhas Telefônicas", parent: "/" },
  "/relatorios": { label: "Relatórios IA", parent: "/" },
  "/oficina": { label: "Oficina", parent: "/" },
  "/oficina/ordens": { label: "Ordens de Serviço", parent: "/oficina" },
  "/oficina/pecas": { label: "Peças", parent: "/oficina" },
  "/oficina/preventivas": { label: "Preventivas", parent: "/oficina" },
};

interface AppLayoutProps {
  children: ReactNode;
}

// Single nav items (no group)
interface NavItem {
  icon: any;
  label: string;
  path: string;
  module: string;
}

// Collapsible group with children
interface NavGroup {
  icon: any;
  label: string;
  module: string;
  children: NavItem[];
}

type NavEntry = NavItem | NavGroup;

const isNavGroup = (entry: NavEntry): entry is NavGroup => {
  return "children" in entry;
};

// Reorganized menu with collapsible groups
const navStructure: NavEntry[] = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/", module: "dashboard" },
  {
    icon: Boxes,
    label: "Patrimônio",
    module: "ativos",
    children: [
      { icon: Package, label: "Ativos", path: "/ativos", module: "ativos" },
      { icon: FolderKanban, label: "Tipos de Ativos", path: "/tipos-ativos", module: "tipos_ativos" },
    ],
  },
  {
    icon: UsersRound,
    label: "Pessoas",
    module: "funcionarios",
    children: [
      { icon: Users, label: "Funcionários", path: "/funcionarios", module: "funcionarios" },
      { icon: UsersRound, label: "Equipes", path: "/equipes", module: "funcionarios" },
    ],
  },
  {
    icon: Car,
    label: "Frota",
    module: "veiculos",
    children: [
      { icon: Car, label: "Veículos", path: "/veiculos", module: "veiculos" },
      { icon: Wrench, label: "Oficina", path: "/oficina", module: "veiculos" },
    ],
  },
  { icon: Phone, label: "Telefonia", path: "/linhas-telefonicas", module: "telefonia" },
  { icon: MessageSquare, label: "Relatórios IA", path: "/relatorios", module: "relatorios" },
  { icon: History, label: "Histórico", path: "/historico", module: "historico" },
  { icon: Settings, label: "Configurações", path: "/configuracoes", module: "configuracoes" },
];

// Admin items
const adminItems: NavItem[] = [
  { icon: UserCog, label: "Usuários", path: "/usuarios", module: "admin" },
  { icon: Shield, label: "Permissões", path: "/permissoes", module: "admin" },
];

function NavContent() {
  const location = useLocation();
  const { user, userRole, signOut } = useAuth();
  const { allowedModules, isAdmin, isLoading } = useCurrentUserPermissions();

  // Track which groups are open - auto-open based on current path
  const getInitialOpenGroups = () => {
    const openGroups: Record<string, boolean> = {};
    navStructure.forEach((entry) => {
      if (isNavGroup(entry)) {
        const isChildActive = entry.children.some(
          (child) => location.pathname === child.path || location.pathname.startsWith(child.path + "/")
        );
        if (isChildActive) {
          openGroups[entry.label] = true;
        }
      }
    });
    return openGroups;
  };

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(getInitialOpenGroups);

  const toggleGroup = (label: string) => {
    setOpenGroups((prev) => ({ ...prev, [label]: !prev[label] }));
  };

  const getRoleLabel = (role: string | null) => {
    const labels = {
      assistente: "Assistente",
      coordenador: "Coordenador",
      diretor: "Diretor",
      admin: "Administrador",
    };
    return role ? labels[role as keyof typeof labels] : "Usuário";
  };

  // Check if user can see a module
  const canSeeModule = (module: string) => {
    if (isAdmin) return true;
    return allowedModules.includes(module);
  };

  // Check if user can see an entry (item or group)
  const canSeeEntry = (entry: NavEntry): boolean => {
    if (isNavGroup(entry)) {
      return entry.children.some((child) => canSeeModule(child.module));
    }
    return canSeeModule(entry.module);
  };

  // Filter visible entries
  const visibleEntries = navStructure.filter(canSeeEntry);
  const visibleAdminItems = isAdmin ? adminItems : [];

  const renderNavItem = (item: NavItem, isNested = false) => {
    const Icon = item.icon;
    const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + "/");

    return (
      <Link
        key={item.path}
        to={item.path}
        className={cn(
          "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
          isNested && "pl-10",
          isActive
            ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
            : "text-sidebar-foreground/70 hover:bg-sidebar-border hover:text-sidebar-foreground"
        )}
      >
        <Icon className="h-5 w-5 flex-shrink-0" />
        <span className="truncate">{item.label}</span>
      </Link>
    );
  };

  const renderNavGroup = (group: NavGroup) => {
    const Icon = group.icon;
    const isOpen = openGroups[group.label] ?? false;
    const hasActiveChild = group.children.some(
      (child) => location.pathname === child.path || location.pathname.startsWith(child.path + "/")
    );

    // Filter children by permission
    const visibleChildren = group.children.filter((child) => canSeeModule(child.module));
    if (visibleChildren.length === 0) return null;

    return (
      <Collapsible key={group.label} open={isOpen} onOpenChange={() => toggleGroup(group.label)}>
        <CollapsibleTrigger asChild>
          <button
            className={cn(
              "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
              hasActiveChild
                ? "text-sidebar-primary"
                : "text-sidebar-foreground/70 hover:bg-sidebar-border hover:text-sidebar-foreground"
            )}
          >
            <Icon className="h-5 w-5 flex-shrink-0" />
            <span className="flex-1 truncate text-left">{group.label}</span>
            <ChevronDown
              className={cn(
                "h-4 w-4 transition-transform duration-200",
                isOpen && "rotate-180"
              )}
            />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-1 pt-1">
          {visibleChildren.map((child) => renderNavItem(child, true))}
        </CollapsibleContent>
      </Collapsible>
    );
  };

  return (
    <div className="flex h-full flex-col bg-sidebar">
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 border-b border-sidebar-border px-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sidebar-primary">
          <Rocket className="h-5 w-5 text-sidebar-primary-foreground" />
        </div>
        <span className="text-lg font-semibold text-sidebar-foreground tracking-tight">
          Gestão de Ativos
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-6 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-4">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-sidebar-primary border-t-transparent" />
          </div>
        ) : (
          <>
            {visibleEntries.map((entry) =>
              isNavGroup(entry) ? renderNavGroup(entry) : renderNavItem(entry as NavItem)
            )}

            {/* Admin Section */}
            {visibleAdminItems.length > 0 && (
              <>
                <div className="pt-4 pb-2 px-3">
                  <span className="text-xs font-semibold text-sidebar-foreground/50 uppercase tracking-wider">
                    Administração
                  </span>
                </div>
                {visibleAdminItems.map((item) => renderNavItem(item))}
              </>
            )}
          </>
        )}
      </nav>

      {/* User info */}
      <div className="mt-auto border-t border-sidebar-border p-4 space-y-3">
        <div className="flex items-center gap-3 px-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sidebar-primary/20">
            <User className="w-5 h-5 text-sidebar-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-sidebar-foreground truncate">
              {user?.email?.split("@")[0]}
            </p>
            <p className="text-xs text-sidebar-foreground/60">{getRoleLabel(userRole)}</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-border rounded-xl"
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
      const segments = path.split("/").filter(Boolean);
      for (let i = segments.length; i >= 0; i--) {
        const testPath = "/" + segments.slice(0, i).join("/");
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
      <aside className="flex w-64 flex-col flex-shrink-0">
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
          <div className="mx-auto max-w-7xl p-6 lg:p-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
