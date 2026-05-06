import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "IMEI Intel — Validación de Datos",
  description: "Validador y detector de duplicados de IMEI/ICCID empresarial",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className="light">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="text-on-surface">{children}</body>
    </html>
  );
}
