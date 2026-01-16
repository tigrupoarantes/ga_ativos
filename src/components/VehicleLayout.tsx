import { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { Car, Gauge, ClipboardList } from "lucide-react";
import { cn } from "@/lib/utils";

interface VehicleLayoutProps {
  children: ReactNode;
}

const subNavItems = [
  { icon: Gauge, label: "Dashboard", shortLabel: "Dash", path: "/veiculos" },
  { icon: ClipboardList, label: "Cadastro", shortLabel: "Cadastro", path: "/veiculos/cadastro" },
];

export function VehicleLayout({ children }: VehicleLayoutProps) {
  const location = useLocation();

  return (
    <div className="space-y-6 md:space-y-8">
      {/* Header da seção - Apple style */}
      <div className="border-b border-border/50 pb-5 md:pb-6">
        <div className="flex items-start sm:items-center gap-3 md:gap-4 mb-5 md:mb-6">
          <div className="flex h-12 w-12 md:h-14 md:w-14 items-center justify-center rounded-apple-lg bg-primary/10 flex-shrink-0 animate-scale-in">
            <Car className="h-6 w-6 md:h-7 md:w-7 text-primary" />
          </div>
          <div className="min-w-0 animate-fade-in">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-foreground">
              Veículos
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-1">
              Gestão completa da frota
            </p>
          </div>
        </div>

        {/* Sub-navegação - Apple style tabs */}
        <nav className="flex gap-1.5 sm:gap-2 overflow-x-auto pb-1 -mb-1 scrollbar-hide">
          {subNavItems.map((item, index) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;

            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center gap-2 px-3 sm:px-4 py-2.5 text-sm font-medium rounded-xl transition-all duration-300 ease-out whitespace-nowrap animate-fade-in flex-shrink-0",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{item.label}</span>
                <span className="sm:hidden">{item.shortLabel}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Conteúdo da página */}
      <div className="animate-fade-in" style={{ animationDelay: '100ms' }}>
        {children}
      </div>
    </div>
  );
}
