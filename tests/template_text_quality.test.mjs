import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const textSourceFiles = [
  "pipeline/generators/github_generator.mjs",
  "pipeline/generators/docker_generator.mjs",
  "pipeline/generators/web_generator.mjs",
  "templates/G1_github/template1/scenes.mjs",
  "templates/G1_github/template2/scenes.mjs",
  "templates/G1_github/template3/scenes.mjs",
  "templates/G2_docker/template1/scenes.mjs",
  "templates/G2_docker/template2/scenes.mjs",
  "templates/G2_docker/template3/scenes.mjs",
  "templates/G3_web/template1/scenes.mjs",
  "templates/G3_web/template2/scenes.mjs",
  "templates/G3_web/template3/scenes.mjs",
];

const templateFiles = [
  "templates/G1_github/template1/template.mjs",
  "templates/G1_github/template2/template.mjs",
  "templates/G1_github/template3/template.mjs",
  "templates/G2_docker/template1/template.mjs",
  "templates/G2_docker/template2/template.mjs",
  "templates/G2_docker/template3/template.mjs",
  "templates/G3_web/template1/template.mjs",
  "templates/G3_web/template2/template.mjs",
  "templates/G3_web/template3/template.mjs",
];

const styleFiles = [
  "templates/G1_github/style.css",
  "templates/G1_github/template1/style.css",
  "templates/G1_github/template2/style.css",
  "templates/G1_github/template3/style.css",
  "templates/G2_docker/style.css",
  "templates/G2_docker/template1/style.css",
  "templates/G2_docker/template2/style.css",
  "templates/G2_docker/template3/style.css",
  "templates/G3_web/style.css",
  "templates/G3_web/template1/style.css",
  "templates/G3_web/template2/style.css",
  "templates/G3_web/template3/style.css",
];

test("template and generator copy has no mojibake fallback text", () => {
  const mojibake = /(?:Ã|Ä|Æ|áº|á»|âœ|â–|â€¢|â€”|ðŸ|�)/;

  for (const file of textSourceFiles) {
    const source = readFileSync(file, "utf8");
    assert.doesNotMatch(source, mojibake, `${file} contains mojibake text`);
  }
});

test("all rendered text templates avoid Space Grotesk for Vietnamese captions", () => {
  for (const file of [...templateFiles, ...styleFiles]) {
    const source = readFileSync(file, "utf8");
    assert.doesNotMatch(source, /Space Grotesk/, `${file} still uses Space Grotesk`);
  }
});
