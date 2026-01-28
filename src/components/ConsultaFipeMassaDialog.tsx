import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Info } from "lucide-react";
import { Tables } from "@/integrations/supabase/types";

type Veiculo = Tables<"veiculos"> & {
  funcionario?: Tables<"funcionarios"> | null;
  empresa?: Tables<"empresas"> | null;
};

interface ConsultaFipeMassaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  veiculos: Veiculo[];
}

export function ConsultaFipeMassaDialog({
  open,
  onOpenChange,
  veiculos,
}: ConsultaFipeMassaDialogProps) {
  const handleClose = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Consultar FIPE em Massa</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex items-start gap-3 p-4 rounded-lg bg-accent/50 border border-border">
            <Info className="h-5 w-5 text-primary mt-0.5 shrink-0" />
            <div className="space-y-2 text-sm">
              <p className="font-medium text-foreground">
                Consulta em massa indisponível
              </p>
              <p className="text-muted-foreground">
                A API da Tabela FIPE não suporta busca direta por código FIPE. 
                Para consultar o valor FIPE de um veículo, é necessário selecionar 
                manualmente Marca, Modelo e Ano.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-sm font-medium">Como consultar:</p>
            <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
              <li>Abra o cadastro do veículo (clique em Editar)</li>
              <li>Clique no botão <strong>"Consultar FIPE"</strong></li>
              <li>Selecione a Marca, Modelo e Ano do veículo</li>
              <li>O valor será atualizado automaticamente</li>
            </ol>
          </div>

          <div className="flex items-center gap-2 p-3 rounded-lg bg-muted text-muted-foreground">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-sm">
              Total de veículos na frota: {veiculos.length}
            </span>
          </div>
        </div>

        <DialogFooter>
          <Button onClick={handleClose}>
            Entendi
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
