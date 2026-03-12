import { useState, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Upload,
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/external-client";
import { parseCustoFrotaXlsx, type DespesaFromExcel, type TipoDespesa } from "@/lib/parsers/custo-frota-parser";
import {
  useImportarLoteDespesa,
  formatCurrencyFrota,
  TIPO_LABEL,
} from "@/hooks/useCustosVeiculos";

interface ImportCustoFrotaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface DespesaDetalhe extends DespesaFromExcel {
  veiculoModelo: string | null;
  encontrado: boolean;
}

export function ImportCustoFrotaDialog({ open, onOpenChange }: ImportCustoFrotaDialogProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [despesas, setDespesas] = useState<DespesaDetalhe[]>([]);
  const [tipo, setTipo] = useState<TipoDespesa>("pedagio");
  const [fornecedor, setFornecedor] = useState("");
  const [notaFiscal, setNotaFiscal] = useState("");
  const [periodoReferencia, setPeriodoReferencia] = useState("");

  const importar = useImportarLoteDespesa();

  const resetState = () => {
    setFileName(null);
    setDespesas([]);
    setError(null);
    setFornecedor("");
    setNotaFiscal("");
    setPeriodoReferencia("");
  };

  const processFile = useCallback(async (file: File) => {
    setError(null);
    setDespesas([]);
    setIsParsing(true);

    try {
      const result = await parseCustoFrotaXlsx(file);

      // Busca placas cadastradas para match
      const { data: veiculosDb } = await supabase
        .from("veiculos")
        .select("placa, modelo, marca")
        .eq("active", true);

      const veiculoMap = new Map<string, { modelo: string | null; marca: string | null }>();
      for (const v of veiculosDb ?? []) {
        veiculoMap.set(v.placa.toUpperCase(), { modelo: v.modelo, marca: v.marca });
      }

      const detalhes: DespesaDetalhe[] = result.despesas.map((d) => {
        const v = veiculoMap.get(d.placaCorreta);
        return {
          ...d,
          veiculoModelo: v ? `${v.marca ?? ""} ${v.modelo ?? ""}`.trim() || null : null,
          encontrado: !!v,
        };
      });

      setDespesas(detalhes);
      setFileName(file.name);
      setTipo(result.tipo);
      setFornecedor(result.fornecedor);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao processar o arquivo.");
    } finally {
      setIsParsing(false);
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = Array.from(e.dataTransfer.files).find((f) =>
      f.name.toLowerCase().endsWith(".xlsx")
    );
    if (!file) {
      setError("Apenas arquivos .xlsx são aceitos.");
      return;
    }
    processFile(file);
  };

  const handleConfirmar = () => {
    if (!periodoReferencia) return;

    importar.mutate(
      {
        tipo,
        fornecedor,
        notaFiscal,
        periodoReferencia,
        despesas,
      },
      {
        onSuccess: () => {
          onOpenChange(false);
          resetState();
        },
      }
    );
  };

  const hasParsed = despesas.length > 0;
  const encontrados = despesas.filter((d) => d.encontrado).length;
  const naoEncontrados = despesas.filter((d) => !d.encontrado).length;
  const valorTotal = despesas.reduce((s, d) => s + d.valor, 0);

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) resetState(); }}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-blue-500" />
            Importar Custos de Frota
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Dropzone */}
          <div
            onDrop={handleDrop}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            className={`relative flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-5 text-center transition-colors ${
              isDragging
                ? "border-blue-500 bg-blue-50"
                : hasParsed
                ? "border-green-400 bg-green-50/40"
                : "border-border hover:border-blue-400 hover:bg-muted/40"
            }`}
          >
            {isParsing ? (
              <Loader2 className="h-7 w-7 animate-spin text-blue-500" />
            ) : (
              <FileSpreadsheet className={`h-7 w-7 ${hasParsed ? "text-green-500" : "text-muted-foreground"}`} />
            )}
            <div>
              <p className="text-sm font-medium">
                Arraste o arquivo .xlsx aqui ou{" "}
                <label className="cursor-pointer text-blue-600 hover:underline">
                  clique para selecionar
                  <input type="file" accept=".xlsx" className="hidden" onChange={handleFileChange} />
                </label>
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Formatos suportados: Veloe (pedágio) e planilhas de abastecimento
              </p>
            </div>
            {fileName && (
              <Badge variant="secondary" className="text-xs font-mono">{fileName}</Badge>
            )}
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Formulário de metadados */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="space-y-1">
              <Label>Tipo *</Label>
              <Select value={tipo} onValueChange={(v) => setTipo(v as TipoDespesa)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pedagio">Pedágio</SelectItem>
                  <SelectItem value="combustivel">Combustível</SelectItem>
                  <SelectItem value="outros">Outros</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Fornecedor</Label>
              <Input
                placeholder="Ex: Veloe, Posto Violeta"
                value={fornecedor}
                onChange={(e) => setFornecedor(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>Nota Fiscal</Label>
              <Input
                placeholder="Ex: 2384"
                value={notaFiscal}
                onChange={(e) => setNotaFiscal(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>Período de referência *</Label>
              <Input
                type="date"
                value={periodoReferencia}
                onChange={(e) => setPeriodoReferencia(e.target.value)}
              />
            </div>
          </div>

          {/* Resumo e preview */}
          {hasParsed && (
            <div className="space-y-3">
              {/* Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="rounded-lg border bg-green-50/60 p-3 text-center">
                  <p className="text-2xl font-bold text-green-700">{encontrados}</p>
                  <p className="text-xs text-green-600 mt-0.5">Vinculados</p>
                </div>
                <div className="rounded-lg border bg-amber-50/60 p-3 text-center">
                  <p className="text-2xl font-bold text-amber-700">{naoEncontrados}</p>
                  <p className="text-xs text-amber-600 mt-0.5">Não cadastrados</p>
                </div>
                <div className="rounded-lg border bg-blue-50/60 p-3 text-center">
                  <p className="text-2xl font-bold text-blue-700">{despesas.length}</p>
                  <p className="text-xs text-blue-600 mt-0.5">Total veículos</p>
                </div>
                <div className="rounded-lg border bg-purple-50/60 p-3 text-center">
                  <p className="text-lg font-bold text-purple-700">{formatCurrencyFrota(valorTotal)}</p>
                  <p className="text-xs text-purple-600 mt-0.5">Valor total</p>
                </div>
              </div>

              {naoEncontrados > 0 && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    {naoEncontrados} placa{naoEncontrados > 1 ? "s" : ""} não encontrada{naoEncontrados > 1 ? "s" : ""} no cadastro.
                    Serão importadas mesmo assim. Verifique o cadastro de veículos.
                  </AlertDescription>
                </Alert>
              )}

              {/* Preview table */}
              <div>
                <p className="mb-2 text-sm font-medium text-muted-foreground">
                  Prévia — {despesas.length} veículos (mostrando primeiros 20)
                </p>
                <div className="rounded-md border overflow-auto max-h-52">
                  <Table>
                    <TableHeader className="sticky top-0 bg-background z-10 shadow-sm">
                      <TableRow>
                        <TableHead>Placa</TableHead>
                        <TableHead>Veículo</TableHead>
                        <TableHead>Condutor</TableHead>
                        <TableHead className="text-right">Valor</TableHead>
                        <TableHead>Rateio 1</TableHead>
                        <TableHead>Rateio 2</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {despesas.slice(0, 20).map((d, i) => (
                        <TableRow key={i} className={!d.encontrado ? "bg-amber-50/40" : undefined}>
                          <TableCell className="font-mono text-xs font-medium">
                            {d.placaCorreta}
                            {!d.encontrado && (
                              <Badge variant="outline" className="ml-1 text-[10px] border-amber-400 text-amber-600">
                                novo
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {d.veiculoModelo ?? "—"}
                          </TableCell>
                          <TableCell className="text-xs">{d.condutor || "—"}</TableCell>
                          <TableCell className="text-right text-xs font-medium">
                            {formatCurrencyFrota(d.valor)}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {d.rateio1Empresa
                              ? `${d.rateio1Empresa} — ${formatCurrencyFrota(d.rateio1Valor)}`
                              : "—"}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {d.rateio2Empresa
                              ? `${d.rateio2Empresa} — ${formatCurrencyFrota(d.rateio2Valor)}`
                              : "—"}
                          </TableCell>
                        </TableRow>
                      ))}
                      {despesas.length > 20 && (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-xs text-muted-foreground py-2">
                            ... e mais {despesas.length - 20} veículos
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          )}

          {/* Ações */}
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" onClick={() => { onOpenChange(false); resetState(); }}>
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmar}
              disabled={!hasParsed || !periodoReferencia || importar.isPending}
            >
              {importar.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Importando...
                </>
              ) : !hasParsed ? (
                "Selecione o arquivo primeiro"
              ) : !periodoReferencia ? (
                "Informe o período"
              ) : (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Confirmar Importação ({despesas.length} veículos)
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
