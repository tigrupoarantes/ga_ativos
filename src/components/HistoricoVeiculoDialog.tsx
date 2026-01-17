import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { History, ArrowRight, UserCircle, Car } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useVeiculosHistoricoResponsavel } from "@/hooks/useVeiculosHistoricoResponsavel";
import { cn } from "@/lib/utils";

interface HistoricoVeiculoDialogProps {
  veiculoPlaca: string | null;
  veiculoInfo?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function HistoricoVeiculoDialog({ veiculoPlaca, veiculoInfo, open, onOpenChange }: HistoricoVeiculoDialogProps) {
  const { historico, isLoading } = useVeiculosHistoricoResponsavel(veiculoPlaca || undefined);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Histórico de Responsáveis
            {veiculoInfo && (
              <span className="text-muted-foreground font-normal">
                - {veiculoInfo}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="mt-4">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : historico.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Car className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Nenhuma alteração de responsável registrada para este veículo.</p>
            </div>
          ) : (
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-4 top-2 bottom-2 w-0.5 bg-border" />

              <div className="space-y-4">
                {historico.map((item, index) => (
                  <div key={item.id} className="relative pl-10">
                    {/* Timeline dot */}
                    <div
                      className={cn(
                        "absolute left-2.5 top-3 h-3 w-3 rounded-full border-2 bg-background",
                        index === 0 ? "border-primary" : "border-muted-foreground/50"
                      )}
                    />

                    <div className="bg-muted/50 rounded-lg p-4 border">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-sm text-muted-foreground">
                              {item.data_alteracao
                                ? format(new Date(item.data_alteracao), "dd/MM/yyyy 'às' HH:mm", {
                                    locale: ptBR,
                                  })
                                : "-"}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 text-sm">
                            <UserCircle className="h-4 w-4 text-muted-foreground shrink-0" />
                            <span className={cn(
                              item.funcionario_anterior ? "font-medium" : "text-muted-foreground italic"
                            )}>
                              {item.funcionario_anterior?.nome || "Sem responsável"}
                            </span>
                            <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                            <span className={cn(
                              item.funcionario_novo ? "font-medium text-primary" : "text-muted-foreground italic"
                            )}>
                              {item.funcionario_novo?.nome || "Sem responsável"}
                            </span>
                          </div>

                          {item.observacoes && (
                            <p className="text-sm text-muted-foreground mt-2 italic">
                              {item.observacoes}
                            </p>
                          )}

                          {item.usuario_alteracao && (
                            <p className="text-xs text-muted-foreground mt-2">
                              Por: {item.usuario_alteracao}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
