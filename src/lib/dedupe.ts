import { validate, type ValidationResult } from "./imei";
import type { ParsedRow } from "./parse";

export interface AnalysisRecord extends ValidationResult {
  rowIndex: number;
  source: string;
  isDuplicate: boolean;
  duplicateRows: number[]; // other row indexes sharing this value
}

export interface AnalysisSummary {
  totalRows: number;
  unique: number;
  duplicates: number; // count of rows that are part of any duplicate group
  duplicateGroups: number;
  invalid: number;
  imeiCount: number;
  iccidCount: number;
}

export interface AnalysisReport {
  records: AnalysisRecord[];
  summary: AnalysisSummary;
  duplicateGroups: { value: string; rows: number[] }[];
}

export function analyze(rows: ParsedRow[]): AnalysisReport {
  const groups = new Map<string, number[]>();
  for (const r of rows) {
    if (!r.value) continue;
    const arr = groups.get(r.value) ?? [];
    arr.push(r.rowIndex);
    groups.set(r.value, arr);
  }

  const duplicateGroups = [...groups.entries()]
    .filter(([, idxs]) => idxs.length > 1)
    .map(([value, rows]) => ({ value, rows }));

  const records: AnalysisRecord[] = rows.map((r) => {
    const v = validate(r.value);
    const groupRows = groups.get(r.value) ?? [];
    const isDuplicate = groupRows.length > 1;
    return {
      ...v,
      rowIndex: r.rowIndex,
      source: r.source,
      isDuplicate,
      duplicateRows: isDuplicate ? groupRows.filter((i) => i !== r.rowIndex) : [],
    };
  });

  let unique = 0;
  let duplicates = 0;
  let invalid = 0;
  let imeiCount = 0;
  let iccidCount = 0;
  for (const rec of records) {
    if (rec.isDuplicate) duplicates++;
    else unique++;
    if (!rec.valid) invalid++;
    if (rec.kind === "imei") imeiCount++;
    if (rec.kind === "iccid") iccidCount++;
  }

  return {
    records,
    summary: {
      totalRows: rows.length,
      unique,
      duplicates,
      duplicateGroups: duplicateGroups.length,
      invalid,
      imeiCount,
      iccidCount,
    },
    duplicateGroups,
  };
}
