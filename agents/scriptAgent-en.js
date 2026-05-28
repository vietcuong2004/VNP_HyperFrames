// src/agents/scriptAgent-en.js — English script prompt + generator
// Dùng khi outputLanguage = 'en'
import { callAI } from '../services/aiRouter.js';

const WORD_TARGETS_BY_SCENE_DURATION = {
  5: 20,
  6: 25,
  7: 30,
  8: 34,
  10: 43,
};

function buildDurationPlan(videoDurationSec = 60, sceneDurationSec = 7) {
  const safeVideoDurationSec = Math.max(30, Math.min(1200, Number(videoDurationSec) || 60));
  const safeSceneDurationSec = Math.max(5, Math.min(8, Number(sceneDurationSec) || 7));
  const sceneCount = Math.max(1, Math.ceil(safeVideoDurationSec / safeSceneDurationSec));
  const wordsPerScene = WORD_TARGETS_BY_SCENE_DURATION[safeSceneDurationSec]
    ?? Math.max(12, Math.round(safeSceneDurationSec * 4.2));
  const minWordsPerScene = Math.max(10, wordsPerScene - 3);
  const maxWordsPerScene = wordsPerScene + 4;
  const totalWordsTarget = sceneCount * wordsPerScene;
  const structureGuide = safeVideoDurationSec >= 300
    ? 'Structure should include an intro, main content points with examples/analysis, and a strong closing that reinforces the key message.'
    : 'Keep a fast hook, brief development, and a concise takeaway.';
  return { safeVideoDurationSec, safeSceneDurationSec, sceneCount, wordsPerScene, minWordsPerScene, maxWordsPerScene, totalWordsTarget, structureGuide };
}

