/**
 * Parser para faturas da Claro em formato TXT (CSV separado por ";")
 *
 * Formato do arquivo:
 * - Linhas 1-N: metadados do cabeçalho (empresa, período, valor, NF)
 * - Linha com "Tel;Seção;...": linha de cabeçalho CSV
 * - Demais linhas: registros de uso/cobrança
 *
 * Categorias por Sub-Seção (col índice 13) e Seção (col índice 1):
 * - mensalidade: "Mensalidades e Pacotes Promocionais" | "Franquias e Planos"
 * - dados:       Seção contém "Internet"
 * - ligacoes:    Sub-Seção contém "Liga" (Ligações Locais, LDN, etc.)
 * - servicos:    demais
 *
 * Linhas com Tel vazio = custo compartilhado da conta (ex: Plano Total Share).
 * Esse custo é distribuído igualmente entre todas as linhas no hook.
 */

export interface ParsedBillHeader {
  empresa: string;
  periodoInicio: string;   // "20/01/2026"
  periodoFim: string;      // "19/02/2026"
  dataVencimento: string;  // "12/03/2026"
  valorTotal: number;      // 25165.83
  numeroFatura: string;    // "007001896/022026"
}

export interface ParsedLinhaCusto {
  numeroLinha: string;       // normalizado: apenas dígitos, ex: "16991117570"
  numeroLinhaOriginal: string; // "16 99111-7570"
  valorMensalidade: number;
  valorLigacoes: number;
  valorDados: number;
  valorServicos: number;
}

