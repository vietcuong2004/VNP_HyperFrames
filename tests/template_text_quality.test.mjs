import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { getHyperframesReviewScene as getG1T1Scene, getSceneCards as getG1Template1Cards } from "../templates/G1_github/template1/scenes.mjs";
import { getHyperframesReviewScene as getG1T2Scene, getSceneCards as getG1Template2Cards } from "../templates/G1_github/template2/scenes.mjs";
import { getHyperframesReviewScene as getG1T3Scene } from "../templates/G1_github/template3/scenes.mjs";
import { getHyperframesReviewScene as getG2T1Scene } from "../templates/G2_docker/template1/scenes.mjs";
import { getHyperframesReviewScene as getG2T2Scene } from "../templates/G2_docker/template2/scenes.mjs";
import { getHyperframesReviewScene as getG2T3Scene } from "../templates/G2_docker/template3/scenes.mjs";
import { getHyperframesReviewScene as getG3T1Scene } from "../templates/G3_web/template1/scenes.mjs";
import { getHyperframesReviewScene as getG3T2Scene } from "../templates/G3_web/template2/scenes.mjs";
import { getHyperframesReviewScene as getG3T3Scene } from "../templates/G3_web/template3/scenes.mjs";

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
  const mojibake = /(?:Ã|Ä|Æ|áº|á»|âœ|â–|â€¢|â€”|ðŸ|�|Ná»|TÃ|BÆ°|Má»|CÃ|GÃ)/;

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
    ["G1", getG1T1Scene, 8],
    ["G2", getG2T1Scene, 5],
    ["G3", getG3T1Scene, 6],
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

test("all template variants replace sparse placeholder cards with useful card copy", () => {
  const renderers = [
    ["G1 template1", getG1T1Scene, 8],
    ["G1 template2", getG1T2Scene, 8],
    ["G1 template3", getG1T3Scene, 8],
    ["G2 template1", getG2T1Scene, 8],
    ["G2 template2", getG2T2Scene, 8],
    ["G2 template3", getG2T3Scene, 8],
    ["G3 template1", getG3T1Scene, 8],
    ["G3 template2", getG3T2Scene, 8],
    ["G3 template3", getG3T3Scene, 8],
  ];
  const placeholderText = />\s*(?:Bước|Buoc|Mục|Muc|Điểm|Diem|Ý chính|Y chinh)\s*\d+\s*</i;
  const emptyDescription = /class="[^"]*(?:card-desc|step-desc|feature-item-subtitle|timeline-subtitle)[^"]*"[^>]*>\s*<\/div>/;
  const contentBlock = /(?:bento-card|step-card|terminal-frame|browser-frame|repo-badge|web-card|feature-item|timeline-item|action-btn|docker-stats-card|deploy-spec-row|workflow-gate|source-note-row|action-console-row)/;

  for (const [name, renderScene, count] of renderers) {
    for (let index = 0; index < count; index += 1) {
      const scene = {
        scene: index + 1,
        headline_line1: "KIỂM TRA",
        headline_line2: "NỘI DUNG",
        repo_url: "github.com/rtk-ai/rtk",
        btn_text: "",
        steps: [
          { title: "Bước 1", body: "" },
          { title: "Bước 2", body: " " },
          { title: "Bước 3", body: "" },
        ],
        cards: [{ title: "Điểm 1", body: "" }],
        bento1_title: "Bước 1",
        bento1_desc: "",
        bento2_title: "Bước 2",
        bento2_desc: " ",
        bento3_title: "Bước 3",
        bento3_desc: "",
        bento4_title: "Bước 4",
        bento4_desc: "",
      };
      const safeName = name.replace(/\s+/g, "-");
      const { html } = renderScene(index, scene, `sparse-${safeName}-${index + 1}`, index * 6);

      assert.match(html, contentBlock, `${name} scene ${index + 1} should render a visible content block`);
      assert.doesNotMatch(html, placeholderText, `${name} scene ${index + 1} leaked placeholder card title`);
      assert.doesNotMatch(html, emptyDescription, `${name} scene ${index + 1} rendered an empty card/step description`);
    }
  }
});

