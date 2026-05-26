import { spawnSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { DEMO_SPECS, buildDemoData } from "./demo-fixtures.mjs";

const repoRoot = process.cwd();
const demoRoot = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(demoRoot, "data");
const renderedDir = path.join(demoRoot, "rendered");

fs.mkdirSync(dataDir, { recursive: true });
fs.mkdirSync(renderedDir, { recursive: true });

function patchRenderedHtml(filePath) {
  const html = fs.readFileSync(filePath, "utf8");
  const patched = html
    .replace("<head>", '<head>\n  <base href="../../">')
    .replace(
      "</body>",
      `  <script>
    window.addEventListener("load", () => {
      window.setTimeout(() => {
        const timelines = window.__timelines || {};
        const timeline = timelines["news-multi"] || timelines["docker-multi"] || timelines.main;
        if (timeline && typeof timeline.play === "function") {
          timeline.timeScale(0.85);
          timeline.play(0);
        }
      }, 120);
    });
  </script>
</body>`
    );
  fs.writeFileSync(filePath, patched, "utf8");
}

function buildOne(template, subtemplate) {
  const dataPath = path.join(dataDir, `${template}-${subtemplate}.json`);
  const outputPath = path.join(renderedDir, `${template}-${subtemplate}.html`);

  fs.writeFileSync(dataPath, `${JSON.stringify(buildDemoData(template, subtemplate), null, 2)}\n`, "utf8");

  const result = spawnSync(process.execPath, ["pipeline/generate.mjs", dataPath], {
    cwd: repoRoot,
    stdio: "inherit",
    env: {
      ...process.env,
      COMPOSITION_PATH: outputPath,
    },
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }

  patchRenderedHtml(outputPath);
  return {
    label: `${template}/${subtemplate}`,
    src: `rendered/${template}-${subtemplate}.html`,
  };
}

const previews = DEMO_SPECS.map(([template, subtemplate]) => buildOne(template, subtemplate));

const cardsHtml = previews.map((preview) => `
      <section class="preview-card">
        <header>
          <strong>${preview.label}</strong>
          <a href="${preview.src}" target="_blank" rel="noreferrer">Open</a>
        </header>
        <iframe src="${preview.src}" title="${preview.label}" loading="eager"></iframe>
      </section>`).join("");

const overviewHtml = `<!doctype html>
<html lang="vi">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Template Demo Overview</title>
  <style>
    :root {
      color-scheme: dark;
      --bg: #0a0c10;
      --panel: #111620;
      --line: rgba(255, 255, 255, 0.12);
      --text: #f4f7fb;
      --muted: rgba(244, 247, 251, 0.62);
      --accent: #fdf01c;
    }

    * {
      box-sizing: border-box;
    }

    body {
      margin: 0;
      min-height: 100vh;
      background: var(--bg);
      color: var(--text);
      font-family: "Segoe UI", "Noto Sans", "Helvetica Neue", Arial, sans-serif;
    }

    .page {
      width: min(1800px, calc(100vw - 32px));
      margin: 0 auto;
      padding: 22px 0 28px;
    }

    .topbar {
      display: flex;
      align-items: end;
      justify-content: space-between;
      gap: 18px;
      margin-bottom: 18px;
    }

    h1 {
      margin: 0;
      font-size: 28px;
      line-height: 1.2;
      letter-spacing: 0;
    }

    .hint {
      margin: 6px 0 0;
      color: var(--muted);
      font-size: 14px;
    }

    .refresh {
      color: var(--accent);
      text-decoration: none;
      font-size: 14px;
      font-weight: 700;
      border: 1px solid rgba(253, 240, 28, 0.28);
      border-radius: 6px;
      padding: 9px 12px;
      white-space: nowrap;
    }

    .grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 14px;
    }

    .preview-card {
      min-width: 0;
      overflow: hidden;
      background: var(--panel);
      border: 1px solid var(--line);
      border-radius: 8px;
    }

    .preview-card header {
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 0 12px;
      border-bottom: 1px solid var(--line);
      font-size: 13px;
    }

    .preview-card a {
      color: var(--accent);
      text-decoration: none;
      font-weight: 700;
    }

    iframe {
      display: block;
      width: 100%;
      aspect-ratio: 9 / 16;
      border: 0;
      background: #050505;
    }

    @media (max-width: 1180px) {
      .grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }

    @media (max-width: 760px) {
      .page {
        width: min(100vw - 18px, 560px);
      }

      .topbar {
        align-items: stretch;
        flex-direction: column;
      }

      .grid {
        grid-template-columns: 1fr;
      }
    }
  </style>
</head>
<body>
  <main class="page">
    <div class="topbar">
      <div>
        <h1>Template Demo Overview</h1>
        <p class="hint">Hiển thị đồng thời 9 template bằng data mock, không cần render video.</p>
      </div>
      <a class="refresh" href="index.html">Restart all</a>
    </div>
    <div class="grid">
${cardsHtml}
    </div>
  </main>
</body>
</html>
`;

const overviewPath = path.join(demoRoot, "index.html");
fs.writeFileSync(overviewPath, overviewHtml, "utf8");

console.log("");
console.log(`Overview ready: ${overviewPath}`);
console.log("Open template_demo/index.html in your browser.");
