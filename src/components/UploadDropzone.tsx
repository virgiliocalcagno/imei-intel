"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { UploadCloud, CheckCircle2, Loader2 } from "lucide-react";
import { parseFile } from "@/lib/parse";
import { analyze } from "@/lib/dedupe";
import { saveAnalysis } from "@/lib/store";

export function UploadDropzone() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = useCallback(
    async (file: File) => {
      setBusy(true);
      setError(null);
      try {
        const rows = await parseFile(file);
        const report = analyze(rows);
        const { id } = await saveAnalysis(
          { fileName: file.name, fileSize: file.size },
          report
        );
        router.push(`/results?id=${id}`);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setBusy(false);
      }
    },
    [router]
  );

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        const f = e.dataTransfer.files?.[0];
        if (f) void handleFile(f);
      }}
      onClick={() => inputRef.current?.click()}
      className={
        "bg-surface-container-lowest border rounded-xl p-stack-lg flex flex-col items-center justify-center min-h-[400px] border-dashed border-2 transition-colors group cursor-pointer " +
        (dragOver ? "border-secondary" : "border-secondary/40 hover:border-secondary")
      }
    >
      <input
        ref={inputRef}
        type="file"
        accept=".csv,.xlsx,.xls"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void handleFile(f);
          e.target.value = "";
        }}
      />
      <div className="w-20 h-20 bg-surface-container-high rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
        {busy ? (
          <Loader2 className="w-12 h-12 text-secondary animate-spin" />
        ) : (
          <UploadCloud className="w-12 h-12 text-secondary" />
        )}
      </div>
      <h3 className="text-headline-lg text-primary mb-2">
        {busy ? "Procesando…" : "Sube un Excel o CSV"}
      </h3>
      <p className="text-body-md text-on-surface-variant text-center max-w-sm mb-8">
        Arrastra y suelta tu archivo aquí, o{" "}
        <span className="text-secondary font-semibold underline">explora tu equipo</span> para iniciar el
        proceso de validación automática.
      </p>
      <div className="flex items-center gap-4 text-label-md text-on-surface-variant">
        <div className="flex items-center gap-1">
          <CheckCircle2 className="w-4 h-4" />
          <span>Máx. 500 MB</span>
        </div>
        <div className="flex items-center gap-1">
          <CheckCircle2 className="w-4 h-4" />
          <span>XLSX, XLS, CSV</span>
        </div>
      </div>
      {error && (
        <p className="mt-6 text-body-sm text-error bg-error-container px-3 py-2 rounded">
          {error}
        </p>
      )}
    </div>
  );
}
