"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, Copy, Database, FileX2, Ban } from "lucide-react";
import { Shell } from "@/components/Shell";
import { ReportImeiDialog } from "@/components/ReportImeiDialog";
import { getStoredAnalysis, listHistory, type EnrichedRecord, type HistoryEntry, type StoredAnalysis } from "@/lib/store";

type Filter = "all" | "duplicates" | "invalid" | "blacklisted";

export default function ResultsPage() {
  return (
    <Suspense>
      <ResultsInner />
    </Suspense>
  );
}

function ResultsInner() {
  const search = useSearchParams();
  const queryId = search.get("id");
  const [data, setData] = useState<StoredAnalysis | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [q, setQ] = useState("");

  useEffect(() => {
    void (async () => {
      const list = await listHistory();
      setHistory(list);
      const id = queryId ?? list[0]?.id ?? null;
      setActiveId(id);
      if (id) setData(await getStoredAnalysis(id));
    })();
  }, [queryId]);

  const report = data?.report ?? null;
  const meta = useMemo(() => history.find((h) => h.id === activeId), [history, activeId]);
  const [reporting, setReporting] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!activeId) return;
    setData(await getStoredAnalysis(activeId));
  }, [activeId]);

  const filtered = useMemo(() => {
    if (!report) return [];
    return report.records.filter((r) => {
      if (filter === "duplicates" && !r.isDuplicate) return false;
      if (filter === "invalid" && r.valid) return false;
      if (filter === "blacklisted" && !r.blacklisted) return false;
      if (q && !r.value.includes(q)) return false;
      return true;
    });
  }, [report, filter, q]);

  const blacklistHits = useMemo(
    () => report?.records.filter((r) => r.blacklisted).length ?? 0,
    [report]
  );

  if (!activeId || !report) {
    return (
      <Shell>
        <div className="col-span-12 flex flex-col items-center justify-center min-h-[60vh] text-center">
          <Database className="w-12 h-12 text-on-surface-variant mb-4" />
          <h2 className="text-headline-lg text-primary">Sin análisis cargado</h2>
          <p className="text-body-md text-on-surface-variant mt-2 mb-6">
            Sube un archivo para ver los resultados de validación.
          </p>
          <Link href="/" className="bg-primary text-on-primary px-6 py-3 rounded-lg font-semibold">
            Subir un archivo
          </Link>
        </div>
      </Shell>
    );
  }

  const s = report.summary;

  return (
    <Shell>
      <div className="col-span-12 mb-stack-md flex justify-between items-end gap-4 flex-wrap">
        <div>
          <h2 className="text-headline-xl text-primary">Resultados del Análisis</h2>
          <p className="text-body-md text-on-surface-variant mt-1">
            {meta?.fileName ?? "Última carga"} · {s.totalRows.toLocaleString()} filas procesadas
          </p>
        </div>
        <Link
          href="/reports"
          className="bg-primary text-on-primary px-5 py-2 rounded-lg font-semibold hover:opacity-90"
        >
          Generar Reporte
        </Link>
      </div>

      <div className="col-span-12 grid grid-cols-2 lg:grid-cols-5 gap-gutter">
        <Stat
          label="ÚNICOS"
          value={s.unique.toLocaleString()}
          tone="secondary"
          icon={<CheckCircle2 className="w-5 h-5 text-secondary" />}
        />
        <Stat
          label="DUPLICADOS"
          value={s.duplicates.toLocaleString()}
          tone="error"
          icon={<Copy className="w-5 h-5 text-error" />}
          hint={`${s.duplicateGroups} grupo${s.duplicateGroups === 1 ? "" : "s"}`}
        />
        <Stat
          label="EN LISTA NEGRA"
          value={blacklistHits.toLocaleString()}
          tone={blacklistHits > 0 ? "error" : "primary"}
          icon={<Ban className={"w-5 h-5 " + (blacklistHits > 0 ? "text-error" : "text-on-surface-variant")} />}
        />
        <Stat
          label="INVÁLIDOS"
          value={s.invalid.toLocaleString()}
          tone="error"
          icon={<FileX2 className="w-5 h-5 text-error" />}
        />
        <Stat
          label="IMEI / ICCID"
          value={`${s.imeiCount.toLocaleString()} / ${s.iccidCount.toLocaleString()}`}
          icon={<AlertTriangle className="w-5 h-5 text-on-surface-variant" />}
        />
      </div>

      <div className="col-span-12 bg-surface-container-lowest border border-outline-variant rounded-xl p-stack-md mt-stack-md">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-stack-md">
          <div className="flex gap-2 flex-wrap">
            {(["all", "duplicates", "blacklisted", "invalid"] as Filter[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={
                  "px-3 py-1.5 rounded-full text-body-sm font-semibold transition " +
                  (filter === f
                    ? "bg-primary text-on-primary"
                    : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high")
                }
              >
                {filterLabel(f)}
              </button>
            ))}
          </div>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar un valor…"
            className="px-3 py-2 bg-surface-container-low border border-outline-variant rounded-lg text-body-sm focus:ring-1 focus:ring-primary outline-none w-64"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-body-sm">
            <thead className="text-label-md text-on-surface-variant border-b border-outline-variant">
              <tr>
                <th className="text-left py-2 pr-4 font-semibold">FILA</th>
                <th className="text-left py-2 pr-4 font-semibold">VALOR</th>
                <th className="text-left py-2 pr-4 font-semibold">TIPO</th>
                <th className="text-left py-2 pr-4 font-semibold">ESTADO</th>
                <th className="text-left py-2 pr-4 font-semibold">NOTAS</th>
                <th className="text-right py-2 pr-2 font-semibold">ACCIÓN</th>
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, 500).map((r) => (
                <tr key={r.rowIndex} className="border-b border-outline-variant/50 hover:bg-surface-container-low">
                  <td className="py-2 pr-4 text-on-surface-variant">{r.rowIndex}</td>
                  <td className="py-2 pr-4 font-mono-data">{r.value}</td>
                  <td className="py-2 pr-4 uppercase text-on-surface-variant">{r.kind}</td>
                  <td className="py-2 pr-4">
                    <StatusBadges record={r} />
                  </td>
                  <td className="py-2 pr-4 text-on-surface-variant">
                    {r.blacklisted && (
                      <span className="text-error font-semibold">
                        {r.blacklistCategory}
                        {r.blacklistCaseNumber ? ` · ${r.blacklistCaseNumber}` : ""}
                      </span>
                    )}
                    {r.isDuplicate && (
                      <span className="ml-2">comparte con fila{r.duplicateRows.length > 1 ? "s" : ""} {r.duplicateRows.slice(0, 3).join(", ")}{r.duplicateRows.length > 3 ? "…" : ""}</span>
                    )}
                    {!r.valid && r.reason && <span className="ml-2 text-error">{translateReason(r.reason)}</span>}
                  </td>
                  <td className="py-2 pr-2 text-right">
                    {!r.blacklisted && (
                      <button
                        onClick={() => setReporting(r.value)}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded text-error hover:bg-error-container text-[11px] font-bold"
                        title="Reportar a Lista Negra"
                      >
                        <Ban className="w-3.5 h-3.5" />
                        REPORTAR
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length > 500 && (
            <p className="text-body-sm text-on-surface-variant mt-3">
              Mostrando las primeras 500 de {filtered.length.toLocaleString()} filas. Exporta para ver todas.
            </p>
          )}
          {filtered.length === 0 && (
            <p className="text-body-sm text-on-surface-variant mt-6 text-center py-8">
              No hay filas que coincidan con el filtro actual.
            </p>
          )}
        </div>
      </div>

      {reporting && (
        <ReportImeiDialog
          initialValue={reporting}
          onClose={() => setReporting(null)}
          onReported={() => void refresh()}
        />
      )}
    </Shell>
  );
}

function Stat({
  label,
  value,
  hint,
  icon,
  tone = "primary",
}: {
  label: string;
  value: string;
  hint?: string;
  icon: React.ReactNode;
  tone?: "primary" | "secondary" | "error";
}) {
  const valueClass =
    tone === "error" ? "text-error" : tone === "secondary" ? "text-secondary" : "text-primary";
  return (
    <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-stack-md">
      <div className="flex justify-between items-start mb-2">
        <span className="text-label-md text-on-surface-variant">{label}</span>
        {icon}
      </div>
      <div className={"text-headline-md font-bold " + valueClass}>{value}</div>
      {hint && <div className="text-body-sm text-on-surface-variant mt-1">{hint}</div>}
    </div>
  );
}

function StatusBadges({ record }: { record: EnrichedRecord }) {
  return (
    <div className="flex flex-wrap gap-1">
      {record.blacklisted && (
        <span className="px-1.5 py-0.5 bg-error text-on-error text-[10px] font-bold rounded">
          LISTA NEGRA
        </span>
      )}
      {record.isDuplicate ? (
        <span className="px-1.5 py-0.5 bg-error-container text-on-error-container text-[10px] font-bold rounded">
          DUPLICADO
        </span>
      ) : (
        <span className="px-1.5 py-0.5 bg-secondary-container text-on-secondary-container text-[10px] font-bold rounded">
          ÚNICO
        </span>
      )}
      {!record.valid && (
        <span className="px-1.5 py-0.5 bg-error-container text-on-error-container text-[10px] font-bold rounded">
          INVÁLIDO
        </span>
      )}
    </div>
  );
}

function filterLabel(f: Filter): string {
  if (f === "all") return "Todos";
  if (f === "duplicates") return "Duplicados";
  if (f === "blacklisted") return "Lista Negra";
  return "Inválidos";
}

function translateReason(reason: string): string {
  if (reason === "empty") return "vacío";
  if (reason === "luhn check failed") return "falló verificación Luhn";
  if (reason.startsWith("unexpected length")) return "longitud inesperada " + reason.replace("unexpected length ", "");
  return reason;
}
