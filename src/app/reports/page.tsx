"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Download, FileSpreadsheet, FileText, FileType2, Filter as FilterIcon } from "lucide-react";
import { Shell } from "@/components/Shell";
import { getStoredAnalysis, listHistory, type HistoryEntry, type StoredAnalysis } from "@/lib/store";

type Scope = "all" | "duplicates" | "unique" | "invalid" | "blacklisted";

export default function ReportsPage() {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [data, setData] = useState<StoredAnalysis | null>(null);
  const [scope, setScope] = useState<Scope>("duplicates");

  useEffect(() => {
    void (async () => {
      const list = await listHistory();
      setHistory(list);
      const id = list[0]?.id ?? null;
      setActiveId(id);
      if (id) setData(await getStoredAnalysis(id));
    })();
  }, []);

  const report = data?.report ?? null;
  const meta = useMemo(() => history.find((h) => h.id === activeId), [history, activeId]);

  const rows = useMemo(() => {
    if (!report) return [];
    return report.records.filter((r) => {
      if (scope === "duplicates") return r.isDuplicate;
      if (scope === "unique") return !r.isDuplicate;
      if (scope === "invalid") return !r.valid;
      if (scope === "blacklisted") return r.blacklisted;
      return true;
    });
  }, [report, scope]);

  const blacklistHits = useMemo(
    () => report?.records.filter((r) => r.blacklisted).length ?? 0,
    [report]
  );

  const exportXlsx = () => {
    if (!report || !meta) return;
    const sheet = XLSX.utils.json_to_sheet(
      rows.map((r) => ({
        Fila: r.rowIndex,
        Valor: r.value,
        Tipo: r.kind,
        Estado: r.isDuplicate ? "Duplicado" : "Único",
        Valido: r.valid ? "Sí" : "No",
        ListaNegra: r.blacklisted ? r.blacklistCategory ?? "Sí" : "",
        Caso: r.blacklisted ? r.blacklistCaseNumber ?? "" : "",
        Razon: r.reason ?? "",
        DuplicadoDe: r.duplicateRows.join(", "),
      }))
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, sheet, "Reporte");

    const summary = XLSX.utils.json_to_sheet([
      { Metrica: "Archivo", Valor: meta.fileName },
      { Metrica: "Total de filas", Valor: report.summary.totalRows },
      { Metrica: "Únicos", Valor: report.summary.unique },
      { Metrica: "Duplicados", Valor: report.summary.duplicates },
      { Metrica: "Grupos de duplicados", Valor: report.summary.duplicateGroups },
      { Metrica: "Inválidos", Valor: report.summary.invalid },
      { Metrica: "Cantidad IMEI", Valor: report.summary.imeiCount },
      { Metrica: "Cantidad ICCID", Valor: report.summary.iccidCount },
    ]);
    XLSX.utils.book_append_sheet(wb, summary, "Resumen");
    XLSX.writeFile(wb, fileBase(meta.fileName) + `_${scope}.xlsx`);
  };

  const exportCsv = () => {
    if (!report || !meta) return;
    const header = ["Fila", "Valor", "Tipo", "Estado", "Valido", "ListaNegra", "Caso", "Razon", "DuplicadoDe"];
    const lines = [header.join(",")];
    for (const r of rows) {
      lines.push(
        [
          r.rowIndex,
          r.value,
          r.kind,
          r.isDuplicate ? "Duplicado" : "Único",
          r.valid ? "Sí" : "No",
          r.blacklisted ? (r.blacklistCategory ?? "Sí") : "",
          r.blacklisted ? (r.blacklistCaseNumber ?? "") : "",
          (r.reason ?? "").replace(/,/g, ";"),
          r.duplicateRows.join(" "),
        ].join(",")
      );
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    triggerDownload(blob, fileBase(meta.fileName) + `_${scope}.csv`);
  };

  const exportPdf = () => {
    if (!report || !meta) return;
    const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 36;
    const now = new Date();

    // Header
    doc.setFillColor(0, 53, 95); // primary
    doc.rect(0, 0, pageW, 64, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text("IMEI Intel — Reporte de Análisis", margin, 36);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`Generado: ${now.toLocaleString("es-ES")}`, pageW - margin, 36, { align: "right" });

    // Metadata block
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(11);
    let y = 92;
    doc.setFont("helvetica", "bold");
    doc.text("Archivo:", margin, y);
    doc.setFont("helvetica", "normal");
    doc.text(meta.fileName, margin + 80, y);
    y += 16;
    doc.setFont("helvetica", "bold");
    doc.text("Cargado:", margin, y);
    doc.setFont("helvetica", "normal");
    doc.text(new Date(meta.uploadedAt).toLocaleString("es-ES"), margin + 80, y);
    y += 16;
    doc.setFont("helvetica", "bold");
    doc.text("Alcance:", margin, y);
    doc.setFont("helvetica", "normal");
    doc.text(scopeLabel(scope), margin + 80, y);
    y += 16;
    doc.setFont("helvetica", "bold");
    doc.text("Filas exportadas:", margin, y);
    doc.setFont("helvetica", "normal");
    doc.text(rows.length.toLocaleString(), margin + 110, y);
    y += 24;

    // Summary table
    autoTable(doc, {
      startY: y,
      theme: "grid",
      head: [["Métrica", "Valor"]],
      body: [
        ["Total de filas", String(report.summary.totalRows)],
        ["Únicos", String(report.summary.unique)],
        ["Duplicados", String(report.summary.duplicates)],
        ["Grupos de duplicados", String(report.summary.duplicateGroups)],
        ["En lista negra", String(blacklistHits)],
        ["Inválidos", String(report.summary.invalid)],
        ["IMEI", String(report.summary.imeiCount)],
        ["ICCID", String(report.summary.iccidCount)],
      ],
      headStyles: { fillColor: [0, 53, 95], textColor: [255, 255, 255], fontStyle: "bold" },
      styles: { fontSize: 9, cellPadding: 4 },
      columnStyles: { 0: { cellWidth: 180 }, 1: { cellWidth: 100, halign: "right" } },
      margin: { left: margin, right: margin },
    });

    // Detail table
    const headers = [["Fila", "Valor", "Tipo", "Estado", "Lista Negra", "Caso", "Nota"]];
    const body = rows.map((r) => [
      String(r.rowIndex),
      r.value,
      r.kind.toUpperCase(),
      r.isDuplicate ? "Duplicado" : r.valid ? "Único" : "Inválido",
      r.blacklisted ? r.blacklistCategory ?? "Sí" : "",
      r.blacklisted ? r.blacklistCaseNumber ?? "" : "",
      !r.valid ? r.reason ?? "" : r.isDuplicate ? `dup. fila${r.duplicateRows.length > 1 ? "s" : ""} ${r.duplicateRows.slice(0, 4).join(", ")}` : "",
    ]);

    autoTable(doc, {
      startY: (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 18,
      theme: "striped",
      head: headers,
      body,
      headStyles: { fillColor: [0, 53, 95], textColor: [255, 255, 255], fontStyle: "bold" },
      styles: { fontSize: 8, cellPadding: 3 },
      columnStyles: {
        0: { cellWidth: 36, halign: "right" },
        1: { cellWidth: 130, fontStyle: "normal" },
        2: { cellWidth: 50 },
        3: { cellWidth: 60 },
        4: { cellWidth: 80 },
        5: { cellWidth: 80 },
        6: { cellWidth: "auto" },
      },
      didParseCell: (data) => {
        if (data.section !== "body") return;
        const status = body[data.row.index][3];
        const onBlacklist = body[data.row.index][4];
        if (onBlacklist) {
          data.cell.styles.fillColor = [255, 218, 214]; // error-container
        } else if (status === "Inválido") {
          data.cell.styles.fillColor = [255, 240, 235];
        }
      },
      margin: { left: margin, right: margin },
      didDrawPage: () => drawFooter(doc, pageW, pageH, margin),
    });

    doc.save(fileBase(meta.fileName) + `_${scope}.pdf`);
  };

  if (!report || !meta) {
    return (
      <Shell>
        <div className="col-span-12 flex flex-col items-center justify-center min-h-[60vh] text-center">
          <FileSpreadsheet className="w-12 h-12 text-on-surface-variant mb-4" />
          <h2 className="text-headline-lg text-primary">Aún no hay nada que reportar</h2>
          <p className="text-body-md text-on-surface-variant mt-2 mb-6">
            Sube un archivo primero; los reportes se generan a partir de los resultados del análisis.
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
      <div className="col-span-12 mb-stack-md">
        <h2 className="text-headline-xl text-primary">Generar Reporte</h2>
        <p className="text-body-md text-on-surface-variant mt-1">
          {meta.fileName} · {s.totalRows.toLocaleString()} filas · {s.duplicates.toLocaleString()} duplicados
        </p>
      </div>

      <div className="col-span-12 lg:col-span-7 bg-surface-container-lowest border border-outline-variant rounded-xl p-stack-lg">
        <div className="flex items-center gap-2 mb-stack-md">
          <FilterIcon className="w-5 h-5 text-primary" />
          <h3 className="text-headline-md text-primary">Alcance</h3>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <ScopeOption v="all" active={scope} onChange={setScope} title="Todas las filas" hint={`${s.totalRows.toLocaleString()} filas`} />
          <ScopeOption v="duplicates" active={scope} onChange={setScope} title="Solo duplicados" hint={`${s.duplicates.toLocaleString()} filas`} />
          <ScopeOption v="blacklisted" active={scope} onChange={setScope} title="Solo lista negra" hint={`${blacklistHits.toLocaleString()} filas`} />
          <ScopeOption v="unique" active={scope} onChange={setScope} title="Solo únicos" hint={`${s.unique.toLocaleString()} filas`} />
          <ScopeOption v="invalid" active={scope} onChange={setScope} title="Solo inválidos" hint={`${s.invalid.toLocaleString()} filas`} />
        </div>

        <div className="mt-stack-lg">
          <h3 className="text-headline-md text-primary mb-stack-sm flex items-center gap-2">
            <Download className="w-5 h-5" /> Formato
          </h3>
          <div className="grid grid-cols-3 gap-3">
            <ExportButton label="PDF" icon={<FileType2 className="w-5 h-5" />} onClick={exportPdf} />
            <ExportButton label="Excel (.xlsx)" icon={<FileSpreadsheet className="w-5 h-5" />} onClick={exportXlsx} />
            <ExportButton label="CSV" icon={<FileText className="w-5 h-5" />} onClick={exportCsv} />
          </div>
          <p className="text-body-sm text-on-surface-variant mt-stack-md">
            Se exportarán {rows.length.toLocaleString()} fila{rows.length === 1 ? "" : "s"}.
          </p>
        </div>
      </div>

      <div className="col-span-12 lg:col-span-5 bg-primary text-on-primary rounded-xl p-stack-lg">
        <h3 className="text-label-md font-bold tracking-wider mb-stack-md">VISTA PREVIA DEL RESUMEN</h3>
        <dl className="space-y-3 text-body-md">
          <Row k="Total de filas" v={s.totalRows.toLocaleString()} />
          <Row k="Únicos" v={s.unique.toLocaleString()} />
          <Row k="Duplicados" v={s.duplicates.toLocaleString()} />
          <Row k="Grupos de duplicados" v={s.duplicateGroups.toLocaleString()} />
          <Row k="Inválidos" v={s.invalid.toLocaleString()} />
          <Row k="IMEI" v={s.imeiCount.toLocaleString()} />
          <Row k="ICCID" v={s.iccidCount.toLocaleString()} />
        </dl>
      </div>
    </Shell>
  );
}

function ScopeOption({
  v,
  active,
  onChange,
  title,
  hint,
}: {
  v: Scope;
  active: Scope;
  onChange: (s: Scope) => void;
  title: string;
  hint: string;
}) {
  const isActive = active === v;
  return (
    <button
      onClick={() => onChange(v)}
      className={
        "p-stack-md rounded-lg border text-left transition " +
        (isActive
          ? "border-primary bg-primary/5"
          : "border-outline-variant hover:border-primary/50")
      }
    >
      <div className="text-body-md font-semibold text-primary">{title}</div>
      <div className="text-body-sm text-on-surface-variant">{hint}</div>
    </button>
  );
}

function ExportButton({
  label,
  icon,
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center justify-center gap-2 p-stack-md rounded-lg border border-outline-variant hover:border-primary hover:bg-surface-container-low transition"
    >
      <span className="text-primary">{icon}</span>
      <span className="text-body-sm font-semibold text-primary">{label}</span>
    </button>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between border-b border-on-primary/15 pb-2">
      <dt className="text-on-primary/80">{k}</dt>
      <dd className="font-semibold">{v}</dd>
    </div>
  );
}

function fileBase(name: string) {
  return name.replace(/\.[^.]+$/, "") || "reporte";
}

function triggerDownload(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

function scopeLabel(s: Scope): string {
  if (s === "all") return "Todas las filas";
  if (s === "duplicates") return "Solo duplicados";
  if (s === "unique") return "Solo únicos";
  if (s === "invalid") return "Solo inválidos";
  return "Solo lista negra";
}

function drawFooter(doc: jsPDF, pageW: number, pageH: number, margin: number) {
  const pageCount = doc.getNumberOfPages();
  const current = (doc as unknown as { internal: { getCurrentPageInfo: () => { pageNumber: number } } })
    .internal.getCurrentPageInfo()
    .pageNumber;
  doc.setDrawColor(194, 199, 209);
  doc.setLineWidth(0.5);
  doc.line(margin, pageH - 30, pageW - margin, pageH - 30);
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.setFont("helvetica", "normal");
  doc.text("IMEI Intel · Procesamiento local · Powered by Alexander Felíz PN", margin, pageH - 16);
  doc.text(`Página ${current} de ${pageCount}`, pageW - margin, pageH - 16, { align: "right" });
}
