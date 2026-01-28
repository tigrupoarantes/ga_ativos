import { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { AlertTriangle, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { Tables } from "@/integrations/supabase/types";
import { useFipeConsultaPorCodigo } from "@/hooks/useFipeConsulta";
import { useQueryClient } from "@tanstack/react-query";

type Veiculo = Tables<"veiculos"> & {
  funcionario?: Tables<"funcionarios"> | null;
  empresa?: Tables<"empresas"> | null;
};

interface ConsultaFipeMassaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  veiculos: Veiculo[];
}

interface ResultadoConsulta {
  placa: string;
  sucesso: boolean;
  mensagem: string;
}

export function ConsultaFipeMassaDialog({
  open,
  onOpenChange,
  veiculos,
}: ConsultaFipeMassaDialogProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentVeiculo, setCurrentVeiculo] = useState<string>("");
  const [progress, setProgress] = useState(0);
  const [processados, setProcessados] = useState(0);
  const [sucessos, setSucessos] = useState(0);
  const [falhas, setFalhas] = useState(0);
  const [concluido, setConcluido] = useState(false);
  const [resultados, setResultados] = useState<ResultadoConsulta[]>([]);
  const cancelRef = useRef(false);

  const consultaFipe = useFipeConsultaPorCodigo();
  const queryClient = useQueryClient();

  // Veículos com código FIPE
  const veiculosComFipe = veiculos.filter((v) => v.codigo_fipe && v.codigo_fipe.trim() !== "");
  const veiculosSemFipe = veiculos.length - veiculosComFipe.length;

  const mapTipoToFipe = (tipo: string | null): string => {
    if (!tipo) return "carros";
    const tipoLower = tipo.toLowerCase();
    if (tipoLower.includes("moto")) return "motos";
    if (tipoLower.includes("caminh")) return "caminhoes";
    return "carros";
  };

  const handleIniciar = async () => {
    if (veiculosComFipe.length === 0) return;

    setIsProcessing(true);
    setConcluido(false);
    setProgress(0);
    setProcessados(0);
    setSucessos(0);
    setFalhas(0);
    setResultados([]);
    cancelRef.current = false;

    const total = veiculosComFipe.length;

    for (let i = 0; i < total; i++) {
      if (cancelRef.current) break;

      const veiculo = veiculosComFipe[i];
      setCurrentVeiculo(`${veiculo.placa} - ${veiculo.marca} ${veiculo.modelo}`);

      try {
        await consultaFipe.mutateAsync({
          veiculoId: veiculo.id,
          codigoFipe: veiculo.codigo_fipe!,
          tipo: mapTipoToFipe(veiculo.tipo),
        });

        setSucessos((prev) => prev + 1);
        setResultados((prev) => [
          ...prev,
          { placa: veiculo.placa, sucesso: true, mensagem: "Atualizado com sucesso" },
        ]);
      } catch (error) {
        setFalhas((prev) => prev + 1);
        setResultados((prev) => [
          ...prev,
          {
            placa: veiculo.placa,
            sucesso: false,
            mensagem: error instanceof Error ? error.message : "Erro desconhecido",
          },
        ]);
      }

      setProcessados(i + 1);
      setProgress(((i + 1) / total) * 100);

      // Rate limiting: aguardar 500ms entre consultas
      if (i < total - 1 && !cancelRef.current) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    setIsProcessing(false);
    setConcluido(true);
    setCurrentVeiculo("");
    queryClient.invalidateQueries({ queryKey: ["veiculos"] });
  };

  const handleCancelar = () => {
    if (isProcessing) {
      cancelRef.current = true;
    } else {
      resetState();
      onOpenChange(false);
    }
  };

  const resetState = () => {
    setIsProcessing(false);
    setConcluido(false);
    setProgress(0);
    setProcessados(0);
    setSucessos(0);
    setFalhas(0);
    setResultados([]);
    setCurrentVeiculo("");
    cancelRef.current = false;
  };

  const handleClose = () => {
    resetState();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !isProcessing && onOpenChange(o)}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isProcessing
              ? "Consultando FIPE..."
              : concluido
              ? "Consulta Concluída"
              : "Consultar FIPE em Massa"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {!isProcessing && !concluido && (
            <>
              <p className="text-sm text-muted-foreground">
                Esta ação vai consultar o valor FIPE para todos os veículos que possuem código FIPE
                cadastrado.
              </p>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Veículos com código FIPE:</span>
                  <span className="font-semibold">
                    {veiculosComFipe.length} de {veiculos.length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Veículos sem código:</span>
                  <span className="font-semibold text-muted-foreground">{veiculosSemFipe}</span>
                </div>
              </div>

              {veiculosComFipe.length === 0 && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-status-warning/10 text-status-warning">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="text-sm">
                    Nenhum veículo possui código FIPE cadastrado. Cadastre o código FIPE nos
                    veículos para usar esta função.
                  </span>
                </div>
              )}

              {veiculosSemFipe > 0 && veiculosComFipe.length > 0 && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-muted text-muted-foreground">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="text-sm">
                    Veículos sem código FIPE serão ignorados.
                  </span>
                </div>
              )}
            </>
          )}

          {isProcessing && (
            <>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Processando: {currentVeiculo}</span>
              </div>

              <Progress value={progress} className="h-2" />

              <div className="flex justify-between text-sm">
                <span>
                  {processados} de {veiculosComFipe.length} ({Math.round(progress)}%)
                </span>
              </div>

              <div className="flex gap-4 text-sm">
                <div className="flex items-center gap-1 text-status-success">
                  <CheckCircle className="h-4 w-4" />
                  <span>Atualizados: {sucessos}</span>
                </div>
                <div className="flex items-center gap-1 text-status-error">
                  <XCircle className="h-4 w-4" />
                  <span>Falhas: {falhas}</span>
                </div>
              </div>
            </>
          )}

          {concluido && (
            <>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-status-success">
                  <CheckCircle className="h-5 w-5" />
                  <span className="font-medium">Consulta finalizada!</span>
                </div>

                <div className="flex gap-4 text-sm">
                  <span>
                    Atualizados: <strong className="text-status-success">{sucessos}</strong>
                  </span>
                  <span>
                    Falhas: <strong className="text-status-error">{falhas}</strong>
                  </span>
                </div>
              </div>

              {resultados.length > 0 && falhas > 0 && (
                <div className="max-h-40 overflow-y-auto border rounded-lg p-2 space-y-1">
                  {resultados
                    .filter((r) => !r.sucesso)
                    .map((r, idx) => (
                      <div key={idx} className="text-xs flex justify-between text-status-error">
                        <span>{r.placa}</span>
                        <span className="truncate ml-2">{r.mensagem}</span>
                      </div>
                    ))}
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter>
          {!isProcessing && !concluido && (
            <>
              <Button variant="outline" onClick={handleCancelar}>
                Cancelar
              </Button>
              <Button onClick={handleIniciar} disabled={veiculosComFipe.length === 0}>
                Iniciar Consulta
              </Button>
            </>
          )}

          {isProcessing && (
            <Button variant="outline" onClick={handleCancelar}>
              Cancelar
            </Button>
          )}

          {concluido && (
            <Button onClick={handleClose}>
              Fechar
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
