import { useState } from "react";
import { AlertTriangle, ArrowRight, UserCircle } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface ConfirmResponsavelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  responsavelAnteriorNome: string | null;
  responsavelNovoNome: string | null;
  veiculoInfo: string;
  onConfirm: (observacoes: string) => void;
  isPending?: boolean;
}

export function ConfirmResponsavelDialog({
  open,
  onOpenChange,
  responsavelAnteriorNome,
  responsavelNovoNome,
  veiculoInfo,
  onConfirm,
  isPending,
}: ConfirmResponsavelDialogProps) {
  const [observacoes, setObservacoes] = useState("");

  const handleConfirm = () => {
    onConfirm(observacoes);
    setObservacoes("");
  };

  const handleCancel = () => {
    setObservacoes("");
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-warning" />
            Confirmar Alteração de Responsável
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4">
              <p>
                Você está alterando o responsável do veículo{" "}
                <span className="font-medium text-foreground">{veiculoInfo}</span>
              </p>

              <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-2 flex-1">
                  <UserCircle className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className={responsavelAnteriorNome ? "font-medium" : "text-muted-foreground italic"}>
                    {responsavelAnteriorNome || "Sem responsável"}
                  </span>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="flex items-center gap-2 flex-1">
                  <UserCircle className="h-4 w-4 text-primary shrink-0" />
                  <span className={responsavelNovoNome ? "font-medium text-primary" : "text-muted-foreground italic"}>
                    {responsavelNovoNome || "Sem responsável"}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="observacoes">Observações (opcional)</Label>
                <Textarea
                  id="observacoes"
                  placeholder="Ex: Transferência por férias do colaborador anterior..."
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleCancel} disabled={isPending}>
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirm} disabled={isPending}>
            {isPending ? "Salvando..." : "Confirmar Alteração"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
