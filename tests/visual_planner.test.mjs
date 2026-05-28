import assert from "node:assert/strict";
import { test } from "node:test";

import {
  buildVisualCopyBlock,
  createVisualBrief,
  validateVisualBrief,
} from "../agents/scene/visualPlanner.js";
import { deriveFallbackSceneContent } from "../pipeline/localFallbackGenerator.js";

test("createVisualBrief derives meaningful RTK copy without explicit visual text", () => {
  const scene = {
    stt: 1,
    source_url: "https://github.com/rtk-ai/rtk",
    voice:
      "RTK la mot CLI proxy viet bang Rust, dung giua terminal va AI assistant de giam token bill.",
    visual: "[MAIN FOCUS] Terminal proxy diagram. [MOTION] token packets move through cache.",
  };

  const brief = createVisualBrief(scene);

  assert.equal(brief.main_subject, "RTK");
  assert.match(brief.primary_text, /RTK/i);
  assert.doesNotMatch(brief.primary_text, /^scene\s*\d+$/i);
  assert.doesNotMatch(brief.primary_text, /^html$/i);
  assert.ok(brief.secondary_labels.some((label) => /proxy|rust|token|cache/i.test(label)));
  assert.deepEqual(validateVisualBrief(brief, scene).errors, []);
});

test("validateVisualBrief rejects generic central copy", () => {
  const scene = {
    voice: "RTK la CLI proxy viet bang Rust.",
    visual: "[TEXT] 'HTML'",
    source_url: "https://github.com/rtk-ai/rtk",
  };

  const result = validateVisualBrief(
    {
      main_subject: "RTK",
      primary_text: "HTML",
      secondary_labels: ["Scene 1", "Focus"],
      layout_intent: "feature_cards",
    },
    scene,
  );

  assert.ok(result.errors.includes("generic primary_text"));
  assert.ok(result.errors.includes("generic secondary_labels"));
});

test("buildVisualCopyBlock uses validated brief fields", () => {
  const brief = createVisualBrief({
    source_url: "https://github.com/rtk-ai/rtk",
    voice: "RTK la CLI proxy viet bang Rust.",
    visual: "[TEXT] 'RTK PROXY'",
  });

  const block = buildVisualCopyBlock(brief);

  assert.match(block, /PRIMARY_TEXT: RTK PROXY/);
  assert.match(block, /LAYOUT_INTENT:/);
  assert.doesNotMatch(block, /Scene 1/);
});

test("fallback scene content prefers visual_brief over generic scene labels", () => {
  const scene = {
    stt: 1,
    voice: "RTK la CLI proxy viet bang Rust.",
    visual: "[MAIN FOCUS] Terminal diagram.",
    visual_brief: createVisualBrief({
      source_url: "https://github.com/rtk-ai/rtk",
      voice: "RTK la CLI proxy viet bang Rust.",
      visual: "[MAIN FOCUS] Terminal diagram.",
    }),
  };

  const content = deriveFallbackSceneContent(scene);

  assert.match(content.title, /RTK/);
  assert.notEqual(content.title, "SCENE 1");
  assert.notEqual(content.title, "HTML");
});

test("visual brief facts do not expose art direction prose", () => {
  const brief = createVisualBrief({
    source_url: "https://github.com/rtk-ai/rtk",
    voice: "RTK la CLI proxy viet bang Rust.",
    visual:
      "[ENVIRONMENT] Gradient xanh đen tối, 3 lớp depth. [MAIN FOCUS] Terminal proxy diagram. [TEXT] 'RTK PROXY'. [MOTION] token packets move through cache.",
  });

  assert.match(brief.primary_text, /RTK PROXY|RTK/i);
  assert.doesNotMatch(brief.facts.join(" "), /Gradient xanh|3 lớp depth|ENVIRONMENT|MAIN FOCUS|MOTION/i);
});
