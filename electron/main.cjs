const { app, BrowserWindow, Menu, shell, dialog } = require("electron");
const { spawn } = require("node:child_process");
const path = require("node:path");
const fs = require("node:fs");
const http = require("node:http");
const net = require("node:net");

const isDev = !app.isPackaged;
let serverProcess = null;
let mainWindow = null;
let serverUrl = null;

function findFreePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const port = server.address().port;
      server.close(() => resolve(port));
    });
  });
}

function waitForServer(url, timeoutMs = 30000) {
  const deadline = Date.now() + timeoutMs;
  return new Promise((resolve, reject) => {
    const tryOnce = () => {
      const req = http.get(url, (res) => {
        res.resume();
        if (res.statusCode && res.statusCode < 500) return resolve();
        retry();
      });
      req.on("error", retry);
      req.setTimeout(2000, () => {
        req.destroy();
        retry();
      });
    };
    const retry = () => {
      if (Date.now() > deadline) return reject(new Error("server timeout"));
      setTimeout(tryOnce, 250);
    };
    tryOnce();
  });
}

async function startServer() {
  const port = await findFreePort();
  const userData = app.getPath("userData");
  fs.mkdirSync(userData, { recursive: true });

  const env = {
    ...process.env,
    PORT: String(port),
    HOSTNAME: "127.0.0.1",
    NODE_ENV: "production",
    IMEI_DB_PATH: path.join(userData, "imei.db"),
    // Make Electron behave like plain Node when re-launched via process.execPath.
    // Without this, every spawn opens a new Electron window — the "mil ventanas" bug.
    ELECTRON_RUN_AS_NODE: "1",
  };

  // In packaged mode the standalone tree is unpacked from the asar archive.
  const serverEntry = isDev
    ? path.join(__dirname, "..", ".next", "standalone", "server.js")
    : path.join(process.resourcesPath, "app.asar.unpacked", ".next", "standalone", "server.js");

  if (!fs.existsSync(serverEntry)) {
    dialog.showErrorBox(
      "IMEI Intel — Error",
      `No se encontró el servidor en:\n${serverEntry}\n\nEjecuta "npm run build" antes de arrancar Electron.`
    );
    app.quit();
    return null;
  }

  serverProcess = spawn(process.execPath, [serverEntry], {
    env,
    cwd: path.dirname(serverEntry),
    stdio: "pipe",
    windowsHide: true,
  });

  serverProcess.stdout.on("data", (d) => process.stdout.write(`[next] ${d}`));
  serverProcess.stderr.on("data", (d) => process.stderr.write(`[next] ${d}`));
  serverProcess.on("exit", (code) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      dialog.showErrorBox(
        "IMEI Intel",
        `El servidor interno se detuvo (código ${code}). La aplicación se cerrará.`
      );
    }
    app.quit();
  });

  const url = `http://127.0.0.1:${port}`;
  await waitForServer(url);
  return url;
}

function stopServer() {
  if (!serverProcess) return;
  try {
    if (process.platform === "win32") {
      // Hard kill the whole process tree on Windows.
      spawn("taskkill", ["/pid", String(serverProcess.pid), "/T", "/F"]);
    } else {
      serverProcess.kill("SIGTERM");
    }
  } catch {}
  serverProcess = null;
}

function buildMenu() {
  const template = [
    {
      label: "Archivo",
      submenu: [
        { label: "Recargar", role: "reload" },
        { type: "separator" },
        { label: "Salir", role: "quit" },
      ],
    },
    {
      label: "Editar",
      submenu: [
        { label: "Deshacer", role: "undo" },
        { label: "Rehacer", role: "redo" },
        { type: "separator" },
        { label: "Cortar", role: "cut" },
        { label: "Copiar", role: "copy" },
        { label: "Pegar", role: "paste" },
        { label: "Seleccionar todo", role: "selectAll" },
      ],
    },
    {
      label: "Ver",
      submenu: [
        { label: "Pantalla completa", role: "togglefullscreen" },
        { label: "Acercar", role: "zoomIn" },
        { label: "Alejar", role: "zoomOut" },
        { label: "Tamaño normal", role: "resetZoom" },
      ],
    },
    {
      label: "Ayuda",
      submenu: [
        {
          label: "Carpeta de datos",
          click: () => shell.openPath(app.getPath("userData")),
        },
        {
          label: "Acerca de IMEI Intel",
          click: () =>
            dialog.showMessageBox({
              type: "info",
              title: "IMEI Intel",
              message: "IMEI Intel",
              detail: `Validador local de IMEI / ICCID con detección de duplicados y lista negra.\n\nDatos guardados en:\n${app.getPath("userData")}`,
            }),
        },
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    backgroundColor: "#f1f5f9",
    autoHideMenuBar: false,
    webPreferences: {
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
    },
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("http")) {
      shell.openExternal(url);
      return { action: "deny" };
    }
    return { action: "allow" };
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  try {
    serverUrl = await startServer();
    if (serverUrl) await mainWindow.loadURL(serverUrl);
  } catch (err) {
    dialog.showErrorBox("IMEI Intel — Error", `No se pudo iniciar el servidor:\n${err.message}`);
    app.quit();
  }
}

app.whenReady().then(() => {
  buildMenu();
  void createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) void createWindow();
  });
});

app.on("window-all-closed", () => {
  stopServer();
  if (process.platform !== "darwin") app.quit();
});

app.on("before-quit", stopServer);
app.on("will-quit", stopServer);
