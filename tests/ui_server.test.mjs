import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { startServer } from "../desktop_app/ui_server.js";

test("startServer starts on an available port and serves the desktop prototype", async () => {
  const tempWorkspace = await mkdtemp(path.join(os.tmpdir(), "hf-server-test-"));
  const instance = await startServer({
    rootDir: process.cwd(),
    workspaceDir: tempWorkspace,
    port: 0,
    host: "127.0.0.1",
  });

  try {
    assert.match(instance.url, /^http:\/\/127\.0\.0\.1:\d+$/);

    const homeResponse = await fetch(instance.url);
    assert.equal(homeResponse.status, 200);
    const html = await homeResponse.text();
    assert.match(html, /VNP HyperFrames/);

    const recentResponse = await fetch(`${instance.url}/api/recent-videos`);
    assert.equal(recentResponse.status, 200);
    const recentVideos = await recentResponse.json();
    assert.equal(Array.isArray(recentVideos), true);
    for (const video of recentVideos) {
      assert.equal(typeof video.name, "string");
      assert.match(video.name, /\.mp4$/);
      assert.equal(video.url, `/renders/${video.name}`);
    }

    const environmentResponse = await fetch(`${instance.url}/api/environment`);
    assert.equal(environmentResponse.status, 200);
    const environment = await environmentResponse.json();
    assert.equal(Array.isArray(environment.checks), true);
    assert.equal(typeof environment.workspaceRoot, "string");
  } finally {
    await instance.close();
    await rm(tempWorkspace, { recursive: true, force: true });
  }
});

test("GET and POST /api/settings handles loading and saving settings", async () => {
  const tempWorkspace = await mkdtemp(path.join(os.tmpdir(), "hf-settings-test-"));
  const instance = await startServer({
    rootDir: process.cwd(),
    workspaceDir: tempWorkspace,
    port: 0,
    host: "127.0.0.1",
  });

  try {
    const postRes = await fetch(`${instance.url}/api/settings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        openaiApiKey: "test-openai-key",
        openrouterApiKey: "test-openrouter-key",
        tavilyApiKey: "test-tavily-key",
        larvoiceApiKey: "test-larvoice-key",
        larvoiceVoiceId: "2",
      }),
    });
    assert.equal(postRes.status, 200);
    const postData = await postRes.json();
    assert.equal(postData.success, true);

    const getUpdatedRes = await fetch(`${instance.url}/api/settings`);
    assert.equal(getUpdatedRes.status, 200);
    const updatedSettings = await getUpdatedRes.json();
    assert.equal(updatedSettings.openaiApiKey, "test-openai-key");
    assert.equal(updatedSettings.openrouterApiKey, "test-openrouter-key");
    assert.equal(updatedSettings.tavilyApiKey, "test-tavily-key");
    assert.equal(updatedSettings.larvoiceApiKey, "test-larvoice-key");
    assert.equal(updatedSettings.larvoiceVoiceId, "2");
  } finally {
    await instance.close();
    await rm(tempWorkspace, { recursive: true, force: true });
  }
});
