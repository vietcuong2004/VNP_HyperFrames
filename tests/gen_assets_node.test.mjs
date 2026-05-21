import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";

import { addGeneratedAssets, buildTranscript, formatError, runWithRetries } from "../pipeline/gen_assets.mjs";

test("buildTranscript spreads words across the effective text duration", () => {
  const transcript = buildTranscript("xin chào bạn", 0.5, 3);

  assert.deepEqual(transcript, [
    { text: "xin", start: 0.5, end: 1.35 },
    { text: "chào", start: 1.35, end: 2.2 },
    { text: "bạn", start: 2.2, end: 3.05 },
  ]);
});

test("addGeneratedAssets writes scene audio metadata without Python", async () => {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), "hf-assets-"));
  try {
    const data = {
      scenes: [{ voice: "xin chào" }, { voice: "tạm biệt" }],
    };

    const result = await addGeneratedAssets(data, {
      audioDir: path.join(tempRoot, "assets", "audio"),
      filePrefix: "sample-video",
      generateAudio: async (_text, outputPath) => outputPath,
      speedUpAudio: async () => {},
      getAudioDuration: async (audioPath) => (audioPath.includes("scene_1") ? 2 : 4),
      pauseBetweenScenes: 1.2,
    });

    assert.equal(result.duration, 10);
    assert.equal(result.scenes[0].audio_start, 0.5);
    assert.equal(result.scenes[0].audio_duration, 2);
    assert.equal(result.scenes[0].audio_path, "assets/audio/sample-video_scene_1.mp3");
    assert.equal(result.scenes[1].audio_start, 3.7);
    assert.equal(result.scenes[1].audio_duration, 4);
    assert.equal(result.scenes[1].audio_path, "assets/audio/sample-video_scene_2.mp3");
    assert.equal(result.scenes[1].transcript.length, 2);
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
});

test("formatError does not hide empty thrown values as undefined", () => {
  assert.equal(formatError(undefined), "Unknown error");
  assert.equal(formatError({ code: "ECONNRESET" }), '{"code":"ECONNRESET"}');
  assert.equal(formatError(new Error("network failed")), "network failed");
});

test("runWithRetries retries transient failures before succeeding", async () => {
  let attempts = 0;
  const result = await runWithRetries(
    async () => {
      attempts += 1;
      if (attempts < 3) throw new Error("temporary");
      return "ok";
    },
    { attempts: 3, delayMs: 1, label: "tts" },
  );

  assert.equal(result, "ok");
  assert.equal(attempts, 3);
});
