/**
 * Parser para a planilha de controle de linhas Claro ("conta claro .xlsx").
 *
 * O arquivo tem ~4.819 linhas porque há múltiplos itens de cobrança por linha
 * telefônica. Este parser deduplica por número, retornando uma entrada por linha.
 *
 * Colunas esperadas (case-insensitive, após trim):
 *   "Numero Linha" ou "Linha" → número do celular
 *   "CPF"                     → CPF do usuário (para match com funcionarios)
 *   "Nome Usuário"            → nome do usuário
 *   "Equipe"                  → equipe/time
 *   "Centro de Custo"         → CC
 *   "Empresa"                 → empresa do grupo
 */

import { readXlsxAsObjects } from "@/lib/excel";

export interface LinhaFromClaro {
  numeroNorm: string;       // apenas dígitos, ex: "16991117570"
  numeroOriginal: string;   // valor bruto da planilha, ex: "16 99111-7570"
  cpfNorm: string;          // apenas dígitos, ex: "12345678901"
  nomeUsuario: string;
  equipe: string;
  centroCusto: string;
  empresa: string;
}

function digitsOnly(v: unknown): string {
  return String(v ?? "").replace(/\D/g, "");
}

function strVal(v: unknown): string {
  return String(v ?? "").trim();
}

/** Normaliza um header de coluna: minúsculas, sem acento, trim */
function normalizeHeader(h: string): string {
  return h
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

/** Detecta qual chave do objeto corresponde a um padrão de header */
function findKey(
  obj: Record<string, unknown>,
  patterns: string[]
): string | undefined {
  const keys = Object.keys(obj);
  for (const pattern of patterns) {
    const found = keys.find((k) => normalizeHeader(k) === pattern);
    if (found) return found;
  }
  // Fallback: contém o padrão
  for (const pattern of patterns) {
    const found = keys.find((k) => normalizeHeader(k).includes(pattern));
    if (found) return found;
  }
  return undefined;
}

export async function parseClaroLinhasXlsx(file: File): Promise<LinhaFromClaro[]> {
  const rows = await readXlsxAsObjects(file, { defval: "" });

  if (rows.length === 0) {
    throw new Error("Planilha vazia ou sem dados.");
  }

  // Detecta colunas usando a primeira linha como referência
  const sample = rows[0];
  const colNumero = findKey(sample, ["numero linha", "numero", "linha"]);
  const colCpf = findKey(sample, ["cpf"]);
  const colNome = findKey(sample, ["nome usuario", "nome"]);
  const colEquipe = findKey(sample, ["equipe"]);
  const colCc = findKey(sample, ["centro de custo", "centro custo", "cc"]);
  const colEmpresa = findKey(sample, ["empresa"]);

  if (!colNumero) {
    throw new Error(
      'Coluna de número não encontrada. Esperado: "Numero Linha" ou "Linha".'
    );
  }

  const map = new Map<string, LinhaFromClaro>();

  for (const row of rows) {
    const numeroOriginal = strVal(row[colNumero!]);
    const numeroNorm = digitsOnly(numeroOriginal);

    // Ignora linhas sem número ou com número muito curto
    if (numeroNorm.length < 10) continue;

    // Deduplica: mantém primeira ocorrência
    if (map.has(numeroNorm)) continue;

    const cpfNorm = colCpf ? digitsOnly(row[colCpf]) : "";
    const nomeUsuario = colNome ? strVal(row[colNome]) : "";
    const equipe = colEquipe ? strVal(row[colEquipe]) : "";
    const centroCusto = colCc ? strVal(row[colCc]) : "";
    const empresa = colEmpresa ? strVal(row[colEmpresa]) : "";

    map.set(numeroNorm, {
      numeroNorm,
      numeroOriginal,
      cpfNorm,
      nomeUsuario,
      equipe,
      centroCusto,
      empresa,
    });
  }

  return Array.from(map.values()).sort((a, b) =>
    a.numeroNorm.localeCompare(b.numeroNorm)
  );
}
