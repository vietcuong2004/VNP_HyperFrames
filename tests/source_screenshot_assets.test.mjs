import assert from "node:assert/strict";
import { test } from "node:test";

import { generateLocalFallbackHTML } from "../pipeline/localFallbackGenerator.js";
import { selectProjectAssetsForScene } from "../pipeline/run_pipeline.js";

const assets = [
  {
    name: "character shiba burning incense and praying.png",
    type: "image",
    aspectRatio: "auto",
    fileUrl: "../assets/character/shiba/character shiba burning incense and praying.png",
  },
  {
    name: "github_repo.png",
    type: "image",
    aspectRatio: "640x3800",
    fileUrl: "../assets/images/github_repo.png",
  },
  {
    name: "shiba.png",
    type: "image",
    aspectRatio: "1:1",
    fileUrl: "../assets/logo/shiba.png",
  },
];

test("local fallback uses the captured source screenshot instead of the first image asset", () => {
  const html = generateLocalFallbackHTML({
    scene: {
      stt: 2,
      voice: "Chup man hinh website va cuon trang.",
      visual: "Browser screenshot scroll tu link nguon.",
    },
    projectAssets: assets,
    audioDurationMs: 8000,
  });

  assert.match(html, /src="\.\.\/assets\/images\/github_repo\.png"/);
  assert.doesNotMatch(html, /character shiba burning incense and praying\.png/);
});

test("source screenshot scenes only receive screenshot and logo project assets", () => {
  const selected = selectProjectAssetsForScene(
    {
      voice: "Mo trang web va noi ve giao dien.",
      visual: "Hien browser screenshot scroll cua link nguon.",
    },
    assets,
  );

  assert.deepEqual(
    selected.map((asset) => asset.fileUrl),
    ["../assets/images/github_repo.png", "../assets/logo/shiba.png"],
  );
});
