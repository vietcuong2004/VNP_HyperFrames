import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { DEMO_SPECS, buildDemoData } from "./demo-fixtures.mjs";

const demoRoot = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(demoRoot, "data");

fs.mkdirSync(dataDir, { recursive: true });

for (const [template, subtemplate] of DEMO_SPECS) {
  const outputPath = path.join(dataDir, `${template}-${subtemplate}.json`);
  fs.writeFileSync(outputPath, `${JSON.stringify(buildDemoData(template, subtemplate), null, 2)}\n`, "utf8");
  console.log(`Wrote ${outputPath}`);
}
