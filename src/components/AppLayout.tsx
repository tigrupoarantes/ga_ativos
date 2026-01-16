import { ReactNode, useState } from "react";
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
  Building2,
  Car,
  Phone,
  FileSignature,
  Menu,
  Wrench
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { NotificationBell } from "@/components/NotificationBell";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { useCurrentUserPermissions } from "@/hooks/useModulePermissions";

interface AppLayoutProps {
  children: ReactNode;
}

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/", module: "dashboard" },
  { icon: Package, label: "Ativos", path: "/ativos", module: "ativos" },
  { icon: FolderKanban, label: "Tipos de Ativos", path: "/tipos-ativos", module: "tipos_ativos" },
  { icon: FileSignature, label: "Termos de Comodato", path: "/termos-comodato", module: "ativos" },
  { icon: Users, label: "Funcionários", path: "/funcionarios", module: "funcionarios" },
  { icon: Building2, label: "Empresas", path: "/empresas", module: "empresas" },
  { icon: Users, label: "Equipes", path: "/equipes", module: "funcionarios" },
  { icon: Car, label: "Veículos", path: "/veiculos", module: "veiculos" },
  { icon: Wrench, label: "Oficina", path: "/oficina", module: "oficina" },
  { icon: Phone, label: "Telefonia", path: "/telefonia", module: "telefonia" },
  { icon: FileSignature, label: "Contratos", path: "/contratos", module: "contratos" },
  { icon: History, label: "Histórico", path: "/historico", module: "historico" },
  { icon: Settings, label: "Configurações", path: "/configuracoes", module: "configuracoes" },
];

function NavContent({ onNavigate }: { onNavigate?: () => void }) {
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

  return (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 border-b border-sidebar-border px-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary">
          <Package className="h-5 w-5 text-primary-foreground" />
        </div>
        <span className="text-lg font-semibold text-foreground tracking-tight">
          Gestão
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-6 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-4">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : (
          filteredNavItems.map((item, index) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path ||
              (item.path === "/veiculos" && location.pathname.startsWith("/veiculos")) ||
              (item.path === "/oficina" && location.pathname.startsWith("/oficina")) ||
              (item.path === "/telefonia" && location.pathname.startsWith("/telefonia")) ||
              (item.path === "/contratos" && location.pathname.startsWith("/contratos"));

            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={onNavigate}
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
          })
        )}
      </nav>

      {/* User info - Apple style */}
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
  const isMobile = useIsMobile();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Mobile Layout
  if (isMobile) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        {/* Mobile Header */}
        <header className="sticky top-0 z-50 flex h-14 items-center justify-between border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 px-4 safe-area-top">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Package className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="text-base font-semibold">Gestão</span>
          </div>

          <div className="flex items-center gap-2">
            <NotificationBell />
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-80 p-0">
                <NavContent onNavigate={() => setMobileMenuOpen(false)} />
              </SheetContent>
            </Sheet>
          </div>
        </header>

        {/* Mobile Content */}
        <main className="flex-1 overflow-auto">
          <div className="p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
            {children}
          </div>
        </main>
      </div>
    );
  }

  // Desktop Layout
  return (
    <div className="flex h-screen w-full bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 flex-col border-r border-border bg-sidebar shadow-sm">
        <NavContent />
        <div className="absolute top-4 right-4">
          <NotificationBell />
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <div className="mx-auto max-w-7xl p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
