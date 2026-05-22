// src/agents/scriptAgent.js - Bước 2: Tạo kịch bản JSON
import { callAI } from '../services/aiRouter.js';

const WORD_TARGETS_BY_SCENE_DURATION = {
  5: 24,
  6: 29,
  7: 34,
  8: 38,
  10: 48,
};

function buildDurationPlan(videoDurationSec = 60, sceneDurationSec = 7) {
  const safeVideoDurationSec = Math.max(30, Math.min(1200, Number(videoDurationSec) || 60));
  const safeSceneDurationSec = Math.max(5, Math.min(8, Number(sceneDurationSec) || 7));
  const sceneCount = Math.max(1, Math.ceil(safeVideoDurationSec / safeSceneDurationSec));
  const wordsPerScene = WORD_TARGETS_BY_SCENE_DURATION[safeSceneDurationSec]
    ?? Math.max(12, Math.round(safeSceneDurationSec * 4.8));
  const minWordsPerScene = Math.max(10, wordsPerScene - 3);
  const maxWordsPerScene = wordsPerScene + 4;
  const totalWordsTarget = sceneCount * wordsPerScene;
  const structureGuide = safeVideoDurationSec >= 300
    ? 'Cấu trúc nên có mở bài, các ý chính theo cụm nội dung, ví dụ minh hoạ ngắn và đoạn kết chốt lại giá trị.'
    : 'Cấu trúc tập trung hook nhanh, triển khai ngắn và chốt thông điệp gọn.';
  return {
    safeVideoDurationSec,
    safeSceneDurationSec,
    sceneCount,
    wordsPerScene,
    minWordsPerScene,
    maxWordsPerScene,
    totalWordsTarget,
    structureGuide,
  };
}

