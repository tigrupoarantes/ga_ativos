import { useState, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Upload, RefreshCw, AlertTriangle, CheckCircle2, Loader2, FileSpreadsheet } from "lucide-react";
import { supabase } from "@/integrations/supabase/external-client";
import { parseClaroLinhasXlsx, type LinhaFromClaro } from "@/lib/parsers/claro-linhas-parser";
import { useLinhasTelefonicas } from "@/hooks/useLinhasTelefonicas";

interface SincronizarLinhasDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSyncComplete: () => void;
}

type StatusLinha = "nova" | "atualizada" | "semAlteracao" | "semCpf";

interface LinhaDetalhe extends LinhaFromClaro {
  status: StatusLinha;
  funcionarioNomeApp: string | null;
  funcionarioIdApp: string | null;
}

function digitsOnly(v: string): string {
  return v.replace(/\D/g, "");
}

function formatPhone(n: string): string {
  const d = digitsOnly(n);
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return n;
}

const STATUS_LABEL: Record<StatusLinha, string> = {
  nova: "Nova",
  atualizada: "Atualizada",
  semAlteracao: "Sem alteração",
  semCpf: "CPF não cadastrado",
};

const STATUS_COLOR: Record<StatusLinha, string> = {
  nova: "bg-blue-100 text-blue-700 border-blue-200",
  atualizada: "bg-amber-100 text-amber-700 border-amber-200",
  semAlteracao: "bg-green-100 text-green-700 border-green-200",
  semCpf: "bg-gray-100 text-gray-600 border-gray-200",
};

