import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { buildDemoData } from "../template_demo/demo-fixtures.mjs";
import g1Template2 from "../templates/G1_github/template2/template.mjs";
import g1Template3 from "../templates/G1_github/template3/template.mjs";
import g2Template2 from "../templates/G2_docker/template2/template.mjs";
import g2Template3 from "../templates/G2_docker/template3/template.mjs";
import g3Template2 from "../templates/G3_web/template2/template.mjs";
import g3Template3 from "../templates/G3_web/template3/template.mjs";

const groups = ["G1_github", "G2_docker", "G3_web"];

test("template2 and template3 use different scene orders after the shared intro", () => {
  for (const group of groups) {
    const template2 = readFileSync(`templates/${group}/template2/template.mjs`, "utf8");
    const template3 = readFileSync(`templates/${group}/template3/template.mjs`, "utf8");

    assert.match(template2, /const SCENE_ORDER = \[0, 3, 1, 5, 2, 6, 4, 7\]/, `${group}/template2 needs a distinct scene order`);
    assert.match(template3, /const SCENE_ORDER = \[0, 5, 2, 4, 1, 6, 3, 7\]/, `${group}/template3 needs a distinct scene order`);
    assert.match(template2, /visual_index: sourceIndex/, `${group}/template2 must preserve original renderer layout`);
    assert.match(template3, /visual_index: sourceIndex/, `${group}/template3 must preserve original renderer layout`);
  }
});

test("variant templates use different scene entrance motion", () => {
  for (const group of groups) {
    const template1 = readFileSync(`templates/${group}/template1/template.mjs`, "utf8");
    const template2 = readFileSync(`templates/${group}/template2/template.mjs`, "utf8");
    const template3 = readFileSync(`templates/${group}/template3/template.mjs`, "utf8");

    assert.doesNotMatch(template1, /SCENE_ORDER|clipPath|filter: "blur/);
    assert.match(template2, /clipPath: "inset\(0 0 100% 0\)"/);
    assert.match(template3, /filter: "blur\(10px\)"/);
  }
});

test("demo template variants keep the intro but use different content scripts", () => {
  for (const group of groups) {
    const variants = ["template1", "template2", "template3"].map((variant) => buildDemoData(group, variant));
    const introHeadlines = variants.map((data) => data.scenes[0].headline_line1);
    assert.equal(new Set(introHeadlines).size, 1, `${group} intro headline should stay shared`);

    const scriptFingerprints = variants.map((data) => data.scenes
      .slice(1)
      .map((scene) => [
        scene.headline_line1,
        scene.headline_line2,
        scene.bento1_title,
        scene.bento1_desc,
        scene.btn_text,
        JSON.stringify(scene.steps || scene.cards || []),
      ].join(" "))
      .join("\n"));

    assert.equal(new Set(scriptFingerprints).size, 3, `${group} template scripts should be meaningfully different`);
  }
});

test("generation pipeline passes subtemplate content profiles into AI prompts", () => {
  const main = readFileSync("pipeline/main_generateContent.js", "utf8");
  const pipeline = readFileSync("pipeline/run_pipeline.js", "utf8");
  const captureGithub = readFileSync("pipeline/capture_github.js", "utf8");
  assert.match(main, /const subtemplate = selectTemplateVariant\("github", classification\.videoFormat\)/);
  assert.match(main, /generateScenes\(\{ target, repoData, readme, rootFiles \}, classification\.videoFormat, subtemplate\)/);
  assert.match(main, /const subtemplate = selectTemplateVariant\("docker", classification\.videoFormat\)/);
  assert.match(main, /generateScenes\(\{ target, info \}, classification\.videoFormat, subtemplate\)/);
  assert.match(main, /const subtemplate = selectTemplateVariant\("web", classification\.videoFormat\)/);
  assert.match(main, /generateScenes\(\{ target, webInfo: \{ title, description, answer, results \} \}, classification\.videoFormat, subtemplate\)/);

  for (const file of [
    "pipeline/generators/github_generator.mjs",
    "pipeline/generators/docker_generator.mjs",
    "pipeline/generators/web_generator.mjs",
  ]) {
    const source = readFileSync(file, "utf8");
    assert.match(source, /const TEMPLATE_CONTENT_PROFILES = \{/);
    assert.match(source, /export async function generateScenes\(rawData, format, subtemplate = "template1"\)/);
    assert.match(source, /TEMPLATE CONTENT PROFILE FOR "\$\{subtemplate\}"/);
    assert.match(source, /Every headline, step, bento card, and voice line must follow this template content profile/);
  }

  assert.match(pipeline, /STAR_SCREENSHOT_PATH: path\.join\(paths\.imageDir, 'github_star\.png'\)/);
  assert.match(captureGithub, /writeTransparentPng\(starOutputPath\)/);
  assert.match(captureGithub, /captureStarScreenshot/);
  assert.match(captureGithub, /setViewport\(\{\s*width: 1365,\s*height: 1600/s);
  assert.match(captureGithub, /#repo-stars-counter-star/);
  assert.match(captureGithub, /closest\('li, \.d-inline-flex, \.pagehead-actions'\)/);
});

test("reordered variant templates play scenes sequentially without duplicate audio slots", () => {
  const cases = [
    ["G1 template2", g1Template2, 8],
    ["G1 template3", g1Template3, 8],
    ["G2 template2", g2Template2, 5],
    ["G2 template3", g2Template3, 5],
    ["G3 template2", g3Template2, 6],
    ["G3 template3", g3Template3, 6],
  ];

  for (const [name, renderTemplate, sceneCount] of cases) {
    const scenes = Array.from({ length: sceneCount }, (_, index) => ({
      scene: index + 1,
      audio_start: index * 10,
      audio_duration: 10,
      duration: 10,
      audio_path: `assets/audio/scene_${index + 1}.mp3`,
      headline_line1: `SCENE ${index + 1}`,
      headline_line2: "TEST",
      transcript: [
        { text: `scene-${index + 1}`, start: index * 10, end: index * 10 + 1 },
      ],
    }));
    const html = renderTemplate({ duration: sceneCount * 10, scenes }, "");
    const starts = [...html.matchAll(/id="tts-scene\d+"[^>]+data-start="([^"]+)"/g)].map((match) => Number(match[1]));

    assert.deepEqual(starts, Array.from({ length: sceneCount }, (_, index) => index * 10), `${name} should rebase audio starts after reordering`);
    assert.equal(new Set(starts).size, sceneCount, `${name} should not duplicate scenes when order contains unavailable source indexes`);
    assert.doesNotMatch(html, /data-start="undefined"|NaN/, `${name} should not emit invalid timeline positions`);
  }
});
