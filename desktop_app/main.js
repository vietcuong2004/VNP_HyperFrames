import { createRequire } from "module";
import path from "path";
import { createBrowserRuntimeState } from "./browser_runtime.mjs";
import { buildBundledBinaryEnv, resolveBundledBinaryPaths } from "./runtime_binaries.mjs";
import { buildRuntimeEnv, loadAppBundledEnv, loadWorkspaceEnv } from "./settings.mjs";
import { startServer } from "./ui_server.js";

const require = createRequire(import.meta.url);
const electron = require("electron");
const { app, BrowserWindow, shell } = electron;

let mainWindow = null;
let serverInstance = null;

function hasArg(name) {
  const normalized = name.startsWith("--") ? name : `--${name}`;
  return process.argv.includes(normalized);
}

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
  const appEnv = await loadAppBundledEnv(appRoot);
  const workspaceEnv = await loadWorkspaceEnv(workspaceRoot);
  const browserRuntime = createBrowserRuntimeState({
    workspaceRoot,
    isPackaged: app.isPackaged,
    installIfMissing: true,
  });

  const runtimeEnv = buildBundledBinaryEnv({
    baseEnv: buildRuntimeEnv({
      baseEnv: {
        ...process.env,
        ...browserRuntime.env,
      },
      appEnv,
      workspaceEnv,
    }),
    ...bundledBinaries,
  });

  serverInstance = await startServer({
    rootDir: appRoot,
    workspaceDir: workspaceRoot,
    runtimeEnv,
    isPackaged: app.isPackaged,
    nodePath: bundledBinaries.nodePath ?? process.execPath,
    electronPath: process.execPath,
    browserRuntime,
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

async function runSmokeTest() {
  const appRoot = getAppRoot();
  const workspaceRoot = path.join(app.getPath("temp"), "vnp-hyperframes-smoke-workspace");
  const bundledBinaries = await resolveBundledBinaryPaths({ appRoot });
  const appEnv = await loadAppBundledEnv(appRoot);
  const workspaceEnv = await loadWorkspaceEnv(workspaceRoot);
  const browserRuntime = createBrowserRuntimeState({
    workspaceRoot,
    isPackaged: app.isPackaged,
    installIfMissing: false,
  });
  const runtimeEnv = buildBundledBinaryEnv({
    baseEnv: buildRuntimeEnv({
      baseEnv: {
        ...process.env,
        ...browserRuntime.env,
      },
      appEnv,
      workspaceEnv,
    }),
    ...bundledBinaries,
  });

  const instance = await startServer({
    rootDir: appRoot,
    workspaceDir: workspaceRoot,
    runtimeEnv,
    isPackaged: app.isPackaged,
    nodePath: bundledBinaries.nodePath ?? process.execPath,
    electronPath: process.execPath,
    browserRuntime,
    port: 0,
    host: "127.0.0.1",
  });

  try {
    const response = await fetch(instance.url);
    if (!response.ok) {
      throw new Error(`Smoke test HTTP ${response.status}`);
    }
    console.log(`Desktop smoke test OK: ${instance.url}`);
  } finally {
    await instance.close();
  }
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

  app.whenReady().then(async () => {
    if (hasArg("--desktop-smoke-test")) {
      await runSmokeTest();
      app.quit();
      return;
    }
    await createMainWindow();
  }).catch((error) => {
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
