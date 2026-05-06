"use client";

import { useEffect, useState } from "react";
import { Ban, Plus, Search, Trash2, Upload as UploadIcon } from "lucide-react";
import { Shell } from "@/components/Shell";
import {
  addBlacklist,
  listBlacklist,
  removeBlacklist,
  type AddBlacklistEntry,
  type BlacklistEntry,
} from "@/lib/store";
import { parseFile } from "@/lib/parse";

const CATEGORIES = ["Robado", "Incautado", "Sospechoso", "Reportado", "Otro"];

export default function BlacklistPage() {
  const [items, setItems] = useState<BlacklistEntry[]>([]);
  const [q, setQ] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = (term?: string) => listBlacklist(term).then(setItems);

  useEffect(() => {
    void refresh();
  }, []);

  useEffect(() => {
    const t = setTimeout(() => void refresh(q || undefined), 200);
    return () => clearTimeout(t);
  }, [q]);

  const onAdd = async (entry: AddBlacklistEntry) => {
    await addBlacklist(entry);
    setShowAdd(false);
    void refresh(q || undefined);
  };

  const onRemove = async (id: number) => {
    if (!confirm("¿Eliminar este IMEI de la lista negra?")) return;
    await removeBlacklist(id);
    void refresh(q || undefined);
  };

  const onBulkFile = async (file: File) => {
    setBulkBusy(true);
    setError(null);
    try {
      const rows = await parseFile(file);
      const entries = rows.map((r) => ({
        value: r.value,
        category: "Importado",
        reason: `Importado de ${file.name}`,
      }));
      const res = await addBlacklist({ entries });
      void refresh();
      alert(`${res.inserted} registros agregados a la lista negra.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBulkBusy(false);
    }
  };

  return (
    <Shell>
      <div className="col-span-12 mb-stack-md flex justify-between items-end gap-4 flex-wrap">
        <div>
          <h2 className="text-headline-xl text-primary">Lista Negra</h2>
          <p className="text-body-md text-on-surface-variant mt-1">
            {items.length} registro{items.length === 1 ? "" : "s"} marcado{items.length === 1 ? "" : "s"}.
            Cada IMEI nuevo se contrasta automáticamente con esta base.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label className="bg-surface-container border border-outline-variant text-primary px-4 py-2 rounded-lg font-semibold flex items-center gap-2 cursor-pointer hover:bg-surface-container-high">
            <UploadIcon className="w-4 h-4" />
            Importar Excel/CSV
            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              className="hidden"
              disabled={bulkBusy}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void onBulkFile(f);
                e.target.value = "";
              }}
            />
          </label>
          <button
            onClick={() => setShowAdd(true)}
            className="bg-primary text-on-primary px-4 py-2 rounded-lg font-semibold flex items-center gap-2 hover:opacity-90"
          >
            <Plus className="w-4 h-4" />
            Reportar IMEI
          </button>
        </div>
      </div>

      <div className="col-span-12 bg-surface-container-lowest border border-outline-variant rounded-xl">
        <div className="p-stack-md border-b border-outline-variant">
          <div className="relative max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por IMEI, caso o razón…"
              className="w-full pl-10 pr-4 py-2 bg-surface-container-low border border-outline-variant rounded-lg text-body-sm focus:ring-1 focus:ring-primary outline-none"
            />
          </div>
        </div>

        {error && (
          <div className="m-stack-md p-stack-sm bg-error-container text-on-error-container rounded text-body-sm">
            {error}
          </div>
        )}

        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Ban className="w-12 h-12 text-on-surface-variant mb-4" />
            <h3 className="text-headline-md text-primary">Lista negra vacía</h3>
            <p className="text-body-md text-on-surface-variant mt-2">
              Reporta un IMEI manualmente o importa un Excel con la lista existente.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-body-sm">
              <thead className="text-label-md text-on-surface-variant border-b border-outline-variant">
                <tr>
                  <th className="text-left py-3 px-stack-md font-semibold">VALOR</th>
                  <th className="text-left py-3 px-stack-md font-semibold">TIPO</th>
                  <th className="text-left py-3 px-stack-md font-semibold">CATEGORÍA</th>
                  <th className="text-left py-3 px-stack-md font-semibold">CASO</th>
                  <th className="text-left py-3 px-stack-md font-semibold">RAZÓN</th>
                  <th className="text-left py-3 px-stack-md font-semibold">REPORTADO POR</th>
                  <th className="text-left py-3 px-stack-md font-semibold">FECHA</th>
                  <th className="text-right py-3 px-stack-md font-semibold">ACCIÓN</th>
                </tr>
              </thead>
              <tbody>
                {items.map((b) => (
                  <tr key={b.id} className="border-b border-outline-variant/50 hover:bg-surface-container-low">
                    <td className="py-3 px-stack-md font-mono-data">{b.value}</td>
                    <td className="py-3 px-stack-md uppercase text-on-surface-variant">{b.kind}</td>
                    <td className="py-3 px-stack-md">
                      <span className="px-2 py-0.5 bg-error-container text-on-error-container text-[11px] font-bold rounded">
                        {b.category.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3 px-stack-md">{b.caseNumber ?? "—"}</td>
                    <td className="py-3 px-stack-md text-on-surface-variant">{b.reason ?? "—"}</td>
                    <td className="py-3 px-stack-md text-on-surface-variant">{b.reportedBy ?? "—"}</td>
                    <td className="py-3 px-stack-md text-on-surface-variant">
                      {new Date(b.reportedAt).toLocaleString("es-ES")}
                    </td>
                    <td className="py-3 px-stack-md text-right">
                      <button
                        onClick={() => onRemove(b.id)}
                        className="p-2 rounded-lg text-error hover:bg-error-container"
                        aria-label="Eliminar"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showAdd && <AddDialog onCancel={() => setShowAdd(false)} onSubmit={onAdd} />}
    </Shell>
  );
}

function AddDialog({
  onCancel,
  onSubmit,
}: {
  onCancel: () => void;
  onSubmit: (e: AddBlacklistEntry) => void;
}) {
  const [value, setValue] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [caseNumber, setCaseNumber] = useState("");
  const [reason, setReason] = useState("");
  const [reportedBy, setReportedBy] = useState("");
  const [notes, setNotes] = useState("");

  return (
    <div
      role="dialog"
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
      onClick={onCancel}
    >
      <div
        className="bg-surface-container-lowest rounded-xl w-full max-w-lg p-stack-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-headline-md text-primary mb-stack-md">Reportar IMEI / ICCID</h3>
        <div className="space-y-stack-sm">
          <Field label="IMEI o ICCID *">
            <input
              autoFocus
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="15 dígitos (IMEI) o 19-20 dígitos (ICCID)"
              className="w-full px-3 py-2 bg-surface-container-low border border-outline-variant rounded-lg font-mono-data outline-none focus:ring-1 focus:ring-primary"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Categoría">
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 bg-surface-container-low border border-outline-variant rounded-lg outline-none"
              >
                {CATEGORIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </Field>
            <Field label="Número de caso">
              <input
                value={caseNumber}
                onChange={(e) => setCaseNumber(e.target.value)}
                placeholder="2026-XXXX"
                className="w-full px-3 py-2 bg-surface-container-low border border-outline-variant rounded-lg outline-none"
              />
            </Field>
          </div>
          <Field label="Razón">
            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 bg-surface-container-low border border-outline-variant rounded-lg outline-none"
            />
          </Field>
          <Field label="Reportado por">
            <input
              value={reportedBy}
              onChange={(e) => setReportedBy(e.target.value)}
              placeholder="Nombre del oficial"
              className="w-full px-3 py-2 bg-surface-container-low border border-outline-variant rounded-lg outline-none"
            />
          </Field>
          <Field label="Notas">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 bg-surface-container-low border border-outline-variant rounded-lg outline-none resize-none"
            />
          </Field>
        </div>
        <div className="flex justify-end gap-2 mt-stack-lg">
          <button onClick={onCancel} className="px-4 py-2 text-primary font-semibold rounded hover:bg-surface-container">
            Cancelar
          </button>
          <button
            disabled={!value.trim()}
            onClick={() =>
              onSubmit({
                value: value.trim(),
                category,
                caseNumber: caseNumber.trim() || undefined,
                reason: reason.trim() || undefined,
                reportedBy: reportedBy.trim() || undefined,
                notes: notes.trim() || undefined,
              })
            }
            className="px-4 py-2 bg-primary text-on-primary font-semibold rounded disabled:opacity-50 hover:opacity-90"
          >
            Reportar
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-label-md text-on-surface-variant block mb-1">{label}</span>
      {children}
    </label>
  );
}
