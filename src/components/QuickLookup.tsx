"use client";

import { useState } from "react";
import { Search, ShieldAlert, ShieldCheck, AlertTriangle } from "lucide-react";
import { lookup, type LookupResponse } from "@/lib/store";

export function QuickLookup() {
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<LookupResponse | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!value.trim()) return;
    setBusy(true);
    setErr(null);
    setResult(null);
    try {
      const r = await lookup(value.trim());
      setResult(r);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-stack-md">
      <h3 className="text-label-md text-primary font-bold tracking-wider mb-stack-sm">
        CONSULTA PUNTUAL
      </h3>
      <form onSubmit={onSubmit} className="flex gap-2">
        <div className="relative flex-grow">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Pega un IMEI o ICCID…"
            className="w-full pl-10 pr-4 py-2 bg-surface-container-low border border-outline-variant rounded-lg text-body-md font-mono-data outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <button
          type="submit"
          disabled={busy || !value.trim()}
          className="bg-primary text-on-primary px-4 rounded-lg font-semibold disabled:opacity-50 hover:opacity-90"
        >
          {busy ? "…" : "Consultar"}
        </button>
      </form>

      {err && <p className="mt-stack-sm text-body-sm text-error">{err}</p>}

      {result && <Result data={result} />}
    </div>
  );
}

function Result({ data }: { data: LookupResponse }) {
  const blacklisted = data.blacklisted;
  const occurrences = data.occurrences ?? [];
  const validation = data.validation;

  return (
    <div className="mt-stack-md space-y-stack-sm">
      {blacklisted ? (
        <div className="bg-error text-on-error rounded-lg p-stack-md flex gap-3">
          <ShieldAlert className="w-6 h-6 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold uppercase tracking-wider text-body-sm">EN LISTA NEGRA</p>
            <p className="text-body-sm mt-1">
              {blacklisted.category}
              {blacklisted.caseNumber ? ` · Caso ${blacklisted.caseNumber}` : ""}
              {blacklisted.reportedBy ? ` · Reportado por ${blacklisted.reportedBy}` : ""}
            </p>
            {blacklisted.reason && <p className="text-body-sm mt-1 opacity-90">{blacklisted.reason}</p>}
            <p className="text-[11px] opacity-75 mt-1">
              {new Date(blacklisted.reportedAt).toLocaleString("es-ES")}
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-secondary-container text-on-secondary-container rounded-lg p-stack-md flex gap-3">
          <ShieldCheck className="w-6 h-6 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold uppercase tracking-wider text-body-sm">LIMPIO</p>
            <p className="text-body-sm mt-1">No aparece en la lista negra.</p>
          </div>
        </div>
      )}

      {!validation.valid && (
        <div className="bg-error-container text-on-error-container rounded-lg p-stack-sm flex gap-2 text-body-sm">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>
            Validación falló: {validation.reason ?? "formato inválido"} (tipo: {validation.kind})
          </span>
        </div>
      )}

      {occurrences.length > 0 && (
        <div className="bg-surface-container rounded-lg p-stack-sm">
          <p className="text-label-md text-on-surface-variant mb-1">
            Aparece en {occurrences.length} carga{occurrences.length === 1 ? "" : "s"} previa{occurrences.length === 1 ? "" : "s"}:
          </p>
          <ul className="text-body-sm space-y-1">
            {occurrences.slice(0, 5).map((o, i) => (
              <li key={i} className="text-on-surface-variant">
                · {o.fileName} (fila {o.rowIndex}) — {new Date(o.uploadedAt).toLocaleDateString("es-ES")}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