const SCRIPT_PROMPT = `Bạn là đạo diễn kiêm biên kịch video giáo dục tiếng Việt.

Hãy viết kịch bản cho chủ đề: "{{TOPIC}}"

{{PROJECT_ASSETS_BLOCK}}

THÔNG SỐ ĐỘ DÀI VIDEO:
- Tổng thời lượng mục tiêu: khoảng {{VIDEO_DURATION_SEC}} giây
- Mỗi cảnh mục tiêu: khoảng {{SCENE_DURATION_SEC}} giây
- Số lượng cảnh mục tiêu: {{SCENE_COUNT}} cảnh
- Voice mục tiêu mỗi cảnh: khoảng {{WORDS_PER_SCENE}} từ
- Khoảng an toàn mỗi cảnh: {{MIN_WORDS_PER_SCENE}}-{{MAX_WORDS_PER_SCENE}} từ
- Tổng số từ voice toàn video mục tiêu: khoảng {{TOTAL_WORDS_TARGET}} từ
- Định hướng nhịp nội dung: {{STRUCTURE_GUIDE}}
- QUAN TRỌNG: Các con số trên chỉ là mốc ƯỚC TÍNH để chia nhịp nội dung và lượng chữ. Thời lượng cảnh thực tế khi render sẽ đi theo độ dài voice/TTS, nên mỗi cảnh có thể ngắn hoặc dài hơn một chút nếu cần tự nhiên.
- QUAN TRỌNG HƠN: TTS thực tế thường đọc nhanh hơn chữ viết tưởng tượng, nên phải ưu tiên viết ĐỦ chữ. Không viết voice quá ngắn làm cảnh bị hụt thời lượng.

YÊU CẦU VỀ "voice":
- Phải tạo ĐÚNG {{SCENE_COUNT}} cảnh, đánh số liên tiếp từ 1 đến {{SCENE_COUNT}}
- Mỗi cảnh viết voice với độ dài ƯỚC TÍNH để đọc trong khoảng {{SCENE_DURATION_SEC}} giây, ưu tiên gần {{WORDS_PER_SCENE}} từ
- Mỗi cảnh nên nằm trong khoảng {{MIN_WORDS_PER_SCENE}}-{{MAX_WORDS_PER_SCENE}} từ; không được viết kiểu cụt ngủn dưới mức này trừ khi bất khả kháng
- Có thể là 1-3 câu tùy cảnh, nhưng phải súc tích, nhịp rõ, không lan man
- Giọng tự nhiên, gần gũi, dễ hiểu với người Việt
- Tổng voice toàn video nên bám sát mục tiêu khoảng {{VIDEO_DURATION_SEC}} giây, chấp nhận dao động nhẹ nếu cần để nội dung mượt hơn
- Nếu video dài 3-15 phút, phải trải nội dung theo tiến trình rõ ràng: mở vấn đề → giải thích → ví dụ / phân tích → kết luận

YÊU CẦU VỀ "visual" (QUAN TRỌNG — CINEMATIC):
Bạn là motion designer chuyên nghiệp. KHÔNG mô tả visual như UI/website. Phải thiết kế mỗi cảnh như một video animation cao cấp.

Mỗi scene.visual PHẢI gồm đủ các phần sau (viết gọn, mỗi phần 1-2 dòng):

[ENVIRONMENT] — Nền + chiều sâu:
• Background style (dark/gradient/abstract/futuristic)
• Depth layers (far background, mid, near) — TỐI THIỂU 3 lớp
• Atmosphere (particles, fog, noise, bokeh)

[MAIN FOCUS] — Chủ thể chính:
• Main subject (text keyword / object / number / icon)
• Position (center / left / off-center)
• Scale (dominant / subtle)

[CAMERA] — Chuyển động camera giả lập:
• slow zoom in / zoom out / pan left-right / parallax shift giữa các layers

[MOTION FLOW] — Chuyển động:
• Entry: cách element xuất hiện (glitch-in, scale-up, slide...)
• Idle: chuyển động liên tục khi hiện (floating, drifting, pulse)
• Exit: cách element biến mất

[LIGHTING & FX] — Ánh sáng + hiệu ứng:
• glow, shadow, blur, gradient light, light sweep, depth blur

[TEXT STYLE] — Kiểu chữ (nếu có):
• bold / minimal / futuristic / kinetic typography

[MOOD] — Cảm xúc: cinematic / epic / clean / premium / dark / energetic

⛔ KHÔNG: mô tả layout tĩnh, chỉ nói "hiển thị text", dùng từ chung chung.
🎯 MỤC TIÊU: cảnh phải cảm giác như Apple keynote animation hoặc cinematic motion graphics.

Giữ mỗi cảnh tối đa 2-3 yếu tố động chính. Cảnh phức tạp quá = HTML lỗi.

TRẢ VỀ JSON THEO ĐÚNG SCHEMA NÀY:
{
  "scenes": [
    {
      "stt": 1,
      "voice": "Câu mở đầu thu hút...",
      "visual": "...",
      "assets": ["Tên mô tả tài nguyên được phân công cho cảnh này (hoặc [] nếu không có)"]
    }
  ],
  "thumbnail": {
    "title": "Tiêu đề ngắn, mạnh, dễ đọc trên thumbnail",
    "prompt": "Mô tả một thumbnail tĩnh theo phong cách cinematic, nêu rõ nền, chủ thể chính, text overlay và bố cục."
  }
}

VÍ DỤ với chủ đề "Bitcoin là gì":
{
  "scenes": [
    {
      "stt": 1,
      "voice": "Bạn đã bao giờ chuyển tiền mà tự hỏi: sao mình cứ phải phụ thuộc vào ngân hàng? Chờ, trả phí, bị kiểm soát...",
      "visual": "[ENVIRONMENT] Gradient xanh đen tối, 3 lớp depth: far=grid mờ, mid=bokeh circles, near=glow halo. Atmosphere: gold dust particles nhẹ. [MAIN FOCUS] Icon điện thoại lớn center, dominant scale. [CAMERA] Slow zoom-in 5% suốt cảnh. [MOTION] Entry: icon glitch-in + screen flash. Idle: phone float nhẹ, spinner loading xoay. 'Phí: 15,000đ' popup slide-up. Exit: scale-out + blur. [LIGHTING] Cyan glow halo sau phone, light sweep từ trái qua. [TEXT] '15,000đ' bold futuristic count-up. [MOOD] Dark, tech, premium.",
      "assets": []
    },
    {
      "stt": 2,
      "voice": "Bitcoin ra đời năm 2009 để giải quyết đúng vấn đề đó — chuyển tiền trực tiếp, không trung gian, không ai kiểm soát.",
      "visual": "[ENVIRONMENT] Đen deep space, far=star grid mờ, mid=connection lines animate, near=glow particles. [MAIN FOCUS] Logo Bitcoin vàng center, dominant. [CAMERA] Parallax shift — logo gần drift chậm, background xa drift ngược. [MOTION] Entry: logo scale 0→1.2→1 elastic bounce. Idle: logo rotate nhẹ 3°, connection lines pulse. Arrow nodes tỏa ra 3 hướng stagger. Exit: giữ (climax). [LIGHTING] Gold radial glow sau logo, flare sweep. [TEXT] 'P2P' kinetic typography appear sau logo. [MOOD] Epic, cinematic, gold.",
      "assets": ["Logo Bitcoin tròn vàng 3D"]
    }
  ],
  "thumbnail": {
    "title": "Bitcoin Là Gì?",
    "prompt": "Thumbnail tĩnh 9:16 phong cách cinematic. Nền: gradient xanh đen với glow vàng. Chủ thể chính: đồng Bitcoin 3D lớn ở trung tâm, phía sau có lưới kết nối tài chính mờ. Text overlay lớn: 'BITCOIN LÀ GÌ?' màu vàng sáng ở nửa trên. Một badge nhỏ phía dưới: 'Không qua ngân hàng'. Bố cục rõ, tương phản mạnh, ưu tiên cảm giác công nghệ và tài chính."
  }
}

Nếu không thể tạo object đúng schema trên, được phép trả về mảng scenes kiểu cũ.

CHỈ TRẢ VỀ JSON, KHÔNG GIẢI THÍCH, KHÔNG MARKDOWN.`;

