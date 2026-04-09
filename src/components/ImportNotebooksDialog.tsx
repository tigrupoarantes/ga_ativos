import { useMemo, useState } from "react";
import { z } from "zod";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Upload } from "lucide-react";

import { supabase } from "@/integrations/supabase/external-client";
import { useTiposAtivos } from "@/hooks/useAtivos";
import { readXlsxAsObjects } from "@/lib/excel";

const ImportRowSchema = z.object({
  marca: z.string().trim().min(1, "Marca é obrigatória"),
  modelo: z.string().trim().min(1, "Modelo é obrigatório"),
  numero_serie: z.string().trim().min(1, "Número de série é obrigatório"),
  cpf: z
    .string()
    .transform((v) => v.replace(/\D/g, "").trim())
    .optional()
    .default(""),
});

type ImportRow = z.infer<typeof ImportRowSchema>;

type ImportLineResult =
  | { status: "ok"; index: number; modelo: string; numero_serie: string; patrimonio: string }
  | { status: "skip"; index: number; modelo: string; numero_serie: string; reason: string }
  | { status: "error"; index: number; modelo?: string; numero_serie?: string; reason: string };

function normalizeHeaderKey(key: string): string {
  return key
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function guessDelimiter(headerLine: string): ";" | "," {
  const commas = (headerLine.match(/,/g) || []).length;
  const semicolons = (headerLine.match(/;/g) || []).length;
  return semicolons > commas ? ";" : ",";
}

function parseDelimited(text: string, delimiter: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  const pushField = () => {
    row.push(field);
    field = "";
  };

  const pushRow = () => {
    if (row.length === 1 && row[0].trim() === "") {
      row = [];
      return;
    }
    rows.push(row);
    row = [];
  };

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (ch === '"') {
      if (inQuotes && text[i + 1] === '"') {
        field += '"';
        i++;
        continue;
      }
      inQuotes = !inQuotes;
      continue;
    }

    if (!inQuotes && ch === delimiter) {
      pushField();
      continue;
    }

    if (!inQuotes && (ch === "\n" || ch === "\r")) {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      pushField();
      pushRow();
      continue;
    }

    field += ch;
  }

  pushField();
  pushRow();

  return rows;
}

function mapObjectToImportRow(obj: Record<string, unknown>) {
  const n = Object.fromEntries(
    Object.entries(obj).map(([k, v]) => [normalizeHeaderKey(String(k)), v])
  );

  return {
    marca: n.marca ?? n.brand ?? "",
    modelo: n.modelo ?? n.model ?? "",
    numero_serie:
      n.numero_serie ??
      n.serial ??
      n.serie ??
      n.numero_de_serie ??
      n.n_serie ??
      n.serial_number ??
      "",
    cpf: n.cpf ?? "",
  };
}

async function asyncPool<T, R>(
  concurrency: number,
  items: T[],
  iterator: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length) as R[];
  let nextIndex = 0;

  const workers = Array.from({ length: Math.max(1, concurrency) }, async () => {
    while (nextIndex < items.length) {
      const current = nextIndex++;
      results[current] = await iterator(items[current], current);
    }
  });

  await Promise.all(workers);
  return results;
}

