import { short, baseScene } from "../main_generateContent.js";
import { buildProjectAssetsPrompt } from "../agent_dynamic_flow.mjs";
import { buildAiProviders, createChatCompletionWithFallback, parseAiJsonContent } from "../ai_provider.mjs";

// Hướng dẫn kể chuyện khác nhau cho từng format con của Web (Tavily/General URLs)
const STORYTELLING_GUIDELINES = {
  web_docs_explainer: `
    - Đây là trang tài liệu công nghệ (documentation/guide): Tập trung chỉ ra đâu là phần quan trọng giúp lập trình viên dùng được ngay.
    - Hướng dẫn cấu trúc docs, các chương mục và lưu ý khi tra cứu.
  `,
  web_tool_overview: `
    - Đây là trang công cụ/SDK/Platform cho developer: Giải thích vấn đề thực tế nó xử lý là gì, thế mạnh so với giải pháp khác.
    - Hướng dẫn cách dùng thử nhanh và các tính năng chính.
  `,
  web_article_digest: `
    - Đây là một bài viết/blog/phân tích chuyên sâu: Tóm tắt lại luận điểm cốt lõi của tác giả và các dẫn chứng kỹ thuật.
    - Giọng điệu khách quan, đúc kết bài học.
  `,
  web_product_brief: `
    - Đây là landing page giới thiệu sản phẩm thương mại: Tách bạch các câu từ quảng cáo (marketing hype) để chỉ ra giá trị thực tế của sản phẩm.
    - Đánh giá sản phẩm này phù hợp cho đối tượng nào và giới hạn/chi phí ra sao.
  `,
  web_context_digest: `
    - Tóm tắt tổng quan thông tin hữu dụng nhất từ URL, đưa ra lời khuyên kiểm chứng trước khi áp dụng.
  `
};

// Cấu trúc 6 cảnh (scenes) cố định cho Group 3 (Web)
export const WEB_LAYOUT_SCHEMA = [
  {
    scene: 1,
    layout: "intro_web",
    voice: "Lời mở đầu dẫn dắt người xem vào URL web khoảng 30-40 từ...",
    visual: "Chụp giao diện trang web, highlight tiêu đề chính.",
    headline_line1: "TIÊU ĐỀ TRANG WEB (VIẾT HOA)",
    headline_line2: "WEB CONTEXT DIGEST",
    repo_url: "domain.com/path",
    assets: ["character shiba using a magnifying glass to look closely.png"]
  },
  {
    scene: 2,
    layout: "web_summary",
    voice: "Tóm tắt ý chính cốt lõi hoặc mục đích của trang web...",
    visual: "Bento card tóm tắt nội dung chính và đối tượng phù hợp.",
    content_mode: "steps",
    headline_line1: "NỘI DUNG CHÍNH",
    headline_line2: "CẦN GIẢI THÍCH",
    steps: [
      { title: "<bước 1>", body: "<hành động đầu tiên nên làm>" },
      { title: "<bước 2>", body: "<cách kiểm tra nhanh>" },
      { title: "<bước 3>", body: "<lưu ý trước khi áp dụng>" }
    ],
    bento1_title: "Tóm tắt",
    bento1_desc: "Mô tả nội dung tóm tắt ngắn gọn",
    bento2_title: "Audience",
    bento3_title: "Context",
    assets: ["character shiba explaining something.png"]
  },
  {
    scene: 3,
    layout: "web_questions",
    voice: "Nêu ra 3 câu hỏi thực tế phải trả lời khi đọc trang này...",
    visual: "Ba thẻ câu hỏi: What, Why, Check.",
    content_mode: "steps",
    headline_line1: "BA CÂU HỎI",
    headline_line2: "PHẢI TRẢ LỜI",
    steps: [
      { title: "<câu hỏi 1>", body: "<điều cần xác định>" },
      { title: "<câu hỏi 2>", body: "<lý do cần quan tâm>" },
      { title: "<câu hỏi 3>", body: "<cách kiểm chứng>" }
    ],
    bento1_title: "What",
    bento2_title: "Why",
    bento3_title: "Check",
    bento4_title: "Next",
    assets: ["character shiba thinking.png"]
  },
  {
    scene: 4,
    layout: "web_notable",
    voice: "Chỉ ra các điểm đáng chú ý nhất (quickstart, changelog, demo)...",
    visual: "Checklist các điểm quan trọng rút ra từ trang web.",
    headline_line1: "ĐIỂM ĐÁNG CHÚ Ý",
    headline_line2: "RÚT TỪ NGUỒN WEB",
    bento1_title: "Key point",
    bento1_desc: "Nội dung điểm nhấn chính",
    bento2_title: "Evidence",
    bento3_title: "Limit",
    assets: ["character shiba explaining something.png"]
  },
  {
    scene: 5,
    layout: "action",
    voice: "Hành động tiếp theo khuyến nghị cho người xem (đọc tiếp, clone, check pricing)...",
    visual: "Nút CTA kêu gọi hành động cụ thể.",
    headline_line1: "<nguồn hoặc hành động cụ thể>",
    headline_line2: "<việc nên làm tiếp theo>",
    btn_text: "Mở nguồn và kiểm chứng",
    assets: ["character shiba developer.png"]
  },
  {
    scene: 6,
    layout: "outro_web",
    voice: "Tóm tắt lời kết và kêu gọi lưu lại link, chia sẻ video...",
    visual: "Màn hình outro hiển thị link và các nguồn tham khảo liên quan.",
    headline_line1: "LƯU LINK",
    headline_line2: "KIỂM CHỨNG TRƯỚC KHI DÙNG",
    bento1_title: "Nguồn chính",
    bento1_desc: "Tóm tắt liên quan",
    bento2_title: "Tóm tắt",
    bento3_title: "Kiểm chứng",
    bento4_title: "Áp dụng",
    assets: ["character shiba smiling brightly.png"]
  }
];