test("variant templates define genuinely different information component systems", () => {
  const expectations = [
    [
      "templates/G1_github/template2/style.css",
      ["map-node-card", "knowledge-map-template .repo-check-panel", "knowledge-map-template .step-card::before", "SIGNAL MAP"],
    ],
    [
      "templates/G1_github/template3/style.css",
      ["brief-command-card", "developer-brief-template .repo-proof-panel", "developer-brief-template .step-card::before", "RUNBOOK"],
    ],
    [
      "templates/G2_docker/template2/style.css",
      ["deploy-terminal-card", "self-host-template .repo-check-panel", "self-host-template .step-card::before", "DEPLOY CHECK"],
    ],
    [
      "templates/G2_docker/template3/style.css",
      ["workflow-status-card", "dev-workflow-template .repo-proof-panel", "dev-workflow-template .step-card::before", "PIPELINE"],
    ],
    [
      "templates/G3_web/template2/style.css",
      ["source-note-panel", "docs-path-template .web-action-panel", "docs-path-template .step-card::before", "SOURCE PATH"],
    ],
    [
      "templates/G3_web/template3/style.css",
      ["action-console-panel", "tool-action-template .web-action-panel", "tool-action-template .step-card::before", "ACTION QUEUE"],
    ],
  ];

  for (const [file, tokens] of expectations) {
    const source = readFileSync(file, "utf8");
    for (const token of tokens) {
      assert.match(source, new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), `${file} should define ${token}`);
    }
  }
});

test("variant check and evaluation scenes render multiple styled info blocks", () => {
  const renderers = [
    ["G1 template2", getG1T2Scene, [3, 4, 6], "knowledge-map-template"],
    ["G1 template3", getG1T3Scene, [3, 4, 6], "developer-brief-template"],
    ["G2 template2", getG2T2Scene, [3, 4, 6], "self-host-template"],
    ["G2 template3", getG2T3Scene, [3, 4, 6], "dev-workflow-template"],
    ["G3 template2", getG3T2Scene, [2, 4, 6], "docs-path-template"],
    ["G3 template3", getG3T3Scene, [2, 4, 6], "tool-action-template"],
  ];
  const countInfoBlocks = (html) =>
    (html.match(/class="[^"]*(?:bento-card|step-card|feature-item|timeline-item|repo-badge|docker-stats-card|terminal-frame|terminal-line|action-btn|deploy-spec-row|workflow-gate|source-note-row|action-console-row)[^"]*"/g) || []).length;

  for (const [name, renderScene, sceneIndexes, wrapperClass] of renderers) {
    for (const index of sceneIndexes) {
      const { html } = renderScene(index, {
        scene: index + 1,
        headline_line1: "ĐÁNH GIÁ",
        headline_line2: "TRƯỚC KHI DÙNG",
        repo_url: "github.com/rtk-ai/rtk",
        btn_text: "$ run check",
        steps: [{ title: "Kiểm thử thật", body: "Chạy thử riêng trước khi đưa vào workflow chính." }],
        cards: [{ title: "Một tín hiệu", body: "Dữ liệu AI trả thiếu nhưng scene vẫn phải đủ khối hiển thị." }],
        bento3_title: "Một tín hiệu",
        bento3_desc: "Dữ liệu AI trả thiếu nhưng scene vẫn phải đủ khối hiển thị.",
      }, `variant-density-${name.replace(/\s+/g, "-")}-${index + 1}`, index * 6);

      assert.match(html, new RegExp(wrapperClass), `${name} scene ${index + 1} should keep its variant wrapper`);
      assert.ok(countInfoBlocks(html) >= 3, `${name} scene ${index + 1} rendered too few styled info blocks`);
    }
  }
});