export function ImportNotebooksDialog() {
  const queryClient = useQueryClient();
  const { tipos } = useTiposAtivos();

  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [results, setResults] = useState<ImportLineResult[] | null>(null);

  const tipoNotebook = useMemo(() => {
    return tipos.find(
      (t) =>
        t.name?.toLowerCase().includes("notebook") ||
        t.name?.toLowerCase().includes("microinform") ||
        t.category?.toLowerCase().includes("notebook")
    );
  }, [tipos]);

  const canImport = !!tipoNotebook && rows.length > 0 && !isParsing && !isImporting;

  const reset = () => {
    setFile(null);
    setRows([]);
    setResults(null);
    setIsParsing(false);
    setIsImporting(false);
  };

  const loadRowsFromFile = async (selected: File) => {
    setIsParsing(true);
    setResults(null);

    try {
      const ext = selected.name.split(".").pop()?.toLowerCase();
      let objects: Record<string, unknown>[] = [];

      if (ext === "xlsx") {
        objects = await readXlsxAsObjects(selected, { headerRow: 1, defval: "" });
      } else if (ext === "csv") {
        const text = await selected.text();
        const firstLine = text.split(/\r?\n/)[0] ?? "";
        const delimiter = guessDelimiter(firstLine);
        const matrix = parseDelimited(text, delimiter);
        if (matrix.length === 0) {
          objects = [];
        } else {
          const header = matrix[0].map((h) => h.trim());
          const dataRows = matrix.slice(1);
          objects = dataRows
            .filter((r) => r.some((c) => String(c ?? "").trim() !== ""))
            .map((r) => {
              const obj: Record<string, unknown> = {};
              for (let i = 0; i < header.length; i++) {
                if (!header[i]) continue;
                obj[header[i]] = r[i] ?? "";
              }
              return obj;
            });
        }
      } else {
        toast.error("Formato inválido. Use CSV ou XLSX.");
        setRows([]);
        return;
      }

      const parsed: ImportRow[] = [];
      const errors: ImportLineResult[] = [];
      const seenSeries = new Set<string>();

      objects.forEach((obj, idx) => {
        const mapped = mapObjectToImportRow(obj);
        const res = ImportRowSchema.safeParse({
          marca: mapped.marca ?? "",
          modelo: mapped.modelo ?? "",
          numero_serie: mapped.numero_serie ?? "",
          cpf: mapped.cpf ?? "",
        });

        if (!res.success) {
          errors.push({
            status: "error",
            index: idx + 2,
            modelo: typeof mapped.modelo === "string" ? mapped.modelo : undefined,
            numero_serie: typeof mapped.numero_serie === "string" ? mapped.numero_serie : undefined,
            reason: res.error.issues.map((i) => i.message).join("; "),
          });
          return;
        }

        const serieKey = res.data.numero_serie.toLowerCase();
        if (seenSeries.has(serieKey)) {
          errors.push({
            status: "skip",
            index: idx + 2,
            modelo: res.data.modelo,
            numero_serie: res.data.numero_serie,
            reason: "Número de série duplicado no arquivo",
          });
          return;
        }

        seenSeries.add(serieKey);
        parsed.push(res.data);
      });

      setRows(parsed);
      setResults(errors.length > 0 ? errors : null);

      if (parsed.length === 0) {
        toast.error("Nenhuma linha válida. Verifique as colunas 'marca', 'modelo' e 'numero_serie'.");
      } else {
        toast.success(`Arquivo lido: ${parsed.length} linha(s) pronta(s) para importar`);
      }
    } catch (e) {
      console.error(e);
      toast.error("Falha ao ler o arquivo.");
      setRows([]);
    } finally {
      setIsParsing(false);
    }
  };

  const fetchExistingSeries = async (series: string[]): Promise<Set<string>> => {
    const existing = new Set<string>();
    const chunkSize = 200;

    for (let i = 0; i < series.length; i += chunkSize) {
      const chunk = series.slice(i, i + chunkSize);
      const { data, error } = await supabase
        .from("assets")
        .select("numero_serie")
        .eq("active", true)
        .in("numero_serie", chunk);

      if (error) throw error;
      for (const item of data || []) {
        if (item.numero_serie) existing.add(item.numero_serie.toLowerCase());
      }
    }

    return existing;
  };

  const findFuncionarioByCpf = async (cpf: string): Promise<string | null> => {
    if (!cpf || cpf.length < 11) return null;
    const { data } = await supabase
      .from("funcionarios")
      .select("id")
      .eq("cpf", cpf)
      .eq("active", true)
      .limit(1)
      .maybeSingle();
    return data?.id ?? null;
  };

  const handleImport = async () => {
    if (!tipoNotebook) {
      toast.error('Tipo "Notebook" não encontrado. Cadastre em Tipos de Ativos.');
      return;
    }

    if (rows.length === 0) {
      toast.error("Nenhuma linha para importar.");
      return;
    }

    setIsImporting(true);
    setResults(null);

    try {
      const series = rows.map((r) => r.numero_serie);
      const existingSeries = await fetchExistingSeries(series);

      // Pre-fetch funcionários por CPF (dedup)
      const uniqueCpfs = [...new Set(rows.map((r) => r.cpf).filter(Boolean))];
      const cpfToFuncId = new Map<string, string>();
      for (const cpf of uniqueCpfs) {
        const funcId = await findFuncionarioByCpf(cpf);
        if (funcId) cpfToFuncId.set(cpf, funcId);
      }

      const rowsToCreate = rows.map((r, idx) => ({ r, idx }));

      const lineResults = await asyncPool(5, rowsToCreate, async ({ r, idx }) => {
        const lineNumber = idx + 2;

        if (existingSeries.has(r.numero_serie.toLowerCase())) {
          return {
            status: "skip" as const,
            index: lineNumber,
            modelo: r.modelo,
            numero_serie: r.numero_serie,
            reason: "Número de série já existe no sistema",
          };
        }

        const nome = `Notebook ${r.marca} ${r.modelo}`.trim();
        const funcionarioId = r.cpf ? cpfToFuncId.get(r.cpf) ?? null : null;
        const status = funcionarioId ? "em_uso" : "disponivel";

        try {
          const { data, error } = await supabase.rpc("create_asset_with_patrimonio", {
            p_tipo_id: tipoNotebook.id,
            p_nome: nome,
            p_marca: r.marca,
            p_modelo: r.modelo,
            p_numero_serie: r.numero_serie,
            p_imei: null,
            p_chip_linha: null,
            p_descricao: null,
            p_data_aquisicao: null,
            p_valor_aquisicao: null,
            p_funcionario_id: funcionarioId,
            p_empresa_id: null,
            p_status: status,
          });

          if (error) throw error;
          const created = (data || [])[0];
          return {
            status: "ok" as const,
            index: lineNumber,
            modelo: r.modelo,
            numero_serie: r.numero_serie,
            patrimonio: created?.patrimonio || "",
          };
        } catch (e: any) {
          return {
            status: "error" as const,
            index: lineNumber,
            modelo: r.modelo,
            numero_serie: r.numero_serie,
            reason: e?.message || "Erro ao criar ativo",
          };
        }
      });

      setResults(lineResults);

      const okCount = lineResults.filter((r) => r.status === "ok").length;
      const skipCount = lineResults.filter((r) => r.status === "skip").length;
      const errorCount = lineResults.filter((r) => r.status === "error").length;

      if (okCount > 0) {
        queryClient.invalidateQueries({ queryKey: ["ativos"] });
      }

      toast.success("Importação finalizada", {
        description: `${okCount} importados, ${skipCount} ignorados, ${errorCount} com erro`,
      });
    } catch (e: any) {
      console.error(e);
      toast.error("Falha na importação", {
        description: e?.message || "Erro desconhecido",
      });
    } finally {
      setIsImporting(false);
    }
  };

  const summary = useMemo(() => {
    if (!results) return null;
    const ok = results.filter((r) => r.status === "ok").length;
    const skip = results.filter((r) => r.status === "skip").length;
    const error = results.filter((r) => r.status === "error").length;
    return { ok, skip, error, total: results.length };
  }, [results]);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline">
          <Upload className="h-4 w-4 mr-2" />
          Importar Notebooks
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Importar Ativos — Notebooks</DialogTitle>
          <DialogDescription>
            Importação em massa para o tipo <strong>Notebook</strong>. Campos obrigatórios:{" "}
            <strong>marca</strong>, <strong>modelo</strong> e <strong>numero_serie</strong>.
            Campo opcional: <strong>cpf</strong> (para associar ao funcionário).
          </DialogDescription>
        </DialogHeader>

        {!tipoNotebook && (
          <div className="rounded-md border p-3 text-sm">
            <Badge variant="destructive">Atenção</Badge>
            <div className="mt-2">
              Tipo "Notebook" não encontrado em Tipos de Ativos. Cadastre/ative um tipo com nome
              contendo "notebook" ou "microinformática".
            </div>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="file-nb">Arquivo (CSV ou XLSX)</Label>
          <Input
            id="file-nb"
            type="file"
            accept=".csv,.xlsx"
            disabled={isParsing || isImporting}
            onChange={async (e) => {
              const selected = e.target.files?.[0] || null;
              setFile(selected);
              setRows([]);
              setResults(null);
              if (selected) {
                await loadRowsFromFile(selected);
              }
            }}
          />
          <p className="text-xs text-muted-foreground">
            Cabeçalhos esperados: <code>marca</code>, <code>modelo</code>, <code>numero_serie</code>{" "}
            e opcionalmente <code>cpf</code>.
          </p>
        </div>

        <div className="flex items-center gap-2 text-sm">
          <Badge variant="secondary">Prontas</Badge>
          <span>{rows.length} linha(s)</span>
          {isParsing && (
            <span className="flex items-center text-muted-foreground">
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Lendo arquivo...
            </span>
          )}
          {isImporting && (
            <span className="flex items-center text-muted-foreground">
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Importando...
            </span>
          )}
        </div>

        {summary && (
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-md border p-3">
              <div className="text-xs text-muted-foreground">Importados</div>
              <div className="text-lg font-medium">{summary.ok}</div>
            </div>
            <div className="rounded-md border p-3">
              <div className="text-xs text-muted-foreground">Ignorados</div>
              <div className="text-lg font-medium">{summary.skip}</div>
            </div>
            <div className="rounded-md border p-3">
              <div className="text-xs text-muted-foreground">Erros</div>
              <div className="text-lg font-medium">{summary.error}</div>
            </div>
          </div>
        )}

        {results && results.length > 0 && (
          <div className="space-y-2">
            <Label>Detalhes (primeiros 50)</Label>
            <ScrollArea className="h-56 rounded-md border">
              <div className="p-3 space-y-2 text-sm">
                {results.slice(0, 50).map((r, i) => {
                  if (r.status === "ok") {
                    return (
                      <div key={i} className="flex items-center justify-between">
                        <div>
                          <Badge variant="secondary">OK</Badge>
                          <span className="ml-2">
                            Linha {r.index}: {r.modelo} — {r.numero_serie}
                          </span>
                        </div>
                        <span className="font-mono text-xs text-muted-foreground">
                          {r.patrimonio}
                        </span>
                      </div>
                    );
                  }

                  if (r.status === "skip") {
                    return (
                      <div key={i} className="flex items-center justify-between">
                        <div>
                          <Badge variant="outline">SKIP</Badge>
                          <span className="ml-2">
                            Linha {r.index}: {r.modelo} — {r.numero_serie}
                          </span>
                        </div>
                        <span className="text-xs text-muted-foreground">{r.reason}</span>
                      </div>
                    );
                  }

                  return (
                    <div key={i} className="flex items-center justify-between">
                      <div>
                        <Badge variant="destructive">ERRO</Badge>
                        <span className="ml-2">
                          Linha {r.index}: {r.modelo || "-"} — {r.numero_serie || "-"}
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground">{r.reason}</span>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </div>
        )}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={isParsing || isImporting}
            onClick={() => reset()}
          >
            Limpar
          </Button>
          <Button type="button" onClick={handleImport} disabled={!canImport}>
            {isImporting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Importar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
