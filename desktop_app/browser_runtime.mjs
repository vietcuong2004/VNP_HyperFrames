import fs from "fs";
import path from "path";

const DEFAULT_BROWSER = "chrome";

function fileExists(filePath) {
  return Boolean(filePath && fs.existsSync(filePath));
}

function resolveCacheDir(workspaceRoot) {
  return path.join(path.resolve(workspaceRoot), ".puppeteer-cache");
}

function getBrowserExecutable(browser) {
  if (!browser) return null;
  if (typeof browser.executablePath === "string") return browser.executablePath;
  if (typeof browser.executablePath === "function") return browser.executablePath();
  return null;
}

async function defaultGetInstalledBrowsers(cacheDir) {
  const { getInstalledBrowsers } = await import("@puppeteer/browsers");
  return getInstalledBrowsers({ cacheDir });
}

async function defaultInstallBrowser({ cacheDir, onProgress }) {
  const { Browser, install } = await import("@puppeteer/browsers");
  const { PUPPETEER_REVISIONS } = await import("puppeteer-core/internal/revisions.js");
  return await install({
    browser: Browser.CHROME,
    buildId: PUPPETEER_REVISIONS.chrome,
    cacheDir,
    buildIdAlias: "pinned",
    downloadProgressCallback: onProgress,
  });
}

export function buildPuppeteerEnv(options = {}) {
  const env = { ...(options.baseEnv ?? process.env) };
  const workspaceRoot = options.workspaceRoot ?? process.cwd();
  const cacheDir = options.cacheDir ?? resolveCacheDir(workspaceRoot);

  env.PUPPETEER_CACHE_DIR = cacheDir;
  if (options.browserExecutablePath) {
    env.PUPPETEER_EXECUTABLE_PATH = options.browserExecutablePath;
  }

  return env;
}

export async function findUsableBrowserExecutable(options = {}) {
  const cacheDir = options.cacheDir ?? resolveCacheDir(options.workspaceRoot ?? process.cwd());
  const env = options.env ?? process.env;
  const explicitPath = env.PUPPETEER_EXECUTABLE_PATH;
  if (fileExists(explicitPath)) {
    return { executablePath: explicitPath, source: "env", installed: false };
  }

  const getInstalled = options.getInstalledBrowsers ?? defaultGetInstalledBrowsers;
  const installedBrowsers = await getInstalled(cacheDir);
  const installedChrome = installedBrowsers.find((browser) => String(browser.browser) === DEFAULT_BROWSER) ?? installedBrowsers[0];
  const installedPath = getBrowserExecutable(installedChrome);
  if (fileExists(installedPath)) {
    return { executablePath: installedPath, source: "cache", installed: false };
  }

  if (!options.installIfMissing) {
    return { executablePath: null, source: "missing", installed: false };
  }

  fs.mkdirSync(cacheDir, { recursive: true });
  const installBrowser = options.installBrowser ?? defaultInstallBrowser;
  const browser = await installBrowser({ cacheDir, onProgress: options.onProgress });
  const executablePath = getBrowserExecutable(browser);
  if (!fileExists(executablePath)) {
    throw new Error("Puppeteer browser install finished but no executable was found.");
  }

  return { executablePath, source: "installed", installed: true };
}

export function createBrowserRuntimeState(options = {}) {
  const workspaceRoot = options.workspaceRoot ?? process.cwd();
  const cacheDir = options.cacheDir ?? resolveCacheDir(workspaceRoot);
  const installIfMissing = Boolean(options.installIfMissing ?? options.isPackaged);
  const env = buildPuppeteerEnv({
    baseEnv: options.baseEnv,
    workspaceRoot,
    cacheDir,
    browserExecutablePath: options.browserExecutablePath,
  });
  let readyPromise = null;

  async function ensureReady() {
    if (!readyPromise) {
      readyPromise = findUsableBrowserExecutable({
        cacheDir,
        env,
        installIfMissing,
        getInstalledBrowsers: options.getInstalledBrowsers,
        installBrowser: options.installBrowser,
        onProgress: options.onProgress,
      }).then((result) => {
        if (result.executablePath) {
          env.PUPPETEER_EXECUTABLE_PATH = result.executablePath;
        }
        return result;
      });
    }
    return readyPromise;
  }

  return {
    cacheDir,
    env,
    ensureReady,
  };
}