test("GitHub checklist variants render real checklist items, not an empty board", () => {
  const renderers = [
    ["G1 template1", getG1T1Scene],
    ["G1 template2", getG1T2Scene],
    ["G1 template3", getG1T3Scene],
  ];

  for (const [name, renderScene] of renderers) {
    const { html } = renderScene(4, {
      scene: 5,
      headline_line1: "CHECKLIST",
      headline_line2: "TRƯỚC KHI DÙNG",
      repo_url: "github.com/heygen-com/hyperframes",
      steps: [{ title: "Bước 3", body: "Kiểm tra docs trước khi dùng." }],
      cards: [{ title: "Bước 3", body: "Kiểm tra docs trước khi dùng." }],
    }, `checklist-${name.replace(/\s+/g, "-")}`, 0);

    const titles = [...html.matchAll(/class="[^"]*(?:card-title|check-title)[^"]*"[^>]*>([\s\S]*?)<\/div>/g)]
      .map((match) => match[1].replace(/<[^>]+>/g, "").trim());
    const descs = [...html.matchAll(/class="[^"]*(?:card-desc|check-desc)[^"]*"[^>]*>([\s\S]*?)<\/div>/g)]
      .map((match) => match[1].replace(/<[^>]+>/g, "").trim());

    assert.ok(titles.length >= 4, `${name} checklist should render four visible checklist titles`);
    assert.ok(descs.length >= 4, `${name} checklist should render four visible checklist descriptions`);
    assert.ok(titles.every((text) => text.length > 3), `${name} checklist has an empty title`);
    assert.ok(descs.every((text) => text.length > 8), `${name} checklist has an empty description`);
  }
});

test("GitHub checklist variants use different structural layouts", () => {
  const t1 = getG1T1Scene(4, { scene: 5, headline_line1: "CHECKLIST", headline_line2: "TRƯỚC KHI DÙNG" }, "g1-t1-check", 0).html;
  const t2 = getG1T2Scene(4, { scene: 5, headline_line1: "CHECKLIST", headline_line2: "TRƯỚC KHI DÙNG" }, "g1-t2-check", 0).html;
  const t3 = getG1T3Scene(4, { scene: 5, headline_line1: "CHECKLIST", headline_line2: "TRƯỚC KHI DÙNG" }, "g1-t3-check", 0).html;

  assert.match(t1, /bento-grid-2/, "template1 can keep the baseline bento checklist");
  assert.match(t2, /signal-check-row/, "template2 should use signal-row checklist layout");
  assert.doesNotMatch(t2, /bento-grid-2/, "template2 checklist should not reuse baseline 2x2 bento grid");
  assert.match(t3, /brief-check-command/, "template3 should use command checklist layout");
  assert.doesNotMatch(t3, /bento-grid-2/, "template3 checklist should not reuse baseline 2x2 bento grid");
});

test("Docker and Web variants use non-bento components where appropriate", () => {
  const scene = {
    scene: 4,
    headline_line1: "KIỂM TRA",
    headline_line2: "TRƯỚC KHI DÙNG",
    repo_url: "https://github.com/heygen-com/hyperframes",
    btn_text: "$ run check",
    steps: [
      { title: "Cấu hình", body: "Xác nhận tham số trước khi chạy thật." },
      { title: "Kiểm thử", body: "Chạy thử trong môi trường riêng." },
      { title: "Theo dõi", body: "Đọc log và trạng thái sau khi chạy." },
    ],
  };

  const g2t2Config = getG2T2Scene(3, scene, "g2t2-config", 0).html;
  const g2t3Check = getG2T3Scene(4, scene, "g2t3-check", 0).html;
  const g3t2Evidence = getG3T2Scene(3, scene, "g3t2-evidence", 0).html;
  const g3t3Action = getG3T3Scene(4, scene, "g3t3-action", 0).html;

  assert.match(g2t2Config, /deploy-spec-table/, "G2 template2 config scene should use deploy spec table");
  assert.doesNotMatch(g2t2Config, /bento-grid-2/, "G2 template2 config scene should not reuse bento grid");
  assert.match(g2t3Check, /workflow-gate-list/, "G2 template3 checklist scene should use workflow gates");
  assert.doesNotMatch(g2t3Check, /bento-grid-2/, "G2 template3 checklist scene should not reuse bento grid");
  assert.match(g3t2Evidence, /source-note-stack/, "G3 template2 evidence scene should use source note stack");
  assert.doesNotMatch(g3t2Evidence, /step-card/, "G3 template2 evidence scene should not reuse step cards");
  assert.match(g3t3Action, /action-console-list/, "G3 template3 action scene should use action console list");
  assert.doesNotMatch(g3t3Action, /step-card/, "G3 template3 action scene should not reuse step cards");
});

