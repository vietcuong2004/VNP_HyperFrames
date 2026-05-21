import assert from "node:assert/strict";
import path from "node:path";
import { test } from "node:test";

import { buildBundledBinaryEnv, createNodeScriptCommand } from "../pipeline/runtime_binaries.mjs";

test("createNodeScriptCommand uses system node in development", () => {
  const result = createNodeScriptCommand({
    scriptPath: "pipeline/run_pipeline.js",
    args: ["https://example.com"],
    isPackaged: false,
    nodePath: "C:\\Program Files\\nodejs\\node.exe",
    electronPath: "C:\\App\\VNP HyperFrames.exe",
  });

  assert.equal(result.command, "C:\\Program Files\\nodejs\\node.exe");
  assert.deepEqual(result.args, ["pipeline/run_pipeline.js", "https://example.com"]);
  assert.equal(result.env.ELECTRON_RUN_AS_NODE, undefined);
});

test("createNodeScriptCommand uses bundled Node in packaged mode", () => {
  const result = createNodeScriptCommand({
    scriptPath: "pipeline/run_pipeline.js",
    args: ["https://example.com"],
    isPackaged: true,
    nodePath: "node",
    bundledNodePath: "C:\\App\\resources\\app\\node_modules\\node\\bin\\node.exe",
    electronPath: "C:\\App\\VNP HyperFrames.exe",
  });

  assert.equal(result.command, "C:\\App\\resources\\app\\node_modules\\node\\bin\\node.exe");
  assert.deepEqual(result.args, ["pipeline/run_pipeline.js", "https://example.com"]);
  assert.equal(result.env.ELECTRON_RUN_AS_NODE, undefined);
});

test("buildBundledBinaryEnv prepends binary directories to PATH", () => {
  const env = buildBundledBinaryEnv({
    baseEnv: { PATH: "C:\\Windows" },
    nodePath: "C:\\app\\node\\bin\\node.exe",
    ffmpegPath: "C:\\app\\bin\\ffmpeg.exe",
    ffprobePath: "C:\\app\\tools\\ffprobe.exe",
    delimiter: ";",
  });

  assert.equal(env.FFMPEG_PATH, "C:\\app\\bin\\ffmpeg.exe");
  assert.equal(env.FFPROBE_PATH, "C:\\app\\tools\\ffprobe.exe");
  assert.equal(env.PATH, ["C:\\app\\node\\bin", "C:\\app\\bin", "C:\\app\\tools", "C:\\Windows"].join(";"));
});
