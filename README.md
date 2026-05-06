# IMEI Intel

Validador local de IMEI/ICCID con detección de duplicados y lista negra.

Powered by Alexander Felíz PN.

## Funciones

- **Carga de archivos** XLSX, XLS o CSV con auto-detección de la columna IMEI/ICCID
- **Validación** con algoritmo de Luhn (15 dígitos = IMEI, 19/20 = ICCID)
- **Detección de duplicados** dentro del archivo
- **Lista negra** con categorías (Robado, Incautado, Sospechoso, Reportado, Otro), número de caso y oficial reportante
- **Cross-check automático** contra lista negra al cargar archivos
- **Consulta puntual** de un IMEI individual desde el dashboard
- **Exportación** a PDF, Excel y CSV
- **Log de auditoría** de todas las acciones (consultas, altas y bajas)
- **Sistema de limpieza** controlado para mantenimiento

## Stack

- Next.js 16 + React 19 + TypeScript + Tailwind CSS
- SQLite (better-sqlite3) para persistencia local
- jsPDF + autotable para reportes en PDF
- SheetJS + PapaParse para parsing de Excel/CSV
- Electron + electron-builder para empaquetado de escritorio

## Desarrollo local

```bash
npm install
npm run dev
# abrir http://localhost:3000
```

## Empaquetar para Windows

```bash
npm run dist
# resultado en dist-installer/IMEI Intel-Setup-X.Y.Z.exe
```

## Deploy en web (testing)

Configurado para Render.com. Ver `render.yaml`.
