"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FileText, Trash2, Eye, History as HistoryIcon } from "lucide-react";
import { Shell } from "@/components/Shell";
import { deleteEntry, listHistory, type HistoryEntry } from "@/lib/store";

export default function HistoryPage() {
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  useEffect(() => {
    void listHistory().then(setHistory);
  }, []);

  const remove = async (id: string) => {
    await deleteEntry(id);
    setHistory(await listHistory());
  };

  return (
    <Shell>
      <div className="col-span-12 mb-stack-md">
        <h2 className="text-headline-xl text-primary">Historial de Cargas</h2>
        <p className="text-body-md text-on-surface-variant mt-1">
          {history.length} archivo{history.length === 1 ? "" : "s"} procesado{history.length === 1 ? "" : "s"} localmente en este dispositivo.
        </p>
      </div>

      <div className="col-span-12 bg-surface-container-lowest border border-outline-variant rounded-xl">
        {!history.length ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <HistoryIcon className="w-12 h-12 text-on-surface-variant mb-4" />
            <h3 className="text-headline-md text-primary">Aún no hay cargas</h3>
            <p className="text-body-md text-on-surface-variant mt-2 mb-6">
              Los archivos que analices aparecerán aquí para reexportarlos rápidamente.
            </p>
            <Link href="/" className="bg-primary text-on-primary px-6 py-3 rounded-lg font-semibold">
              Sube tu primer archivo
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-body-sm">
              <thead className="text-label-md text-on-surface-variant border-b border-outline-variant">
                <tr>
                  <th className="text-left py-3 px-stack-md font-semibold">ARCHIVO</th>
                  <th className="text-left py-3 px-stack-md font-semibold">FECHA DE CARGA</th>
                  <th className="text-right py-3 px-stack-md font-semibold">FILAS</th>
                  <th className="text-right py-3 px-stack-md font-semibold">DUPLICADOS</th>
                  <th className="text-right py-3 px-stack-md font-semibold">INVÁLIDOS</th>
                  <th className="text-right py-3 px-stack-md font-semibold">ACCIONES</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h) => (
                  <tr key={h.id} className="border-b border-outline-variant/50 hover:bg-surface-container-low">
                    <td className="py-3 px-stack-md">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded bg-surface-container-high flex items-center justify-center">
                          <FileText className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                          <div className="font-semibold text-primary">{h.fileName}</div>
                          <div className="text-[11px] text-on-surface-variant">{formatBytes(h.fileSize)}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-stack-md text-on-surface-variant">
                      {new Date(h.uploadedAt).toLocaleString("es-ES")}
                    </td>
                    <td className="py-3 px-stack-md text-right font-mono-data">{h.summary.totalRows.toLocaleString()}</td>
                    <td className="py-3 px-stack-md text-right font-mono-data">
                      <span className={h.summary.duplicates > 0 ? "text-error font-semibold" : ""}>
                        {h.summary.duplicates.toLocaleString()}
                      </span>
                    </td>
                    <td className="py-3 px-stack-md text-right font-mono-data">
                      <span className={h.summary.invalid > 0 ? "text-error font-semibold" : ""}>
                        {h.summary.invalid.toLocaleString()}
                      </span>
                    </td>
                    <td className="py-3 px-stack-md">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/results?id=${h.id}`}
                          className="p-2 rounded-lg text-primary hover:bg-surface-container"
                          aria-label="Ver resultados"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                        <button
                          onClick={() => remove(h.id)}
                          className="p-2 rounded-lg text-error hover:bg-error-container"
                          aria-label="Eliminar"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Shell>
  );
}

function formatBytes(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / (1024 * 1024)).toFixed(1)} MB`;
}
