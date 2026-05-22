import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const templateNames = ["G1_github", "G2_docker", "G3_web"];
const cssByTemplate = Object.fromEntries(
  templateNames.map((name) => [
    name,
    readFileSync(new URL(`../templates/${name}/style.css`, import.meta.url), "utf8"),
  ]),
);

test("video templates bundle Be Vietnam Pro for Vietnamese text", () => {
  for (const [name, css] of Object.entries(cssByTemplate)) {
    assert.doesNotMatch(css, /fonts\.googleapis\.com/, name);
    assert.match(css, /font-family:\s*"Be Vietnam Pro"/, name);
    assert.match(css, /be-vietnam-pro-latin-ext-700-normal\.woff2/, name);
    assert.match(css, /\.headline-line1[\s\S]*font-family:\s*"Be Vietnam Pro"/, name);
    assert.match(css, /\.headline-line2[\s\S]*font-family:\s*"Be Vietnam Pro"/, name);
  }
});

test("video template headlines leave room for Vietnamese diacritics", () => {
  for (const [name, css] of Object.entries(cssByTemplate)) {
    assert.doesNotMatch(css, /line-height:\s*0\.98/, name);
    assert.match(css, /\.headline-line1[\s\S]*line-height:\s*1\.14/, name);
    assert.match(css, /\.headline-line2[\s\S]*line-height:\s*1\.14/, name);
    assert.match(css, /\.headline-container[\s\S]*overflow:\s*visible/, name);
  }
});

test("caption rendering does not use stripped Google font names", () => {
  for (const name of templateNames) {
    const template = readFileSync(new URL(`../templates/${name}/template.mjs`, import.meta.url), "utf8");
    assert.doesNotMatch(template, /Space Grotesk/, name);
    assert.match(template, /Be Vietnam Pro/, name);
  }
});
