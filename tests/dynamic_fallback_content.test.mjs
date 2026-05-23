import assert from "node:assert/strict";
import { test } from "node:test";

import {
  containsForbiddenFallbackCopy,
  deriveFallbackSceneContent,
  generateLocalFallbackHTML,
} from "../pipeline/localFallbackGenerator.js";
import { autoFixSceneHTML, containsVoiceLeak, validateSceneHTML } from "../agents/scene/htmlValidator.js";
import { deriveSceneDisplayCopy } from "../agents/scene/generate.js";
import { evaluateSceneHtmlRequirements } from "../pipeline/run_agent_pipeline.js";

const forbiddenCopy = [
  "OPEN SOURCE ENGINE",
  "Write HTML. Render Video. Built for Agents.",
  "Automated Screenshots",
  "Infinite Possibilities",
  "GET STARTED",
  "Start Generating Today",
];

test("deriveFallbackSceneContent creates context-aware short labels from scene data", () => {
  const content = deriveFallbackSceneContent({
    stt: 1,
    voice: "PostgreSQL là image chính thức để dựng database nhanh trong Docker.",
    visual:
      "[MAIN FOCUS] Logo PostgreSQL và container database center. [TEXT] 'PostgreSQL Docker' bold. [MOOD] clean, premium.",
  });

  assert.equal(content.title, "POSTGRESQL DOCKER");
  assert.equal(content.label, "SCENE 01");
  assert.match(content.subtitle, /database|docker/i);
  assert.ok(content.cards.length >= 3);
});

test("local fallback does not render old hardcoded HyperFrames titles", () => {
  const html = generateLocalFallbackHTML({
    scene: {
      stt: 3,
      voice: "PostgreSQL official image giúp bạn dựng môi trường database ổn định trong vài lệnh Docker.",
      visual:
        "[MAIN FOCUS] PostgreSQL database cylinder center, docker container ring orbit. [TEXT] 'POSTGRESQL IMAGE'. [MOTION] cards orbit, data pulses.",
    },
    projectAssets: [],
    audioDurationMs: 8000,
  });

  for (const phrase of forbiddenCopy) {
    assert.doesNotMatch(html, new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"));
  }
  assert.match(html, /POSTGRESQL IMAGE|POSTGRESQL/i);
});

test("containsForbiddenFallbackCopy catches stale fallback phrases", () => {
  assert.equal(containsForbiddenFallbackCopy("<h1>Infinite Possibilities</h1>"), true);
  assert.equal(containsForbiddenFallbackCopy("<h1>POSTGRESQL IMAGE</h1>"), false);
});

test("scene requirement guard does not force fallback only because captions are absent", () => {
  const html = [
    '<!DOCTYPE html><html><body>',
    '<img src="./assets/logo/shiba.png">',
    '<div class="hero">POSTGRESQL IMAGE</div>',
    '</body></html>',
  ].join('');

  const result = evaluateSceneHtmlRequirements(
    { stt: 1, voice: "PostgreSQL image", visual: "Database animation" },
    [{ name: "shiba.png", fileUrl: "../assets/logo/shiba.png" }],
    html,
  );

  assert.equal(result.ok, true);
  assert.deepEqual(result.missing, []);
});

test("local fallback keeps long voice narration out of central scene copy", () => {
  const scene = {
    stt: 3,
    voice:
      "RTK la CLI proxy thong minh viet bang Rust, dung giua terminal va AI assistant de giam token bill.",
    visual:
      "[MAIN FOCUS] Terminal proxy diagram, Rust binary in center, token meter drops. [TEXT] 'TOKEN CUT 60-90%'. [MOTION] packets compress into cache.",
  };

  const html = generateLocalFallbackHTML({
    scene,
    projectAssets: [],
    audioDurationMs: 8000,
  });

  const centralHtml = html.split("<!-- Subtitles Bar -->")[0];

  assert.match(html, /TOKEN CUT 60-90%/);
  assert.doesNotMatch(centralHtml, /CLI proxy thong minh viet bang Rust, dung giua terminal/i);
  assert.doesNotMatch(centralHtml, /AI assistant de giam token bill/i);
  assert.equal(containsVoiceLeak(scene.voice, html), false);
});

test("containsVoiceLeak flags copied narration outside subtitle containers only", () => {
  const voice =
    "RTK la CLI proxy thong minh viet bang Rust, dung giua terminal va AI assistant de giam token bill.";

  assert.equal(
    containsVoiceLeak(
      voice,
      '<main><h1>RTK la CLI proxy thong minh viet bang Rust, dung giua terminal</h1></main>',
    ),
    true,
  );
  assert.equal(
    containsVoiceLeak(
      voice,
      '<main><h1>TOKEN CUT 60-90%</h1></main><div class="caption-container">RTK la CLI proxy thong minh viet bang Rust, dung giua terminal va AI assistant de giam token bill.</div>',
    ),
    false,
  );
});

test("scene requirement guard rejects HTML that copies voice into the main visual", () => {
  const result = evaluateSceneHtmlRequirements(
    {
      stt: 2,
      voice:
        "RTK la CLI proxy thong minh viet bang Rust, dung giua terminal va AI assistant de giam token bill.",
      visual: "[TEXT] 'TOKEN CUT 60-90%'",
    },
    [{ name: "shiba.png", fileUrl: "../assets/logo/shiba.png" }],
    [
      '<!DOCTYPE html><html><body>',
      '<img src="./assets/logo/shiba.png">',
      '<section class="hero">RTK la CLI proxy thong minh viet bang Rust, dung giua terminal</section>',
      '</body></html>',
    ].join(''),
  );

  assert.equal(result.ok, false);
  assert.deepEqual(result.missing, ["voice leak"]);
});

test("deriveSceneDisplayCopy prefers explicit visual text over narration", () => {
  const copy = deriveSceneDisplayCopy({
    voice:
      "RTK la CLI proxy thong minh viet bang Rust, dung giua terminal va AI assistant de giam token bill.",
    visual:
      "[MAIN FOCUS] Terminal proxy diagram, Rust binary in center, token meter drops. [TEXT] 'TOKEN CUT 60-90%'. [MOTION] packets compress into cache.",
  });

  assert.match(copy, /TOKEN CUT 60-90%/);
  assert.doesNotMatch(copy, /RTK la CLI proxy thong minh/i);
});

test("autoFixSceneHTML rewrites scene-local asset paths to parent assets", () => {
  const { html, fixes } = autoFixSceneHTML(
    '<html><body><img src="./assets/logo/shiba.png"></body><script>window.__timelines={}; var tl=gsap.timeline({ paused: true });</script></html>',
  );

  assert.match(html, /src="\.\.\/assets\/logo\/shiba\.png"/);
  assert.ok(fixes.some((fix) => fix.includes("scene asset paths")));
});

test("autoFixSceneHTML removes unsupported drawSVG usage", () => {
  const source = [
    '<html><body></body><script>',
    'window.__timelines={}; var tl=gsap.timeline({ paused: true });',
    'tl.from("#graph-line",{drawSVG:"0%",duration:2,ease:"power2.inOut"},1);',
    '</script></html>',
  ].join('');

  const { html, fixes } = autoFixSceneHTML(source);
  const validation = validateSceneHTML(html);

  assert.doesNotMatch(html, /drawSVG/i);
  assert.ok(fixes.some((fix) => fix.includes("drawSVG")));
  assert.deepEqual(validation.warnings.filter((warning) => warning.includes("drawSVG")), []);
});
