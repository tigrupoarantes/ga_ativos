import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, FileText, AlertCircle, CheckCircle, Download } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

// CSV Template constants
const CSV_HEADERS = ['NUMERO', 'CPF_FUNCIONARIO', 'OPERADORA', 'PLANO', 'OBSERVACOES'];
const CSV_EXAMPLE_ROWS = [
  ['11999999999', '12345678901', 'Vivo', 'Corporativo 50GB', 'Linha principal'],
  ['11888888888', '', 'Claro', 'Dados 20GB', 'Linha backup'],
];

// Header mappings for flexible parsing
const headerMappings: Record<string, string> = {
  'numero': 'numero',
  'linha': 'numero',
  'telefone': 'numero',
  'cpf': 'cpf_funcionario',
  'cpf_funcionario': 'cpf_funcionario',
  'funcionario_cpf': 'cpf_funcionario',
  'operadora': 'operadora',
  'plano': 'plano',
  'observacoes': 'observacoes',
  'observacao': 'observacoes',
};

interface ImportLinhasDialogProps {
  onImportComplete: (linhas: ImportedLinha[]) => void;
  trigger?: React.ReactNode;
}

interface ImportedLinha {
  numero: string;
  funcionario_id?: string | null;
  operadora?: string | null;
  plano?: string | null;
  observacoes?: string | null;
}

interface PreviewLinha extends ImportedLinha {
  funcionario_cpf?: string;
  funcionario_nome?: string;
  status: "valid" | "warning" | "error";
  message?: string;
}

interface ParsedLinhaRow {
  numero?: string;
  cpf_funcionario?: string;
  operadora?: string;
  plano?: string;
  observacoes?: string;
}

// Helper to download CSV with UTF-8 BOM for Excel compatibility
const downloadCsv = (content: string, filename: string) => {
  const bom = '\uFEFF';
  const blob = new Blob([bom + content], { type: 'text/csv;charset=utf-8;' });
  
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
};

