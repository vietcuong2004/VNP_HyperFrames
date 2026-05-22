// src/agents/directorAgent_en.js — English version of directorAgent.js
// Analyzes voice/visual → cinematic direction. All output text in English.

const ENERGY_KEYWORDS = {
  high: [
    'surge', 'surges', 'surging', 'soar', 'soared', 'skyrocket', 'skyrocketed',
    'record high', 'record-breaking', 'breakout', 'explode', 'explodes', 'exploded',
    'moon', 'bullish', 'massive', 'huge', 'stunning', 'stunned', 'unbelievable',
    'historic', 'extraordinary', 'outstanding', 'exceptional',
    'skyrocket', 'soaring', 'rocketing', 'surged',
  ],
  low: [
    'explain', 'how', 'why', 'what is', 'basics', 'fundamental',
    'step', 'steps', 'guide', 'tutorial', 'introduction', 'intro',
    'learn', 'understanding', 'understand', 'beginner', 'first',
    'concept', 'definition', 'meaning', 'example', 'in other words',
    'let me explain',
  ],
  dramatic: [
    'crash', 'crashed', 'crashing', 'plunge', 'plunged', 'tumble', 'tumbled',
    'collapse', 'collapsed', 'breakdown', 'fallout', 'crisis', 'alert',
    'bearish', 'drop', 'drops', 'dropped', 'decline', 'declined',
    'loss', 'losses', 'bleeding', 'worst', 'dangerous', 'threat',
    'threatening', 'warns', 'warned', 'warning', 'risk', 'risky',
  ],
};

const CAMERA_MAP = {
  high:     'aggressive_zoom',
  dramatic: 'dramatic_pan',
  low:      'slow_pan',
  build:    'subtle_zoom',
  steady:   'subtle_zoom',
};

const TRANSITION_MAP = {
  high:     'flash',
  dramatic: 'glitch',
  low:      'smooth',
  build:    'fade',
  steady:   'fade',
};

/**
 * Analyze scene → cinematic direction.
 * @param {{ voice: string, visual: string, stt: number }} scene
 * @param {{ totalScenes?: number }} ctx — pipeline context (optional)
 * @returns {{ pacing, camera, energy, transition, mood, isClimax }}
 */
export function buildDirection(scene, ctx = {}) {
  const text = `${scene.voice} ${scene.visual}`.toLowerCase();

  // 1. Detect energy level
  let energy = 'steady';
  let maxHits = 0;
  for (const [level, keywords] of Object.entries(ENERGY_KEYWORDS)) {
    const hits = keywords.filter(k => text.includes(k)).length;
    if (hits > maxHits) { maxHits = hits; energy = level; }
  }

  // 2. Pacing
  const pacing = energy === 'high' ? 'fast'
    : energy === 'dramatic' ? 'medium'
    : energy === 'low' ? 'slow'
    : 'medium';

  // 3. Camera
  const camera = CAMERA_MAP[energy] || 'subtle_zoom';

  // 4. Transition
  const transition = TRANSITION_MAP[energy] || 'fade';

  // 5. Mood
  const mood = energy === 'high' ? 'epic'
    : energy === 'dramatic' ? 'tension'
    : energy === 'low' ? 'clean'
    : 'cinematic';

  // 6. Climax detection: last scene or highest energy scene
  const totalScenes = ctx.totalScenes || 1;
  const isClimax = scene.stt === totalScenes || energy === 'high';

  return { pacing, camera, energy, transition, mood, isClimax };
}

/**
 * Serialize direction into a concise text block to inject into the prompt.
 */
export function directionToPromptBlock(dir) {
  return [
    `CINEMATIC DIRECTION:`,
    `• Pacing: ${dir.pacing} | Energy: ${dir.energy} | Mood: ${dir.mood}`,
    `• Camera: ${dir.camera} | Transition: ${dir.transition}`,
    `• Climax scene: ${dir.isClimax ? 'YES — increase intensity, scale, glow' : 'no'}`,
  ].join('\n');
}