function extractScenesArray(input) {
  if (Array.isArray(input)) return input;
  if (Array.isArray(input?.scenes)) return input.scenes;
  if (Array.isArray(input?.script)) return input.script;
  if (input && typeof input === 'object') {
    const firstArr = Object.values(input).find(v => Array.isArray(v));
    if (firstArr) return firstArr;
  }
  throw new Error('Script không phải array');
}

function normalizeScenesInput(input) {
  const script = extractScenesArray(input);
  if (!script.length) throw new Error('JSON kịch bản đang rỗng');

  return script.map((scene, index) => {
    const stt = Number(scene?.stt ?? index + 1);
    const voice = String(scene?.voice ?? '').trim();
    const visual = String(scene?.visual ?? '').trim();
    const ttsVoice = scene?.ttsVoice == null ? undefined : String(scene.ttsVoice).trim();
    const assets = Array.isArray(scene?.assets)
      ? scene.assets.map(item => String(item ?? '').trim()).filter(Boolean)
      : [];

    if (!Number.isInteger(stt) || stt < 1) {
      throw new Error(`Cảnh ${index + 1} có "stt" không hợp lệ`);
    }
    if (!voice) {
      throw new Error(`Cảnh ${stt} thiếu "voice"`);
    }
    if (!visual) {
      throw new Error(`Cảnh ${stt} thiếu "visual"`);
    }

    return {
      stt,
      voice,
      visual,
      ttsVoice: ttsVoice || voice,
      assets,
    };
  });
}

function normalizeThumbnailInput(input, scenes) {
  const fallbackTitle = String(input?.title ?? scenes?.[0]?.voice ?? '').trim().slice(0, 120) || 'Thumbnail video';
  const prompt = String(input?.prompt ?? '').trim();
  if (!prompt) return null;
  return {
    title: fallbackTitle,
    prompt,
  };
}

export function normalizeUserScriptInput(input) {
  const scenes = normalizeScenesInput(input);
  const thumbnail = normalizeThumbnailInput(input?.thumbnail, scenes);
  return { scenes, thumbnail };
}

