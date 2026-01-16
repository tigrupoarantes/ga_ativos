import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface PageHeaderProps {
  title: string;
  description?: string;
  subtitle?: string;
  icon?: LucideIcon;
  actions?: ReactNode;
  className?: string;
}

export function PageHeader({ title, description, subtitle, icon: Icon, actions, className }: PageHeaderProps) {
  const subtitleText = description || subtitle;
  
  return (
    <div className={cn("mb-8 lg:mb-12 animate-fade-in", className)}>
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex items-start gap-4">
          {Icon && (
            <div className="flex h-12 w-12 md:h-14 md:w-14 items-center justify-center rounded-xl bg-primary/10 text-primary animate-scale-in flex-shrink-0">
              <Icon className="h-6 w-6 md:h-7 md:w-7" />
            </div>
          )}
          <div className="space-y-1.5 min-w-0">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-foreground">
              {title}
            </h1>
            {subtitleText && (
              <p className="text-sm sm:text-base text-muted-foreground max-w-xl animate-fade-in" style={{ animationDelay: "100ms" }}>
                {subtitleText}
              </p>
            )}
          </div>
        </div>
        {actions && (
          <div className="flex items-center gap-2 animate-fade-in flex-shrink-0" style={{ animationDelay: "150ms" }}>
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}
