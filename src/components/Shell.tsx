"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  ListChecks,
  BarChart3,
  History,
  Upload,
  HelpCircle,
  LogOut,
  Search,
  Bell,
  Settings,
  Terminal,
  Ban,
  Wrench,
  Menu,
  X,
} from "lucide-react";

const NAV = [
  { href: "/", label: "Panel", icon: LayoutDashboard },
  { href: "/blacklist", label: "Lista Negra", icon: Ban },
  { href: "/results", label: "Resultados", icon: ListChecks },
  { href: "/reports", label: "Reportes", icon: BarChart3 },
  { href: "/history", label: "Historial", icon: History },
  { href: "/system", label: "Sistema", icon: Wrench },
];

export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Close drawer when navigating on mobile.
  useEffect(() => setOpen(false), [pathname]);

  // Lock body scroll when drawer is open.
  useEffect(() => {
    if (typeof document === "undefined") return;
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <div>
      {open && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          onClick={() => setOpen(false)}
          aria-hidden
        />
      )}
      <Sidebar pathname={pathname} open={open} onClose={() => setOpen(false)} />
      <main className="lg:ml-[280px] min-h-screen flex flex-col">
        <TopBar onMenu={() => setOpen(true)} />
        <div className="p-4 sm:p-6 lg:p-margin max-w-container-max-width mx-auto w-full grid grid-cols-12 gap-3 sm:gap-gutter">
          {children}
        </div>
        <div className="fixed bottom-0 right-0 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[100px] -z-10 pointer-events-none" />
        <div className="fixed top-0 left-[300px] w-[400px] h-[400px] bg-secondary/5 rounded-full blur-[80px] -z-10 pointer-events-none hidden lg:block" />
      </main>
    </div>
  );
}

function Sidebar({
  pathname,
  open,
  onClose,
}: {
  pathname: string;
  open: boolean;
  onClose: () => void;
}) {
  return (
    <aside
      className={
        "fixed left-0 top-0 h-full w-[280px] bg-surface-container-low border-r border-outline-variant flex flex-col p-stack-md gap-stack-sm z-50 transition-transform " +
        (open ? "translate-x-0" : "-translate-x-full lg:translate-x-0")
      }
    >
      <div className="flex items-start justify-between mb-stack-lg px-2">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
            <Terminal className="w-5 h-5 text-on-primary" />
          </div>
          <div>
            <h1 className="text-headline-md font-bold text-primary">IMEI Intel</h1>
            <p className="text-label-md text-on-surface-variant">Enterprise Ops</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="lg:hidden p-2 -mr-2 text-on-surface-variant hover:bg-surface-container-highest rounded-full"
          aria-label="Cerrar menú"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
      <nav className="flex flex-col gap-1 flex-grow">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={
                "flex items-center gap-3 px-4 py-3 rounded-lg transition-all " +
                (active
                  ? "bg-secondary-container text-on-secondary-container font-semibold"
                  : "text-on-surface-variant hover:bg-surface-container-highest")
              }
            >
              <Icon className="w-5 h-5" />
              <span className="text-body-md">{label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto flex flex-col gap-1 border-t border-outline-variant pt-stack-md">
        <Link
          href="/"
          className="w-full mb-4 bg-primary text-on-primary py-3 px-4 rounded-lg font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
        >
          <Upload className="w-5 h-5" />
          Subir Archivo
        </Link>
        <a className="flex items-center gap-3 px-4 py-3 text-on-surface-variant hover:bg-surface-container-highest rounded-lg" href="#">
          <HelpCircle className="w-5 h-5" />
          <span className="text-body-md">Soporte</span>
        </a>
        <a className="flex items-center gap-3 px-4 py-3 text-on-surface-variant hover:bg-surface-container-highest rounded-lg" href="#">
          <LogOut className="w-5 h-5" />
          <span className="text-body-md">Cerrar Sesión</span>
        </a>
        <p className="text-[10px] text-on-surface-variant text-center mt-3 opacity-80">
          Powered by <span className="font-semibold">Alexander Felíz PN</span>
        </p>
      </div>
    </aside>
  );
}

function TopBar({ onMenu }: { onMenu: () => void }) {
  return (
    <header className="flex justify-between items-center h-16 px-4 sm:px-6 lg:px-margin w-full sticky top-0 z-30 bg-surface border-b border-outline-variant">
      <div className="flex items-center gap-3 flex-grow min-w-0">
        <button
          onClick={onMenu}
          className="lg:hidden p-2 -ml-2 text-on-surface-variant hover:bg-surface-container-low rounded-full shrink-0"
          aria-label="Abrir menú"
        >
          <Menu className="w-6 h-6" />
        </button>
        <div className="relative w-full max-w-md hidden md:block">
          <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
          <input
            type="text"
            placeholder="Buscar datos, archivos o reportes..."
            className="w-full pl-10 pr-4 py-2 bg-surface-container-low border border-outline-variant rounded-lg text-body-md focus:ring-1 focus:ring-primary focus:border-primary outline-none"
          />
        </div>
        <h1 className="text-headline-md font-bold text-primary md:hidden truncate">IMEI Intel</h1>
      </div>
      <div className="flex items-center gap-1 sm:gap-stack-md shrink-0">
        <button className="p-2 text-on-surface-variant hover:bg-surface-container-low rounded-full">
          <Bell className="w-5 h-5" />
        </button>
        <button className="p-2 text-on-surface-variant hover:bg-surface-container-low rounded-full hidden sm:inline-flex">
          <Settings className="w-5 h-5" />
        </button>
        <div className="h-8 w-[1px] bg-outline-variant mx-1 sm:mx-2 hidden sm:block" />
        <div className="flex items-center gap-2 sm:gap-3 cursor-pointer p-1 hover:bg-surface-container-low rounded-lg">
          <div className="w-8 h-8 rounded-full bg-primary text-on-primary flex items-center justify-center font-semibold text-body-sm border border-outline-variant">
            AU
          </div>
          <span className="text-body-md font-semibold text-primary hidden sm:inline">
            Administrador
          </span>
        </div>
      </div>
    </header>
  );
}