export async function generateScript({ topic, keys, onLog, projectAssets = [], videoDurationSec = 60, sceneDurationSec = 7 }) {
  const plan = buildDurationPlan(videoDurationSec, sceneDurationSec);
  onLog?.(`Tạo kịch bản cho chủ đề: "${topic}" | ${plan.sceneCount} cảnh x ${plan.safeSceneDurationSec}s`);

  let assetsBlock = '';
  if (projectAssets.length) {
    const list = projectAssets.map(a => `${a.name} | ${a.type} | ${a.aspectRatio}`).join('\n');
    assetsBlock = `TÀI NGUYÊN DỰ ÁN CÓ SẴN (phân phối cho các cảnh phù hợp):
Danh sách (TÊN | LOẠI | TỈ LỆ KHUNG HÌNH):
${list}

YÊU CẦU: Thêm trường "assets" vào mỗi cảnh — mảng tên tài nguyên phân công cho cảnh đó.
Mỗi tài nguyên chỉ nên xuất hiện trong 1-2 cảnh phù hợp nhất. Cảnh không dùng tài nguyên nào thì "assets": [].
Tên trong "assets" phải CHÍNH XÁC như trong danh sách trên.
`;
  }

  const prompt = SCRIPT_PROMPT
    .replace('{{TOPIC}}', topic)
    .replaceAll('{{VIDEO_DURATION_SEC}}', String(plan.safeVideoDurationSec))
    .replaceAll('{{SCENE_DURATION_SEC}}', String(plan.safeSceneDurationSec))
    .replaceAll('{{SCENE_COUNT}}', String(plan.sceneCount))
    .replaceAll('{{WORDS_PER_SCENE}}', String(plan.wordsPerScene))
    .replaceAll('{{MIN_WORDS_PER_SCENE}}', String(plan.minWordsPerScene))
    .replaceAll('{{MAX_WORDS_PER_SCENE}}', String(plan.maxWordsPerScene))
    .replaceAll('{{TOTAL_WORDS_TARGET}}', String(plan.totalWordsTarget))
    .replace('{{STRUCTURE_GUIDE}}', plan.structureGuide)
    .replace('{{PROJECT_ASSETS_BLOCK}}', assetsBlock);

  let rawScenes = null;
  for (let attempt = 1; attempt <= 2; attempt++) {
    const retryNote = attempt === 1
      ? ''
      : `\n\nLƯU Ý BỔ SUNG: Kết quả trước đó trả sai số lượng cảnh. Lần này PHẢI trả đúng ${plan.sceneCount} cảnh, không hơn, không kém.`;
    const { result } = await callAI({ prompt: prompt + retryNote, isJson: true, keys, onLog });
    const pkg = normalizeUserScriptInput(result);
    rawScenes = pkg.scenes;
    if (rawScenes.length === plan.sceneCount) {
      const fallbackThumbnailPrompt = `Thumbnail tĩnh cho video "${topic}". Ưu tiên bố cục rõ, tương phản mạnh, text overlay ngắn gọn, bám sát các ý chính trong video.`;
      const thumbnail = pkg.thumbnail || { title: topic.slice(0, 120), prompt: fallbackThumbnailPrompt };
      onLog?.(`✓ Kịch bản: ${rawScenes.length} cảnh`);
      return { scenes: rawScenes, thumbnail };
    }
    onLog?.(`AI trả ${rawScenes.length} cảnh, lệch mục tiêu ${plan.sceneCount} cảnh${attempt < 2 ? ' — đang yêu cầu tạo lại' : ''}`);
  }

  const script = rawScenes;
  if (!script?.length) throw new Error('AI không trả về cảnh nào');
  onLog?.(`✓ Kịch bản: ${script.length} cảnh`);
  return {
    scenes: script,
    thumbnail: {
      title: topic.slice(0, 120) || 'Thumbnail video',
      prompt: `Thumbnail tĩnh cho video "${topic}". Bố cục cinematic, chủ thể rõ ràng, text overlay ngắn gọn, nổi bật.`,
    },
  };
}
