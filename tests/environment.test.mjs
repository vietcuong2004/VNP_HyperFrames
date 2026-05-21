import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";

import { inspectEnvironment } from "../desktop_app/environment.mjs";

test("inspectEnvironment reports required desktop runtime commands", async () => {
  const calls = [];
  const result = await inspectEnvironment({
    appRoot: "C:/definitely-no-local-hyperframes",
    commandExists: async (name) => {
      calls.push(name);
      return name !== "ffprobe";
    },
    canWriteWorkspace: async () => true,
  });

  assert.deepEqual(calls.sort(), ["ffmpeg", "ffprobe", process.platform === "win32" ? "hyperframes.cmd" : "hyperframes", "node"].sort());
  assert.equal(result.ok, true);
  assert.deepEqual(
    result.checks.map((check) => [check.id, check.ok]),
    [
      ["node", true],
      ["ffmpeg", true],
      ["ffprobe", false],
      ["hyperframes", true],
      ["workspace", true],
    ],
  );
});

test("inspectEnvironment accepts bundled Node and FFmpeg in packaged mode", async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "runtime-binaries-"));
  const ffmpegPath = path.join(tempDir, process.platform === "win32" ? "ffmpeg.exe" : "ffmpeg");
  const ffprobePath = path.join(tempDir, process.platform === "win32" ? "ffprobe.exe" : "ffprobe");
  fs.writeFileSync(ffmpegPath, "");
  fs.writeFileSync(ffprobePath, "");

  const result = await inspectEnvironment({
    appRoot: "C:/definitely-no-local-hyperframes",
    isPackaged: true,
    env: {
      FFMPEG_PATH: ffmpegPath,
      FFPROBE_PATH: ffprobePath,
    },
    commandExists: async (name) => name === (process.platform === "win32" ? "hyperframes.cmd" : "hyperframes"),
    canWriteWorkspace: async () => true,
  });

  assert.equal(result.ok, true);
  assert.deepEqual(
    result.checks.filter((check) => ["node", "ffmpeg", "ffprobe"].includes(check.id)).map((check) => [check.id, check.ok, check.source]),
    [
      ["node", true, "bundled"],
      ["ffmpeg", true, "bundled"],
      ["ffprobe", true, "bundled"],
    ],
  );

  fs.rmSync(tempDir, { recursive: true, force: true });
});
