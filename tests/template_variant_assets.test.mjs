import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const groups = ["G1_github", "G2_docker", "G3_web"];

test("template variant CSS files are visually distinct within each group", () => {
  for (const group of groups) {
    const css1 = readFileSync(`templates/${group}/template1/style.css`, "utf8");
    const css2 = readFileSync(`templates/${group}/template2/style.css`, "utf8");
    const css3 = readFileSync(`templates/${group}/template3/style.css`, "utf8");

    assert.notEqual(css1, css2, `${group} template2 must differ from template1`);
    assert.notEqual(css1, css3, `${group} template3 must differ from template1`);
    assert.notEqual(css2, css3, `${group} template2 must differ from template3`);
  }
});

test("generator shiba asset order stays on the original template1 sequence", () => {
  const githubGenerator = readFileSync("pipeline/generators/github_generator.mjs", "utf8");
  const dockerGenerator = readFileSync("pipeline/generators/docker_generator.mjs", "utf8");
  const webGenerator = readFileSync("pipeline/generators/web_generator.mjs", "utf8");

  assert.match(githubGenerator, /character shiba cheerfully talking\.png[\s\S]*character shiba thinking\.png[\s\S]*character shiba explaining something\.png[\s\S]*character shiba wearing stylish glasses\.png[\s\S]*character shiba using a magnifying glass to look closely\.png[\s\S]*character shiba showing surprise\.png[\s\S]*character shiba wearing a cassock like it has become enlightened\.png[\s\S]*character shiba smiling brightly\.png/);
  assert.match(dockerGenerator, /character shiba cheerfully talking\.png[\s\S]*character shiba thinking\.png[\s\S]*character shiba using a magnifying glass to look closely\.png[\s\S]*character shiba explaining something\.png[\s\S]*character shiba smiling brightly\.png/);
  assert.match(webGenerator, /character shiba using a magnifying glass to look closely\.png[\s\S]*character shiba explaining something\.png[\s\S]*character shiba thinking\.png[\s\S]*character shiba wearing stylish glasses\.png[\s\S]*character shiba cheerfully talking\.png[\s\S]*character shiba smiling brightly\.png/);
});

test("template generators do not select shiba assets with baked-in backgrounds", () => {
  const generatorSources = [
    readFileSync("pipeline/generators/github_generator.mjs", "utf8"),
    readFileSync("pipeline/generators/docker_generator.mjs", "utf8"),
    readFileSync("pipeline/generators/web_generator.mjs", "utf8"),
  ].join("\n");
  const opaqueBackgroundAssets = [
    "character shiba expressing unbelievable emotions.png",
    "character shiba feeling extremely cold and shivering.png",
    "character shiba feeling sad.png",
    "character shiba looking at phone seeing market going up.png",
    "character shiba meditating in zen state.png",
    "character tiger hiding some kind of secret behind its back.png",
  ];

  for (const assetName of opaqueBackgroundAssets) {
    assert.equal(generatorSources.includes(assetName), false, `${assetName} must not be selected by generators`);
  }
});
