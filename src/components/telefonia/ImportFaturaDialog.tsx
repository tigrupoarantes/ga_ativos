import { useState, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Upload, FileText, AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
import {
  parseClaroBill,
  mergeBillContents,
  applySharedCost,
} from "@/lib/parsers/claro-bill-parser";
import type { ParsedBill, LinhaComRateio } from "@/lib/parsers/claro-bill-parser";
import {
  useImportarFatura,
  brDateToIso,
  formatCurrency,
  type ImportFaturaPayload,
} from "@/hooks/useFaturasTelefonia";
import { useEmpresas } from "@/hooks/useEmpresas";

interface ImportFaturaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ImportFaturaDialog({ open, onOpenChange }: ImportFaturaDialogProps) {
  const { data: empresas = [] } = useEmpresas();
  const importarFatura = useImportarFatura();

  const [empresaId, setEmpresaId] = useState<string>("");
  const [parsedBill, setParsedBill] = useState<ParsedBill | null>(null);
  const [linhasComRateio, setLinhasComRateio] = useState<LinhaComRateio[]>([]);
  const [fileNames, setFileNames] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const resetState = () => {
    setParsedBill(null);
    setLinhasComRateio([]);
    setFileNames([]);
    setError(null);
  };

  const processFiles = useCallback(async (files: File[]) => {
    if (files.length === 0) return;

    setError(null);
    setParsedBill(null);

    try {
      const contents = await Promise.all(files.map((f) => f.text()));
      const merged = mergeBillContents(contents);
      const bill = parseClaroBill(merged);
      const linhas = applySharedCost(bill.linhas, bill.custoCompartilhado);

      setParsedBill(bill);
      setLinhasComRateio(linhas);
      setFileNames(files.map((f) => f.name));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao processar o arquivo.");
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    processFiles(files);
    e.target.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files).filter(
      (f) => f.name.toLowerCase().endsWith(".txt")
    );
    if (files.length === 0) {
      setError("Apenas arquivos .txt são aceitos.");
      return;
    }
    processFiles(files);
  };

  const handleImportar = async () => {
    if (!parsedBill || !empresaId) return;

    const payload: ImportFaturaPayload = {
      empresaId,
      operadora: "Claro",
      numeroFatura: parsedBill.header.numeroFatura,
      periodoInicio: brDateToIso(parsedBill.header.periodoInicio),
      periodoFim: brDateToIso(parsedBill.header.periodoFim),
      dataVencimento: brDateToIso(parsedBill.header.dataVencimento),
      valorTotal: parsedBill.header.valorTotal,
      custoCompartilhado: parsedBill.custoCompartilhado,
      linhas: linhasComRateio,
    };

    await importarFatura.mutateAsync(payload);
    onOpenChange(false);
    resetState();
  };

  const handleClose = () => {
    onOpenChange(false);
    resetState();
  };

  const totalParsed = linhasComRateio.reduce((s, l) => s + l.valorTotal, 0);
  const diffFromHeader =
    parsedBill
      ? Math.abs(totalParsed - parsedBill.header.valorTotal) > 0.1
      : false;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-500" />
            Importar Fatura de Telefonia
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Empresa */}
          <div className="space-y-1.5">
            <Label>Empresa</Label>
            <Select value={empresaId} onValueChange={setEmpresaId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a empresa..." />
              </SelectTrigger>
              <SelectContent>
                {empresas.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Dropzone */}
          <div
            onDrop={handleDrop}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            className={`relative flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-8 text-center transition-colors ${
              isDragging
                ? "border-blue-500 bg-blue-50"
                : "border-border hover:border-blue-400 hover:bg-muted/40"
            }`}
          >
            <Upload className="h-8 w-8 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">
                Arraste os arquivos .txt aqui ou{" "}
                <label className="cursor-pointer text-blue-600 hover:underline">
                  clique para selecionar
                  <input
                    type="file"
                    accept=".txt"
                    multiple
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </label>
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Aceita múltiplos arquivos da mesma fatura (partes 1, 2, etc.)
              </p>
            </div>
            {fileNames.length > 0 && (
              <div className="flex flex-wrap gap-2 justify-center">
                {fileNames.map((n) => (
                  <Badge key={n} variant="secondary" className="text-xs">
                    {n}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Erro de parse */}
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Preview após parse */}
          {parsedBill && (
            <div className="space-y-4">
              {/* Header da fatura */}
              <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
                <p className="text-sm font-semibold">Dados detectados</p>
                <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-sm">
                  <div>
                    <span className="text-muted-foreground">Empresa:</span>{" "}
                    <span className="font-medium">{parsedBill.header.empresa}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Operadora:</span>{" "}
                    <span className="font-medium">Claro</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Período:</span>{" "}
                    <span className="font-medium">
                      {parsedBill.header.periodoInicio} a {parsedBill.header.periodoFim}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Vencimento:</span>{" "}
                    <span className="font-medium">{parsedBill.header.dataVencimento}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Valor total (fatura):</span>{" "}
                    <span className="font-medium">
                      {formatCurrency(parsedBill.header.valorTotal)}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Linhas encontradas:</span>{" "}
                    <span className="font-medium">{parsedBill.totalLinhas}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Custo compartilhado:</span>{" "}
                    <span className="font-medium">
                      {formatCurrency(parsedBill.custoCompartilhado)}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Total calculado:</span>{" "}
                    <span className={`font-medium ${diffFromHeader ? "text-amber-600" : "text-green-600"}`}>
                      {formatCurrency(totalParsed)}
                    </span>
                  </div>
                </div>
                {diffFromHeader && (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription className="text-xs">
                      Diferença entre o total calculado e o declarado na fatura. Isso pode ocorrer
                      por impostos ou itens não detalhados. Verifique os arquivos antes de confirmar.
                    </AlertDescription>
                  </Alert>
                )}
              </div>

              {/* Tabela preview (primeiras 10 linhas) */}
              <div>
                <p className="mb-2 text-sm font-medium">
                  Prévia das linhas ({parsedBill.totalLinhas} no total)
                </p>
                <div className="rounded-md border overflow-auto max-h-52">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Número</TableHead>
                        <TableHead className="text-right">Mensalidade</TableHead>
                        <TableHead className="text-right">Ligações</TableHead>
                        <TableHead className="text-right">Dados</TableHead>
                        <TableHead className="text-right">Serviços</TableHead>
                        <TableHead className="text-right">Compartilhado</TableHead>
                        <TableHead className="text-right font-semibold">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {linhasComRateio.slice(0, 10).map((l) => (
                        <TableRow key={l.numeroLinha}>
                          <TableCell className="font-mono text-xs">{l.numeroLinhaOriginal}</TableCell>
                          <TableCell className="text-right text-xs">
                            {formatCurrency(l.valorMensalidade)}
                          </TableCell>
                          <TableCell className="text-right text-xs">
                            {formatCurrency(l.valorLigacoes)}
                          </TableCell>
                          <TableCell className="text-right text-xs">
                            {formatCurrency(l.valorDados)}
                          </TableCell>
                          <TableCell className="text-right text-xs">
                            {formatCurrency(l.valorServicos)}
                          </TableCell>
                          <TableCell className="text-right text-xs">
                            {formatCurrency(l.valorCompartilhado)}
                          </TableCell>
                          <TableCell className="text-right text-xs font-semibold">
                            {formatCurrency(l.valorTotal)}
                          </TableCell>
                        </TableRow>
                      ))}
                      {parsedBill.totalLinhas > 10 && (
                        <TableRow>
                          <TableCell
                            colSpan={7}
                            className="text-center text-xs text-muted-foreground py-2"
                          >
                            ... e mais {parsedBill.totalLinhas - 10} linhas
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          )}

          {/* Aviso de sucesso de parse */}
          {parsedBill && !error && (
            <div className="flex items-center gap-2 text-sm text-green-600">
              <CheckCircle2 className="h-4 w-4" />
              Arquivo processado com sucesso. Confira os dados e confirme a importação.
            </div>
          )}

          {/* Ações */}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
            <Button
              onClick={handleImportar}
              disabled={!parsedBill || !empresaId || importarFatura.isPending}
            >
              {importarFatura.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Importando...
                </>
              ) : (
                "Confirmar Importação"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
