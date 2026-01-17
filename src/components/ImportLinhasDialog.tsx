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
import { Upload, FileText, AlertCircle, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface ImportLinhasDialogProps {
  onImportComplete: (linhas: ImportedLinha[]) => void;
  trigger?: React.ReactNode;
}

interface ImportedLinha {
  numero: string;
  funcionario_id?: string | null;
  operadora?: string | null;
  plano?: string | null;
}

interface PreviewLinha extends ImportedLinha {
  funcionario_cpf?: string;
  funcionario_nome?: string;
  status: "valid" | "warning" | "error";
  message?: string;
}

export function ImportLinhasDialog({ onImportComplete, trigger }: ImportLinhasDialogProps) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<PreviewLinha[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const parseCSV = (content: string): string[][] => {
    return content
      .split("\n")
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .map(line => line.split(";").map(cell => cell.trim()));
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
      const rows = parseCSV(content);

      if (rows.length < 2) {
        toast.error("O arquivo deve conter pelo menos o cabeçalho e uma linha de dados");
        setIsProcessing(false);
        return;
      }

      // Skip header row
      const dataRows = rows.slice(1);

      // Fetch all funcionarios for CPF matching
      const { data: funcionarios } = await supabase
        .from("funcionarios")
        .select("id, nome, cpf")
        .eq("active", true);

      const previewData: PreviewLinha[] = dataRows.map(row => {
        const [numero, cpf, operadora, plano] = row;
        const normalizedPhone = normalizePhone(numero || "");
        const normalizedCpf = cpf ? normalizeCpf(cpf) : "";

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
          funcionario_cpf: cpf || "",
          funcionario_nome: funcionario?.nome || "",
          operadora: operadora || null,
          plano: plano || null,
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
      .map(({ numero, funcionario_id, operadora, plano }) => ({
        numero,
        funcionario_id,
        operadora,
        plano,
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
            Faça upload de um arquivo CSV com as linhas telefônicas.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-muted p-3 rounded-md text-sm">
            <p className="font-medium mb-2">Formato esperado do CSV:</p>
            <code className="text-xs">
              numero;funcionario_cpf;operadora;plano
              <br />
              11999999999;12345678901;Vivo;Corporativo
              <br />
              11888888888;;Claro;Dados 20GB
            </code>
          </div>

          <div className="space-y-2">
            <Label htmlFor="csv-file">Arquivo CSV</Label>
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
      </DialogContent>
    </Dialog>
  );
}
