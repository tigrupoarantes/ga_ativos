/**
 * Parser para planilhas de custos de frota (pedágio Veloe e abastecimento).
 *
 * Formatos suportados:
 *
 * A) Formato processado ("Feito") — usa Sheet2 (Planilha1 ou Planilha2):
 *    Colunas: PLACA | PLACA CORRETA | CONDUTOR | RATEIO | VALOR | (RATEIO | VALOR)
 *    Cada linha = 1 veículo com até 2 divisões de rateio.
 *    Usa PLACA CORRETA para match no banco.
 *
 * B) Formato bruto — usa Sheet1 com PLACA | VALOR:
 *    Agrega (soma) VALOR por PLACA → 1 linha por placa.
 *
 * C) Formato Posto (já agregado) — Sheet1 com Placa | Valor Total (R$)
 */

import { readXlsxAsObjects } from "@/lib/excel";

export interface DespesaFromExcel {
  placaOriginal: string;
  placaCorreta: string;
  condutor: string;
  valor: number;
  rateio1Empresa: string;
  rateio1Valor: number;
  rateio2Empresa: string;
  rateio2Valor: number;
}

export type TipoDespesa = "pedagio" | "combustivel" | "outros";

export interface ParseCustoFrotaResult {
  tipo: TipoDespesa;
  fornecedor: string;
  despesas: DespesaFromExcel[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function normalizeHeader(h: string): string {
  return h
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function strVal(v: unknown): string {
  return String(v ?? "").trim();
}

function numVal(v: unknown): number {
  if (typeof v === "number") return v;
  const s = String(v ?? "").replace(/[^\d.,-]/g, "").replace(",", ".");
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

function normalizePlaca(p: string): string {
  return p.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
}

function findKey(obj: Record<string, unknown>, patterns: string[]): string | undefined {
  const keys = Object.keys(obj);
  for (const pattern of patterns) {
    const found = keys.find((k) => normalizeHeader(k) === pattern);
    if (found) return found;
  }
  for (const pattern of patterns) {
    const found = keys.find((k) => normalizeHeader(k).includes(pattern));
    if (found) return found;
  }
  return undefined;
}

/** Detecta tipo pelo nome do arquivo */
function detectTipo(fileName: string): TipoDespesa {
  const name = fileName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (/veloe|pedagio|tag|sem parar/.test(name)) return "pedagio";
  if (/posto|abastec|combustiv|gasolina|etanol|diesel/.test(name)) return "combustivel";
  return "outros";
}

/** Detecta fornecedor pelo nome do arquivo */
function detectFornecedor(fileName: string): string {
  const name = fileName.toLowerCase();
  if (name.includes("veloe")) return "Veloe";
  if (name.includes("sem parar")) return "Sem Parar";
  const match = fileName.match(/^([^_-]+)/);
  return match ? match[1].trim() : fileName.replace(/\.xlsx?$/i, "").trim();
}

// ─── Parsers por formato ───────────────────────────────────────────────────────

/** Formato processado: PLACA CORRETA | CONDUTOR | RATEIO | VALOR × 2 */
function parseFormatoProcessado(rows: Record<string, unknown>[]): DespesaFromExcel[] | null {
  if (rows.length === 0) return null;

  const sample = rows[0];
  const colPlaca = findKey(sample, ["placa"]);
  const colPlacaCorreta = findKey(sample, ["placa correta"]);
  const colCondutor = findKey(sample, ["condutor", "motorista"]);
  const colValor = findKey(sample, ["valor", "valor total"]);

  // Precisa ter pelo menos PLACA e VALOR
  if (!colPlaca && !colPlacaCorreta) return null;
  if (!colValor) return null;

  // Detecta colunas de rateio: busca todas as chaves "rateio"
  const allKeys = Object.keys(sample);
  const rateioKeys = allKeys.filter((k) => normalizeHeader(k).includes("rateio"));
  const valorKeys = allKeys.filter(
    (k) => normalizeHeader(k).includes("valor") && k !== colValor
  );

  const despesas: DespesaFromExcel[] = [];

  for (const row of rows) {
    const placa = strVal(row[colPlacaCorreta ?? colPlaca!]);
    const placaOriginal = colPlacaCorreta ? strVal(row[colPlaca!]) : placa;
    if (!placa || placa === "0") continue;

    const placaCorreta = normalizePlaca(placa);
    if (placaCorreta.length < 5) continue;

    const valor = numVal(row[colValor]);
    if (valor === 0 && !despesas.find((d) => d.placaCorreta === placaCorreta)) {
      // pode ser linha com só rateio e sem valor total, continua
    }

    const condutor = colCondutor ? strVal(row[colCondutor]) : "";

    // Rateio 1: primeiro par rateio/valor extra
    const r1Empresa = rateioKeys[0] ? strVal(row[rateioKeys[0]]) : "";
    const r1Valor = valorKeys[0] ? numVal(row[valorKeys[0]]) : 0;

    // Rateio 2: segundo par
    const r2Empresa = rateioKeys[1] ? strVal(row[rateioKeys[1]]) : "";
    const r2Valor = valorKeys[1] ? numVal(row[valorKeys[1]]) : 0;

    despesas.push({
      placaOriginal: normalizePlaca(placaOriginal),
      placaCorreta,
      condutor,
      valor: valor || r1Valor + r2Valor,
      rateio1Empresa: r1Empresa,
      rateio1Valor: r1Valor,
      rateio2Empresa: r2Empresa,
      rateio2Valor: r2Valor,
    });
  }

  return despesas.length > 0 ? despesas : null;
}

/** Formato bruto ou aggregado: PLACA | VALOR — agrega por placa */
function parseFormatoBruto(rows: Record<string, unknown>[]): DespesaFromExcel[] {
  if (rows.length === 0) return [];

  const sample = rows[0];
  const colPlaca = findKey(sample, ["placa", "numero", "linha"]);
  const colValor = findKey(sample, ["valor total", "valor"]);

  if (!colPlaca || !colValor) return [];

  const map = new Map<string, number>();

  for (const row of rows) {
    const placa = normalizePlaca(strVal(row[colPlaca]));
    if (placa.length < 5) continue;
    const valor = numVal(row[colValor]);
    if (valor === 0) continue;
    map.set(placa, (map.get(placa) ?? 0) + valor);
  }

  return Array.from(map.entries()).map(([placa, valor]) => ({
    placaOriginal: placa,
    placaCorreta: placa,
    condutor: "",
    valor,
    rateio1Empresa: "",
    rateio1Valor: 0,
    rateio2Empresa: "",
    rateio2Valor: 0,
  }));
}

// ─── Parser CSV ────────────────────────────────────────────────────────────────

export async function parseCustoFrotaCsv(file: File): Promise<ParseCustoFrotaResult> {
  let text: string;
  try {
    text = await file.text();
  } catch {
    // Fallback windows-1252
    const buf = await file.arrayBuffer();
    text = new TextDecoder("windows-1252").decode(buf);
  }

  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) {
    throw new Error("CSV vazio ou sem dados.");
  }

  // Detecta delimitador
  const delim = lines[0].includes(";") ? ";" : ",";

  const headers = lines[0].split(delim).map((h) => h.trim().replace(/^["']|["']$/g, ""));
  const normalizedHeaders = headers.map(normalizeHeader);

  function colIdx(patterns: string[]): number {
    for (const p of patterns) {
      const i = normalizedHeaders.findIndex((h) => h === p);
      if (i >= 0) return i;
    }
    for (const p of patterns) {
      const i = normalizedHeaders.findIndex((h) => h.includes(p));
      if (i >= 0) return i;
    }
    return -1;
  }

  const iPlaca = colIdx(["placa correta", "placa"]);
  const iCondutor = colIdx(["condutor", "motorista"]);
  const iValor = colIdx(["valor total", "valor"]);
  const iRateio1 = colIdx(["rateio 1", "rateio1", "rateio"]);
  const iRateio2 = colIdx(["rateio 2", "rateio2"]);

  if (iPlaca < 0 || iValor < 0) {
    throw new Error(
      'CSV sem colunas reconhecidas. Esperado: "PLACA" e "VALOR" (ou "VALOR TOTAL").'
    );
  }

  const despesas: DespesaFromExcel[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(delim).map((c) => c.trim().replace(/^["']|["']$/g, ""));
    const placaRaw = cols[iPlaca] ?? "";
    const placa = normalizePlaca(placaRaw);
    if (placa.length < 5) continue;

    const valorRaw = cols[iValor] ?? "";
    const valor = numVal(valorRaw);
    if (valor === 0) continue;

    despesas.push({
      placaOriginal: placa,
      placaCorreta: placa,
      condutor: iCondutor >= 0 ? strVal(cols[iCondutor]) : "",
      valor,
      rateio1Empresa: iRateio1 >= 0 ? strVal(cols[iRateio1]) : "",
      rateio1Valor: 0,
      rateio2Empresa: iRateio2 >= 0 ? strVal(cols[iRateio2]) : "",
      rateio2Valor: 0,
    });
  }

  if (despesas.length === 0) {
    throw new Error("Nenhum dado válido encontrado no CSV. Verifique o formato do arquivo.");
  }

  return {
    tipo: detectTipo(file.name),
    fornecedor: detectFornecedor(file.name),
    despesas,
  };
}

// ─── Dispatcher principal ──────────────────────────────────────────────────────

export async function parseCustoFrota(file: File): Promise<ParseCustoFrotaResult> {
  const ext = file.name.split(".").pop()?.toLowerCase();
  if (ext === "pdf") {
    const { parseCustoFrotaPdf } = await import("./pdf-frota-parser");
    const despesas = await parseCustoFrotaPdf(file);
    return { tipo: detectTipo(file.name), fornecedor: detectFornecedor(file.name), despesas };
  }
  if (ext === "csv") return parseCustoFrotaCsv(file);
  return parseCustoFrotaXlsx(file);
}

// ─── Função XLSX ───────────────────────────────────────────────────────────────

export async function parseCustoFrotaXlsx(file: File): Promise<ParseCustoFrotaResult> {
  const { default: readXlsxFile } = await import("read-excel-file");

  // Carrega todas as sheets disponíveis
  const meta = await readXlsxFile(file, { getSheets: true }) as { name: string }[];
  const sheetNames = meta.map((s) => s.name);

  const tipo = detectTipo(file.name);
  const fornecedor = detectFornecedor(file.name);

  // Tenta Sheet2 primeiro (formato processado)
  if (sheetNames.length >= 2) {
    const sheet2Name = sheetNames[1];
    const rows2 = await readXlsxAsObjects(file, { defval: "", headerRow: 1 });
    // readXlsxAsObjects lê sheet1 por padrão — precisamos ler sheet2 explicitamente
    const rawRows2 = await readXlsxFile(file, { sheet: sheet2Name }) as (string | number | boolean | null)[][];

    if (rawRows2.length > 1) {
      const headers = rawRows2[0].map((h) => String(h ?? "").trim());
      const dataRows: Record<string, unknown>[] = rawRows2.slice(1)
        .filter((row) => row.some((c) => c !== null && c !== undefined && c !== ""))
        .map((row) => {
          const obj: Record<string, unknown> = {};
          headers.forEach((h, i) => { if (h) obj[h] = row[i] ?? ""; });
          return obj;
        });

      const processado = parseFormatoProcessado(dataRows);
      if (processado && processado.length > 0) {
        return { tipo, fornecedor, despesas: processado };
      }
    }
  }

  // Fallback: Sheet1 (bruto ou agregado)
  const rows1 = await readXlsxAsObjects(file, { defval: "" });
  const despesas = parseFormatoBruto(rows1);

  if (despesas.length === 0) {
    throw new Error(
      'Nenhum dado válido encontrado. Esperado: colunas "PLACA" e "VALOR" (ou "PLACA CORRETA" para formato processado).'
    );
  }

  return { tipo, fornecedor, despesas };
}
