"use client";

import { useState } from "react";
import { Trash2, AlertTriangle, FileX, Ban, Shield, Database } from "lucide-react";
import { Shell } from "@/components/Shell";
import { resetSystem, type ResetScope } from "@/lib/store";

const ACTIONS: {
  scope: ResetScope;
  title: string;
  description: string;
  icon: React.ReactNode;
  danger: boolean;
}[] = [
  {
    scope: "uploads",
    title: "Borrar todas las cargas y resultados",
    description: "Elimina todo el historial de archivos cargados y sus análisis. La lista negra se conserva.",
    icon: <FileX className="w-5 h-5" />,
    danger: false,
  },
  {
    scope: "blacklist",
    title: "Borrar la lista negra completa",
    description: "Elimina todos los IMEIs reportados. Útil al final de un caso o para reiniciar la base.",
    icon: <Ban className="w-5 h-5" />,
    danger: true,
  },
  {
    scope: "audit",
    title: "Borrar el log de auditoría",
    description: "Elimina el historial de quién consultó qué y cuándo. Considera exportarlo antes.",
    icon: <Shield className="w-5 h-5" />,
    danger: true,
  },
  {
    scope: "all",
    title: "Borrar todo (reset completo)",
    description: "Cargas + lista negra + auditoría. Vuelve la app al estado inicial.",
    icon: <Database className="w-5 h-5" />,
    danger: true,
  },
];

export default function SystemPage() {
  const [busy, setBusy] = useState<ResetScope | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async (scope: ResetScope, title: string) => {
    const phrase = "BORRAR";
    const typed = prompt(
      `${title}.\n\nEsta acción no se puede deshacer. Escribe "${phrase}" para confirmar:`
    );
    if (typed !== phrase) {
      setResult(typed === null ? null : "Operación cancelada (frase no coincide).");
      return;
    }
    setBusy(scope);
    setError(null);
    setResult(null);
    try {
      const res = await resetSystem(scope);
      setResult(
        `Hecho. Cargas: ${res.counts.uploads}, registros: ${res.counts.records}, lista negra: ${res.counts.blacklist}, auditoría: ${res.counts.audit}.`
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  return (
    <Shell>
      <div className="col-span-12 mb-stack-md">
        <h2 className="text-headline-xl text-primary">Sistema</h2>
        <p className="text-body-md text-on-surface-variant mt-1">
          Operaciones de mantenimiento. Todos los datos viven en este equipo.
        </p>
      </div>

      <div className="col-span-12 space-y-stack-md">
        {ACTIONS.map((a) => (
          <div
            key={a.scope}
            className="bg-surface-container-lowest border border-outline-variant rounded-xl p-stack-md flex items-start gap-stack-md"
          >
            <div
              className={
                "w-10 h-10 rounded-lg flex items-center justify-center shrink-0 " +
                (a.danger ? "bg-error-container text-error" : "bg-surface-container-high text-primary")
              }
            >
              {a.icon}
            </div>
            <div className="flex-grow">
              <h3 className="text-body-lg font-semibold text-primary">{a.title}</h3>
              <p className="text-body-sm text-on-surface-variant mt-0.5">{a.description}</p>
            </div>
            <button
              disabled={busy !== null}
              onClick={() => run(a.scope, a.title)}
              className={
                "shrink-0 px-4 py-2 rounded-lg font-semibold flex items-center gap-2 disabled:opacity-50 " +
                (a.danger
                  ? "bg-error text-on-error hover:opacity-90"
                  : "bg-surface-container border border-outline-variant text-primary hover:bg-surface-container-high")
              }
            >
              <Trash2 className="w-4 h-4" />
              {busy === a.scope ? "…" : "Ejecutar"}
            </button>
          </div>
        ))}

        {result && (
          <div className="bg-secondary-container text-on-secondary-container p-stack-md rounded-lg flex gap-2">
            <Shield className="w-5 h-5 mt-0.5 shrink-0" />
            <span className="text-body-sm">{result}</span>
          </div>
        )}
        {error && (
          <div className="bg-error-container text-on-error-container p-stack-md rounded-lg flex gap-2">
            <AlertTriangle className="w-5 h-5 mt-0.5 shrink-0" />
            <span className="text-body-sm">{error}</span>
          </div>
        )}

        <div className="bg-primary text-on-primary rounded-xl p-stack-md flex items-start gap-3">
          <Shield className="w-5 h-5 mt-0.5 shrink-0" />
          <div className="text-body-sm">
            <p className="font-semibold">Consejo</p>
            <p className="opacity-90 mt-1">
              Antes de borrar, exporta lo importante desde <strong>Reportes</strong>. La base de datos vive en
              el archivo <code className="bg-on-primary/20 px-1 rounded">imei.db</code>; puedes copiarlo como
              backup desde el menú <strong>Ayuda → Carpeta de datos</strong> en la app empacada.
            </p>
          </div>
        </div>
      </div>
    </Shell>
  );
}
