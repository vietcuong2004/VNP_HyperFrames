import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";

import {
  buildRuntimeEnv,
  hasAiApiKey,
  loadAppBundledEnv,
  loadWorkspaceEnv,
  parseDotEnv,
  saveWorkspaceEnv,
} from "./settings.mjs";

test("parseDotEnv reads quoted values and ignores comments", () => {
  const env = parseDotEnv(`
    # comment
    OPENAI_API_KEY="dummy-openai-key"
    OPENROUTER_API_KEY='dummy-openrouter-key'
    TROLLLLM_API_KEY='dummy-troll-key'
    EMPTY=
  `);

  assert.deepEqual(env, {
    OPENAI_API_KEY: "dummy-openai-key",
    OPENROUTER_API_KEY: "dummy-openrouter-key",
    TROLLLLM_API_KEY: "dummy-troll-key",
    EMPTY: "",
  });
});

test("saveWorkspaceEnv stores API keys in workspace .env without echoing missing values", async () => {
  const workspaceRoot = await mkdtemp(path.join(os.tmpdir(), "hf-settings-"));
  try {
    await saveWorkspaceEnv(workspaceRoot, {
      openaiApiKey: "dummy-openai",
      openrouterApiKey: "",
      trollllmApiKey: "dummy-troll",
      tavilyApiKey: "tvly-test",
    });

    const text = await readFile(path.join(workspaceRoot, ".env"), "utf-8");
    assert.match(text, /OPENAI_API_KEY=dummy-openai/);
    assert.doesNotMatch(text, /OPENROUTER_API_KEY/);
    assert.match(text, /TROLLLLM_API_KEY=dummy-troll/);
    assert.match(text, /TAVILY_API_KEY=tvly-test/);

    const env = await loadWorkspaceEnv(workspaceRoot);
    assert.equal(env.OPENAI_API_KEY, "dummy-openai");
    assert.equal(env.TROLLLLM_API_KEY, "dummy-troll");
    assert.equal(env.TAVILY_API_KEY, "tvly-test");
  } finally {
    await rm(workspaceRoot, { recursive: true, force: true });
  }
});

test("buildRuntimeEnv uses app bundled keys while still allowing workspace override", () => {
  const env = buildRuntimeEnv({
    baseEnv: { OPENAI_API_KEY: "old", PATH: "C:\\Windows" },
    appEnv: { OPENAI_API_KEY: "bundled", OPENROUTER_API_KEY: "dummy-openrouter-bundled", TROLLLLM_API_KEY: "dummy-troll-bundled" },
    workspaceEnv: { OPENAI_API_KEY: "new" },
  });

  assert.equal(env.OPENAI_API_KEY, "new");
  assert.equal(env.OPENROUTER_API_KEY, "dummy-openrouter-bundled");
  assert.equal(env.TROLLLLM_API_KEY, "dummy-troll-bundled");
  assert.equal(env.PATH, "C:\\Windows");
  assert.equal(hasAiApiKey(env), true);
});

test("hasAiApiKey accepts TROLLLLM fallback key", () => {
  assert.equal(hasAiApiKey({ TROLLLLM_API_KEY: "dummy-troll" }), true);
});

test("loadAppBundledEnv reads env from desktop_app inside the packaged app root", async () => {
  const appRoot = await mkdtemp(path.join(os.tmpdir(), "hf-app-env-"));
  try {
    const desktopDir = path.join(appRoot, "desktop_app");
    await import("node:fs/promises").then((fs) => fs.mkdir(desktopDir, { recursive: true }));
    await import("node:fs/promises").then((fs) =>
      fs.writeFile(path.join(desktopDir, "app.env"), "OPENAI_API_KEY=dummy-bundled\n", "utf-8"),
    );

    const env = await loadAppBundledEnv(appRoot);
    assert.equal(env.OPENAI_API_KEY, "dummy-bundled");
  } finally {
    await rm(appRoot, { recursive: true, force: true });
  }
});
