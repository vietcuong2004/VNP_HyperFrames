import assert from "node:assert/strict";
import fs from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";

import {
  buildPuppeteerEnv,
  createBrowserRuntimeState,
  findUsableBrowserExecutable,
} from "./browser_runtime.mjs";

test("buildPuppeteerEnv keeps browser cache in the writable workspace", () => {
  const env = buildPuppeteerEnv({
    baseEnv: { PATH: "C:\\Windows" },
    workspaceRoot: "C:\\Users\\Tester\\AppData\\Roaming\\VNP HyperFrames\\workspace",
    browserExecutablePath: "C:\\Chrome\\chrome.exe",
  });

  assert.equal(
    env.PUPPETEER_CACHE_DIR,
    "C:\\Users\\Tester\\AppData\\Roaming\\VNP HyperFrames\\workspace\\.puppeteer-cache",
  );
  assert.equal(env.PUPPETEER_EXECUTABLE_PATH, "C:\\Chrome\\chrome.exe");
  assert.equal(env.PUPPETEER_SKIP_DOWNLOAD, undefined);
});

test("findUsableBrowserExecutable prefers explicit executable paths", async () => {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), "hf-browser-runtime-"));
  try {
    const browserPath = path.join(tempRoot, process.platform === "win32" ? "chrome.exe" : "chrome");
    fs.writeFileSync(browserPath, "");

    const result = await findUsableBrowserExecutable({
      cacheDir: path.join(tempRoot, "cache"),
      env: { PUPPETEER_EXECUTABLE_PATH: browserPath },
      getInstalledBrowsers: async () => [],
      installBrowser: async () => {
        throw new Error("should not install when explicit browser exists");
      },
    });

    assert.equal(result.executablePath, browserPath);
    assert.equal(result.source, "env");
    assert.equal(result.installed, false);
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
});

test("createBrowserRuntimeState installs into cache when packaged browser is missing", async () => {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), "hf-browser-runtime-"));
  try {
    let installedBrowserPath = null;
    const state = createBrowserRuntimeState({
      workspaceRoot: tempRoot,
      isPackaged: true,
      getInstalledBrowsers: async () => [],
      installBrowser: async ({ cacheDir }) => {
        installedBrowserPath = path.join(cacheDir, process.platform === "win32" ? "chrome.exe" : "chrome");
        fs.mkdirSync(cacheDir, { recursive: true });
        fs.writeFileSync(installedBrowserPath, "");
        return { executablePath: installedBrowserPath };
      },
    });

    const result = await state.ensureReady();

    assert.equal(result.executablePath, installedBrowserPath);
    assert.equal(result.source, "installed");
    assert.equal(result.installed, true);
    assert.equal(state.env.PUPPETEER_EXECUTABLE_PATH, installedBrowserPath);
    assert.equal(state.env.PUPPETEER_CACHE_DIR, path.join(tempRoot, ".puppeteer-cache"));
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
});