export interface ParsedBill {
  header: ParsedBillHeader;
  linhas: ParsedLinhaCusto[];
  custoCompartilhado: number;
  totalLinhas: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseBrValue(raw: string): number {
  const cleaned = raw.trim().replace(",", ".");
  if (cleaned === "" || cleaned === "0") return 0;
  // Handle ",88" format (leading comma without zero)
  const normalized = cleaned.startsWith(".") ? "0" + cleaned : cleaned;
  const parsed = parseFloat(normalized);
  return isNaN(parsed) ? 0 : parsed;
}

function normalizePhoneNumber(raw: string): string {
  return raw.replace(/\D/g, "");
}

function categorize(
  secao: string,
  subSecao: string
): "valorMensalidade" | "valorLigacoes" | "valorDados" | "valorServicos" {
  const sec = secao.toLowerCase();
  const sub = subSecao.toLowerCase();

  if (sec.includes("internet")) return "valorDados";

  if (
    sub.includes("mensalidade") ||
    sub.includes("franquia") ||
    sub.includes("pacote")
  )
    return "valorMensalidade";

  if (sub.includes("liga")) return "valorLigacoes";

  return "valorServicos";
}

// ─── Header extraction ────────────────────────────────────────────────────────

function extractHeader(lines: string[]): ParsedBillHeader {
  let empresa = "";
  let periodoInicio = "";
  let periodoFim = "";
  let dataVencimento = "";
  let valorTotal = 0;
  let numeroFatura = "";

  for (const line of lines) {
    const trimmed = line.trim();

    if (!empresa && trimmed && !trimmed.startsWith("Tel;")) {
      empresa = trimmed;
    }

    // "Período de Referência: 20/01/2026 a 19/02/2026"
    const periodoMatch = trimmed.match(
      /per[íi]odo.*?(\d{2}\/\d{2}\/\d{4})\s+a\s+(\d{2}\/\d{2}\/\d{4})/i
    );
    if (periodoMatch) {
      periodoInicio = periodoMatch[1];
      periodoFim = periodoMatch[2];
    }

    // "Data de Vencimento: 12/03/2026"
    const vencMatch = trimmed.match(/vencimento.*?(\d{2}\/\d{2}\/\d{4})/i);
    if (vencMatch) {
      dataVencimento = vencMatch[1];
    }

    // "Valor: R$ 25.165,83"
    const valorMatch = trimmed.match(/valor.*?R\$\s*([\d.]+,\d{2})/i);
    if (valorMatch) {
      valorTotal = parseBrValue(valorMatch[1].replace(/\./g, ""));
    }

    // "Nota Fiscal Claro:007001896/022026:"
    if (!numeroFatura) {
      const nfMatch = trimmed.match(/Nota Fiscal Claro:([^:]+):/i);
      if (nfMatch) {
        numeroFatura = nfMatch[1].trim();
      }
    }

    // Stop at CSV header
    if (trimmed.startsWith("Tel;")) break;
  }

  return { empresa, periodoInicio, periodoFim, dataVencimento, valorTotal, numeroFatura };
}

// ─── Main parser ──────────────────────────────────────────────────────────────

export function parseClaroBill(content: string): ParsedBill {
  // Normalize line endings
  const lines = content.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");

  // Find CSV header line index
  const headerLineIdx = lines.findIndex((l) => l.trim().startsWith("Tel;"));
  if (headerLineIdx === -1) {
    throw new Error(
      "Formato de arquivo não reconhecido. Não foi encontrada a linha de cabeçalho 'Tel;Seção;...'"
    );
  }

  const metaLines = lines.slice(0, headerLineIdx + 1);
  const header = extractHeader(metaLines);

  const dataLines = lines.slice(headerLineIdx + 1);

  const linhaMap = new Map<string, ParsedLinhaCusto>();
  let custoCompartilhado = 0;

  for (const line of dataLines) {
    if (!line.trim()) continue;

    const cols = line.split(";");
    if (cols.length < 10) continue;

    const telRaw = cols[0].trim();
    const secao = cols[1].trim();
    const valorCobradoRaw = cols[9].trim(); // Valor Cobrado (index 9)
    const subSecao = cols[13]?.trim() ?? "";

    const valorCobrado = parseBrValue(valorCobradoRaw);
    if (valorCobrado === 0) continue; // Sem custo = ignora

    if (!telRaw) {
      // Custo compartilhado (Plano Total Share, parcelamento, etc.)
      custoCompartilhado += valorCobrado;
      continue;
    }

    const numeroNorm = normalizePhoneNumber(telRaw);
    if (!numeroNorm) continue;

    if (!linhaMap.has(numeroNorm)) {
      linhaMap.set(numeroNorm, {
        numeroLinha: numeroNorm,
        numeroLinhaOriginal: telRaw,
        valorMensalidade: 0,
        valorLigacoes: 0,
        valorDados: 0,
        valorServicos: 0,
      });
    }

    const entry = linhaMap.get(numeroNorm)!;
    const categoria = categorize(secao, subSecao);
    entry[categoria] += valorCobrado;
  }

  const linhas = Array.from(linhaMap.values()).sort((a, b) =>
    a.numeroLinha.localeCompare(b.numeroLinha)
  );

  return {
    header,
    linhas,
    custoCompartilhado,
    totalLinhas: linhas.length,
  };
}

/**
 * Mescla múltiplos arquivos da mesma fatura (ex: parte 1 e parte 2).
 * Pula linhas de cabeçalho duplicadas (que começam com "Tel;").
 */
export function mergeBillContents(contents: string[]): string {
  if (contents.length === 0) return "";
  if (contents.length === 1) return contents[0];

  const [first, ...rest] = contents;

  // Find header line of first file
  const firstLines = first.replace(/\r\n/g, "\n").split("\n");
  const headerIdx = firstLines.findIndex((l) => l.trim().startsWith("Tel;"));

  const extraData = rest.flatMap((content) => {
    const lines = content.replace(/\r\n/g, "\n").split("\n");
    const hIdx = lines.findIndex((l) => l.trim().startsWith("Tel;"));
    // Skip everything up to and including the CSV header row
    return hIdx !== -1 ? lines.slice(hIdx + 1) : lines;
  });

  const allLines = [...firstLines, ...extraData];
  return allLines.join("\n");
}

/**
 * Aplica a divisão do custo compartilhado igualmente entre as linhas.
 * Retorna novas linhas com valorCompartilhado e valorTotal calculados.
 */
export interface LinhaComRateio extends ParsedLinhaCusto {
  valorCompartilhado: number;
  valorTotal: number;
}

export function applySharedCost(
  linhas: ParsedLinhaCusto[],
  custoCompartilhado: number
): LinhaComRateio[] {
  const share =
    linhas.length > 0
      ? Math.round((custoCompartilhado / linhas.length) * 100) / 100
      : 0;

  return linhas.map((l, idx) => {
    // Last line absorbs rounding difference
    const compartilhado =
      idx === linhas.length - 1
        ? Math.round(
            (custoCompartilhado - share * (linhas.length - 1)) * 100
          ) / 100
        : share;

    const total =
      Math.round(
        (l.valorMensalidade +
          l.valorLigacoes +
          l.valorDados +
          l.valorServicos +
          compartilhado) *
          100
      ) / 100;

    return { ...l, valorCompartilhado: compartilhado, valorTotal: total };
  });
}
