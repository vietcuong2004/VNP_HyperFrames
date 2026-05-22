import fs from "fs";
import fsp from "fs/promises";
import path from "path";

const SCREENSHOT_ASSET_NAME = "github_repo.png";
const SCREENSHOT_ASSET_URL = "./assets/images/github_repo.png";

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeAttr(value) {
  return escapeHtml(value).replace(/`/g, "&#96;");
}

function parsePngDimensions(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 24) {
    throw new Error("PNG không hợp lệ: file quá ngắn.");
  }
  const signature = buffer.subarray(0, 8).toString("hex");
  if (signature !== "89504e470d0a1a0a") {
    throw new Error("PNG không hợp lệ: sai signature.");
  }
  const chunkType = buffer.subarray(12, 16).toString("ascii");
  if (chunkType !== "IHDR") {
    throw new Error("PNG không hợp lệ: thiếu IHDR.");
  }
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  };
}

function gcd(a, b) {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y) {
    const t = y;
    y = x % y;
    x = t;
  }
  return x || 1;
}

function ratioLabel(width, height) {
  const divisor = gcd(width, height);
  return `${Math.round(width / divisor)}:${Math.round(height / divisor)}`;
}

export async function buildScreenshotProjectAsset(screenshotPath) {
  const buffer = await fsp.readFile(screenshotPath);
  const { width, height } = parsePngDimensions(buffer);
  return {
    name: SCREENSHOT_ASSET_NAME,
    type: "image",
    filename: SCREENSHOT_ASSET_NAME,
    fileUrl: SCREENSHOT_ASSET_URL,
    aspectRatio: ratioLabel(width, height),
    width,
    height,
  };
}

export async function writeProjectAssetsManifest({ agentOutputDir, projectAssets }) {
  await fsp.mkdir(agentOutputDir, { recursive: true });
  const manifestPath = path.join(agentOutputDir, "project_assets.json");
  await fsp.writeFile(
    manifestPath,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        projectAssets,
      },
      null,
      2,
    ),
    "utf8",
  );
  return manifestPath;
}

export function buildProjectAssetsPrompt(projectAssets = []) {
  if (!projectAssets.length) return "";
  const lines = projectAssets
    .map((asset) => `- ${asset.name} | ${asset.type} | ${asset.aspectRatio} | ${asset.fileUrl}`)
    .join("\n");
  return `

TÀI NGUYÊN DỰ ÁN CÓ SẴN:
${lines}

YÊU CẦU CHO SCRIPT AGENT:
- Khi cảnh cần minh họa trực quan trang nguồn, thêm đúng tên asset vào "assets", ví dụ: ["github_repo.png"].
- Với ảnh chụp trang nguồn, viết "visual_motion" mô tả nhịp auto-scroll, zoom, hoặc pan cần dùng.
- Không bịa tên asset khác. Chỉ dùng đúng tên trong danh sách trên.
`;
}

function sceneNeedsScreenshot(scene, index) {
  const text = `${scene.visual || ""} ${scene.layout || ""} ${scene.headline_line1 || ""} ${scene.headline_line2 || ""}`.toLowerCase();
  return (
    index === 0 ||
    text.includes("screenshot") ||
    text.includes("github") ||
    text.includes("docker hub") ||
    text.includes("trang") ||
    text.includes("repo") ||
    text.includes("web")
  );
}

export function attachProjectAssetsToData(data, projectAssets = []) {
  const screenshot = projectAssets.find((asset) => asset.name === SCREENSHOT_ASSET_NAME);
  const scenes = Array.isArray(data.scenes)
    ? data.scenes.map((scene, index) => {
        const next = { ...scene };
        const assets = Array.isArray(next.assets) ? [...next.assets] : [];
        if (screenshot && !assets.includes(screenshot.name) && sceneNeedsScreenshot(next, index)) {
          assets.unshift(screenshot.name);
        }
        next.assets = assets;
        if (screenshot && assets.includes(screenshot.name) && !next.visual_motion) {
          next.visual_motion = "auto-scroll screenshot from top to bottom, then slow zoom into the most relevant section";
        }
        return next;
      })
    : [];

  return {
    ...data,
    render_mode: "agent_html",
    template: data.template || "agent_dynamic",
    projectAssets,
    scenes,
  };
}

function getSceneDurationSeconds(scene) {
  const value = Number(scene.audio?.duration || scene.duration || scene.duration_sec || 5);
  return Number.isFinite(value) && value > 0 ? value : 5;
}

function getSceneAssets(scene, projectAssets) {
  const names = new Set(Array.isArray(scene.assets) ? scene.assets : []);
  return projectAssets.filter((asset) => names.has(asset.name));
}

function renderCards(scene) {
  const source = Array.isArray(scene.steps) && scene.steps.length
    ? scene.steps
    : Array.isArray(scene.cards) && scene.cards.length
      ? scene.cards
      : [1, 2, 3, 4]
          .map((idx) => ({
            title: scene[`bento${idx}_title`],
            body: scene[`bento${idx}_desc`],
          }))
          .filter((item) => item.title || item.body);

  return source
    .slice(0, 4)
    .map((card, index) => `
      <article class="step-card" id="step-${index + 1}">
        <div class="step-index">${index + 1}</div>
        <div>
          <h3>${escapeHtml(card.title || `Bước ${index + 1}`)}</h3>
          <p>${escapeHtml(card.body || card.desc || card.description || "")}</p>
        </div>
      </article>`)
    .join("");
}

function renderScreenshotStage(scene, projectAssets) {
  const asset = getSceneAssets(scene, projectAssets).find((item) => item.name === SCREENSHOT_ASSET_NAME);
  if (!asset) return "";
  return `
    <section class="browser-stage" aria-label="source screenshot">
      <div class="browser-top">
        <span></span><span></span><span></span>
        <strong>${escapeHtml(scene.repo_url || asset.name)}</strong>
      </div>
      <div class="browser-viewport">
        <img id="source-shot" src="${escapeAttr(asset.fileUrl)}" alt="${escapeAttr(asset.name)}" />
      </div>
    </section>`;
}

function renderSceneHtml(scene, sceneIndex, projectAssets) {
  const duration = getSceneDurationSeconds(scene);
  const hasScreenshot = getSceneAssets(scene, projectAssets).some((asset) => asset.name === SCREENSHOT_ASSET_NAME);
  const scrollDistance = hasScreenshot ? -1250 : 0;
  const cards = renderCards(scene);
  const screenshotStage = renderScreenshotStage(scene, projectAssets);
  const title1 = scene.headline_line1 || `CẢNH ${sceneIndex + 1}`;
  const title2 = scene.headline_line2 || "NỘI DUNG CHÍNH";
  const voice = scene.voice || scene.visual || "";
  const visualMotion = scene.visual_motion || scene.visual || "";

  return `<!doctype html>
<html lang="vi">
<head>
  <meta charset="utf-8" />
  <style>
    @font-face{font-family:"Be Vietnam Pro";src:url("../../vendor/fonts/be-vietnam-pro-latin-ext-700-normal.woff2") format("woff2");font-weight:700;font-display:block}
    @font-face{font-family:"Be Vietnam Pro";src:url("../../vendor/fonts/be-vietnam-pro-latin-ext-900-normal.woff2") format("woff2");font-weight:900;font-display:block}
    *{box-sizing:border-box}
    html,body{width:1080px;height:1920px;margin:0;overflow:hidden;background:#06070a;color:#fff;font-family:"Be Vietnam Pro",Arial,sans-serif}
    .scene{position:relative;width:1080px;height:1920px;overflow:hidden;background:linear-gradient(180deg,#07111f 0%,#07070a 72%)}
    .scene:before{content:"";position:absolute;inset:0;background:radial-gradient(circle at 22% 18%,rgba(0,214,255,.22),transparent 34%),radial-gradient(circle at 82% 26%,rgba(255,214,92,.18),transparent 30%);pointer-events:none}
    .headline{position:absolute;left:64px;right:64px;top:${hasScreenshot ? 930 : 170}px;z-index:3;text-align:left}
    .headline h1{margin:0;font-size:76px;line-height:1.14;font-weight:900;letter-spacing:0;text-transform:uppercase}
    .headline h2{margin:8px 0 0;font-size:56px;line-height:1.14;font-weight:900;letter-spacing:0;color:#49dcff;text-transform:uppercase}
    .browser-stage{position:absolute;left:54px;right:54px;top:88px;height:790px;z-index:2;border-radius:28px;overflow:hidden;border:2px solid rgba(255,255,255,.14);box-shadow:0 34px 80px rgba(0,0,0,.62);background:#0d1117}
    .browser-top{height:66px;display:flex;align-items:center;gap:12px;padding:0 24px;background:#151b23;color:rgba(255,255,255,.68);font-size:20px}
    .browser-top span{width:15px;height:15px;border-radius:50%;background:#ff5f56}.browser-top span:nth-child(2){background:#ffbd2e}.browser-top span:nth-child(3){background:#27c93f}
    .browser-top strong{margin-left:18px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .browser-viewport{position:absolute;left:0;right:0;top:66px;bottom:0;overflow:hidden;background:#fff}
    .browser-viewport img{width:100%;height:auto;display:block;transform-origin:50% 0}
    .cards{position:absolute;left:64px;right:64px;top:${hasScreenshot ? 1195 : 520}px;z-index:3;display:grid;gap:18px}
    .step-card{display:grid;grid-template-columns:72px 1fr;gap:20px;align-items:center;min-height:132px;padding:24px 28px;border:1px solid rgba(255,255,255,.12);border-radius:22px;background:rgba(8,12,18,.72);backdrop-filter:blur(16px)}
    .step-index{width:58px;height:58px;border-radius:16px;background:#49dcff;color:#061018;display:flex;align-items:center;justify-content:center;font-size:28px;font-weight:900}
    .step-card h3{margin:0;font-size:32px;line-height:1.16;font-weight:900}
    .step-card p{margin:7px 0 0;font-size:23px;line-height:1.32;color:rgba(255,255,255,.7)}
    .voice{position:absolute;left:64px;right:64px;bottom:132px;z-index:4;padding:22px 28px;border-radius:24px;background:rgba(0,0,0,.56);border:1px solid rgba(255,255,255,.12);font-size:28px;line-height:1.32;color:rgba(255,255,255,.86)}
    .motion-note{position:absolute;left:64px;right:64px;bottom:76px;z-index:4;font-size:18px;color:rgba(73,220,255,.74);text-transform:uppercase;letter-spacing:0}
  </style>
</head>
<body>
  <main class="scene">
    ${screenshotStage}
    <section class="headline">
      <h1 id="headline-1">${escapeHtml(title1)}</h1>
      <h2 id="headline-2">${escapeHtml(title2)}</h2>
    </section>
    <section class="cards">${cards}</section>
    <div class="voice">${escapeHtml(voice)}</div>
    <div class="motion-note">${escapeHtml(visualMotion)}</div>
  </main>
  <script src="../vendor/gsap.min.js"></script>
  <script>
    window.__timelines = window.__timelines || {};
    const tl = gsap.timeline({ paused: true });
    tl.from("#headline-1", { y: 24, opacity: 0, duration: 0.35, ease: "power3.out" }, 0);
    tl.from("#headline-2", { y: 24, opacity: 0, duration: 0.35, ease: "power3.out" }, 0.08);
    tl.from(".step-card", { y: 22, opacity: 0, duration: 0.32, stagger: 0.12, ease: "power3.out" }, 0.28);
    ${hasScreenshot ? `tl.to("#source-shot", { y: ${scrollDistance}, scale: 1.03, duration: ${Math.max(2, duration - 1).toFixed(2)}, ease: "power1.inOut" }, 0.45);` : ""}
    window.__timelines["main"] = tl;
  </script>
</body>
</html>`;
}

function renderRootComposition(scenes) {
  let cursor = 0;
  const clips = scenes.map((scene, index) => {
    const duration = getSceneDurationSeconds(scene);
    const start = cursor;
    cursor += duration;
    return `
    <div class="clip" data-track-index="0" data-start="${start.toFixed(3)}" data-duration="${duration.toFixed(3)}" data-composition-src="agent_output/scenes/scene-${index + 1}.html"></div>`;
  }).join("");

  return `<!doctype html>
<html lang="vi">
<head>
  <meta charset="utf-8" />
  <style>
    html,body{width:1080px;height:1920px;margin:0;overflow:hidden;background:#050505}
    .clip{position:absolute;inset:0;width:1080px;height:1920px}
  </style>
</head>
<body>
  ${clips}
  <script src="./vendor/gsap.min.js"></script>
  <script>
    window.__timelines = window.__timelines || {};
    window.__timelines["main"] = gsap.timeline({ paused: true });
  </script>
</body>
</html>`;
}

export async function createAgentComposition({ data, agentOutputDir, compositionPath }) {
  const scenesDir = path.join(agentOutputDir, "scenes");
  await fsp.mkdir(scenesDir, { recursive: true });

  const projectAssets = Array.isArray(data.projectAssets) ? data.projectAssets : [];
  const scenes = Array.isArray(data.scenes) ? data.scenes : [];
  const scenePaths = [];

  for (let index = 0; index < scenes.length; index += 1) {
    const scenePath = path.join(scenesDir, `scene-${index + 1}.html`);
    await fsp.writeFile(scenePath, renderSceneHtml(scenes[index], index, projectAssets), "utf8");
    scenePaths.push(scenePath);
  }

  await fsp.mkdir(path.dirname(compositionPath), { recursive: true });
  await fsp.writeFile(compositionPath, renderRootComposition(scenes), "utf8");

  return {
    rootPath: compositionPath,
    scenePaths,
  };
}

export async function loadProjectAssetsFromEnv() {
  const manifestPath = process.env.PROJECT_ASSETS_PATH;
  if (!manifestPath || !fs.existsSync(manifestPath)) return [];
  const json = JSON.parse(await fsp.readFile(manifestPath, "utf8"));
  return Array.isArray(json.projectAssets) ? json.projectAssets : [];
}
