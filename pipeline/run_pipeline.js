import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { runCommand } from "../desktop_app/command_runner.mjs";
import { createNodePackageBinCommand } from "../desktop_app/runtime_binaries.mjs";
import { createWorkspacePaths, prepareWorkspaceRuntime } from "../desktop_app/workspace.mjs";
import {
  buildScreenshotProjectAsset,
  writeProjectAssetsManifest,
} from "./agent_dynamic_flow.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const appRoot = path.resolve(process.env.APP_ROOT || path.join(__dirname, ".."));
const workspaceRoot = path.resolve(process.env.WORKSPACE_DIR || appRoot);
const paths = createWorkspacePaths({ appRoot, workspaceRoot });
const nodeBin = process.execPath;

function run(command, args, options = {}) {
  return runCommand(command, args, {
    cwd: options.cwd || appRoot,
    env: { ...process.env, ...(options.env || {}) },
    stdio: options.stdio || "inherit",
    encoding: options.encoding,
  });
}

export function findJsonPath(output) {
  const lines = output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  for (const line of lines) {
    const markerIndex = line.lastIndexOf(": ");
    if (markerIndex !== -1 && line.toLowerCase().includes(".json")) {
      const candidate = line.slice(markerIndex + 2).trim();
      if (candidate.endsWith(".json")) return candidate;
    }
  }

  const matches = output.match(/[A-Za-z]:[^\r\n]+?\.json|\/[^\r\n]+?\.json/g) || [];
  if (matches.length === 0) {
    throw new Error("Khong tim thay duong dan file JSON da tao trong output.");
  }
  return matches[matches.length - 1].trim();
}

function findLatestMp4(rendersDir) {
  if (!fs.existsSync(rendersDir)) return null;
  const mp4Files = fs
    .readdirSync(rendersDir)
    .filter((file) => file.endsWith(".mp4"))
    .map((file) => ({ name: file, mtime: fs.statSync(path.join(rendersDir, file)).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime);

  return mp4Files[0]?.name || null;
}

async function main() {
  const targetUrl = process.argv[2];
  if (!targetUrl) {
    console.error("Loi: Vui long cung cap URL can tao video.");
    console.error("Vi du GitHub: node pipeline/run_pipeline.js https://github.com/heygen-com/hyperframes");
    console.error("Vi du Docker: node pipeline/run_pipeline.js https://hub.docker.com/_/nginx");
    console.error("Vi du web: node pipeline/run_pipeline.js https://example.com/some-tech-article");
    process.exit(1);
  }

  await prepareWorkspaceRuntime(paths);

  console.log("\n==================================================");
  console.log("KHOI CHAY PIPELINE TAO VIDEO TECH TU DONG");
  console.log(`Target URL: ${targetUrl}`);
  console.log(`App root: ${appRoot}`);
  console.log(`Workspace: ${workspaceRoot}`);
  console.log("==================================================\n");

  console.log("Step 1: Chup anh man hinh trang nguon...");
  const screenshotPath = path.join(paths.imageDir, "github_repo.png");
  run(nodeBin, [path.join(__dirname, "capture_github.js"), targetUrl], {
    cwd: appRoot,
    env: {
      APP_ROOT: appRoot,
      SCREENSHOT_PATH: screenshotPath,
    },
  });

  const projectAssets = [await buildScreenshotProjectAsset(screenshotPath)];
  const projectAssetsPath = await writeProjectAssetsManifest({
    agentOutputDir: paths.agentOutputDir,
    projectAssets,
  });
  console.log(`Da khai bao project asset: ${path.basename(screenshotPath)} (${projectAssets[0].aspectRatio})`);

  console.log("\nStep 2: Phan tich URL va tao kich ban JSON...");
  const result1 = run(nodeBin, [path.join(__dirname, "main_generateContent.js"), targetUrl], {
    cwd: appRoot,
    encoding: "utf-8",
    stdio: ["ignore", "pipe", "pipe"],
    env: {
      APP_ROOT: appRoot,
      DATA_DIR: paths.dataDir,
      PROJECT_ASSETS_PATH: projectAssetsPath,
    },
  });
  if (result1.stdout) console.log(result1.stdout);
  if (result1.stderr) console.error(result1.stderr);

  const jsonPath = findJsonPath(result1.stdout || "");
  const jsonBaseName = path.basename(jsonPath, ".json");

  console.log("\nStep 3: Tao giong doc bang Node va moc thoi gian phu de...");
  run(nodeBin, [path.join(__dirname, "gen_assets.mjs"), jsonPath], {
    cwd: appRoot,
    env: {
      APP_ROOT: appRoot,
      WORKSPACE_DIR: workspaceRoot,
    },
  });

  console.log("\nStep 4: Bien dich kich ban sang HTML composition...");
  run(nodeBin, [path.join(__dirname, "generate.mjs"), jsonPath], {
    cwd: appRoot,
    env: {
      APP_ROOT: appRoot,
      COMPOSITION_PATH: paths.compositionPath,
      AGENT_OUTPUT_DIR: paths.agentOutputDir,
    },
  });

  console.log("\nStep 5: Kiem tra composition bang HyperFrames...");
  const hyperframesValidate = createNodePackageBinCommand({
    appRoot,
    packageName: "hyperframes",
    binRelativePath: path.join("dist", "cli.js"),
    args: ["validate"],
    nodePath: nodeBin,
  });
  run(hyperframesValidate.command, hyperframesValidate.args, { cwd: workspaceRoot });

  console.log("\nStep 6: Ket xuat video MP4...");
  const hyperframesRender = createNodePackageBinCommand({
    appRoot,
    packageName: "hyperframes",
    binRelativePath: path.join("dist", "cli.js"),
    args: ["render", "--workers=2"],
    nodePath: nodeBin,
  });
  run(hyperframesRender.command, hyperframesRender.args, { cwd: workspaceRoot });

  console.log("\nStep 6b: Doi ten video theo dinh dang ten-video-date-time...");
  const latestMp4 = findLatestMp4(paths.rendersDir);
  if (latestMp4) {
    const newMp4Name = `${jsonBaseName}.mp4`;
    const oldPath = path.join(paths.rendersDir, latestMp4);
    const newPath = path.join(paths.rendersDir, newMp4Name);
    if (latestMp4 !== newMp4Name) {
      fs.renameSync(oldPath, newPath);
      console.log(`Video da doi ten: ${latestMp4} -> ${newMp4Name}`);
    } else {
      console.log(`Video da co ten dung: ${newMp4Name}`);
    }
  }

  console.log("\nStep 7: Don dep file audio tam...");
  if (fs.existsSync(paths.audioDir)) {
    const files = fs.readdirSync(paths.audioDir);
    let deletedCount = 0;
    for (const file of files) {
      if (file.endsWith(".wav")) {
        fs.unlinkSync(path.join(paths.audioDir, file));
        deletedCount++;
      }
    }
    console.log(`Da xoa ${deletedCount} file .wav trong thu muc assets/audio.`);
  }

  console.log("\n==================================================");
  console.log("PIPELINE DA HOAN THANH");
  console.log(`Video moi da duoc luu trong thu muc renders/ voi ten: ${jsonBaseName}.mp4`);
  console.log("==================================================\n");
}

const isCli = process.argv[1] && path.resolve(process.argv[1]) === __filename;

if (isCli) {
  main().catch((error) => {
    console.error("\nGap loi trong qua trinh chay pipeline:", error.message);
    process.exit(1);
  });
}
