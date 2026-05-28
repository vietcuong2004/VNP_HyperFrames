import assert from "node:assert/strict";
import { test } from "node:test";

import { GITHUB_LAYOUT_SCHEMA, normalizeGithubScenes } from "../pipeline/generators/github_generator.mjs";

test("GitHub prompt schema defines the 8 scenes required by the template", () => {
  assert.equal(GITHUB_LAYOUT_SCHEMA.length, 8);
  assert.deepEqual(
    GITHUB_LAYOUT_SCHEMA.map((scene) => scene.scene),
    [1, 2, 3, 4, 5, 6, 7, 8],
  );
  assert.deepEqual(
    GITHUB_LAYOUT_SCHEMA.map((scene) => scene.layout),
    ["intro", "problem", "install", "feature", "checklist", "stats", "clone", "outro"],
  );
});

test("normalizeGithubScenes pads a short AI response to 8 scenes", () => {
  const shortScenes = GITHUB_LAYOUT_SCHEMA.slice(0, 7).map((scene) => ({
    ...scene,
    voice: `voice ${scene.scene}`,
  }));

  const scenes = normalizeGithubScenes(shortScenes);

  assert.equal(scenes.length, 8);
  assert.deepEqual(
    scenes.map((scene) => scene.scene),
    [1, 2, 3, 4, 5, 6, 7, 8],
  );
  assert.equal(scenes[6].voice, "voice 7");
  assert.equal(scenes[7].layout, "outro");
});

test("normalizeGithubScenes preserves install steps and maps them to bento fields", () => {
  const scenes = normalizeGithubScenes(
    [
      {
        headline_line1: "SUPERPOWERS",
        repo_url: "github.com/obra/superpowers",
      },
      {},
      {
        content_mode: "steps",
        headline_line1: "RUN SUPERPOWERS",
        headline_line2: "TEST IN SIDE PROJECT",
        steps: [
          { title: "Clone", body: "Clone the repo before reading docs." },
          { title: "Install", body: "Use the package manager shown in README." },
          { title: "Run demo", body: "Run the smallest documented example." },
        ],
      },
    ],
    {
      repoName: "superpowers",
      repoUrl: "github.com/obra/superpowers",
    },
  );

  assert.equal(scenes.length, 8);
  assert.equal(scenes[2].content_mode, "steps");
  assert.deepEqual(scenes[2].steps.map((step) => step.title), ["Clone", "Install", "Run demo"]);
  assert.equal(scenes[2].bento1_title, "Clone");
  assert.equal(scenes[2].bento1_desc, "Clone the repo before reading docs.");
  assert.equal(scenes[2].repo_url, "github.com/obra/superpowers");
});

test("normalizeGithubScenes replaces generic schema headlines with repo-aware copy", () => {
  const scenes = normalizeGithubScenes(
    [
      { headline_line1: "TEN REPO", headline_line2: "CANH MO DAU" },
      { headline_line1: "VAI TRO", headline_line2: "GIAI QUYET VAN DE GI" },
      { headline_line1: "CAI DAT / LO TRINH", headline_line2: "BAT DAU NHANH" },
      { headline_line1: "DIEM NOI BAT", headline_line2: "TINH NANG CHINH" },
      { headline_line1: "DANH GIA NHANH", headline_line2: "LUU Y TRUOC KHI DUNG" },
      { headline_line1: "THONG KE REPO", headline_line2: "SUC HUT CONG DONG" },
      { headline_line1: "CLONE REPO", headline_line2: "CHAY THU AN TOAN" },
      { headline_line1: "TONG KET", headline_line2: "LUU LAI NEU HUU ICH" },
    ],
    {
      repoName: "superpowers",
      repoUrl: "github.com/obra/superpowers",
    },
  );

  assert.deepEqual(
    scenes.map((scene) => [scene.headline_line1, scene.headline_line2]),
    [
      ["SUPERPOWERS", "REPO GITHUB"],
      ["USE CASE", "SUPERPOWERS GIÚP GÌ"],
      ["RUN SUPERPOWERS", "BẮT ĐẦU AN TOÀN"],
      ["ĐIỂM MẠNH", "SUPERPOWERS NỔI BẬT"],
      ["CHECKLIST", "TRƯỚC KHI DÙNG"],
      ["STATS", "TÍN HIỆU GITHUB"],
      ["CLONE SUPERPOWERS", "CHẠY THỬ RIÊNG"],
      ["LƯU REPO", "ĐỌC README KỸ"],
    ],
  );
});
