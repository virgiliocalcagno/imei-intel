"use client";

import * as XLSX from "xlsx";
import Papa from "papaparse";
import { normalize } from "./imei";

export interface ParsedRow {
  rowIndex: number;
  value: string;
  source: string; // column header
}

const HEADER_HINTS = ["imei", "iccid", "serial", "id"];

function pickColumn(headers: string[]): { key: string; label: string } | null {
  const lower = headers.map((h) => (h ?? "").toString().toLowerCase());
  for (const hint of HEADER_HINTS) {
    const idx = lower.findIndex((h) => h.includes(hint));
    if (idx >= 0) return { key: headers[idx], label: headers[idx] };
  }
  return headers.length ? { key: headers[0], label: headers[0] } : null;
}

export async function parseFile(file: File): Promise<ParsedRow[]> {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "csv") return parseCsv(file);
  if (ext === "xlsx" || ext === "xls") return parseXlsx(file);
  throw new Error(`Unsupported file extension: .${ext}`);
}

async function parseCsv(file: File): Promise<ParsedRow[]> {
  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (res) => {
        const headers = res.meta.fields ?? [];
        const col = pickColumn(headers);
        if (!col) return resolve([]);
        const rows: ParsedRow[] = res.data
          .map((r, i) => ({
            rowIndex: i + 2,
            value: normalize(r[col.key] ?? ""),
            source: col.label,
          }))
          .filter((r) => r.value.length > 0);
        resolve(rows);
      },
      error: (err) => reject(err),
    });
  });
}

async function parseXlsx(file: File): Promise<ParsedRow[]> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  const sheetName = wb.SheetNames[0];
  if (!sheetName) return [];
  const ws = wb.Sheets[sheetName];
  const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "" });
  if (!json.length) return [];
  const headers = Object.keys(json[0]);
  const col = pickColumn(headers);
  if (!col) return [];
  return json
    .map((r, i) => ({
      rowIndex: i + 2,
      value: normalize(String(r[col.key] ?? "")),
      source: col.label,
    }))
    .filter((r) => r.value.length > 0);
}
