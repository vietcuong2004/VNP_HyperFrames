import { callAI } from "../../services/aiRouter.js";
import { short, baseScene } from "../main_generateContent.js";

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

const TEMPLATE_CONTENT_PROFILES = {
  template1: `
    - Content angle: web context digest.
    - Scene 2 should explain the main claim, target audience, and what the viewer should verify.
    - Scene 3-4 should turn the page into practical questions and source checks.
    - Keep the viewer thinking: "What does this page say, and what should I verify first?"
  `,
  template2: `
    - Content angle: docs or article reading path.
    - Scene 2 should explain how to read the source in order, not only summarize it.
    - Scene 3-4 should focus on key sections, evidence, examples, compatibility, and source quality.
    - Keep the viewer thinking: "How do I extract reliable notes from this page?"
  `,
  template3: `
    - Content angle: tool or product action brief.
    - Scene 2 should connect the page to a concrete user job or product decision.
    - Scene 3-4 should focus on demo checks, pricing/API/support risks, and a next action.
    - Keep the viewer thinking: "Should I try this tool, and what is the first test?"
  `,
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


function isSchemaPlaceholder(value) {
  return /^<[^>]+>$/.test(String(value || "").trim());
}

function cleanSchemaValue(value, fallback = "") {
  return isSchemaPlaceholder(value) ? fallback : value;
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
    title: softLimit(cleanSchemaValue(card.title, "") || `Điểm ${idx + 1}`, 16),
    body: softLimit(cleanSchemaValue(card.body || card.desc || card.description, "") || "Kiểm tra trong nguồn chính.", 75),
  }));
}

function isGenericActionHeadline(value) {
  const text = String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();
  return text.includes("HANH DONG") || text.includes("TUY THEO") || text.includes("HÀNH ĐỘNG") || text.includes("TÙY THEO") || text.includes("TUỲ THEO");
}

function isGenericWebHeadline(value) {
  const text = String(value || "").toUpperCase();
  return [
    "TIÊU ĐỀ TRANG",
    "TIÊU ĐỀ TRANG",
    "WEB CONTEXT DIGEST",
    "NỘI DUNG CHÍNH",
    "NỘI DUNG CHÍNH",
    "CẦN GIẢI THÍCH",
    "CẦN GIẢI THÍCH",
    "BA CÂU HỎI",
    "BA CÂU HỎI",
    "PHẢI TRẢ LỜI",
    "PHẢI TRẢ LỜI",
  ].some((generic) => text.includes(generic));
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

    if (idx !== 4 && (isGenericWebHeadline(merged.headline_line1) || isGenericWebHeadline(merged.headline_line2))) {
      const source = actionHeadline(context);
      const pairs = [
        [source, "WEB CẦN KIỂM TRA"],
        ["TÓM TẮT", `${source} NÓI GÌ`],
        ["CÂU HỎI", "ĐỌC TRƯỚC KHI DÙNG"],
        ["ĐIỂM CHÍNH", "RÚT TỪ NGUỒN WEB"],
        [source, "KIỂM TRA TRƯỚC"],
        ["LƯU LINK", "KIỂM CHỨNG LẠI"],
      ];
      [merged.headline_line1, merged.headline_line2] = pairs[idx] || [source, "KIỂM TRA NGUỒN"];
    }

    if (
      idx === 4 &&
      (
        isGenericActionHeadline(merged.headline_line1) ||
        isGenericActionHeadline(merged.headline_line2) ||
        isSchemaPlaceholder(merged.headline_line1) ||
        isSchemaPlaceholder(merged.headline_line2)
      )
    ) {
      merged.headline_line1 = actionHeadline(context);
      merged.headline_line2 = "KIỂM TRA TRƯỚC";
    }

    merged.headline_line1 = softLimit(cleanSchemaValue(merged.headline_line1, "") || context.title || context.sourceLabel || "WEB", 20);
    merged.headline_line2 = softLimit(cleanSchemaValue(merged.headline_line2, "") || "KIỂM TRA NGUỒN", 32);
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

export async function generateScenes(rawData, format, subtemplate = "template1") {
  const { target, webInfo } = rawData;
  const title = webInfo.title || target.host;
  const sourceLabel = target.host.replace(/^www\./, "");
  const guideline = STORYTELLING_GUIDELINES[format] || STORYTELLING_GUIDELINES.web_context_digest;
  const templateProfile = TEMPLATE_CONTENT_PROFILES[subtemplate] || TEMPLATE_CONTENT_PROFILES.template1;

  const prompt = `
      Bạn là chuyên gia phân tích và tóm tắt thông tin công nghệ. Hãy viết kịch bản voice-over tiếng Việt và tiêu đề màn hình cho video review trang web sau:
      - Tiêu đề Trang: ${title}
      - Domain: ${sourceLabel}
      - Câu trả lời tóm tắt của hệ thống: ${webInfo.answer || "Không có"}
      - Mô tả: ${webInfo.description || "Không có"}
      - Kết quả tìm kiếm mở rộng (nếu có): ${JSON.stringify(webInfo.results)}

      HƯỚNG DẪN KỂ CHUYỆN BẮT BUỘC CHO FORMAT "${format}":
      ${guideline}

      TEMPLATE CONTENT PROFILE FOR "${subtemplate}":
      ${templateProfile}

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
      8. Every headline, step, bento card, and voice line must follow this template content profile. Do not reuse the same scene angle across template1/template2/template3.
    `;

  try {
    console.log(`> Đang gọi custom API để sinh kịch bản Web cho format: ${format}...`);
    const { result: parsed } = await callAI({
      prompt,
      isJson: true,
      onLog: (msg) => console.log(msg)
    });

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
      const shibaAssets = [
        "character shiba using a magnifying glass to look closely.png", // Scene 1: intro
        "character shiba explaining something.png",         // Scene 2: summary
        "character shiba thinking.png",                   // Scene 3: questions
        "character shiba wearing stylish glasses.png",      // Scene 4: notable points
        "character shiba cheerfully talking.png",          // Scene 5: action
        "character shiba smiling brightly.png"             // Scene 6: outro
      ];
      return scenes.map((scene, idx) => {
        return baseScene({
          ...scene,
          scene: idx + 1,
          assets: [shibaAssets[idx] || "character shiba explaining something.png"],
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
