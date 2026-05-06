"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Database, BadgeCheck, RotateCw, ArrowRight, Lightbulb, ShieldCheck, FileText } from "lucide-react";
import { Shell } from "@/components/Shell";
import { UploadDropzone } from "@/components/UploadDropzone";
import { QuickLookup } from "@/components/QuickLookup";
import { listHistory, type HistoryEntry } from "@/lib/store";

function StatCard({
  label,
  value,
  hint,
  icon,
  hintTone = "secondary",
}: {
  label: string;
  value: string;
  hint?: string;
  icon: React.ReactNode;
  hintTone?: "secondary" | "muted";
}) {
  return (
    <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-stack-md">
      <div className="flex justify-between items-start mb-2">
        <span className="text-label-md text-on-surface-variant">{label}</span>
        {icon}
      </div>
      <div className="text-headline-md font-bold text-primary">{value}</div>
      {hint && (
        <div
          className={
            "text-body-sm mt-1 " +
            (hintTone === "secondary" ? "text-secondary" : "text-on-surface-variant")
          }
        >
          {hint}
        </div>
      )}
    </div>
  );
}

export default function HomePage() {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  useEffect(() => {
    void listHistory().then(setHistory);
  }, []);

  const totalProcessed = history.reduce((acc, h) => acc + h.summary.totalRows, 0);
  const totalDuplicates = history.reduce((acc, h) => acc + h.summary.duplicates, 0);
  const accuracy =
    totalProcessed === 0
      ? "—"
      : ((1 - totalDuplicates / totalProcessed) * 100).toFixed(2) + "%";

  return (
    <Shell>
      <div className="col-span-12 mb-stack-md">
        <h2 className="text-headline-xl text-primary">Panel de Validación de Datos</h2>
        <p className="text-body-lg text-on-surface-variant mt-1">
          Listo para procesar tus registros empresariales de IMEI e ICCID.
        </p>
      </div>

      <div className="col-span-12 lg:col-span-8 space-y-gutter">
        <QuickLookup />
        <UploadDropzone />

        <div className="grid grid-cols-3 gap-gutter">
          <StatCard
            label="TOTAL PROCESADO"
            value={totalProcessed.toLocaleString()}
            hint={history.length ? `${history.length} archivos` : "Sin cargas todavía"}
            hintTone={history.length ? "secondary" : "muted"}
            icon={<Database className="w-5 h-5 text-secondary" />}
          />
          <StatCard
            label="TASA DE ÚNICOS"
            value={accuracy}
            hint={totalDuplicates ? `${totalDuplicates.toLocaleString()} duplicados encontrados` : "Datos limpios"}
            icon={<BadgeCheck className="w-5 h-5 text-primary" />}
          />
          <StatCard
            label="TAREAS ACTIVAS"
            value="0"
            hint="Listo para procesar"
            hintTone="muted"
            icon={<RotateCw className="w-5 h-5 text-on-surface-variant" />}
          />
        </div>
      </div>

      <div className="col-span-12 lg:col-span-4 space-y-gutter">
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-stack-md flex flex-col h-[320px]">
          <div className="flex justify-between items-center mb-4">
            <h4 className="text-label-md text-primary font-bold tracking-wider">ACTIVIDAD RECIENTE</h4>
            <Link href="/history" className="text-secondary text-label-md font-bold hover:underline">
              VER TODO
            </Link>
          </div>
          <div className="space-y-4 overflow-y-auto custom-scrollbar pr-2">
            {history.slice(0, 5).map((h) => (
              <RecentItem key={h.id} entry={h} />
            ))}
            {!history.length && (
              <p className="text-body-sm text-on-surface-variant">Aún no se han procesado archivos. Sube uno arriba para empezar.</p>
            )}
          </div>
        </div>

        <div className="bg-primary text-on-primary rounded-xl p-stack-lg relative overflow-hidden">
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-4">
              <Lightbulb className="w-5 h-5" />
              <h4 className="text-label-md font-bold tracking-wider">CONSEJOS DE FORMATO</h4>
            </div>
            <ul className="space-y-3">
              <Tip>Los IMEI deben tener exactamente 15 dígitos, sin espacios ni caracteres especiales.</Tip>
              <Tip>La fila de encabezados debe incluir &quot;IMEI&quot; o &quot;ICCID&quot; para auto-detectar la columna.</Tip>
              <Tip>Máximo 1,000,000 de filas para validación en tiempo real. Usa lotes para más.</Tip>
            </ul>
            <button className="mt-6 w-full py-2 bg-secondary text-on-secondary rounded font-semibold text-body-sm hover:opacity-90">
              Descargar Plantilla
            </button>
          </div>
          <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-on-primary/10 rounded-full" />
        </div>
      </div>

      <div className="col-span-12 mt-gutter">
        <div className="bg-surface-container rounded-xl p-stack-lg border border-outline-variant flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 bg-surface-container-lowest rounded-xl flex items-center justify-center border border-outline-variant">
              <ShieldCheck className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h4 className="text-headline-md text-primary">Procesamiento Local</h4>
              <p className="text-body-md text-on-surface-variant">
                Los archivos se analizan completamente en tu navegador. Nada sale de este dispositivo hasta que decidas exportarlo.
              </p>
            </div>
          </div>
          <Link
            href="/reports"
            className="px-6 py-2 border border-primary text-primary font-semibold rounded hover:bg-primary hover:text-on-primary transition-colors"
          >
            Exportar Reportes
          </Link>
        </div>
      </div>
    </Shell>
  );
}

function Tip({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-2">
      <ArrowRight className="w-4 h-4 mt-1 shrink-0" />
      <p className="text-body-sm text-primary-fixed">{children}</p>
    </li>
  );
}

function RecentItem({ entry }: { entry: HistoryEntry }) {
  const tag =
    entry.summary.duplicates > 0
      ? { label: "DUPLICADOS", className: "bg-error-container text-on-error-container" }
      : { label: "ÚNICOS", className: "bg-secondary-container text-on-secondary-container" };
  return (
    <Link href={`/results?id=${entry.id}`} className="flex gap-3 pb-3 border-b border-outline-variant last:border-0 hover:opacity-90">
      <div className="w-8 h-8 rounded bg-surface-container-high flex items-center justify-center shrink-0">
        <FileText className="w-4 h-4 text-primary" />
      </div>
      <div className="flex-grow min-w-0">
        <div className="flex justify-between items-start gap-2">
          <p className="text-body-sm font-semibold text-primary truncate">{entry.fileName}</p>
          <span className="text-[11px] text-on-surface-variant shrink-0">{relativeTime(entry.uploadedAt)}</span>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <span className={"px-1.5 py-0.5 text-[10px] font-bold rounded " + tag.className}>{tag.label}</span>
          <span className="text-[11px] text-on-surface-variant">
            {entry.summary.totalRows.toLocaleString()} filas
          </span>
        </div>
      </div>
    </Link>
  );
}

function relativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const min = Math.round(diff / 60000);
  if (min < 1) return "ahora";
  if (min < 60) return `hace ${min}m`;
  const h = Math.round(min / 60);
  if (h < 24) return `hace ${h}h`;
  const d = Math.round(h / 24);
  return `hace ${d}d`;
}
