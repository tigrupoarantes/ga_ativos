import { ReactNode } from "react";
import { Car } from "lucide-react";

interface VehicleLayoutProps {
  children: ReactNode;
}

export function VehicleLayout({ children }: VehicleLayoutProps) {
  return (
    <div className="space-y-6 md:space-y-8">
      {/* Header da seção */}
      <div className="border-b border-border/50 pb-5 md:pb-6">
        <div className="flex items-start sm:items-center gap-3 md:gap-4">
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
      </div>

      {/* Conteúdo da página */}
      <div className="animate-fade-in" style={{ animationDelay: '100ms' }}>
        {children}
      </div>
    </div>
  );
}