// Parse CSV line handling quotes and multiple separators
const parseCSVLine = (line: string): string[] => {
  // Detect separator: prefer ; then ,
  const separator = line.includes(';') ? ';' : ',';
  
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === separator && !inQuotes) {
      result.push(current.trim().replace(/^["']|["']$/g, ''));
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current.trim().replace(/^["']|["']$/g, ''));
  return result;
};

// Normalize header name
const normalizeHeader = (header: string): string => {
  return header
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9_]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
};

export function ImportLinhasDialog({ onImportComplete, trigger }: ImportLinhasDialogProps) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<PreviewLinha[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const downloadTemplate = () => {
    const csvContent = [
      CSV_HEADERS.join(';'),
      ...CSV_EXAMPLE_ROWS.map(row => row.join(';'))
    ].join('\n');
    
    downloadCsv(csvContent, 'modelo_linhas_telefonicas.csv');
    toast.success('Modelo CSV baixado!');
  };

  const exportLinhas = async () => {
    setIsExporting(true);
    try {
      const { data: linhas, error } = await supabase
        .from('linhas_telefonicas')
        .select(`
          numero,
          operadora,
          plano,
          observacoes,
          funcionario:funcionarios(cpf)
        `)
        .eq('active', true)
        .order('numero');

      if (error) throw error;

      if (!linhas || linhas.length === 0) {
        toast.warning('Nenhuma linha telefônica cadastrada para exportar');
        return;
      }

      const rows = linhas.map(linha => [
        linha.numero || '',
        (linha.funcionario as { cpf: string | null } | null)?.cpf?.replace(/\D/g, '') || '',
        linha.operadora || '',
        linha.plano || '',
        linha.observacoes || '',
      ]);

      const csvContent = [
        CSV_HEADERS.join(';'),
        ...rows.map(row => row.join(';'))
      ].join('\n');

      downloadCsv(csvContent, `linhas_telefonicas_${new Date().toISOString().split('T')[0]}.csv`);
      toast.success(`${linhas.length} linhas exportadas com sucesso!`);
    } catch (error) {
      console.error('Erro ao exportar:', error);
      toast.error('Erro ao exportar linhas');
    } finally {
      setIsExporting(false);
    }
  };

  const normalizeCpf = (cpf: string): string => {
    return cpf.replace(/\D/g, "");
  };

  const normalizePhone = (phone: string): string => {
    return phone.replace(/\D/g, "");
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.endsWith(".csv")) {
      toast.error("Por favor, selecione um arquivo CSV");
      return;
    }

    setFile(selectedFile);
    setIsProcessing(true);

    try {
      const content = await selectedFile.text();
      const lines = content
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);

      if (lines.length < 2) {
        toast.error("O arquivo deve conter pelo menos o cabeçalho e uma linha de dados");
        setIsProcessing(false);
        return;
      }

      // Parse headers
      const rawHeaders = parseCSVLine(lines[0]);
      const headers = rawHeaders.map(h => normalizeHeader(h));
      
      // Map headers to standard fields
      const headerIndexMap: Record<string, number> = {};
      headers.forEach((header, index) => {
        const mappedField = headerMappings[header];
        if (mappedField) {
          headerIndexMap[mappedField] = index;
        }
      });

      // Parse data rows
      const dataRows = lines.slice(1).map(line => {
        const values = parseCSVLine(line);
        const row: ParsedLinhaRow = {};
        
        if (headerIndexMap['numero'] !== undefined) {
          row.numero = values[headerIndexMap['numero']] || '';
        }
        if (headerIndexMap['cpf_funcionario'] !== undefined) {
          row.cpf_funcionario = values[headerIndexMap['cpf_funcionario']] || '';
        }
        if (headerIndexMap['operadora'] !== undefined) {
          row.operadora = values[headerIndexMap['operadora']] || '';
        }
        if (headerIndexMap['plano'] !== undefined) {
          row.plano = values[headerIndexMap['plano']] || '';
        }
        if (headerIndexMap['observacoes'] !== undefined) {
          row.observacoes = values[headerIndexMap['observacoes']] || '';
        }
        
        return row;
      });

      // Fetch all funcionarios for CPF matching
      const { data: funcionarios } = await supabase
        .from("funcionarios")
        .select("id, nome, cpf")
        .eq("active", true);

      const previewData: PreviewLinha[] = dataRows.map(row => {
        const normalizedPhone = normalizePhone(row.numero || "");
        const normalizedCpf = row.cpf_funcionario ? normalizeCpf(row.cpf_funcionario) : "";

        let funcionario = null;
        let status: "valid" | "warning" | "error" = "valid";
        let message = "";

        if (normalizedCpf) {
          funcionario = funcionarios?.find(f => 
            f.cpf && normalizeCpf(f.cpf) === normalizedCpf
          );

          if (!funcionario) {
            status = "warning";
            message = "Funcionário não encontrado";
          }
        }

        if (!normalizedPhone || normalizedPhone.length < 10) {
          status = "error";
          message = "Número inválido";
        }

        return {
          numero: normalizedPhone,
          funcionario_id: funcionario?.id || null,
          funcionario_cpf: row.cpf_funcionario || "",
          funcionario_nome: funcionario?.nome || "",
          operadora: row.operadora || null,
          plano: row.plano || null,
          observacoes: row.observacoes || null,
          status,
          message,
        };
      });

      setPreview(previewData);
    } catch (error) {
      toast.error("Erro ao processar arquivo");
      console.error(error);
    }

    setIsProcessing(false);
  };

  const handleImport = () => {
    const validLinhas = preview
      .filter(l => l.status !== "error")
      .map(({ numero, funcionario_id, operadora, plano, observacoes }) => ({
        numero,
        funcionario_id,
        operadora,
        plano,
        observacoes,
      }));

    if (validLinhas.length === 0) {
      toast.error("Nenhuma linha válida para importar");
      return;
    }

    onImportComplete(validLinhas);
    setOpen(false);
    setFile(null);
    setPreview([]);
  };

  const validCount = preview.filter(l => l.status === "valid").length;
  const warningCount = preview.filter(l => l.status === "warning").length;
  const errorCount = preview.filter(l => l.status === "error").length;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline">
            <Upload className="h-4 w-4 mr-2" />
            Importar CSV
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Importar Linhas Telefônicas</DialogTitle>
          <DialogDescription>
            Baixe o modelo CSV, preencha com seus dados e importe.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Template Download Section */}
          <div className="bg-muted p-4 rounded-lg space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Download className="h-4 w-4" />
              Baixar Modelo CSV
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={downloadTemplate}>
                <FileText className="h-4 w-4 mr-2" />
                Modelo Vazio
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={exportLinhas}
                disabled={isExporting}
              >
                <Download className="h-4 w-4 mr-2" />
                {isExporting ? 'Exportando...' : 'Exportar Atuais'}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Formato: NUMERO;CPF_FUNCIONARIO;OPERADORA;PLANO;OBSERVACOES
            </p>
          </div>

          <div className="border-t pt-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="csv-file">Selecionar Arquivo CSV</Label>
              <Input
                id="csv-file"
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                disabled={isProcessing}
              />
            </div>

            {isProcessing && (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="mt-2 text-sm text-muted-foreground">Processando arquivo...</p>
              </div>
            )}

            {preview.length > 0 && (
              <>
                <div className="flex gap-4 text-sm">
                  <div className="flex items-center gap-1 text-green-600">
                    <CheckCircle className="h-4 w-4" />
                    <span>{validCount} válidas</span>
                  </div>
                  <div className="flex items-center gap-1 text-yellow-600">
                    <AlertCircle className="h-4 w-4" />
                    <span>{warningCount} com aviso</span>
                  </div>
                  <div className="flex items-center gap-1 text-red-600">
                    <AlertCircle className="h-4 w-4" />
                    <span>{errorCount} com erro</span>
                  </div>
                </div>

                <div className="border rounded-md overflow-hidden max-h-60 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted sticky top-0">
                      <tr>
                        <th className="text-left p-2">Número</th>
                        <th className="text-left p-2">Funcionário</th>
                        <th className="text-left p-2">Operadora</th>
                        <th className="text-left p-2">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.map((linha, index) => (
                        <tr
                          key={index}
                          className={
                            linha.status === "error"
                              ? "bg-red-50"
                              : linha.status === "warning"
                              ? "bg-yellow-50"
                              : ""
                          }
                        >
                          <td className="p-2">{linha.numero}</td>
                          <td className="p-2">
                            {linha.funcionario_nome || linha.funcionario_cpf || "-"}
                          </td>
                          <td className="p-2">{linha.operadora || "-"}</td>
                          <td className="p-2">
                            {linha.status === "valid" && (
                              <CheckCircle className="h-4 w-4 text-green-600" />
                            )}
                            {linha.status === "warning" && (
                              <span className="text-yellow-600 text-xs">{linha.message}</span>
                            )}
                            {linha.status === "error" && (
                              <span className="text-red-600 text-xs">{linha.message}</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setOpen(false)}>
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleImport}
                    disabled={validCount + warningCount === 0}
                  >
                    Importar {validCount + warningCount} linhas
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
