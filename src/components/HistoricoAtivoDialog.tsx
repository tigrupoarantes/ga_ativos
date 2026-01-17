import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { History, ArrowRight, UserCircle, Package2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useHistoricoAtivo } from "@/hooks/useHistoricoAtivo";
import { cn } from "@/lib/utils";

interface HistoricoAtivoDialogProps {
  ativoId: string | null;
  ativoNome?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const statusColors: Record<string, string> = {
  atribuido: "bg-status-success/10 text-status-success border-status-success/20",
  devolvido: "bg-status-warning/10 text-status-warning border-status-warning/20",
  transferido: "bg-status-info/10 text-status-info border-status-info/20",
};

const statusLabels: Record<string, string> = {
  atribuido: "Atribuído",
  devolvido: "Devolvido",
  transferido: "Transferido",
};

export function HistoricoAtivoDialog({ ativoId, ativoNome, open, onOpenChange }: HistoricoAtivoDialogProps) {
  const { historico, isLoading } = useHistoricoAtivo(ativoId || undefined);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Histórico de Movimentação
            {ativoNome && (
              <span className="text-muted-foreground font-normal">
                - {ativoNome}
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
              <Package2 className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Nenhuma movimentação registrada para este ativo.</p>
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
                            <Badge
                              variant="outline"
                              className={cn(
                                "capitalize",
                                statusColors[item.status || ""] || "bg-muted"
                              )}
                            >
                              {statusLabels[item.status || ""] || item.status || "Movimentação"}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              {item.data_atribuicao
                                ? format(new Date(item.data_atribuicao), "dd/MM/yyyy 'às' HH:mm", {
                                    locale: ptBR,
                                  })
                                : "-"}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 text-sm">
                            <UserCircle className="h-4 w-4 text-muted-foreground" />
                            {item.funcionario ? (
                              <span>
                                <span className="font-medium">{item.funcionario.nome}</span>
                                {item.funcionario.cargo && (
                                  <span className="text-muted-foreground ml-1">
                                    ({item.funcionario.cargo})
                                  </span>
                                )}
                              </span>
                            ) : (
                              <span className="text-muted-foreground italic">
                                Sem responsável (estoque)
                              </span>
                            )}
                          </div>

                          {item.observacoes && (
                            <p className="text-sm text-muted-foreground mt-2 italic">
                              {item.observacoes}
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
