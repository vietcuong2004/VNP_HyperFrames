import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import { shouldUseLarVoice } from "../agents/ttsAgent.js";

test("shouldUseLarVoice selects LarVoice when a key is configured", () => {
  assert.equal(shouldUseLarVoice({ larvoiceKey: "lv-key" }), true);
  assert.equal(shouldUseLarVoice({ larvoiceKeys: ["lv-key-1", "lv-key-2"] }), true);
});

test("shouldUseLarVoice allows explicit Edge TTS override", () => {
  assert.equal(shouldUseLarVoice({ larvoiceKey: "lv-key", useLarVoice: false }), false);
  assert.equal(shouldUseLarVoice({ useLarVoice: true }), true);
  assert.equal(shouldUseLarVoice({}), false);
});

test("generateTTS routes Edge fallback through the Node implementation", () => {
  const source = readFileSync(new URL("../agents/ttsAgent.js", import.meta.url), "utf8");
  assert.match(source, /return generateTTS_EdgeTTS_Node\(text, outputPath, onLog, keys\)/);
});
