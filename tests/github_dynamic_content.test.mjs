import assert from "node:assert/strict";
import { test } from "node:test";

import { getHyperframesReviewScene, getSceneCards } from "../templates/G1_github/scenes.mjs";

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
