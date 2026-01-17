import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Search, DollarSign, CheckCircle } from "lucide-react";
import {
  useFipeMarcas,
  useFipeModelos,
  useFipeAnos,
  useFipeConsultaValor,
  useFipeConsultaPorCodigo,
} from "@/hooks/useFipeConsulta";
import { cn } from "@/lib/utils";

interface ConsultaFipeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  veiculoId: string;
  veiculoInfo: string;
  tipoInicial?: string;
}

export function ConsultaFipeDialog({
  open,
  onOpenChange,
  veiculoId,
  veiculoInfo,
  tipoInicial = "carro",
}: ConsultaFipeDialogProps) {
  const [tab, setTab] = useState<"wizard" | "codigo">("wizard");
  const [tipo, setTipo] = useState(tipoInicial);
  const [marcaId, setMarcaId] = useState<string | null>(null);
  const [modeloId, setModeloId] = useState<string | null>(null);
  const [anoId, setAnoId] = useState<string | null>(null);
  const [codigoFipe, setCodigoFipe] = useState("");
  const [resultado, setResultado] = useState<{
    valor: string;
    valorNumerico: number;
    codigoFipe: string;
    mesReferencia: string;
  } | null>(null);

  const { data: marcas = [], isLoading: loadingMarcas } = useFipeMarcas(tipo, open);
  const { data: modelos = [], isLoading: loadingModelos } = useFipeModelos(tipo, marcaId, open);
  const { data: anos = [], isLoading: loadingAnos } = useFipeAnos(tipo, marcaId, modeloId, open);

  const consultaValor = useFipeConsultaValor();
  const consultaPorCodigo = useFipeConsultaPorCodigo();

  // Reset quando mudar tipo
  useEffect(() => {
    setMarcaId(null);
    setModeloId(null);
    setAnoId(null);
    setResultado(null);
  }, [tipo]);

  // Reset quando mudar marca
  useEffect(() => {
    setModeloId(null);
    setAnoId(null);
    setResultado(null);
  }, [marcaId]);

  // Reset quando mudar modelo
  useEffect(() => {
    setAnoId(null);
    setResultado(null);
  }, [modeloId]);

  // Reset resultado quando mudar ano
  useEffect(() => {
    setResultado(null);
  }, [anoId]);

  const handleConsultarWizard = async () => {
    if (!marcaId || !modeloId || !anoId) return;

    try {
      const data = await consultaValor.mutateAsync({
        veiculoId,
        tipo,
        marcaId,
        modeloId,
        anoId,
      });
      setResultado({
        valor: data.valor,
        valorNumerico: data.valorNumerico!,
        codigoFipe: data.codigoFipe,
        mesReferencia: data.mesReferencia,
      });
    } catch {
      // Erro já tratado pelo hook
    }
  };

  const handleConsultarCodigo = async () => {
    if (!codigoFipe.trim()) return;

    try {
      const data = await consultaPorCodigo.mutateAsync({
        veiculoId,
        codigoFipe: codigoFipe.trim(),
        tipo,
      });
      setResultado({
        valor: data.valor,
        valorNumerico: data.valorNumerico!,
        codigoFipe: data.codigoFipe,
        mesReferencia: data.mesReferencia,
      });
    } catch {
      // Erro já tratado pelo hook
    }
  };

  const handleClose = () => {
    setMarcaId(null);
    setModeloId(null);
    setAnoId(null);
    setCodigoFipe("");
    setResultado(null);
    onOpenChange(false);
  };

  const isLoading = consultaValor.isPending || consultaPorCodigo.isPending;
  const canConsultWizard = marcaId && modeloId && anoId && !isLoading;
  const canConsultCodigo = codigoFipe.trim() && !isLoading;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" />
            Consultar Tabela FIPE
          </DialogTitle>
        </DialogHeader>

        <div className="text-sm text-muted-foreground mb-4">
          Veículo: <span className="font-medium text-foreground">{veiculoInfo}</span>
        </div>

        <Tabs value={tab} onValueChange={(v) => setTab(v as "wizard" | "codigo")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="wizard">Por Marca/Modelo</TabsTrigger>
            <TabsTrigger value="codigo">Por Código FIPE</TabsTrigger>
          </TabsList>

          <TabsContent value="wizard" className="space-y-4 mt-4">
            {/* Tipo */}
            <div className="space-y-2">
              <Label>Tipo de Veículo</Label>
              <Select value={tipo} onValueChange={setTipo}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="carro">Carro</SelectItem>
                  <SelectItem value="moto">Moto</SelectItem>
                  <SelectItem value="caminhao">Caminhão</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Marca */}
            <div className="space-y-2">
              <Label>Marca</Label>
              <Select
                value={marcaId || ""}
                onValueChange={setMarcaId}
                disabled={loadingMarcas}
              >
                <SelectTrigger>
                  <SelectValue placeholder={loadingMarcas ? "Carregando..." : "Selecione a marca"} />
                </SelectTrigger>
                <SelectContent className="max-h-[200px]">
                  {marcas.map((m) => (
                    <SelectItem key={m.code} value={m.code}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Modelo */}
            <div className="space-y-2">
              <Label>Modelo</Label>
              <Select
                value={modeloId || ""}
                onValueChange={setModeloId}
                disabled={!marcaId || loadingModelos}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      !marcaId
                        ? "Selecione a marca primeiro"
                        : loadingModelos
                        ? "Carregando..."
                        : "Selecione o modelo"
                    }
                  />
                </SelectTrigger>
                <SelectContent className="max-h-[200px]">
                  {modelos.map((m) => (
                    <SelectItem key={m.code} value={m.code}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Ano */}
            <div className="space-y-2">
              <Label>Ano/Combustível</Label>
              <Select
                value={anoId || ""}
                onValueChange={setAnoId}
                disabled={!modeloId || loadingAnos}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      !modeloId
                        ? "Selecione o modelo primeiro"
                        : loadingAnos
                        ? "Carregando..."
                        : "Selecione o ano"
                    }
                  />
                </SelectTrigger>
                <SelectContent className="max-h-[200px]">
                  {anos.map((a) => (
                    <SelectItem key={a.code} value={a.code}>
                      {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              className="w-full"
              onClick={handleConsultarWizard}
              disabled={!canConsultWizard}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Consultando...
                </>
              ) : (
                <>
                  <Search className="h-4 w-4 mr-2" />
                  Consultar Valor
                </>
              )}
            </Button>
          </TabsContent>

          <TabsContent value="codigo" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Tipo de Veículo</Label>
              <Select value={tipo} onValueChange={setTipo}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="carro">Carro</SelectItem>
                  <SelectItem value="moto">Moto</SelectItem>
                  <SelectItem value="caminhao">Caminhão</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="codigoFipe">Código FIPE</Label>
              <Input
                id="codigoFipe"
                value={codigoFipe}
                onChange={(e) => setCodigoFipe(e.target.value)}
                placeholder="Ex: 001004-9"
              />
              <p className="text-xs text-muted-foreground">
                Digite o código FIPE do veículo (ex: 001004-9)
              </p>
            </div>

            <Button
              className="w-full"
              onClick={handleConsultarCodigo}
              disabled={!canConsultCodigo}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Consultando...
                </>
              ) : (
                <>
                  <Search className="h-4 w-4 mr-2" />
                  Consultar Valor
                </>
              )}
            </Button>
          </TabsContent>
        </Tabs>

        {/* Resultado */}
        {resultado && (
          <div className={cn(
            "mt-4 p-4 rounded-lg border",
            "bg-status-success/5 border-status-success/20"
          )}>
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle className="h-5 w-5 text-status-success" />
              <span className="font-medium text-status-success">Valor Atualizado!</span>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Valor FIPE:</span>
                <span className="font-bold text-lg">{resultado.valor}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Código FIPE:</span>
                <span className="font-medium">{resultado.codigoFipe}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Referência:</span>
                <span>{resultado.mesReferencia}</span>
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