const SCRIPT_PROMPT_EN = `You are a professional video scriptwriter and director for English-language educational content.

Write a script for the topic: "{{TOPIC}}"

{{PROJECT_ASSETS_BLOCK}}

VIDEO DURATION PARAMETERS:
- Target total duration: approximately {{VIDEO_DURATION_SEC}} seconds
- Target per scene: approximately {{SCENE_DURATION_SEC}} seconds
- Target number of scenes: {{SCENE_COUNT}} scenes
- Target words per scene: approximately {{WORDS_PER_SCENE}} words
- Safe range per scene: {{MIN_WORDS_PER_SCENE}}-{{MAX_WORDS_PER_SCENE}} words
- Target total words: approximately {{TOTAL_WORDS_TARGET}} words
- Content pacing: {{STRUCTURE_GUIDE}}
- IMPORTANT: These numbers are ESTIMATES for pacing. Real TTS duration will follow the actual voice length, so scenes may be slightly shorter or longer for natural flow.
- CRITICAL: TTS usually reads faster than written text feels. Write ENOUGH text — do not make scenes too short.

REQUIREMENTS FOR "voice" (ENGLISH):
- Must create EXACTLY {{SCENE_COUNT}} scenes, numbered 1 to {{SCENE_COUNT}}
- Each scene voice should take approximately {{SCENE_DURATION_SEC}} seconds to read, targeting ~{{WORDS_PER_SCENE}} words
- Each scene should be within {{MIN_WORDS_PER_SCENE}}-{{MAX_WORDS_PER_SCENE}} words — avoid being too short
- Can be 1-3 sentences per scene, but must be concise, clear pacing, no rambling
- Natural, engaging English — like a skilled presenter speaking to camera
- Total voice should target ~{{VIDEO_DURATION_SEC}} seconds with slight flexibility for smoother delivery
- For 3-15 minute videos: structure must follow clear progression: opening → explanation → examples/analysis → conclusion

REQUIREMENTS FOR "visual" (CINEMATIC — CRITICAL):
You are a motion designer. Do NOT describe visuals like a UI/website. Each scene MUST be designed as a high-end video animation.

Each scene.visual MUST include (write concisely, 1-2 lines each):

[ENVIRONMENT] — Background + depth:
• Background style (dark/gradient/abstract/futuristic)
• Depth layers (far background, mid, near) — MINIMUM 3 layers
• Atmosphere (particles, fog, noise, bokeh)

[MAIN FOCUS] — Primary subject:
• Main subject (keyword / object / number / icon)
• Position (center / left / off-center)
• Scale (dominant / subtle)

[CAMERA] — Simulated camera movement:
• slow zoom in / zoom out / pan left-right / parallax shift between layers

[MOTION FLOW] — Animation:
• Entry: how element appears (glitch-in, scale-up, slide...)
• Idle: continuous motion while visible (floating, drifting, pulse)
• Exit: how element disappears

[LIGHTING & FX] — Lighting + effects:
• glow, shadow, blur, gradient light, light sweep, depth blur

[TEXT STYLE] — Typography (if applicable):
• bold / minimal / futuristic / kinetic typography

[MOOD] — Mood: cinematic / epic / clean / premium / dark / energetic

⛔ DO NOT: describe static layout, just say "display text", use vague terms.
🎯 GOAL: each scene should feel like an Apple keynote animation or cinematic motion graphics.

Keep each scene to 2-3 main dynamic elements. Overly complex scenes = HTML errors.

RETURN JSON WITH THIS EXACT SCHEMA:
{
  "scenes": [
    {
      "stt": 1,
      "voice": "Engaging opening sentence...",
      "visual": "...",
      "assets": ["Asset name assigned to this scene (or [] if none)"]
    }
  ],
  "thumbnail": {
    "title": "Short, powerful title for thumbnail",
    "prompt": "Describe a static cinematic thumbnail with background, main subject, text overlay, and layout."
  }
}

EXAMPLE with topic "What is Bitcoin":
{
  "scenes": [
    {
      "stt": 1,
      "voice": "Have you ever wondered why sending money feels so complicated? Waiting, fees, bank control...",
      "visual": "[ENVIRONMENT] Dark blue-black gradient, 3 depth layers: far=grid pattern, mid=bokeh circles, near=glow halo. Atmosphere: gold dust particles light. [MAIN FOCUS] Phone icon center, dominant scale. [CAMERA] Slow zoom-in 5% throughout scene. [MOTION] Icon glitch-in + screen flash. Idle: phone float light, spinner rotate. 'Fee: $15' popup slide-up. Exit: scale-out + blur. [LIGHTING] Cyan glow halo behind phone, light sweep left to right. [TEXT] '$15' bold futuristic count-up. [MOOD] Dark, tech, premium.",
      "assets": []
    },
    {
      "stt": 2,
      "voice": "Bitcoin was created in 2009 to solve exactly that — direct transfers, no middleman, no one in control.",
      "visual": "[ENVIRONMENT] Black deep space, far=star grid faint, mid=connection lines animate, near=glow particles. [MAIN FOCUS] Bitcoin logo gold center, dominant. [CAMERA] Parallax shift — logo near drift slow, background far drift reverse. [MOTION] Logo scale 0→1.2→1 elastic bounce. Idle: logo rotate light 3°. Arrow nodes radiate 3 directions stagger. Exit: hold (climax). [LIGHTING] Gold radial glow behind logo, flare sweep. [TEXT] 'P2P' kinetic typography appear after logo. [MOOD] Epic, cinematic, gold.",
      "assets": ["Bitcoin logo gold 3D"]
    }
  ],
  "thumbnail": {
    "title": "What Is Bitcoin?",
    "prompt": "Static cinematic thumbnail for 'What is Bitcoin' video. Gold Bitcoin logo center, dark space background, bold title text overlay, premium tech feel."
  }
}

SCENES TO GENERATE:
{{SCENE_COUNT}} scenes for topic: "{{TOPIC}}"
{{PROJECT_ASSETS_BLOCK_EN}}
`;

// Minimal scenes validator
function normalizeScenesInput(input) {
  if (!Array.isArray(input)) {
    if (input?.scenes) return normalizeScenesInput(input.scenes);
    if (input?.items) return normalizeScenesInput(input.items);
    throw new Error('AI returned invalid scenes format (not an array)');
  }
  return input.map((s, index) => {
    let { stt, voice, visual, ttsVoice, assets } = s;
    if (stt == null) stt = index + 1;
    if (typeof visual !== 'string') visual = '';
    if (typeof voice !== 'string') voice = '';
    if (!Array.isArray(assets)) assets = [];
    if (!Number.isInteger(stt) || stt < 1) {
      throw new Error(`Scene ${index + 1} has invalid "stt"`);
    }
    if (!voice) throw new Error(`Scene ${stt} missing "voice"`);
    if (!visual) throw new Error(`Scene ${stt} missing "visual"`);
    return { stt, voice, visual, ttsVoice: ttsVoice || voice, assets };
  });
}

