// src/agents/imageSearchKeywordsAgent.js
// AI generate keywords tìm ảnh theo ngôn ngữ content (vi → vi, en → en).
// Output: { language, images: [{ short_keyword, search_keyword }, ...] }

import { callAI } from '../services/aiRouter.js';

/**
 * @param {{
 *   text: string,         // Nội dung / script để trích keyword
 *   count?: number,       // Số keywords (default 5, max 10)
 *   language?: 'vi'|'en', // Override ngôn ngữ (undefined = auto-detect từ content)
 *   keys: object,         // AI provider keys từ aiKeysFromState / UI
 *   onLog?: (msg:string)=>void
 * }} opts
 * @returns {Promise<{
 *   language: 'vi'|'en',
 *   images: Array<{ short_keyword: string, search_keyword: string }>
 * }>}
 */
export async function generateImageSearchKeywords({ text, count = 5, language, keys, onLog }) {
  const n = Math.max(1, Math.min(10, Number(count) || 5));
  const trimmed = String(text || '').trim();
  if (!trimmed) throw new Error('Thiếu nội dung để tạo keyword');

  // Nếu user chọn ngôn ngữ cụ thể → override AI auto-detect
  const langInstruction = language === 'vi'
    ? `\n⚠ BẮT BUỘC: Tạo keyword TIẾNG VIỆT (bất kể content gốc ngôn ngữ gì). language = "vi".`
    : language === 'en'
    ? `\n⚠ BẮT BUỘC: Tạo keyword TIẾNG ANH (bất kể content gốc ngôn ngữ gì). language = "en".`
    : ''; // auto-detect

  const prompt = `Bạn là AI chuyên tạo keyword tìm kiếm hình ảnh trên Google Images.
${langInstruction}
NHIỆM VỤ:
1. Phân tích nội dung người dùng nhập
2. Tự nhận diện ngôn ngữ của nội dung (vi hoặc en)
3. Nếu content tiếng Việt → keyword tiếng Việt
4. Nếu content tiếng Anh → keyword tiếng Anh
5. Tạo ĐÚNG ${n} object, mỗi object gồm 2 field: short_keyword và search_keyword

QUY TẮC short_keyword:
- Ngắn gọn 2-4 từ
- LÀ từ khoá CỐT LÕI, CHÍNH XÁC từ nội dung (entity name, tên công cụ, khái niệm chính)
- Ví dụ: nếu content nói về "v0 dev" → short_keyword phải là "v0 dev" (KHÔNG được đổi thành "AI code" hay "web builder")
- Ví dụ: nếu content nói về "ChatGPT Plus" → giữ nguyên "ChatGPT Plus" (KHÔNG đổi thành "AI chatbot")
- Dùng để đặt tên file ảnh
- Giữ nguyên ngôn ngữ gốc của content

QUY TẮC search_keyword (CỰC KỲ QUAN TRỌNG):
⚠ BẮT BUỘC: search_keyword PHẢI CHỨA NGUYÊN VĂN short_keyword (không được đổi, không được bỏ, không được thay từ đồng nghĩa)
- Format: "<short_keyword> <từ mô tả bổ sung>"
- Từ bổ sung: mô tả hình ảnh, cảm xúc, hành động, ánh sáng, phong cách
- Mục đích: Google Images sẽ tìm đúng entity + phong cách ảnh đẹp
- KHÔNG ĐƯỢC thay thế short_keyword bằng khái niệm tổng quát hơn

VÍ DỤ SAI ❌:
  short_keyword: "v0 dev"
  search_keyword: "giao diện thiết kế web bằng AI hiện đại"  ← SAI! Mất từ "v0 dev"

VÍ DỤ ĐÚNG ✓:
  short_keyword: "v0 dev"
  search_keyword: "v0 dev giao diện thiết kế web AI hiện đại"  ← ĐÚNG: chứa nguyên "v0 dev"

VÍ DỤ TIẾNG VIỆT ĐẦY ĐỦ:
{
  "language": "vi",
  "images": [
    {
      "short_keyword": "giao dịch bitcoin",
      "search_keyword": "giao dịch bitcoin màn hình tài chính ánh sáng điện ảnh"
    },
    {
      "short_keyword": "v0 dev",
      "search_keyword": "v0 dev giao diện thiết kế web AI"
    },
    {
      "short_keyword": "ChatGPT Plus",
      "search_keyword": "ChatGPT Plus giao diện chat AI màn hình laptop"
    }
  ]
}

VÍ DỤ TIẾNG ANH:
{
  "language": "en",
  "images": [
    {
      "short_keyword": "bitcoin trading",
      "search_keyword": "bitcoin trading office setup cinematic lighting"
    },
    {
      "short_keyword": "v0 dev",
      "search_keyword": "v0 dev AI web design interface modern"
    }
  ]
}

CHỈ TRẢ VỀ JSON, KHÔNG GIẢI THÍCH:
{
  "language": "vi hoặc en",
  "images": [
    { "short_keyword": "...", "search_keyword": "..." }
  ]
}

Content:
${trimmed}`;

  onLog?.(`AI tạo ${n} keywords...`);
  const { result } = await callAI({ prompt, isJson: true, keys, onLog });

  // Validate + normalize
  const detectedLang = result?.language === 'en' ? 'en' : 'vi';
  const finalLang = language || detectedLang; // user override > AI detect
  const rawImages = Array.isArray(result?.images) ? result.images : [];

  // Safety net: nếu search_keyword KHÔNG chứa short_keyword (case-insensitive,
  // bỏ dấu) → tự động prepend short_keyword vào đầu. Đảm bảo Google search
  // đúng entity ngay cả khi AI bỏ qua rule trong prompt.
  const norm = (s) => String(s || '').toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd').replace(/\s+/g, ' ').trim();

  let fixedCount = 0;
  const images = rawImages
    .map(img => {
      const sk = String(img?.short_keyword || '').trim();
      let search = String(img?.search_keyword || sk || '').trim();
      if (sk && search && !norm(search).includes(norm(sk))) {
        // AI vi phạm — prepend short_keyword
        search = `${sk} ${search}`;
        fixedCount++;
      }
      return { short_keyword: sk, search_keyword: search };
    })
    .filter(img => img.short_keyword && img.search_keyword)
    .slice(0, n);

  if (!images.length) {
    throw new Error('AI không trả về keyword hợp lệ: ' + JSON.stringify(result).slice(0, 200));
  }
  if (fixedCount > 0) {
    onLog?.(`⚠ Auto-fixed ${fixedCount} keyword(s) do AI không giữ short_keyword nguyên văn`);
  }

  onLog?.(`✓ Đã tạo ${images.length} keywords (lang=${finalLang}): ${images.map(i => i.short_keyword).join(', ')}`);
  return { language: finalLang, images };
}
