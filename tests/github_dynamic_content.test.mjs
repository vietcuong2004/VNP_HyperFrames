import assert from "node:assert/strict";
import { test } from "node:test";

import { getHyperframesReviewScene, getSceneCards } from "../templates/G1_github/template1/scenes.mjs";
import renderGithubTemplate from "../templates/G1_github/template1/template.mjs";

test("G1_github install renderer uses dynamic step cards instead of fixed feature copy", () => {
  const scene = {
    layout: "install",
    content_mode: "steps",
    headline_line1: "RUN SUPERPOWERS",
    headline_line2: "TEST IN SIDE PROJECT",
    steps: [
      { title: "Clone", body: "Clone the repo before reading docs." },
      { title: "Install", body: "Use the package manager shown in README." },
      { title: "Run demo", body: "Run the smallest documented example." },
      { title: "Verify", body: "Check output before integration." },
    ],
  };

  const cards = getSceneCards(scene, 4);
  const result = getHyperframesReviewScene(2, scene, "scene3", 0);

  assert.deepEqual(cards.map((card) => card.title), ["Clone", "Install", "Run demo", "Verify"]);
  assert.match(result.html, /step-card/);
  assert.match(result.html, /Clone the repo before reading docs/);
  assert.match(result.html, /Check output before integration/);
  assert.doesNotMatch(result.html, /bento-container/);
  assert.doesNotMatch(result.html, /Phân tích Real-time/);
});

test("G1_github feature renderer uses repo evidence panel instead of generic render icon", () => {
  const scene = {
    layout: "feature",
    headline_line1: "TYPECHAT",
    headline_line2: "TYPE SAFE AI",
    btn_text: "README has examples",
    steps: [
      { title: "API", body: "Typed schemas reduce invalid responses." },
      { title: "Demo", body: "Examples show the smallest working flow." },
      { title: "Fit", body: "Best for teams validating LLM output." },
    ],
  };

  const result = getHyperframesReviewScene(3, scene, "scene4", 0);

  assert.match(result.html, /repo-proof-panel/);
  assert.match(result.html, /Typed schemas reduce invalid responses/);
  assert.match(result.html, /README has examples/);
  assert.doesNotMatch(result.html, /main-glow-icon/);
  assert.doesNotMatch(result.html, /DETERMINISTIC|RENDER/i);
});

test("G1_github feature renderer keeps visible fallback content when AI omits cards", () => {
  const scene = {
    layout: "feature",
    headline_line1: "AWESOME NLP",
    headline_line2: "CURATED NLP MAP",
    btn_text: "github.com/keon/awesome-nlp",
  };

  const result = getHyperframesReviewScene(3, scene, "scene4", 0);

  assert.match(result.html, /repo-proof-panel/);
  assert.match(result.html, /Use case|Evidence|Fit/);
  assert.match(result.html, /github\.com\/keon\/awesome-nlp/);
  assert.doesNotMatch(result.html, /main-glow-icon/);
});

test("G1_github template remaps shiba assets that have baked-in backgrounds", () => {
  const html = renderGithubTemplate({
    duration: 3,
    platform: "github",
    video_format: "knowledge_map_resource_digest",
    scenes: [
      {
        audio_start: 0,
        audio_duration: 3,
        layout: "feature",
        headline_line1: "AWESOME NLP",
        headline_line2: "CURATED NLP MAP",
        assets: ["character shiba meditating in zen state.png"],
      },
    ],
  }, "");

  assert.match(html, /character shiba wearing a cassock like it has become enlightened\.png/);
  assert.doesNotMatch(html, /character shiba meditating in zen state\.png/);
});

test("G1_github checklist renderer does not leak adapter animation defaults", () => {
  const scene = {
    layout: "checklist",
    headline_line1: "CHECK BEFORE",
    headline_line2: "ADOPTING",
    steps: [
      { title: "License", body: "Confirm commercial use is allowed." },
      { title: "Release", body: "Prefer projects with recent releases." },
      { title: "Issues", body: "Read blockers before integration." },
    ],
  };

  const result = getHyperframesReviewScene(4, scene, "scene5", 0);

  assert.match(result.html, /repo-check-panel/);
  assert.match(result.html, /Confirm commercial use is allowed/);
  assert.doesNotMatch(result.html, /ADAPTER PATTERN|GSAP Timeline|ThreeJS|Lottie/i);
});

test("G1_github stats renderer looks like repo signals instead of a finance chart", () => {
  const scene = {
    layout: "stats",
    headline_line1: "AWESOME NLP",
    headline_line2: "TIN HIEU REPO",
    repo_name: "keon/awesome-nlp",
    repo_lang: "Python",
    repo_stars: "★ 17,000",
    repo_trend: "Curated list",
    repo_trend_label: "GitHub",
  };

  const result = getHyperframesReviewScene(5, scene, "scene6", 0);

  assert.match(result.html, /repo-signal-panel/);
  assert.match(result.html, /keon\/awesome-nlp/);
  assert.match(result.html, /Python/);
  assert.doesNotMatch(result.html, /financial-chart|candlestick|robot-badge/i);
});

test("G1_github clone renderer shows git steps as sequential cards", () => {
  const scene = {
    layout: "clone",
    content_mode: "steps",
    headline_line1: "CLONE SUPERPOWERS",
    headline_line2: "CHAY THU RIENG",
    btn_text: "$ git clone github.com/obra/superpowers",
    steps: [
      { title: "Clone", body: "Lay source ve may phu." },
      { title: "Read README", body: "Doc cach cai dat truoc khi chay." },
      { title: "Run test", body: "Chay lenh nho nhat trong docs." },
    ],
  };

  const result = getHyperframesReviewScene(6, scene, "scene7", 0);

  assert.match(result.html, /step-card/);
  assert.match(result.html, /git clone github.com\/obra\/superpowers/);
  assert.match(result.html, /Read README/);
  assert.match(result.html, /Chay lenh nho nhat/);
  assert.doesNotMatch(result.html, /main-glow-icon/);
});

test("G1_github clone renderer has useful fallback cards when AI omits steps", () => {
  const scene = {
    layout: "clone",
    headline_line1: "CLONE AWESOME NLP",
    headline_line2: "READ BEFORE USE",
    btn_text: "$ git clone github.com/keon/awesome-nlp",
  };

  const result = getHyperframesReviewScene(6, scene, "scene7", 0);

  assert.match(result.html, /step-card/);
  assert.match(result.html, /Read README|Run test|Check license/);
  assert.doesNotMatch(result.html, /main-glow-icon/);
});

test("G1_github outro renderer includes dynamic card bodies", () => {
  const scene = {
    layout: "outro",
    content_mode: "steps",
    headline_line1: "SAVE REPO",
    headline_line2: "READ README FIRST",
    steps: [
      { title: "Star", body: "Save the repo if it fits your stack." },
      { title: "Issues", body: "Read open issues before adopting." },
      { title: "Release", body: "Check recent release notes." },
      { title: "License", body: "Confirm the license for your use case." },
    ],
  };

  const result = getHyperframesReviewScene(7, scene, "scene8", 0);

  assert.match(result.html, /Save the repo if it fits your stack/);
  assert.match(result.html, /Confirm the license/);
  assert.doesNotMatch(result.html, /Đăng ký kênh/);
});