function softLimit(value, max) {
  const text = String(value || "").trim().replace(/\s+/g, " ");
  if (text.length <= max) return text;
  const sliced = text.slice(0, max + 1);
  const lastSpace = sliced.lastIndexOf(" ");
  return `${sliced.slice(0, lastSpace > 10 ? lastSpace : max).trim()}...`;
}

function normalizeCards(scene) {
  const rawCards = Array.isArray(scene.steps) && scene.steps.length > 0
    ? scene.steps
    : Array.isArray(scene.cards) && scene.cards.length > 0
      ? scene.cards
      : [1, 2, 3, 4]
          .map((idx) => ({
            title: scene[`bento${idx}_title`],
            body: scene[`bento${idx}_desc`],
          }))
          .filter((card) => card.title || card.body);

  return rawCards.slice(0, 4).map((card, idx) => ({
    title: softLimit(card.title || `Điểm ${idx + 1}`, 16),
    body: softLimit(card.body || card.desc || card.description || "Kiểm tra trong nguồn chính.", 75),
  }));
}

function isGenericActionHeadline(value) {
  const text = String(value || "").toUpperCase();
  return text.includes("HÀNH ĐỘNG") || text.includes("TÙY THEO") || text.includes("TUỲ THEO");
}

function actionHeadline(context) {
  const title = String(context.title || "").toUpperCase();
  const source = String(context.sourceLabel || "NGUỒN").replace(/^www\./, "").toUpperCase();
  if (title.includes("DOC")) return "ĐỌC DOCS";
  if (title.includes("API")) return "KIỂM API";
  return softLimit(source, 20);
}

export function normalizeWebScenes(scenes, context = {}) {
  if (!Array.isArray(scenes)) {
    return [];
  }

  const normalized = scenes.slice(0, WEB_LAYOUT_SCHEMA.length).map((scene, idx) => {
    const schema = WEB_LAYOUT_SCHEMA[idx];
    const merged = {
      ...schema,
      ...scene,
      scene: idx + 1,
      layout: schema.layout,
      repo_url: scene.repo_url || context.sourceUrl || schema.repo_url,
    };

    const cards = normalizeCards(merged);
    if (merged.content_mode === "steps" && cards.length > 0) {
      merged.steps = cards;
    } else if (cards.length > 0) {
      merged.cards = cards;
    }

    cards.forEach((card, cardIdx) => {
      const n = cardIdx + 1;
      merged[`bento${n}_title`] = card.title;
      merged[`bento${n}_desc`] = card.body;
    });

    if (idx === 4 && (isGenericActionHeadline(merged.headline_line1) || isGenericActionHeadline(merged.headline_line2))) {
      merged.headline_line1 = actionHeadline(context);
      merged.headline_line2 = "KIỂM TRA TRƯỚC";
    }

    merged.headline_line1 = softLimit(merged.headline_line1 || context.title || context.sourceLabel || "WEB", 20);
    merged.headline_line2 = softLimit(merged.headline_line2 || schema.headline_line2 || "KIỂM TRA NGUỒN", 32);
    return merged;
  });

  for (let idx = normalized.length; idx < WEB_LAYOUT_SCHEMA.length; idx += 1) {
    normalized.push({
      ...WEB_LAYOUT_SCHEMA[idx],
      scene: idx + 1,
      headline_line1: softLimit(WEB_LAYOUT_SCHEMA[idx].headline_line1 || context.sourceLabel || "WEB", 20),
      headline_line2: softLimit(WEB_LAYOUT_SCHEMA[idx].headline_line2 || "KIỂM TRA NGUỒN", 32),
    });
  }

  return normalized;
}

