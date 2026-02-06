import { useState, useCallback } from "react";
import * as XLSX from "xlsx";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2, RefreshCw, Plus, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ImportAreasDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  companyName: string;
  onSuccess?: () => void;
}

interface PreviewRow {
  cost_center: string;
  name: string;
  status: "new" | "update" | "skip" | "error";
  existingId?: string;
  error?: string;
}

interface ImportResult {
  inserted: number;
  updated: number;
  skipped: number;
  errors: number;
}

export function ImportAreasDialog({
  open,
  onOpenChange,
  companyId,
  companyName,
  onSuccess,
}: ImportAreasDialogProps) {
  const [step, setStep] = useState<"upload" | "preview" | "importing" | "done">("upload");
  const [file, setFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<PreviewRow[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ImportResult | null>(null);

  const resetDialog = useCallback(() => {
    setStep("upload");
    setFile(null);
    setPreviewData([]);
    setIsAnalyzing(false);
    setIsImporting(false);
    setProgress(0);
    setResult(null);
  }, []);

  const handleClose = () => {
    resetDialog();
    onOpenChange(false);
  };

  const normalizeCostCenter = (value: string | number | undefined | null): string => {
    if (value === undefined || value === null) return "";
    return String(value).trim();
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setIsAnalyzing(true);

    try {
      const data = await selectedFile.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet);

      if (jsonData.length === 0) {
        toast.error("Arquivo vazio ou sem dados válidos");
        setFile(null);
        setIsAnalyzing(false);
        return;
      }

      // Map column names (flexible)
      const rows = jsonData.map((row) => {
        const rawCostCenter = row["CCUSTO"] ?? row["ccusto"] ?? row["Centro de Custo"] ?? row["cost_center"] ?? row["CENTRO_CUSTO"];
        const costCenter = normalizeCostCenter(rawCostCenter as string | number | undefined | null);
        const rawName = row["DESCRIÇÃO CENTRO DE CUSTO"] ?? row["DESCRICAO CENTRO DE CUSTO"] ?? row["Descrição"] ?? 
          row["DESCRICAO"] ?? row["name"] ?? row["Nome"] ?? row["NOME"] ?? "";
        const name = String(rawName).trim();

        return { cost_center: costCenter, name };
      }).filter(r => r.cost_center || r.name); // Filter empty rows

      if (rows.length === 0) {
        toast.error("Nenhum registro válido encontrado. Verifique as colunas: CCUSTO, DESCRIÇÃO CENTRO DE CUSTO");
        setFile(null);
        setIsAnalyzing(false);
        return;
      }

      // Fetch existing areas for this company
      const { data: existingAreas, error } = await supabase
        .from("areas")
        .select("id, cost_center, name")
        .eq("company_id", companyId);

      if (error) {
        console.error("Erro ao buscar áreas existentes:", error);
        toast.error("Erro ao verificar áreas existentes");
        setIsAnalyzing(false);
        return;
      }

      // Create lookup by cost_center
      const existingByCostCenter = new Map(
        (existingAreas || [])
          .filter(a => a.cost_center)
          .map(a => [a.cost_center!, { id: a.id, name: a.name }])
      );

      // Analyze each row
      const preview: PreviewRow[] = rows.map((row) => {
        if (!row.cost_center) {
          return { ...row, status: "error", error: "Centro de custo vazio" };
        }
        if (!row.name) {
          return { ...row, status: "error", error: "Descrição vazia" };
        }

        const existing = existingByCostCenter.get(row.cost_center);
        if (existing) {
          // Check if name changed
          if (existing.name === row.name) {
            return { ...row, status: "skip", existingId: existing.id };
          }
          return { ...row, status: "update", existingId: existing.id };
        }

        return { ...row, status: "new" };
      });

      setPreviewData(preview);
      setStep("preview");
    } catch (err) {
      console.error("Erro ao processar arquivo:", err);
      toast.error("Erro ao processar arquivo Excel");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleImport = async () => {
    setIsImporting(true);
    setStep("importing");

    const toProcess = previewData.filter(r => r.status === "new" || r.status === "update");
    const total = toProcess.length;
    let processed = 0;

    const importResult: ImportResult = {
      inserted: 0,
      updated: 0,
      skipped: previewData.filter(r => r.status === "skip").length,
      errors: previewData.filter(r => r.status === "error").length,
    };

    for (const row of toProcess) {
      try {
        if (row.status === "new") {
          const { error } = await supabase
            .from("areas")
            .insert({
              company_id: companyId,
              cost_center: row.cost_center,
              name: row.name,
              active: true,
            });

          if (error) throw error;
          importResult.inserted++;
        } else if (row.status === "update" && row.existingId) {
          const { error } = await supabase
            .from("areas")
            .update({
              name: row.name,
              active: true,
            })
            .eq("id", row.existingId);

          if (error) throw error;
          importResult.updated++;
        }
      } catch (err) {
        console.error("Erro ao processar registro:", err);
        importResult.errors++;
      }

      processed++;
      setProgress(Math.round((processed / total) * 100));
    }

    setResult(importResult);
    setStep("done");
    setIsImporting(false);

    if (importResult.inserted > 0 || importResult.updated > 0) {
      toast.success(
        `Importação concluída: ${importResult.inserted} inseridos, ${importResult.updated} atualizados`
      );
      onSuccess?.();
    }
  };

  const summaryStats = {
    new: previewData.filter(r => r.status === "new").length,
    update: previewData.filter(r => r.status === "update").length,
    skip: previewData.filter(r => r.status === "skip").length,
    error: previewData.filter(r => r.status === "error").length,
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Importar Centros de Custo
          </DialogTitle>
          <DialogDescription>
            Importando para: <strong>{companyName}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          {/* STEP: Upload */}
          {step === "upload" && (
            <div className="flex flex-col items-center justify-center py-8 gap-4">
              <div className="border-2 border-dashed rounded-lg p-8 w-full text-center hover:border-primary/50 transition-colors">
                <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-sm text-muted-foreground mb-4">
                  Arraste um arquivo Excel (.xlsx) ou clique para selecionar
                </p>
                <Input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileSelect}
                  className="max-w-[300px] mx-auto"
                  disabled={isAnalyzing}
                />
              </div>

              {isAnalyzing && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Analisando arquivo...
                </div>
              )}

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Formato esperado</AlertTitle>
                <AlertDescription>
                  <p className="text-sm">Colunas: <strong>CCUSTO</strong> (código) e <strong>DESCRIÇÃO CENTRO DE CUSTO</strong></p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Se o código já existir, a descrição será atualizada.
                  </p>
                </AlertDescription>
              </Alert>
            </div>
          )}

          {/* STEP: Preview */}
          {step === "preview" && (
            <div className="space-y-4">
              {/* Summary badges */}
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="border-primary/30 text-primary">
                  <Plus className="h-3 w-3 mr-1" />
                  {summaryStats.new} novos
                </Badge>
                <Badge variant="outline" className="border-accent/30 text-accent-foreground">
                  <RefreshCw className="h-3 w-3 mr-1" />
                  {summaryStats.update} atualizações
                </Badge>
                <Badge variant="secondary">
                  {summaryStats.skip} sem alteração
                </Badge>
                {summaryStats.error > 0 && (
                  <Badge variant="destructive">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    {summaryStats.error} erros
                  </Badge>
                )}
              </div>

              {/* Data tabs */}
              <Tabs defaultValue="all" className="w-full">
                <TabsList>
                  <TabsTrigger value="all">Todos ({previewData.length})</TabsTrigger>
                  <TabsTrigger value="new">Novos ({summaryStats.new})</TabsTrigger>
                  <TabsTrigger value="update">Atualizações ({summaryStats.update})</TabsTrigger>
                  {summaryStats.error > 0 && (
                    <TabsTrigger value="error">Erros ({summaryStats.error})</TabsTrigger>
                  )}
                </TabsList>

                {["all", "new", "update", "error"].map((tabValue) => (
                  <TabsContent key={tabValue} value={tabValue} className="mt-4">
                    <ScrollArea className="h-[300px] border rounded-md">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[120px]">Código</TableHead>
                            <TableHead>Descrição</TableHead>
                            <TableHead className="w-[120px]">Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {previewData
                            .filter(r => tabValue === "all" || r.status === tabValue)
                            .map((row, idx) => (
                              <TableRow key={idx}>
                                <TableCell className="font-mono">{row.cost_center}</TableCell>
                                <TableCell>{row.name}</TableCell>
                                <TableCell>
                                  {row.status === "new" && (
                                    <Badge variant="outline" className="border-primary/30 text-primary">Novo</Badge>
                                  )}
                                  {row.status === "update" && (
                                    <Badge variant="outline" className="border-accent/30 text-accent-foreground">Atualizar</Badge>
                                  )}
                                  {row.status === "skip" && (
                                    <Badge variant="secondary">Igual</Badge>
                                  )}
                                  {row.status === "error" && (
                                    <Badge variant="destructive" title={row.error}>Erro</Badge>
                                  )}
                                </TableCell>
                              </TableRow>
                            ))}
                        </TableBody>
                      </Table>
                    </ScrollArea>
                  </TabsContent>
                ))}
              </Tabs>
            </div>
          )}

          {/* STEP: Importing */}
          {step === "importing" && (
            <div className="py-8 space-y-4">
              <div className="text-center">
                <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
                <p className="mt-4 text-lg font-medium">Importando registros...</p>
                <p className="text-sm text-muted-foreground">
                  Por favor, aguarde enquanto os dados são processados.
                </p>
              </div>
              <Progress value={progress} className="w-full" />
              <p className="text-center text-sm text-muted-foreground">{progress}%</p>
            </div>
          )}

          {/* STEP: Done */}
          {step === "done" && result && (
            <div className="py-8 space-y-4">
              <div className="text-center">
                <CheckCircle2 className="h-12 w-12 mx-auto text-primary" />
                <p className="mt-4 text-lg font-medium">Importação Concluída!</p>
              </div>

              <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
                <div className="bg-primary/10 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-primary">{result.inserted}</p>
                  <p className="text-sm text-primary/80">Inseridos</p>
                </div>
                <div className="bg-accent/10 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-accent-foreground">{result.updated}</p>
                  <p className="text-sm text-accent-foreground/80">Atualizados</p>
                </div>
                <div className="bg-muted rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-muted-foreground">{result.skipped}</p>
                  <p className="text-sm text-muted-foreground">Sem alteração</p>
                </div>
                {result.errors > 0 && (
                  <div className="bg-destructive/10 rounded-lg p-4 text-center">
                    <p className="text-2xl font-bold text-destructive">{result.errors}</p>
                    <p className="text-sm text-destructive/80">Erros</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          {step === "upload" && (
            <Button variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
          )}

          {step === "preview" && (
            <>
              <Button variant="outline" onClick={resetDialog}>
                Voltar
              </Button>
              <Button
                onClick={handleImport}
                disabled={summaryStats.new === 0 && summaryStats.update === 0}
              >
                Importar {summaryStats.new + summaryStats.update} registros
              </Button>
            </>
          )}

          {step === "done" && (
            <Button onClick={handleClose}>
              Fechar
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
