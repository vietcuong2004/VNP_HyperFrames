// src/agents/assetMapperAgent.js — AI-powered project asset → scene mapping
// Thay thế keyword matching thuần bằng AI hiểu ngữ nghĩa cross-language
import { callAI } from '../services/aiRouter.js';

/**
 * Dùng AI để map project assets (file user upload) vào từng scene.
 * AI hiểu ngữ nghĩa nên match được tên EN với voice/visual VI và ngược lại.
 *
 * @param {{
 *   script: Array<{stt:number, voice:string, visual:string}>,
 *   projectAssets: Array<{name:string, type:string, aspectRatio:string, filename:string, fileUrl:string}>,
 *   keys: object,
 *   onLog?: (msg:string)=>void
 * }} opts
 * @returns {Promise<Record<number, object[]>>}  { stt → [asset, ...] }
 */
export async function mapAssetsToScenes({ script, projectAssets, keys, onLog }) {
  if (!projectAssets?.length || !script?.length) return {};

  const log = (msg) => { console.log(`[AssetMapper] ${msg}`); onLog?.(msg); };

  // Build compact scene summary cho prompt (tiết kiệm token)
  const sceneSummary = script.map(sc =>
    `Scene ${sc.stt}: voice="${sc.voice.slice(0, 120)}" | visual="${sc.visual.slice(0, 100)}"`
  ).join('\n');

  // Build asset list
  const assetList = projectAssets.map((a, i) =>
    `[${i}] "${a.name}" (${a.type}, ${a.aspectRatio})`
  ).join('\n');

  const prompt = `You are a video asset coordinator. Match uploaded project files to the most relevant video scenes.

ASSET LIST (index | name | type | ratio):
${assetList}

SCENE LIST:
${sceneSummary}

RULES:
• Each asset can be assigned to 1-2 scenes maximum (the most relevant ones)
• A scene can have 0 or multiple assets
• Match by MEANING — asset name may be in English while scene voice/visual is in Vietnamese (or vice versa)
• Examples: "bitcoin-logo.png" matches a scene about "Bitcoin là gì", "growth-chart" matches "tăng trưởng"
• If an asset name is generic (e.g. "IMG_001", "screenshot") and has no clear match, assign it to the scene where it would fit best based on type and context, or leave unassigned
• Return ONLY valid asset indices from the list above

Return a JSON object where keys are scene numbers (stt) and values are arrays of asset indices.
Only include scenes that have at least 1 asset. Example:
{"1": [0, 2], "3": [1]}

Return ONLY the JSON object. No explanation.`;

  const t0 = Date.now();
  log(`Mapping ${projectAssets.length} assets → ${script.length} scenes...`);

  try {
    const { result } = await callAI({ prompt, isJson: true, keys, onLog });

    // Parse result: { "1": [0, 2], "3": [1] } → { 1: [assetObj, ...], 3: [assetObj, ...] }
    const map = {};
    for (const sc of script) map[sc.stt] = [];

    for (const [sttStr, indices] of Object.entries(result)) {
      const stt = Number(sttStr);
      if (!map[stt]) continue;
      if (!Array.isArray(indices)) continue;

      for (const idx of indices) {
        const i = Number(idx);
        if (Number.isInteger(i) && i >= 0 && i < projectAssets.length) {
          // Tránh gán trùng asset vào cùng scene
          const asset = projectAssets[i];
          if (!map[stt].some(a => a.filename === asset.filename)) {
            map[stt].push(asset);
          }
        }
      }
    }

    const elapsed = Date.now() - t0;
    const assigned = Object.entries(map).filter(([, v]) => v.length > 0);
    log(`✓ AI mapped ${assigned.length} scenes có asset (${(elapsed / 1000).toFixed(1)}s)`);
    if (assigned.length) {
      log(`  ${assigned.map(([stt, v]) => `cảnh ${stt}→${v.map(a => a.name).join(', ')}`).join(' | ')}`);
    }

    return map;
  } catch (e) {
    log(`⚠ AI asset mapping failed: ${e.message?.slice(0, 120)} — fallback keyword matching`);
    return null; // null = signal cho caller dùng fallback
  }
}

// EOF: agents/assetMapperAgent.js
