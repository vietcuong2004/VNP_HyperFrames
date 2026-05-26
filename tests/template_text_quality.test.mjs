import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { getHyperframesReviewScene as getG1Scene } from "../templates/G1_github/template1/scenes.mjs";
import { getSceneCards as getG1Template2Cards } from "../templates/G1_github/template2/scenes.mjs";
import { getHyperframesReviewScene as getG2Scene } from "../templates/G2_docker/template1/scenes.mjs";
import { getHyperframesReviewScene as getG3Scene } from "../templates/G3_web/template1/scenes.mjs";

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
  "templates/G1_github/template1/style.css",
  "templates/G1_github/template2/style.css",
  "templates/G1_github/template3/style.css",
  "templates/G2_docker/template1/style.css",
  "templates/G2_docker/template2/style.css",
  "templates/G2_docker/template3/style.css",
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

test("headline font stack prioritizes Vietnamese-safe glyph coverage", () => {
  for (const file of styleFiles) {
    const source = readFileSync(file, "utf8");
    assert.match(
      source,
      /--font-sans:\s*"Be Vietnam Pro",\s*"Be Vietnam",\s*Arial/,
      `${file} should prefer Be Vietnam Pro for Vietnamese headlines`,
    );
    assert.match(
      source,
      /@font-face[\s\S]*be-vietnam-pro-vietnamese-800-normal\.woff2/,
      `${file} should embed Be Vietnam Pro font files for render workspaces`,
    );
  }
});

test("variant scene renderers contain distinct content and animation systems", () => {
  const expectations = [
    ["templates/G1_github/template2/scenes.mjs", "knowledge-map-template", "knowledge-map-card"],
    ["templates/G1_github/template3/scenes.mjs", "developer-brief-template", "dev-brief-card"],
    ["templates/G2_docker/template2/scenes.mjs", "self-host-template", "deploy-card"],
    ["templates/G2_docker/template3/scenes.mjs", "dev-workflow-template", "workflow-card"],
    ["templates/G3_web/template2/scenes.mjs", "docs-path-template", "source-note-card"],
    ["templates/G3_web/template3/scenes.mjs", "tool-action-template", "action-brief-card"],
  ];

  for (const [file, wrapperClass, cardClass] of expectations) {
    const source = readFileSync(file, "utf8");
    assert.match(source, new RegExp(wrapperClass), `${file} needs a distinct wrapper`);
    assert.match(source, new RegExp(cardClass), `${file} needs distinct card styling hooks`);
    assert.match(source, /stagger:/, `${file} needs variant-specific card animation`);
  }
});

test("scene fallbacks always render visible cards and Vietnamese headlines", () => {
  const cases = [
    ["G1", getG1Scene, 8],
    ["G2", getG2Scene, 5],
    ["G3", getG3Scene, 6],
  ];
  const asciiFallback = /\b(?:CO GI DANG CHU Y|TIN HIEU REPO|DOC TRUOC KHI DUNG|DIEM MANH|CO DANG DUNG|TRUOC KHI DUNG|CHAY THU RIENG|NGUON WEB|CAN KIEM TRA GI|HANH DONG TIEP|KIEM TRA NGUON|DOC NGUON|KIEM CHUNG TIEP)\b/;

  for (const [group, renderScene, count] of cases) {
    for (let index = 0; index < count; index += 1) {
      const { html } = renderScene(index, { scene: index + 1 }, `fallback-${group}-${index + 1}`, index * 6);
      assert.match(html, /headline-line1/, `${group} scene ${index + 1} needs a headline`);
      assert.match(html, /(?:bento-card|step-card|terminal-frame|browser-frame|repo-badge|web-card|feature-item|timeline-item|action-btn)/, `${group} scene ${index + 1} needs visible content`);
      const headlineText = [...html.matchAll(/headline-line[12][^>]*>([^<]+)/g)].map((match) => match[1]).join(" ");
      assert.doesNotMatch(headlineText, asciiFallback, `${group} scene ${index + 1} contains unaccented fallback headline text`);
    }
  }
});

test("G1 template2 ignores placeholder cards and renders useful fallback card copy", () => {
  const cards = getG1Template2Cards({
    headline_line1: "RTK",
    headline_line2: "TỐI ƯU LLM",
    steps: [
      { title: "Bước 1", body: "" },
      { title: "Bước 2", body: "" },
      { title: "Bước 3", body: " " },
    ],
  }, 3);

  assert.equal(cards.length, 3);
  assert.notDeepEqual(cards.map((card) => card.title), ["Bước 1", "Bước 2", "Bước 3"]);
  for (const card of cards) {
    assert.ok(card.body.trim().length >= 6);
    assert.doesNotMatch(card.title, /^Bước \d$/);
  }
});
