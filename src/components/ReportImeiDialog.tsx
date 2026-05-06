"use client";

import { useEffect, useState } from "react";
import { Ban } from "lucide-react";
import { addBlacklist, type AddBlacklistEntry } from "@/lib/store";

const CATEGORIES = ["Robado", "Incautado", "Sospechoso", "Reportado", "Otro"];

interface Props {
  initialValue: string;
  onClose: () => void;
  onReported?: (entry: AddBlacklistEntry) => void;
}

export function ReportImeiDialog({ initialValue, onClose, onReported }: Props) {
  const [value, setValue] = useState(initialValue);
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [caseNumber, setCaseNumber] = useState("");
  const [reason, setReason] = useState("");
  const [reportedBy, setReportedBy] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => setValue(initialValue), [initialValue]);

  const submit = async () => {
    if (!value.trim()) return;
    setBusy(true);
    setError(null);
    const entry: AddBlacklistEntry = {
      value: value.trim(),
      category,
      caseNumber: caseNumber.trim() || undefined,
      reason: reason.trim() || undefined,
      reportedBy: reportedBy.trim() || undefined,
      notes: notes.trim() || undefined,
    };
    try {
      await addBlacklist(entry);
      onReported?.(entry);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      role="dialog"
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-surface-container-lowest rounded-xl w-full max-w-lg p-stack-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 mb-stack-md">
          <div className="w-10 h-10 bg-error-container rounded-lg flex items-center justify-center">
            <Ban className="w-5 h-5 text-error" />
          </div>
          <h3 className="text-headline-md text-primary">Reportar a Lista Negra</h3>
        </div>

        <div className="space-y-stack-sm">
          <Field label="IMEI o ICCID *">
            <input
              autoFocus
              value={value}
              onChange={(e) => setValue(e.target.value)}
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

        {error && (
          <div className="mt-stack-md p-stack-sm bg-error-container text-on-error-container rounded text-body-sm">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-2 mt-stack-lg">
          <button
            onClick={onClose}
            className="px-4 py-2 text-primary font-semibold rounded hover:bg-surface-container"
          >
            Cancelar
          </button>
          <button
            disabled={busy || !value.trim()}
            onClick={submit}
            className="px-4 py-2 bg-error text-on-error font-semibold rounded disabled:opacity-50 hover:opacity-90"
          >
            {busy ? "Reportando…" : "Reportar"}
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
