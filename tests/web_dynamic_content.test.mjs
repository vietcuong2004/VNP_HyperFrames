import assert from "node:assert/strict";
import { test } from "node:test";

import { normalizeWebScenes } from "../pipeline/generators/web_generator.mjs";
import { getHyperframesReviewScene, getSceneCards } from "../templates/G3_web/scenes.mjs";

test("normalizeWebScenes preserves dynamic step cards for Web guide scenes", () => {
  const scenes = normalizeWebScenes(
    [
      {
        scene: 1,
        headline_line1: "DOCS",
        headline_line2: "READ FIRST",
      },
      {
        scene: 2,
        content_mode: "steps",
        headline_line1: "QUICKSTART",
        headline_line2: "3 BƯỚC ĐỌC DOCS",
        steps: [
          { title: "Mở guide", body: "Bắt đầu từ quickstart thay vì đọc lan man." },
          { title: "Chạy mẫu", body: "Copy ví dụ nhỏ nhất để kiểm tra API." },
          { title: "Đọc limit", body: "Xem quota, auth và lỗi thường gặp." },
        ],
      },
    ],
    {
      title: "API Docs",
      sourceLabel: "example.dev",
      sourceUrl: "example.dev/docs",
    },
  );

  assert.equal(scenes.length, 6);
  assert.equal(scenes[1].content_mode, "steps");
  assert.deepEqual(scenes[1].steps.map((step) => step.title), ["Mở guide", "Chạy mẫu", "Đọc limit"]);
  assert.equal(scenes[1].bento2_title, "Chạy mẫu");
  assert.equal(scenes[1].repo_url, "example.dev/docs");
});

test("G3_web scene renderer uses dynamic steps instead of fixed bento copy", () => {
  const scene = {
    content_mode: "steps",
    headline_line1: "QUICKSTART",
    headline_line2: "3 BƯỚC ĐỌC DOCS",
    steps: [
      { title: "Mở guide", body: "Bắt đầu từ quickstart." },
      { title: "Chạy mẫu", body: "Copy ví dụ nhỏ nhất." },
      { title: "Đọc limit", body: "Xem quota và lỗi thường gặp." },
    ],
  };

  const cards = getSceneCards(scene, 3);
  const result = getHyperframesReviewScene(1, scene, "scene2", 0);

  assert.deepEqual(cards.map((card) => card.title), ["Mở guide", "Chạy mẫu", "Đọc limit"]);
  assert.match(result.html, /Mở guide/);
  assert.match(result.html, /Copy ví dụ nhỏ nhất/);
  assert.doesNotMatch(result.html, /Audience/);
  assert.doesNotMatch(result.html, /Tính năng/);
});

test("G3_web question scene renders step bodies from dynamic content", () => {
  const scene = {
    content_mode: "steps",
    headline_line1: "CHECK DOCS",
    headline_line2: "TRƯỚC KHI DÙNG",
    steps: [
      { title: "API nào", body: "Xác định endpoint chính cần gọi." },
      { title: "Auth ra sao", body: "Kiểm tra token, scope và quota." },
      { title: "Lỗi gì", body: "Đọc phần lỗi thường gặp trước." },
    ],
  };

  const result = getHyperframesReviewScene(2, scene, "scene3", 0);

  assert.match(result.html, /Xác định endpoint chính/);
  assert.match(result.html, /Kiểm tra token/);
  assert.doesNotMatch(result.html, /Định nghĩa vấn đề cơ bản/);
});

test("normalizeWebScenes replaces generic action headlines with source-aware copy", () => {
  const scenes = normalizeWebScenes(
    [
      {},
      {},
      {},
      {},
      {
        headline_line1: "HÀNH ĐỘNG TIẾP",
        headline_line2: "TÙY THEO NGUỒN",
        btn_text: "Mở tài liệu",
      },
    ],
    {
      title: "Dart documentation",
      sourceLabel: "dart.dev",
      sourceUrl: "dart.dev/guides",
    },
  );

  assert.notEqual(scenes[4].headline_line1, "HÀNH ĐỘNG TIẾP");
  assert.notEqual(scenes[4].headline_line2, "TÙY THEO NGUỒN");
  assert.match(scenes[4].headline_line1, /DART|DOCS|NGUỒN/);
});
