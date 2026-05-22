// src/agents/metadataAgent.js — Generate viral metadata (title, description, hashtags) from script
import { callAI } from '../services/aiRouter.js';

// Default style prompt (phần hướng dẫn AI — KHÔNG chứa {{SCRIPT}}/{{TOPIC}})
const DEFAULT_STYLE_VI = `Bạn là chuyên gia SEO và viral content cho video ngắn (TikTok, YouTube Shorts, Reels).

Từ kịch bản video dưới đây, tạo metadata VIRAL gồm:
1. TITLE: Tiêu đề hấp dẫn, gây tò mò, 50-80 ký tự. Dùng số, emoji, power words. KHÔNG lặp lại nguyên văn câu voice trong kịch bản.
2. DESCRIPTION: Mô tả ngắn gọn 100-200 ký tự tóm tắt nội dung video. Hook mạnh dòng đầu + giá trị chính + CTA cuối. KHÔNG copy nguyên văn kịch bản.
3. HASHTAGS: 15-25 hashtags trending + niche, KHÔNG có dấu #, cách nhau bởi dấu cách.

QUAN TRỌNG:
- Title phải là tiêu đề sáng tạo, KHÔNG phải câu đầu tiên của kịch bản
- Description phải tóm tắt giá trị video, KHÔNG liệt kê từng cảnh
- Hashtags PHẢI có ít nhất 15 từ khóa`;

const DEFAULT_STYLE_EN = `You are an expert in SEO and viral content for short-form video (TikTok, YouTube Shorts, Reels).

From the video script below, generate VIRAL metadata:
1. TITLE: Catchy, curiosity-driven, 50-80 chars. Use numbers, emoji, power words. Do NOT copy the first line of the script.
2. DESCRIPTION: Concise 100-200 chars summarizing video value. Strong hook + key value + CTA. Do NOT copy script verbatim.
3. HASHTAGS: 15-25 trending + niche hashtags, NO # symbol, separated by spaces.

IMPORTANT:
- Title must be creative, NOT the first voice line
- Description must summarize value, NOT list scenes
- Hashtags MUST have at least 15 keywords`;

// System suffix — LUÔN được gửi kèm, không hiển thị trong prompt editor
const SYSTEM_SUFFIX = `

Kịch bản:
{{SCRIPT}}

Chủ đề gốc: {{TOPIC}}

Trả về JSON duy nhất (KHÔNG markdown, KHÔNG \`\`\`json, KHÔNG giải thích):
{"title":"...","description":"...","hashtags":"tag1 tag2 tag3 ..."}`;

/**
 * Clean AI response — loại bỏ markdown code block, text thừa trước/sau JSON
 */
function cleanJsonResponse(raw) {
  if (!raw) return '';
  // Loại bỏ ```json ... ``` hoặc ``` ... ```
  let cleaned = raw.replace(/```(?:json)?\s*/gi, '').replace(/```\s*/g, '');
  // Trim whitespace
  cleaned = cleaned.trim();
  return cleaned;
}

/**
 * Parse metadata JSON từ AI response với nhiều chiến lược fallback
 */
function parseMetadataJson(raw) {
  const cleaned = cleanJsonResponse(raw);

  // Strategy 1: Parse trực tiếp nếu response là JSON thuần
  try {
    const data = JSON.parse(cleaned);
    if (data.title && data.description && data.hashtags) return data;
  } catch {}

  // Strategy 2: Tìm JSON object trong response
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      const data = JSON.parse(jsonMatch[0]);
      if (data.title && data.description && data.hashtags) return data;
    } catch {}

    // Strategy 3: Fix JSON bị lỗi escape — thử replace newlines trong string values
    try {
      const fixedJson = jsonMatch[0]
        .replace(/[\r\n]+/g, ' ')           // newlines → space
        .replace(/,\s*}/g, '}')             // trailing comma
        .replace(/,\s*]/g, ']');            // trailing comma in array
      const data = JSON.parse(fixedJson);
      if (data.title && data.description && data.hashtags) return data;
    } catch {}
  }

  // Strategy 4: Regex extract từng field riêng lẻ
  const titleMatch = cleaned.match(/"title"\s*:\s*"([^"]+)"/);
  const descMatch = cleaned.match(/"description"\s*:\s*"([^"]+)"/);
  const hashMatch = cleaned.match(/"hashtags"\s*:\s*"([^"]+)"/);
  if (titleMatch && descMatch && hashMatch) {
    return {
      title: titleMatch[1],
      description: descMatch[1],
      hashtags: hashMatch[1],
    };
  }

  return null; // Thất bại hoàn toàn
}

export async function generateMetadata({ script, topic, keys, onLog, outputLanguage = 'vi', customPrompt }) {
  const isEN = outputLanguage === 'en';
  // Style prompt (phần hướng dẫn) — custom hoặc default
  const stylePrompt = customPrompt || (isEN ? DEFAULT_STYLE_EN : DEFAULT_STYLE_VI);

  // Build script summary (voice lines)
  const scriptSummary = script.map(sc => `Cảnh ${sc.stt}: ${sc.voice}`).join('\n');

  // Ghép: style prompt + system suffix (luôn có)
  const finalPrompt = (stylePrompt + SYSTEM_SUFFIX)
    .replace('{{SCRIPT}}', scriptSummary)
    .replace('{{TOPIC}}', topic || '');

  onLog?.('⏳ AI đang tạo metadata (title, description, hashtags)...');

  const { result: raw } = await callAI({
    prompt: finalPrompt,
    isJson: true,
    keys,
    onLog,
  });

  // Parse JSON from response — nhiều chiến lược
  const data = parseMetadataJson(raw);
  if (data) {
    onLog?.(`✓ Metadata: "${data.title.slice(0, 40)}..." | ${data.hashtags.split(/\s+/).length} hashtags`);
    return {
      title: data.title.trim(),
      description: data.description.trim(),
      hashtags: data.hashtags.trim(),
    };
  }

  // Tất cả strategy đều thất bại → throw để retry logic xử lý
  const snippet = (raw || '').slice(0, 100);
  throw new Error(`Parse metadata thất bại — AI response không chứa JSON hợp lệ: "${snippet}..."`);
}
// EOF: agents/metadataAgent.js