export function SincronizarLinhasDialog({
  open,
  onOpenChange,
  onSyncComplete,
}: SincronizarLinhasDialogProps) {
  const { linhas: linhasNoApp, bulkCreateLinhas } = useLinhasTelefonicas();

  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [linhasDetalhe, setLinhasDetalhe] = useState<LinhaDetalhe[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isParsing, setIsParsing] = useState(false);

  const resetState = () => {
    setFileName(null);
    setLinhasDetalhe([]);
    setError(null);
  };

  const processFile = useCallback(
    async (file: File) => {
      setError(null);
      setLinhasDetalhe([]);
      setIsParsing(true);

      try {
        // 1. Parsear XLSX
        const linhasExcel = await parseClaroLinhasXlsx(file);

        // 2. Buscar funcionários com CPF
        const { data: funcs, error: funcErr } = await supabase
          .from("funcionarios")
          .select("id, nome, cpf")
          .eq("active", true);
        if (funcErr) throw funcErr;

        const cpfToFunc = new Map<string, { id: string; nome: string }>();
        for (const f of funcs ?? []) {
          if (f.cpf) cpfToFunc.set(digitsOnly(f.cpf), { id: f.id, nome: f.nome });
        }

        // 3. Mapa de linhas já no app: numero→{ id, funcionario_id }
        const numToApp = new Map<string, { id: string; funcionario_id: string | null }>();
        for (const l of linhasNoApp ?? []) {
          numToApp.set(digitsOnly(l.numero), { id: l.id, funcionario_id: l.funcionario_id });
        }

        // 4. Build de→para
        const resultado: LinhaDetalhe[] = linhasExcel.map((l) => {
          const funcMatch = l.cpfNorm ? cpfToFunc.get(l.cpfNorm) : null;
          const appEntry = numToApp.get(l.numeroNorm);

          let status: StatusLinha;
          if (!appEntry) {
            status = "nova";
          } else if (funcMatch && appEntry.funcionario_id === funcMatch.id) {
            status = "semAlteracao";
          } else if (!funcMatch) {
            status = "semCpf";
          } else {
            status = "atualizada";
          }

          return {
            ...l,
            status,
            funcionarioIdApp: funcMatch?.id ?? null,
            funcionarioNomeApp: funcMatch?.nome ?? null,
          };
        });

        setLinhasDetalhe(resultado);
        setFileName(file.name);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro ao processar o arquivo.");
      } finally {
        setIsParsing(false);
      }
    },
    [linhasNoApp]
  );

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
    const payload = linhasDetalhe
      .filter((l) => l.status !== "semAlteracao")
      .map((l) => ({
        numero: l.numeroNorm,
        funcionario_id: l.funcionarioIdApp,
        operadora: "Claro" as const,
        observacoes: l.equipe || null,
      }));

    bulkCreateLinhas.mutate(payload, {
      onSuccess: () => {
        onSyncComplete();
        onOpenChange(false);
        resetState();
      },
    });
  };

  const handleClose = () => {
    onOpenChange(false);
    resetState();
  };

  // Contadores
  const novas = linhasDetalhe.filter((l) => l.status === "nova").length;
  const atualizadas = linhasDetalhe.filter((l) => l.status === "atualizada").length;
  const semAlteracao = linhasDetalhe.filter((l) => l.status === "semAlteracao").length;
  const semCpf = linhasDetalhe.filter((l) => l.status === "semCpf").length;
  const total = linhasDetalhe.length;

  const hasParsed = linhasDetalhe.length > 0;
  const pendentes = novas + atualizadas + semCpf; // semCpf ainda vai gerar upsert (sem funcionario_id)

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-blue-500" />
            Sincronizar Linhas com Claro
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
                  <input
                    type="file"
                    accept=".xlsx"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </label>
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Use o arquivo "conta claro .xlsx" com as colunas: Numero Linha, CPF, Nome Usuário
              </p>
            </div>
            {fileName && (
              <Badge variant="secondary" className="text-xs font-mono">
                {fileName}
              </Badge>
            )}
          </div>

          {/* Erro de parse */}
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* De→Para */}
          {hasParsed && (
            <div className="space-y-3">
              {/* Cards de resumo */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="rounded-lg border bg-blue-50/60 p-3 text-center">
                  <p className="text-2xl font-bold text-blue-700">{novas}</p>
                  <p className="text-xs text-blue-600 mt-0.5">Novas</p>
                </div>
                <div className="rounded-lg border bg-amber-50/60 p-3 text-center">
                  <p className="text-2xl font-bold text-amber-700">{atualizadas}</p>
                  <p className="text-xs text-amber-600 mt-0.5">Atualizadas</p>
                </div>
                <div className="rounded-lg border bg-green-50/60 p-3 text-center">
                  <p className="text-2xl font-bold text-green-700">{semAlteracao}</p>
                  <p className="text-xs text-green-600 mt-0.5">Sem alteração</p>
                </div>
                <div className="rounded-lg border bg-gray-50 p-3 text-center">
                  <p className="text-2xl font-bold text-gray-600">{semCpf}</p>
                  <p className="text-xs text-gray-500 mt-0.5">CPF não cadastrado</p>
                </div>
              </div>

              {semCpf > 0 && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    {semCpf} linha{semCpf > 1 ? "s" : ""} com CPF não encontrado no app.
                    Serão importadas sem vínculo com funcionário. Verifique o cadastro de funcionários.
                  </AlertDescription>
                </Alert>
              )}

              {/* Tabela de amostra */}
              <div>
                <p className="mb-2 text-sm font-medium text-muted-foreground">
                  Prévia — {total} linhas únicas encontradas (mostrando primeiras 20)
                </p>
                <div className="rounded-md border overflow-auto max-h-52">
                  <Table>
                    <TableHeader className="sticky top-0 bg-background z-10 shadow-sm">
                      <TableRow>
                        <TableHead>Número</TableHead>
                        <TableHead>Nome (Excel)</TableHead>
                        <TableHead>Equipe</TableHead>
                        <TableHead>Funcionário no App</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {linhasDetalhe.slice(0, 20).map((l) => (
                        <TableRow key={l.numeroNorm}>
                          <TableCell className="font-mono text-xs">{formatPhone(l.numeroNorm)}</TableCell>
                          <TableCell className="text-xs">{l.nomeUsuario || "—"}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{l.equipe || "—"}</TableCell>
                          <TableCell className="text-xs">
                            {l.funcionarioNomeApp ? (
                              <span className="text-green-700">{l.funcionarioNomeApp}</span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={`text-[10px] ${STATUS_COLOR[l.status]}`}>
                              {STATUS_LABEL[l.status]}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                      {total > 20 && (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-xs text-muted-foreground py-2">
                            ... e mais {total - 20} linhas
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
            <Button variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmar}
              disabled={!hasParsed || bulkCreateLinhas.isPending || pendentes === 0}
            >
              {bulkCreateLinhas.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sincronizando...
                </>
              ) : !hasParsed ? (
                "Selecione o arquivo primeiro"
              ) : pendentes === 0 ? (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Tudo já atualizado
                </>
              ) : (
                `Confirmar Sincronização (${pendentes} linhas)`
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
