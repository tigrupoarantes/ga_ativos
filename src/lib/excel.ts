import readXlsxFile from "read-excel-file";

export type ExcelCell = string | number | boolean | Date | null | undefined;

export interface ReadXlsxAsObjectsOptions {
  defval?: unknown;
  headerRow?: number;
}

function normalizeHeaderCell(value: ExcelCell): string {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function isRowEmpty(row: ExcelCell[]): boolean {
  return row.every((cell) => {
    if (cell === null || cell === undefined) return true;
    if (cell instanceof Date) return false;
    if (typeof cell === "string") return cell.trim() === "";
    return false;
  });
}

export async function readXlsxAsObjects(
  file: File,
  options: ReadXlsxAsObjectsOptions = {}
): Promise<Record<string, unknown>[]> {
  const rows = (await readXlsxFile(file)) as ExcelCell[][];
  if (rows.length === 0) return [];

  const headerRowIndex = Math.max(0, (options.headerRow ?? 1) - 1);
  const headerRow = rows[headerRowIndex] ?? [];
  const headers = headerRow.map(normalizeHeaderCell);

  const dataRows = rows.slice(headerRowIndex + 1);
  const defval = options.defval;

  const objects: Record<string, unknown>[] = [];

  for (const row of dataRows) {
    if (isRowEmpty(row)) continue;

    const obj: Record<string, unknown> = {};
    for (let i = 0; i < headers.length; i++) {
      const key = headers[i];
      if (!key) continue;
      const value = row[i];
      obj[key] = value === undefined || value === null ? defval : value;
    }
    objects.push(obj);
  }

  return objects;
}

export function excelSerialToDate(serial: number): Date {
  // Excel (Windows) counts days since 1899-12-30 (taking into account the 1900 leap year bug)
  const excelEpoch = Date.UTC(1899, 11, 30);
  const ms = serial * 24 * 60 * 60 * 1000;
  return new Date(excelEpoch + ms);
}
