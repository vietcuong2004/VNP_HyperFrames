import OpenAI from "openai";
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

// Cấu trúc 6 cảnh (scenes) cố định cho Group 3 (Web)
const WEB_LAYOUT_SCHEMA = [
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
    headline_line1: "NỘI DUNG CHÍNH",
    headline_line2: "CẦN GIẢI THÍCH",
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
    headline_line1: "BA CÂU HỎI",
    headline_line2: "PHẢI TRẢ LỜI",
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
    headline_line1: "HÀNH ĐỘNG TIẾP",
    headline_line2: "TÙY THEO NGUỒN",
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

export async function generateScenes(rawData, format) {
  const { target, webInfo } = rawData;
  const apiKey = process.env.OPENAI_API_KEY || process.env.OPENROUTER_API_KEY;

  const title = webInfo.title || target.host;
  const sourceLabel = target.host.replace(/^www\./, "");

  if (!apiKey) {
    throw new Error("Không tìm thấy OPENAI_API_KEY hoặc OPENROUTER_API_KEY trong cấu hình .env để chạy luồng sinh kịch bản AI.");
  }

  try {
    console.log(`> Đang gọi OpenAI/OpenRouter để sinh kịch bản Web cho format: ${format}...`);
    const isOpenRouter = apiKey.startsWith("sk-or-") || process.env.OPENROUTER_API_KEY;
    const client = new OpenAI({
      apiKey: apiKey,
      baseURL: isOpenRouter ? "https://openrouter.ai/api/v1" : undefined
    });

    const modelName = isOpenRouter ? "openai/gpt-4o-mini" : "gpt-4o-mini";
    const guideline = STORYTELLING_GUIDELINES[format] || STORYTELLING_GUIDELINES.web_context_digest;

    const prompt = `
      Bạn là chuyên gia phân tích và tóm tắt thông tin công nghệ. Hãy viết kịch bản voice-over tiếng Việt và tiêu đề màn hình cho video review trang web sau:
      - Tiêu đề Trang: ${title}
      - Domain: ${sourceLabel}
      - Câu trả lời tóm tắt của hệ thống: ${webInfo.answer || "Không có"}
      - Mô tả: ${webInfo.description || "Không có"}
      - Kết quả tìm kiếm mở rộng (nếu có): ${JSON.stringify(webInfo.results)}

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
      4. Đối với Scene 1, điền chính xác "repo_url" là: "${target.url.replace(/^https?:\/\//, "")}".toLowerCase()
    `;

    const response = await client.chat.completions.create({
      model: modelName,
      messages: [
        { role: "system", content: "You are a tech analyst script writer who outputs JSON strict format." },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" }
    });

    const parsed = JSON.parse(response.choices[0].message.content);
    
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
