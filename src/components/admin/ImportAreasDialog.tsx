import { useState, useRef } from "react";
import * as XLSX from "xlsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Upload, FileSpreadsheet, Check, AlertCircle, Building2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/external-client";
import { toast } from "sonner";

interface Empresa {
  id: string;
  nome: string;
  razao_social?: string;
}

interface ImportAreasDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  empresas: Empresa[];
  onSuccess?: () => void;
}

interface PreviewRow {
  empresa_excel: string;
  empresa_match?: Empresa;
  cost_center: string;
  name: string;
  status: "new" | "update" | "skip" | "error";
  existingId?: string;
  error?: string;
}

type Step = "upload" | "preview" | "importing" | "done";

// Normalize string for comparison (lowercase, remove accents, trim extra spaces)
function normalizeString(str: string | undefined | null): string {
  if (!str) return "";
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// Fuzzy match empresa from Excel to registered companies
function matchEmpresa(nomeExcel: string, empresas: Empresa[]): Empresa | null {
  const normalizado = normalizeString(nomeExcel);
  if (!normalizado) return null;

  // 1. Exact match by nome
  let match = empresas.find((e) => normalizeString(e.nome) === normalizado);
  if (match) return match;

  // 2. Exact match by razao_social
  match = empresas.find((e) => normalizeString(e.razao_social) === normalizado);
  if (match) return match;

  // 3. Partial match (nome contains or is contained)
  match = empresas.find((e) => {
    const nomeNorm = normalizeString(e.nome);
    const razaoNorm = normalizeString(e.razao_social);
    return (
      nomeNorm.includes(normalizado) ||
      normalizado.includes(nomeNorm) ||
      razaoNorm.includes(normalizado) ||
      normalizado.includes(razaoNorm)
    );
  });
  if (match) return match;

  return null;
}

// Normalize cost center (remove leading zeros, trim)
function normalizeCostCenter(value: string | number | undefined | null): string {
  if (value === undefined || value === null) return "";
  const str = String(value).trim();
  // Remove leading zeros but keep at least one character
  return str.replace(/^0+/, "") || "0";
}

export function ImportAreasDialog({
  open,
  onOpenChange,
  empresas,
  onSuccess,
}: ImportAreasDialogProps) {
  const [step, setStep] = useState<Step>("upload");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [previewByEmpresa, setPreviewByEmpresa] = useState<Map<string, PreviewRow[]>>(new Map());
  const [importResults, setImportResults] = useState({ success: 0, errors: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetState = () => {
    setStep("upload");
    setIsAnalyzing(false);
    setIsImporting(false);
    setPreviewByEmpresa(new Map());
    setImportResults({ success: 0, errors: 0 });
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleClose = () => {
    resetState();
    onOpenChange(false);
  };

  const analyzeFile = async (file: File) => {
    setIsAnalyzing(true);
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet) as Record<string, unknown>[];

      if (rows.length === 0) {
        toast.error("Arquivo vazio ou sem dados válidos");
        setIsAnalyzing(false);
        return;
      }

      // Group by empresa from Excel
      const byEmpresa = new Map<string, PreviewRow[]>();

      for (const row of rows) {
        const empresaExcel = String(row["EMPRESA"] || "").trim();
        const rawCostCenter = row["CCUSTO"] || row["cost_center"];
        const costCenter = normalizeCostCenter(typeof rawCostCenter === 'string' || typeof rawCostCenter === 'number' ? rawCostCenter : String(rawCostCenter || ""));
        const name = String(row["DESCRIÇÃO CENTRO DE CUSTO"] || row["DESCRICAO CENTRO DE CUSTO"] || row["name"] || "").trim();

        if (!costCenter || !name) continue;

        // Try to match with registered companies
        const empresaMatch = matchEmpresa(empresaExcel, empresas);

        const grupo = byEmpresa.get(empresaExcel) || [];
        grupo.push({
          empresa_excel: empresaExcel,
          empresa_match: empresaMatch || undefined,
          cost_center: costCenter,
          name,
          status: empresaMatch ? "new" : "error",
          error: empresaMatch ? undefined : "Empresa não encontrada",
        });
        byEmpresa.set(empresaExcel, grupo);
      }

      // For each matched company, check for existing areas
      for (const [, rows] of byEmpresa.entries()) {
        const empresa = rows[0]?.empresa_match;
        if (!empresa) continue;

        // Fetch existing areas for this company
        const { data: existingAreas } = await supabase
          .from("areas")
          .select("id, cost_center, name")
          .eq("company_id", empresa.id)
          .eq("active", true);

        const existingMap = new Map(
          (existingAreas || []).map((a) => [normalizeCostCenter(a.cost_center), a])
        );

        // Update status for each row
        for (const row of rows) {
          if (row.status === "error") continue;
          
          const existing = existingMap.get(row.cost_center);
          if (existing) {
            row.status = existing.name === row.name ? "skip" : "update";
            row.existingId = existing.id;
          } else {
            row.status = "new";
          }
        }
      }

      setPreviewByEmpresa(byEmpresa);
      setStep("preview");
    } catch (error) {
      console.error("Error analyzing file:", error);
      toast.error("Erro ao analisar arquivo. Verifique o formato.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await analyzeFile(file);
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      await analyzeFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleImport = async () => {
    setStep("importing");
    setIsImporting(true);

    let successCount = 0;
    let errorCount = 0;

    for (const [, rows] of previewByEmpresa.entries()) {
      const empresa = rows[0]?.empresa_match;
      if (!empresa) continue;

      for (const row of rows) {
        if (row.status === "skip" || row.status === "error") continue;

        try {
          if (row.status === "new") {
            const { error } = await supabase.from("areas").insert({
              company_id: empresa.id,
              cost_center: row.cost_center,
              name: row.name,
              active: true,
            });
            if (error) throw error;
            successCount++;
          } else if (row.status === "update" && row.existingId) {
            const { error } = await supabase
              .from("areas")
              .update({ name: row.name })
              .eq("id", row.existingId);
            if (error) throw error;
            successCount++;
          }
        } catch (error) {
          console.error("Error importing row:", error);
          errorCount++;
        }
      }
    }

    setImportResults({ success: successCount, errors: errorCount });
    setIsImporting(false);
    setStep("done");
    onSuccess?.();
  };

  // Calculate stats
  const stats = { new: 0, update: 0, skip: 0, error: 0 };
  for (const [, rows] of previewByEmpresa.entries()) {
    for (const row of rows) {
      stats[row.status]++;
    }
  }
  const importableCount = stats.new + stats.update;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Importar Centros de Custo
          </DialogTitle>
          <DialogDescription>
            Importe áreas/setores de todas as empresas a partir de um arquivo Excel
          </DialogDescription>
        </DialogHeader>

        {/* Upload Step */}
        {step === "upload" && (
          <div
            className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary transition-colors"
            onClick={() => fileInputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={handleFileSelect}
            />
            {isAnalyzing ? (
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <p className="text-muted-foreground">Analisando arquivo...</p>
              </div>
            ) : (
              <>
                <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-4" />
                <p className="font-medium mb-1">Arraste ou clique para selecionar</p>
                <p className="text-sm text-muted-foreground mb-4">
                  Suporta arquivos .xlsx, .xls ou .csv
                </p>
                <div className="text-xs text-muted-foreground bg-muted rounded-md p-3 inline-block">
                  <p className="font-medium mb-1">Colunas esperadas:</p>
                  <p>EMPRESA | CCUSTO | DESCRIÇÃO CENTRO DE CUSTO</p>
                </div>
              </>
            )}
          </div>
        )}

        {/* Preview Step */}
        {step === "preview" && (
          <>
            <ScrollArea className="flex-1 max-h-[400px] pr-4">
              <div className="space-y-4">
                {Array.from(previewByEmpresa.entries()).map(([empresaExcel, rows]) => {
                  const empresa = rows[0]?.empresa_match;
                  const isMatched = !!empresa;

                  return (
                    <div
                      key={empresaExcel}
                      className={`rounded-lg border p-3 ${
                        isMatched ? "border-border" : "border-destructive/50 bg-destructive/5"
                      }`}
                    >
                      {/* Company Header */}
                      <div className="flex items-center gap-2 mb-2">
                        {isMatched ? (
                          <Check className="h-4 w-4 text-primary" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-destructive" />
                        )}
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">
                          {isMatched ? empresa.nome : empresaExcel}
                        </span>
                        {isMatched && empresaExcel !== empresa.nome && (
                          <span className="text-xs text-muted-foreground">
                            (match: {empresaExcel.length > 30 ? empresaExcel.substring(0, 30) + "..." : empresaExcel})
                          </span>
                        )}
                        {!isMatched && (
                          <Badge variant="destructive" className="text-xs">
                            Não encontrada
                          </Badge>
                        )}
                      </div>

                      {/* Areas List */}
                      {isMatched ? (
                        <div className="pl-6 space-y-1">
                          {rows.slice(0, 5).map((row, idx) => (
                            <div key={idx} className="flex items-center gap-2 text-sm">
                              <span className="text-muted-foreground font-mono text-xs">
                                {row.cost_center}
                              </span>
                              <span className="text-muted-foreground">-</span>
                              <span className="flex-1 truncate">{row.name}</span>
                              <Badge
                                variant={
                                  row.status === "new"
                                    ? "default"
                                    : row.status === "update"
                                    ? "secondary"
                                    : "outline"
                                }
                                className="text-xs"
                              >
                                {row.status === "new"
                                  ? "Novo"
                                  : row.status === "update"
                                  ? "Atualizar"
                                  : "Igual"}
                              </Badge>
                            </div>
                          ))}
                          {rows.length > 5 && (
                            <p className="text-xs text-muted-foreground">
                              + {rows.length - 5} outros registros
                            </p>
                          )}
                        </div>
                      ) : (
                        <p className="pl-6 text-sm text-muted-foreground">
                          {rows.length} registro(s) serão ignorados
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </ScrollArea>

            {/* Summary */}
            <div className="flex items-center justify-between text-sm border-t pt-4">
              <div className="flex gap-3">
                <span className="text-primary">{stats.new} novos</span>
                <span className="text-secondary-foreground">{stats.update} atualizações</span>
                <span className="text-muted-foreground">{stats.skip} iguais</span>
                {stats.error > 0 && (
                  <span className="text-destructive">{stats.error} erros</span>
                )}
              </div>
            </div>
          </>
        )}

        {/* Importing Step */}
        {step === "importing" && (
          <div className="py-12 text-center">
            <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Importando registros...</p>
          </div>
        )}

        {/* Done Step */}
        {step === "done" && (
          <div className="py-12 text-center">
            <Check className="h-12 w-12 text-primary mx-auto mb-4" />
            <p className="text-lg font-medium mb-2">Importação concluída!</p>
            <p className="text-muted-foreground">
              {importResults.success} registro(s) importado(s)
              {importResults.errors > 0 && `, ${importResults.errors} erro(s)`}
            </p>
          </div>
        )}

        <DialogFooter>
          {step === "upload" && (
            <Button variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
          )}

          {step === "preview" && (
            <>
              <Button variant="outline" onClick={resetState}>
                Voltar
              </Button>
              <Button onClick={handleImport} disabled={importableCount === 0}>
                Importar {importableCount} registro(s)
              </Button>
            </>
          )}

          {step === "done" && (
            <Button onClick={handleClose}>Fechar</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