export async function generateScenes(rawData, format) {
  const { target, webInfo, projectAssets = [] } = rawData;
  const title = webInfo.title || target.host;
  const sourceLabel = target.host.replace(/^www\./, "");
  const providers = buildAiProviders();

  if (!providers.length) {
    throw new Error("Không tìm thấy OPENAI_API_KEY, OPENROUTER_API_KEY hoặc TROLLLLM_API_KEY trong cấu hình .env để chạy luồng sinh kịch bản AI.");
  }

  try {
    console.log(`> Đang gọi OpenAI/OpenRouter để sinh kịch bản Web cho format: ${format}...`);
    const guideline = STORYTELLING_GUIDELINES[format] || STORYTELLING_GUIDELINES.web_context_digest;

    const prompt = `
      Bạn là chuyên gia phân tích và tóm tắt thông tin công nghệ. Hãy viết kịch bản voice-over tiếng Việt và tiêu đề màn hình cho video review trang web sau:
      - Tiêu đề Trang: ${title}
      - Domain: ${sourceLabel}
      - Câu trả lời tóm tắt của hệ thống: ${webInfo.answer || "Không có"}
      - Mô tả: ${webInfo.description || "Không có"}
      - Kết quả tìm kiếm mở rộng (nếu có): ${JSON.stringify(webInfo.results)}
      ${buildProjectAssetsPrompt(projectAssets)}

      HƯỚNG DẪN KỂ CHUYỆN BẮT BUỘC CHO FORMAT "${format}":
      ${guideline}

      BẠN PHẢI TRẢ VỀ MỘT JSON OBJECT theo đúng cấu trúc mẫu dưới đây (chứa key "scenes" là mảng 6 cảnh):
      {
        "scenes": ${JSON.stringify(WEB_LAYOUT_SCHEMA, null, 2)}
      }

      QUY TẮC CỰC KỲ QUAN TRỌNG ĐỂ TRÁNH VỠ CHỮ:
      1. Mảng "scenes" phải chứa đúng 6 object tương tự mẫu trên. Không tự ý thêm bớt cảnh.
      2. Viết lời đọc (voice) bằng tiếng Việt tự nhiên, trôi chảy, dài khoảng 30-40 từ mỗi cảnh.
      3. Giới hạn độ dài text hiển thị:
         - "headline_line1": tối đa 20 ký tự (viết hoa).
         - "headline_line2": tối đa 30 ký tự (viết hoa).
         - "bento1_desc": tối đa 70 ký tự.
         - "bento1_title" đến "bento4_title": tối đa 12 ký tự.
         - "btn_text": Nút CTA cực ngắn (<= 30 ký tự).
         - "steps": tối đa 3-4 object, mỗi object có "title" <= 16 ký tự và "body" <= 75 ký tự.
      4. Đối với Scene 1, điền chính xác "repo_url" là: "${target.url.replace(/^https?:\/\//, "")}".toLowerCase()
      5. Không copy placeholder trong schema. Mọi headline, bento title, bento desc và step phải viết lại theo context thật của trang.
      6. Với scene hướng dẫn đọc docs, quickstart, cấu hình hoặc hành động tiếp theo, ưu tiên "content_mode": "steps" và sinh 3 bước cụ thể.
      7. Nếu không đủ dữ liệu chắc chắn, hãy viết theo hướng kiểm tra/tư vấn; không bịa API, giá, port, lệnh hoặc cấu hình.
    `;

    const { result: response, provider } = await createChatCompletionWithFallback({
      providers,
      request: {
        messages: [
          { role: "system", content: "You are a tech analyst script writer who outputs JSON strict format." },
          { role: "user", content: prompt }
        ],
        response_format: { type: "json_object" }
      },
      onFallback: ({ from, to, error }) => {
        console.warn(`AI provider ${from.name} lỗi (${error.message}); chuyển sang ${to.name}.`);
      },
    });
    console.log(`> Đã sinh kịch bản Web bằng provider: ${provider.name}`);

    const parsed = parseAiJsonContent(response.choices[0].message.content);
    
    // Trích xuất mảng scenes một cách an toàn và linh hoạt
    let scenes = parsed.scenes;
    if (!Array.isArray(scenes)) {
      if (Array.isArray(parsed)) {
        scenes = parsed;
      } else {
        // Tìm bất kỳ key nào chứa mảng có độ dài bằng 6
        const foundKey = Object.keys(parsed).find(
          (k) => Array.isArray(parsed[k]) && parsed[k].length === 6
        );
        if (foundKey) {
          scenes = parsed[foundKey];
        }
      }
    }
    
    scenes = normalizeWebScenes(scenes, {
      title,
      sourceLabel,
      sourceUrl: target.url.replace(/^https?:\/\//, "").toLowerCase(),
    });

    if (Array.isArray(scenes) && scenes.length === 6) {
      return scenes.map((scene, idx) => {
        return baseScene({
          ...scene,
          scene: idx + 1,
          // Giữ lại các assets/sfx mặc định hoặc lấy từ AI nếu hợp lệ
          assets: scene.assets || ["character shiba explaining something.png"],
          sfx: "Ding 2.mp3"
        });
      });
    } else {
      throw new Error(`AI trả về số lượng cảnh không hợp lý (cần 6 cảnh, nhận được ${scenes ? scenes.length : 0} cảnh).`);
    }
  } catch (error) {
    throw new Error(`Không thể sinh kịch bản tự động bằng AI: ${error.message}`);
  }
}
