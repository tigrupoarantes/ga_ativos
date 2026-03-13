/**
 * Parser de PDF para relatórios de custos de frota (combustível, pedágio, etc.).
 *
 * Estratégia:
 * 1. Extrai texto de todas as páginas via `unpdf`
 * 2. Para cada linha de texto, detecta placa brasileira (old: ABC-1234 | Mercosul: ABC1D23)
 * 3. Associa a placa ao valor monetário mais próximo na mesma linha ou nas 2 linhas seguintes
 * 4. Deduplica por placa (soma valores duplicados)
 */

import type { DespesaFromExcel } from "./custo-frota-parser";

// Placa old: ABC1234 ou ABC-1234; Mercosul: ABC1D23 (4ª posição é letra)
const PLATE_RE = /\b([A-Z]{3}[-\s]?[0-9][A-Z0-9][0-9]{2})\b/g;

// Valor monetário: 1.234,56 | 1234,56 | 1.234.56 | 1234.56 (pelo menos 2 casas decimais)
const VALUE_RE = /(?:R\$\s*)?(\d{1,3}(?:[.,]\d{3})*[.,]\d{2})\b/g;

function normalizePlaca(p: string): string {
  return p.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
}

function parseMonetaryValue(raw: string): number {
  // Remove símbolo de moeda e espaços
  let s = raw.replace(/[R$\s]/g, "");
  // Detecta formato: se tem vírgula como decimal ou ponto
  // Formato BR: 1.234,56 → separador milhar=ponto, decimal=vírgula
  // Formato EN: 1,234.56 → separador milhar=vírgula, decimal=ponto
  if (s.match(/,\d{2}$/) && s.includes(".")) {
    // BR: 1.234,56
    s = s.replace(/\./g, "").replace(",", ".");
  } else if (s.match(/\.\d{2}$/) && s.includes(",")) {
    // EN: 1,234.56
    s = s.replace(/,/g, "");
  } else if (s.match(/,\d{2}$/)) {
    // 1234,56
    s = s.replace(",", ".");
  }
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

function extractPlatesFromLine(line: string): string[] {
  const plates: string[] = [];
  let match: RegExpExecArray | null;
  PLATE_RE.lastIndex = 0;
  while ((match = PLATE_RE.exec(line.toUpperCase())) !== null) {
    plates.push(normalizePlaca(match[1]));
  }
  return plates;
}

function extractValueFromLine(line: string): number {
  let match: RegExpExecArray | null;
  let best = 0;
  VALUE_RE.lastIndex = 0;
  while ((match = VALUE_RE.exec(line)) !== null) {
    const v = parseMonetaryValue(match[1]);
    if (v > best) best = v;
  }
  return best;
}

export async function parseCustoFrotaPdf(file: File): Promise<DespesaFromExcel[]> {
  // Dynamic import para code splitting (unpdf ~100KB)
  const { extractText } = await import("unpdf");

  const buffer = await file.arrayBuffer();

  let pages: string[];
  try {
    const result = await extractText(new Uint8Array(buffer), { mergePages: false });
    // unpdf retorna { text: string[] } onde cada item é uma página
    pages = Array.isArray(result.text) ? result.text : [String(result.text)];
  } catch (err) {
    throw new Error(
      `Não foi possível extrair texto do PDF. Tente converter para CSV ou XLSX. (${err instanceof Error ? err.message : String(err)})`
    );
  }

  // Une todas as páginas em linhas
  const allLines: string[] = pages
    .join("\n")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const map = new Map<string, number>();

  for (let i = 0; i < allLines.length; i++) {
    const line = allLines[i];
    const plates = extractPlatesFromLine(line);
    if (plates.length === 0) continue;

    // Tenta valor na mesma linha primeiro
    let valor = extractValueFromLine(line);

    // Se não achou, tenta nas próximas 2 linhas
    if (valor === 0) {
      for (let j = i + 1; j <= Math.min(i + 2, allLines.length - 1); j++) {
        // Não pula para uma linha que já tenha outra placa
        if (extractPlatesFromLine(allLines[j]).length > 0) break;
        valor = extractValueFromLine(allLines[j]);
        if (valor > 0) break;
      }
    }

    for (const placa of plates) {
      if (placa.length < 7) continue;
      map.set(placa, (map.get(placa) ?? 0) + valor);
    }
  }

  if (map.size === 0) {
    throw new Error(
      "Nenhuma placa brasileira encontrada no PDF. Verifique se o arquivo contém dados no formato correto ou converta para CSV/XLSX."
    );
  }

  return Array.from(map.entries())
    .filter(([, valor]) => valor > 0)
    .map(([placa, valor]) => ({
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