function normalizeThumbnailInput(input, scenes) {
  const fallbackTitle = String(input?.title ?? scenes?.[0]?.voice ?? '').trim().slice(0, 120) || 'Video thumbnail';
  const prompt = String(input?.prompt ?? '').trim();
  if (!prompt) return null;
  return { title: fallbackTitle, prompt };
}

export function normalizeUserScriptInput(input) {
  const scenes = normalizeScenesInput(input);
  const thumbnail = normalizeThumbnailInput(input?.thumbnail, scenes);
  return { scenes, thumbnail };
}

export async function generateScript_EN({ topic, keys, onLog, projectAssets = [], videoDurationSec = 60, sceneDurationSec = 7 }) {
  const plan = buildDurationPlan(videoDurationSec, sceneDurationSec);
  onLog?.(`Generating EN script: "${topic}" | ${plan.sceneCount} scenes x ${plan.safeSceneDurationSec}s`);

  let assetsBlock = '';
  if (projectAssets.length) {
    const list = projectAssets.map(a => `${a.name} | ${a.type} | ${a.aspectRatio}`).join('\n');
    assetsBlock = `AVAILABLE PROJECT ASSETS (assign to suitable scenes):
Name | Type | Aspect Ratio:
${list}

REQUIREMENTS: Add the "assets" field to each scene — an array of asset names assigned to that scene.
Each asset should appear in 1-2 of the most relevant scenes. Scenes without assets use "assets": [].
Asset names in "assets" must match EXACTLY the names above.
`;
  }

  const fallbackAssetsBlock = assetsBlock
    ? assetsBlock.replace('{{PROJECT_ASSETS_BLOCK_EN}}', assetsBlock)
    : '';

  const prompt = SCRIPT_PROMPT_EN
    .replace('{{TOPIC}}', topic)
    .replaceAll('{{VIDEO_DURATION_SEC}}', String(plan.safeVideoDurationSec))
    .replaceAll('{{SCENE_DURATION_SEC}}', String(plan.safeSceneDurationSec))
    .replaceAll('{{SCENE_COUNT}}', String(plan.sceneCount))
    .replaceAll('{{WORDS_PER_SCENE}}', String(plan.wordsPerScene))
    .replaceAll('{{MIN_WORDS_PER_SCENE}}', String(plan.minWordsPerScene))
    .replaceAll('{{MAX_WORDS_PER_SCENE}}', String(plan.maxWordsPerScene))
    .replaceAll('{{TOTAL_WORDS_TARGET}}', String(plan.totalWordsTarget))
    .replace('{{STRUCTURE_GUIDE}}', plan.structureGuide)
    .replaceAll('{{PROJECT_ASSETS_BLOCK}}', assetsBlock);

  let rawScenes = null;
  for (let attempt = 1; attempt <= 2; attempt++) {
    const retryNote = attempt === 1
      ? ''
      : `\n\nNOTE: Previous result had wrong scene count. This time you MUST return EXACTLY ${plan.sceneCount} scenes, no more, no less.`;
    const { result } = await callAI({ prompt: prompt + retryNote, isJson: true, keys, onLog });
    const pkg = normalizeUserScriptInput(result);
    rawScenes = pkg.scenes;
    if (rawScenes.length === plan.sceneCount) {
      const fallbackThumbnailPrompt = `Static thumbnail for video "${topic}". Cinematic layout, strong contrast, short text overlay, clear subject.`;
      const thumbnail = pkg.thumbnail || { title: topic.slice(0, 120), prompt: fallbackThumbnailPrompt };
      onLog?.(`✓ EN script: ${rawScenes.length} scenes`);
      return { scenes: rawScenes, thumbnail };
    }
    onLog?.(`AI returned ${rawScenes.length} scenes (target ${plan.sceneCount})${attempt < 2 ? ' — retrying' : ''}`);
  }

  if (!rawScenes?.length) throw new Error('AI returned no scenes');
  onLog?.(`✓ EN script: ${rawScenes.length} scenes`);
  return {
    scenes: rawScenes,
    thumbnail: {
      title: topic.slice(0, 120) || 'Video thumbnail',
      prompt: `Static cinematic thumbnail for "${topic}". Clear subject, bold text overlay, cinematic feel.`,
    },
  };
}
// EOF: agents/scriptAgent-en.js