test("step and checklist animations reveal items one by one with readable spacing", () => {
  const renderers = [
    ["G1 template1", getG1T1Scene, [2, 3, 4, 6]],
    ["G1 template2", getG1T2Scene, [2, 3, 4, 6]],
    ["G1 template3", getG1T3Scene, [2, 3, 4, 6]],
    ["G2 template1", getG2T1Scene, [3, 4, 6]],
    ["G2 template2", getG2T2Scene, [3, 4, 6]],
    ["G2 template3", getG2T3Scene, [3, 4, 6]],
    ["G3 template1", getG3T1Scene, [3, 4, 6]],
    ["G3 template2", getG3T2Scene, [3, 4, 6]],
    ["G3 template3", getG3T3Scene, [3, 4, 6]],
  ];

  const scene = {
    scene: 5,
    headline_line1: "KIỂM TRA",
    headline_line2: "TRƯỚC KHI DÙNG",
    repo_url: "github.com/heygen-com/hyperframes",
    btn_text: "$ run check",
    steps: [
      { title: "Đọc docs", body: "Đọc hướng dẫn chính trước khi thử." },
      { title: "Chạy demo", body: "Chạy ví dụ nhỏ trong môi trường riêng." },
      { title: "Kiểm tra lỗi", body: "Xem issue và release gần đây." },
      { title: "Tích hợp", body: "Chỉ đưa vào workflow khi đã kiểm chứng." },
    ],
  };

  for (const [name, renderScene, sceneIndexes] of renderers) {
    for (const index of sceneIndexes) {
      const { gsap } = renderScene(index, scene, `seq-${name.replace(/\s+/g, "-")}-${index}`, 10);
      const times = [...gsap.matchAll(/tl\.(?:from|to)\("#(?:st|proof|check|runstep|ev|act|read)-[^"]+",\s*\{[^}]*opacity:\s*(?:0|1)[^}]*\},\s*([0-9.]+)/g)]
        .map((match) => Number(match[1]))
        .sort((a, b) => a - b);
      if (times.length < 3) continue;
      const deltas = times.slice(1).map((time, idx) => Number((time - times[idx]).toFixed(2)));
      assert.ok(deltas.every((delta) => delta >= 0.28), `${name} scene ${index + 1} reveals steps too quickly: ${deltas.join(", ")}`);
    }
  }
});

test("variant-level stagger animations do not hide card opacity", () => {
  const variantSceneFiles = [
    "templates/G1_github/template2/scenes.mjs",
    "templates/G1_github/template3/scenes.mjs",
    "templates/G2_docker/template2/scenes.mjs",
    "templates/G2_docker/template3/scenes.mjs",
    "templates/G3_web/template2/scenes.mjs",
    "templates/G3_web/template3/scenes.mjs",
  ];
  const unsafeVariantOpacity = /gsap \+= `\\n\s*tl\.from\("[^`]+(?:bento-card|step-card)[^`]+\{[^`]*opacity:\s*0/s;

  for (const file of variantSceneFiles) {
    const source = readFileSync(file, "utf8");
    assert.doesNotMatch(source, unsafeVariantOpacity, `${file} should not apply a second opacity-from tween to cards`);
  }
});

test("template card layouts use compact safe-area sizing", () => {
  for (const file of styleFiles) {
    const source = readFileSync(file, "utf8");
    assert.match(source, /Safe dense layout: keep every generated card visible/, `${file} needs safe dense layout guardrails`);
    assert.match(source, /\.step-card\s*\{[\s\S]*min-height:\s*116px !important/, `${file} should keep step cards compact enough for 3-4 visible cards`);
    assert.match(source, /\.bento-card\.half\s*\{[\s\S]*min-height:\s*205px !important/, `${file} should keep two-row bento grids inside the safe area`);
    if (file.includes("G1_github")) {
      assert.match(source, /\.github-star-crop\s*\{[\s\S]*object-fit:\s*cover !important/, `${file} should show the captured GitHub crop at full width`);
    }
  }
});

test("G1 repo signal scene has a visible star fallback when the crop is unavailable", () => {
  const renderers = [
    ["G1 template1", getG1T1Scene],
    ["G1 template2", getG1T2Scene],
    ["G1 template3", getG1T3Scene],
  ];

  for (const [name, renderScene] of renderers) {
    const { html } = renderScene(5, {
      headline_line1: "RTK STATS",
      headline_line2: "ĐỘ TIN CẬY BAN ĐẦU",
      repo_name: "rtk-ai/rtk",
      repo_lang: "Rust",
      repo_stars: "★ 54.436",
      repo_trend: "Repo",
      repo_trend_label: "GitHub",
    }, `star-${name.replace(/\s+/g, "-")}`, 0);

    assert.match(html, /github-star-wrap/, `${name} should wrap the crop with a fallback panel`);
    assert.match(html, /has-star-image/, `${name} should hide the fallback once the star crop loads`);
    assert.match(html, /GitHub Stars/, `${name} should label the star fallback`);
    assert.match(html, /★ 54\.436/, `${name} should show repo star text if the screenshot crop fails`);
  }
});

test("card fallback pads partial AI content so scenes cannot render with missing earlier cards", () => {
  const cards = getG1Template1Cards({
    headline_line1: "RTK",
    headline_line2: "TỐI ƯU LLM",
    steps: [
      { title: "Bước 1", body: "" },
      { title: "Bước 2", body: " " },
      { title: "Điểm thật", body: "Có nội dung thật cho card cuối." },
    ],
  }, 4);

  assert.equal(cards.length, 4);
  assert.deepEqual(cards.map((card) => card.title), ["Điểm thật", "Điểm chính", "Cách dùng", "Lưu ý"]);
  for (const card of cards) {
    assert.ok(card.body.trim().length >= 6);
  }
});

test("all non-intro scenes render the minimum information block count", () => {
  const renderers = [
    ["G1 template1", getG1T1Scene, 8],
    ["G1 template2", getG1T2Scene, 8],
    ["G1 template3", getG1T3Scene, 8],
    ["G2 template1", getG2T1Scene, 8],
    ["G2 template2", getG2T2Scene, 8],
    ["G2 template3", getG2T3Scene, 8],
    ["G3 template1", getG3T1Scene, 8],
    ["G3 template2", getG3T2Scene, 8],
    ["G3 template3", getG3T3Scene, 8],
  ];
  const countInfoBlocks = (html) =>
    (html.match(/class="[^"]*(?:bento-card|step-card|feature-item|timeline-item|repo-badge|docker-stats-card|terminal-frame|terminal-line|action-btn|deploy-spec-row|workflow-gate|source-note-row|action-console-row)[^"]*"/g) || []).length;

  for (const [name, renderScene, count] of renderers) {
    for (let index = 1; index < count; index += 1) {
      const scene = {
        scene: index + 1,
        headline_line1: "KIỂM TRA",
        headline_line2: "NỘI DUNG",
        repo_url: "github.com/rtk-ai/rtk",
        btn_text: "$ run demo",
        steps: [
          { title: "Bước 1", body: "" },
          { title: "Bước 2", body: "" },
          { title: "Điểm thật", body: "Một thông tin thật nhưng chưa đủ số card." },
        ],
        bento1_title: "",
        bento1_desc: "",
        bento2_title: "",
        bento2_desc: "",
        bento3_title: "Điểm thật",
        bento3_desc: "Một thông tin thật nhưng chưa đủ số card.",
      };
      const { html } = renderScene(index, scene, `count-${name.replace(/\s+/g, "-")}-${index + 1}`, index * 6);
      assert.ok(countInfoBlocks(html) >= 3, `${name} scene ${index + 1} rendered too few information blocks`);
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
