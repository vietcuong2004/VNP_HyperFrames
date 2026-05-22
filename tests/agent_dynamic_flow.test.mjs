import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";

import {
  buildScreenshotProjectAsset,
  createAgentComposition,
  writeProjectAssetsManifest,
} from "../pipeline/agent_dynamic_flow.mjs";

const PNG_2X3 = Buffer.from(
  "89504e470d0a1a0a0000000d4948445200000002000000030806000000f478d4fa0000000049454e44ae426082",
  "hex",
);

test("buildScreenshotProjectAsset declares github_repo.png with real PNG ratio", async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), "hf-agent-asset-"));
  try {
    const screenshotPath = path.join(tempRoot, "assets", "images", "github_repo.png");
    await mkdir(path.dirname(screenshotPath), { recursive: true });
    await writeFile(screenshotPath, PNG_2X3);

    const asset = await buildScreenshotProjectAsset(screenshotPath);

    assert.deepEqual(asset, {
      name: "github_repo.png",
      type: "image",
      filename: "github_repo.png",
      fileUrl: "./assets/images/github_repo.png",
      aspectRatio: "2:3",
      width: 2,
      height: 3,
    });
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
});

test("writeProjectAssetsManifest keeps new flow output inside agent_output", async () => {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), "hf-agent-manifest-"));
  try {
    const manifestPath = await writeProjectAssetsManifest({
      agentOutputDir: path.join(tempRoot, "agent_output"),
      projectAssets: [{ name: "github_repo.png", fileUrl: "./assets/images/github_repo.png" }],
    });

    assert.equal(manifestPath, path.join(tempRoot, "agent_output", "project_assets.json"));
    const json = JSON.parse(await readFile(manifestPath, "utf8"));
    assert.equal(json.projectAssets[0].name, "github_repo.png");
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
});

test("createAgentComposition writes scene HTML files and root composition using screenshot asset", async () => {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), "hf-agent-composition-"));
  try {
    const agentOutputDir = path.join(tempRoot, "agent_output");
    const compositionPath = path.join(tempRoot, "index.html");
    const data = {
      title: "Demo",
      render_mode: "agent_html",
      projectAssets: [
        {
          name: "github_repo.png",
          type: "image",
          fileUrl: "./assets/images/github_repo.png",
          aspectRatio: "2:3",
          width: 2,
          height: 3,
        },
      ],
      scenes: [
        {
          scene: 1,
          voice: "Giới thiệu repo và cuộn qua trang nguồn.",
          visual: "Auto-scroll ảnh chụp trang GitHub.",
          headline_line1: "DEMO",
          headline_line2: "GITHUB REPO",
          assets: ["github_repo.png"],
          visual_motion: "auto-scroll screenshot from top to bottom",
          audio: { duration: 4 },
        },
      ],
    };

    const result = await createAgentComposition({ data, agentOutputDir, compositionPath });

    assert.equal(result.scenePaths.length, 1);
    assert.equal(result.rootPath, compositionPath);
    assert.match(await readFile(result.scenePaths[0], "utf8"), /github_repo\.png/);
    const rootHtml = await readFile(compositionPath, "utf8");
    assert.match(rootHtml, /agent_output\/scenes\/scene-1\.html/);
    assert.match(rootHtml, /window\.__timelines\["main"\]/);
    assert.match(rootHtml, /data-composition-src="agent_output\/scenes\/scene-1\.html"/);
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
});
