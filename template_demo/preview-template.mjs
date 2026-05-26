import { spawnSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { DEMO_SPECS, buildDemoData } from "./demo-fixtures.mjs";

const repoRoot = process.cwd();
const demoRoot = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(demoRoot, "data");

const [template = "G1_github", subtemplate = "template1"] = process.argv.slice(2);
const valid = DEMO_SPECS.some(([group, variant]) => group === template && variant === subtemplate);

if (!valid) {
  console.error("Usage: node template_demo/preview-template.mjs <G1_github|G2_docker|G3_web> <template1|template2|template3>");
  console.error("Examples:");
  for (const [group, variant] of DEMO_SPECS) {
    console.error(`  node template_demo/preview-template.mjs ${group} ${variant}`);
  }
  process.exit(1);
}

fs.mkdirSync(dataDir, { recursive: true });

const dataPath = path.join(dataDir, `${template}-${subtemplate}.json`);
fs.writeFileSync(dataPath, `${JSON.stringify(buildDemoData(template, subtemplate), null, 2)}\n`, "utf8");

const result = spawnSync(
  process.execPath,
  ["pipeline/generate.mjs", dataPath],
  {
    cwd: repoRoot,
    stdio: "inherit",
    env: {
      ...process.env,
      COMPOSITION_PATH: path.join(repoRoot, "index.html"),
    },
  }
);

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

console.log("");
console.log(`Preview ready: ${template}/${subtemplate}`);
console.log("Run `npm run dev` once, then refresh the HyperFrames preview after switching templates.");
