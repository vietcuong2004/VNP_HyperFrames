import assert from "node:assert/strict";
import { test } from "node:test";

import { startServer } from "../pipeline/ui_server.js";

test("startServer starts on an available port and serves the desktop prototype", async () => {
  const instance = await startServer({
    rootDir: process.cwd(),
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
  }
});
