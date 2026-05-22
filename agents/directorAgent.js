// src/agents/directorAgent.js — Đạo diễn: phân tích voice/visual → cinematic direction
// Quyết định pacing, camera, energy, transition, mood cho mỗi cảnh.

const ENERGY_KEYWORDS = {
  high: [
    'shock', 'wow', 'bùng nổ', 'tăng vọt', 'kỷ lục', 'cực', 'khủng', 'siêu',
    'kinh ngạc', 'không thể tin', 'đỉnh', 'rocket', 'moon', 'pump', 'all-time high',
    'breaking', 'gấp', 'x10', 'x100', 'phá đỉnh', 'lịch sử', 'điên rồ',
  ],
  low: [
    'giải thích', 'cách', 'tại sao', 'để hiểu',
    'cơ bản', 'đầu tiên', 'bước', 'khái niệm', 'là gì',
    'nghĩa là', 'nói cách khác', 'ví dụ',
  ],
  dramatic: [
    'cảnh báo', 'warning', 'nguy hiểm', 'danger', 'sụp đổ', 'crash', 'mất',
    'rủi ro', 'risk', 'scam', 'lừa', 'coi chừng', 'chú ý', 'hậu quả',
    'giảm mạnh', 'bear', 'đỏ', 'red',
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
 * Phân tích scene → cinematic direction.
 * @param {{ voice: string, visual: string, stt: number }} scene
 * @param {{ totalScenes?: number }} ctx — context pipeline (tuỳ chọn)
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

  // 6. Climax detection: cảnh cuối hoặc cảnh có energy cao nhất
  const totalScenes = ctx.totalScenes || 1;
  const isClimax = scene.stt === totalScenes || energy === 'high';

  return { pacing, camera, energy, transition, mood, isClimax };
}

/**
 * Serialize direction thành block text ngắn gọn để inject vào prompt.
 */
export function directionToPromptBlock(dir) {
  return [
    `CINEMATIC DIRECTION:`,
    `• Pacing: ${dir.pacing} | Energy: ${dir.energy} | Mood: ${dir.mood}`,
    `• Camera: ${dir.camera} | Transition: ${dir.transition}`,
    `• Climax scene: ${dir.isClimax ? 'CÓ — tăng intensity, scale, glow' : 'không'}`,
  ].join('\n');
}
