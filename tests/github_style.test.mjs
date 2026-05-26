import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const css = readFileSync(new URL("../templates/G1_github/template1/style.css", import.meta.url), "utf8");

test("G1_github uses local Vietnamese-safe font stack for headlines", () => {
  assert.doesNotMatch(css, /fonts\.googleapis\.com/);
  assert.doesNotMatch(css, /Space Grotesk/);
  assert.match(css, /--font-sans:\s*"Segoe UI",\s*"Noto Sans",\s*"Helvetica Neue",\s*Arial,\s*sans-serif/);
  assert.match(css, /\.headline-line1[\s\S]*font-family:\s*var\(--font-sans\)/);
  assert.match(css, /\.headline-line2[\s\S]*font-family:\s*var\(--font-sans\)/);
});

test("G1_github headline line-height leaves room for Vietnamese diacritics", () => {
  assert.doesNotMatch(css, /line-height:\s*0\.98/);
  assert.match(css, /\.headline-line1[\s\S]*line-height:\s*1\.14/);
  assert.match(css, /\.headline-line2[\s\S]*line-height:\s*1\.14/);
  assert.match(css, /\.headline-container[\s\S]*overflow:\s*visible/);
});
