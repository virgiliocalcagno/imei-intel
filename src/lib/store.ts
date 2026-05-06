"use client";

// Client-side wrapper around the local SQLite-backed API. All persistence lives
// in the server-side database file; nothing is in localStorage anymore.

import type { AnalysisRecord, AnalysisReport } from "./dedupe";

export interface HistoryEntry {
  id: string;
  fileName: string;
  fileSize: number;
  uploadedAt: number;
  summary: AnalysisReport["summary"];
}

export interface BlacklistedRecordExtras {
  blacklisted: boolean;
  blacklistCategory?: string;
  blacklistCaseNumber?: string;
  blacklistReason?: string;
}

export type EnrichedRecord = AnalysisRecord & BlacklistedRecordExtras;

export interface StoredAnalysis {
  id: string;
  fileName: string;
  fileSize: number;
  uploadedAt: number;
  report: {
    records: EnrichedRecord[];
    summary: AnalysisReport["summary"];
    duplicateGroups: { value: string; rows: number[] }[];
  };
}

export async function listHistory(): Promise<HistoryEntry[]> {
  const r = await fetch("/api/uploads", { cache: "no-store" });
  if (!r.ok) return [];
  return r.json();
}

export async function saveAnalysis(
  meta: { fileName: string; fileSize: number },
  report: AnalysisReport
): Promise<{ id: string }> {
  const r = await fetch("/api/uploads", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fileName: meta.fileName, fileSize: meta.fileSize, report }),
  });
  if (!r.ok) throw new Error("Failed to save analysis");
  return r.json();
}

export async function getStoredAnalysis(id: string): Promise<StoredAnalysis | null> {
  const r = await fetch(`/api/uploads/${id}`, { cache: "no-store" });
  if (!r.ok) return null;
  return r.json();
}

export async function deleteEntry(id: string): Promise<void> {
  await fetch(`/api/uploads/${id}`, { method: "DELETE" });
}

export interface BlacklistEntry {
  id: number;
  value: string;
  kind: string;
  category: string;
  reason: string | null;
  caseNumber: string | null;
  reportedBy: string | null;
  reportedAt: number;
  notes: string | null;
}

export async function listBlacklist(q?: string): Promise<BlacklistEntry[]> {
  const url = q ? `/api/blacklist?q=${encodeURIComponent(q)}` : "/api/blacklist";
  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) return [];
  return r.json();
}

export interface AddBlacklistEntry {
  value: string;
  category: string;
  reason?: string;
  caseNumber?: string;
  reportedBy?: string;
  notes?: string;
}

export async function addBlacklist(entry: AddBlacklistEntry | { entries: AddBlacklistEntry[] }) {
  const r = await fetch("/api/blacklist", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(entry),
  });
  if (!r.ok) throw new Error("Failed to add to blacklist");
  return r.json() as Promise<{ inserted: number }>;
}

export async function removeBlacklist(id: number) {
  await fetch(`/api/blacklist/${id}`, { method: "DELETE" });
}

export type ResetScope = "uploads" | "blacklist" | "audit" | "all";

export async function resetSystem(scope: ResetScope) {
  const r = await fetch("/api/admin/reset", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ scope, confirm: "BORRAR" }),
  });
  if (!r.ok) throw new Error("Reset failed");
  return r.json() as Promise<{
    ok: true;
    counts: { uploads: number; records: number; blacklist: number; audit: number };
  }>;
}

export interface LookupResponse {
  value: string;
  validation: {
    valid: boolean;
    kind: string;
    reason?: string;
  };
  blacklisted: BlacklistEntry | null;
  occurrences: { uploadId: string; fileName: string; uploadedAt: number; rowIndex: number }[];
}

export async function lookup(value: string, actor?: string): Promise<LookupResponse> {
  const r = await fetch("/api/lookup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ value, actor }),
  });
  if (!r.ok) throw new Error("Lookup failed");
  return r.json();
}
