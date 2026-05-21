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
