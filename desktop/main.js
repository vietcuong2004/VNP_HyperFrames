import { app, BrowserWindow, shell } from "electron";
import path from "path";
import { buildBundledBinaryEnv, resolveBundledBinaryPaths } from "../pipeline/runtime_binaries.mjs";
import { startServer } from "../pipeline/ui_server.js";

let mainWindow = null;
let serverInstance = null;

function getAppRoot() {
  return app.getAppPath();
}

function getWorkspaceRoot() {
  return path.join(app.getPath("userData"), "workspace");
}

async function createMainWindow() {
  const appRoot = getAppRoot();
  const workspaceRoot = getWorkspaceRoot();
  const bundledBinaries = await resolveBundledBinaryPaths({ appRoot });
  const runtimeEnv = buildBundledBinaryEnv({
    baseEnv: {
      ...process.env,
      PUPPETEER_CACHE_DIR: path.join(appRoot, ".puppeteer-cache"),
    },
    ...bundledBinaries,
  });

  serverInstance = await startServer({
    rootDir: appRoot,
    workspaceDir: workspaceRoot,
    runtimeEnv,
    isPackaged: app.isPackaged,
    nodePath: bundledBinaries.nodePath ?? process.execPath,
    electronPath: process.execPath,
    port: 0,
    host: "127.0.0.1",
  });

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 1040,
    minHeight: 700,
    title: "VNP HyperFrames",
    backgroundColor: "#0d1117",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  await mainWindow.loadURL(serverInstance.url);
}

async function shutdownServer() {
  if (!serverInstance) return;
  const instance = serverInstance;
  serverInstance = null;
  await instance.close();
}

const hasLock = app.requestSingleInstanceLock();

if (!hasLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (!mainWindow) return;
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  });

  app.whenReady().then(createMainWindow).catch((error) => {
    console.error("Failed to start desktop app:", error);
    app.quit();
  });

  app.on("window-all-closed", async () => {
    await shutdownServer();
    if (process.platform !== "darwin") app.quit();
  });

  app.on("before-quit", async (event) => {
    if (!serverInstance) return;
    event.preventDefault();
    await shutdownServer();
    app.quit();
  });

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow().catch((error) => {
        console.error("Failed to recreate desktop window:", error);
      });
    }
  });
}
