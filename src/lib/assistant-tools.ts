export interface SaveConsumoItem {
  metrica_nome: string;
  mes_referencia: string;
  quantidade: number;
  valor_total: number;
}

export interface SaveConsumoIntent {
  action: "save_consumo";
  data: SaveConsumoItem[];
}

function tryParseJson(text: string): SaveConsumoIntent | null {
  try {
    const parsed = JSON.parse(text);
    if (
      parsed?.action === "save_consumo" &&
      Array.isArray(parsed.data) &&
      parsed.data.every(
        (item: unknown) =>
          typeof item === "object" &&
          item !== null &&
          "metrica_nome" in item &&
          "mes_referencia" in item &&
          "quantidade" in item &&
          "valor_total" in item,
      )
    ) {
      return parsed as SaveConsumoIntent;
    }
  } catch {
    // Ignore invalid JSON candidates.
  }

  return null;
}

export function extractSaveConsumoIntent(content: string): SaveConsumoIntent | null {
  const fencedJsonMatches = content.match(/```json\s*([\s\S]*?)```/gi) || [];
  for (const match of fencedJsonMatches) {
    const jsonCandidate = match.replace(/```json|```/gi, "").trim();
    const parsed = tryParseJson(jsonCandidate);
    if (parsed) return parsed;
  }

  const inlineJsonMatches = content.match(/\{[\s\S]*"action"\s*:\s*"save_consumo"[\s\S]*\}/g) || [];
  for (const candidate of inlineJsonMatches) {
    const parsed = tryParseJson(candidate);
    if (parsed) return parsed;
  }

  return null;
}
