import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";

import { createWorkspacePaths, ensureWorkspace } from "../pipeline/workspace.mjs";

test("createWorkspacePaths keeps resources separate from runtime output", () => {
  const appRoot = path.resolve("app-root");
  const workspaceRoot = path.resolve("user-workspace");
  const paths = createWorkspacePaths({ appRoot, workspaceRoot });

  assert.equal(paths.appRoot, appRoot);
  assert.equal(paths.workspaceRoot, workspaceRoot);
  assert.equal(paths.publicDir, path.join(appRoot, "public"));
  assert.equal(paths.templatesDir, path.join(appRoot, "templates"));
  assert.equal(paths.dataDir, path.join(workspaceRoot, "data"));
  assert.equal(paths.audioDir, path.join(workspaceRoot, "assets", "audio"));
  assert.equal(paths.imageDir, path.join(workspaceRoot, "assets", "images"));
  assert.equal(paths.rendersDir, path.join(workspaceRoot, "renders"));
  assert.equal(paths.logsDir, path.join(workspaceRoot, "logs"));
  assert.equal(paths.compositionPath, path.join(workspaceRoot, "index.html"));
});

test("ensureWorkspace creates runtime output directories", async () => {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), "hf-workspace-"));
  try {
    const paths = createWorkspacePaths({
      appRoot: process.cwd(),
      workspaceRoot: tempRoot,
    });

    await ensureWorkspace(paths);

    const expectedDirs = [
      paths.dataDir,
      paths.audioDir,
      paths.imageDir,
      paths.rendersDir,
      paths.logsDir,
    ];

    for (const dir of expectedDirs) {
      const stat = await import("node:fs/promises").then((fs) => fs.stat(dir));
      assert.equal(stat.isDirectory(), true);
    }
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
});
