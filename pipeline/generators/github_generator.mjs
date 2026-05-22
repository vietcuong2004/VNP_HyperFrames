import { short, baseScene, githubStatsScene, getReadmeHeadings } from "../main_generateContent.js";
import { buildProjectAssetsPrompt } from "../agent_dynamic_flow.mjs";
import { buildAiProviders, createChatCompletionWithFallback } from "../ai_provider.mjs";

// Hướng dẫn kể chuyện khác nhau cho từng format con của GitHub
const STORYTELLING_GUIDELINES = {
  knowledge_map_resource_digest: `
    - Đây là một danh sách tổng hợp tài liệu học tập (awesome list/curated resources). Hãy ví nó như một "bản đồ kho báu".
    - Hãy chia sẻ định hướng học tập cho người mới bắt đầu (Beginner) và người phát triển (Builder).
    - Khuyên người xem bookmark/star để lưu lại và lọc nguồn trước khi học.
  `,
  developer_integration_brief: `
    - Đây là thư viện/framework viết code: Tập trung giải thích nó nằm ở lớp nào trong tech stack (ví dụ: frontend, backend, database...).
    - Phân tích cách import, cài đặt bằng CLI nhanh và cách chạy thử trong một dự án phụ để kiểm nghiệm.
    - Giọng điệu chuyên nghiệp, hữu ích cho các developer đang cân nhắc tích hợp vào dự án thực tế.
  `,
  dataset_explainer: `
    - Đây là tập dữ liệu/benchmark cho AI/Machine Learning: Hãy tập trung vào kích thước dữ liệu, các nhãn (labels) và ứng dụng thực tế.
    - Nhắc nhở kiểm tra License và bias của dữ liệu trước khi train model lớn.
  `,
  tool_review_quick_demo: `
    - Đây là một công cụ/ứng dụng/CLI: Tập trung giải thích cách nó giải quyết một vấn đề nhức nhối thực tế.
    - Hướng dẫn nhanh lệnh cài đặt, cách chạy demo và xem trực quan kết quả đầu ra.
    - Giọng điệu hào hứng, tò mò, lôi cuốn người xem chạy thử ngay.
  `,
  repo_overview_with_use_cases: `
    - Giới thiệu tổng quan chung về dự án và các trường hợp sử dụng thực tế (use cases) hữu dụng nhất.
    - Giải thích rõ ai nên sử dụng và tại sao nên lưu tâm đến dự án này.
  `
};

// Cấu trúc 8 cảnh (scenes) cố định cho Group 1 (GitHub)
export const GITHUB_LAYOUT_SCHEMA = [
  {
    scene: 1,
    layout: "intro",
    voice: "Lời mở đầu dẫn dắt tự nhiên dài khoảng 30-40 từ...",
    visual: "Chụp trang repo GitHub, phóng to tiêu đề và mô tả.",
    headline_line1: "TÊN REPO (VIẾT HOA, NGẮN)",
    headline_line2: "CẢNH MỞ ĐẦU (VIẾT HOA)"
  },
  {
    scene: 2,
    layout: "problem",
    voice: "Đặt vấn đề hoặc phân tích vai trò của repo trong tech stack...",
    visual: "Bento card tóm tắt usecase chính của dự án.",
    headline_line1: "VAI TRÒ / LAYER",
    headline_line2: "GIẢI QUYẾT VẤN ĐỀ GÌ?",
    bento1_title: "Use case",
    bento1_desc: "Mô tả ngắn gọn use case",
    bento2_title: "Tiện ích",
    bento3_title: "Mục tiêu"
  },
  {
    scene: 3,
    layout: "install",
    voice: "Hướng dẫn cài đặt nhanh hoặc hướng tiếp cận ban đầu...",
    visual: "Snippet code cài đặt tối giản hoặc cách tiếp cận.",
    headline_line1: "CÀI ĐẶT / LỘ TRÌNH",
    headline_line2: "BẮT ĐẦU NHANH",
    content_mode: "steps",
    steps: [
      { title: "Buoc 1", body: "Viec can lam dau tien" },
      { title: "Buoc 2", body: "Lenh hoac thao tac tiep theo" },
      { title: "Buoc 3", body: "Cach kiem tra ket qua" }
    ],
    bento1_title: "Bước 1",
    bento1_desc: "Noi dung buoc 1",
    bento2_title: "Bước 2",
    bento2_desc: "Noi dung buoc 2",
    bento3_title: "Bước 3",
    bento3_desc: "Noi dung buoc 3",
    bento4_title: "Bước 4",
    bento4_desc: "Noi dung buoc 4"
  },
  {
    scene: 4,
    layout: "feature",
    voice: "Đi sâu phân tích tính năng chính nổi bật hoặc giá trị lớn nhất...",
    visual: "Sơ đồ hoặc biểu tượng trực quan mô tả tính năng.",
    headline_line1: "ĐIỂM NỔI BẬT",
    headline_line2: "TÍNH NĂNG CHÍNH",
    btn_text: "Lệnh chạy mẫu hoặc nút CTA"
  },
  {
    scene: 5,
    layout: "checklist",
    voice: "Checklist đánh giá, các điểm lưu ý hoặc giấy phép sử dụng...",
    visual: "Checklist các điểm cần lưu ý trước khi dùng.",
    headline_line1: "ĐÁNH GIÁ NHANH",
    headline_line2: "LƯU Ý TRƯỚC KHI DÙNG",
    bento1_title: "License",
    bento1_desc: "Thông tin giấy phép",
    bento2_title: "Release",
    bento3_title: "Issues"
  },
  {
    scene: 6,
    layout: "stats",
    voice: "Tóm tắt tín hiệu cộng đồng và độ tin cậy ban đầu trên GitHub...",
    visual: "Thẻ stats của repo với số sao, ngôn ngữ.",
    headline_line1: "THỐNG KÊ REPO",
    headline_line2: "SỨC HÚT CỘNG ĐỒNG",
    repo_name: "owner/repo",
    repo_lang: "JavaScript",
    repo_stars: "★ 12,345",
    repo_trend: "▲ Repo",
    repo_trend_label: "GitHub"
  },
  {
    scene: 7,
    layout: "clone",
    voice: "Huong dan clone repo, doc README va chay thu trong mot project phu truoc khi tich hop that...",
    visual: "Hien thi lenh git clone va checklist chay thu toi gian.",
    headline_line1: "CLONE REPO",
    headline_line2: "CHAY THU AN TOAN",
    btn_text: "$ git clone github.com/owner/repo"
  },
  {
    scene: 8,
    layout: "outro",
    voice: "Ket lai bang loi khuyen kiem tra license, issue, release va star repo neu thay huu ich...",
    visual: "Outro nhac star, binh luan va luu repo de xem lai.",
    headline_line1: "TONG KET",
    headline_line2: "LUU LAI NEU HUU ICH",
    content_mode: "steps",
    steps: [
      { title: "Star", body: "Luu repo neu phu hop" },
      { title: "Issue", body: "Doc issue truoc khi dung" },
      { title: "Release", body: "Kiem tra ban phat hanh" },
      { title: "License", body: "Xac nhan license" }
    ],
    bento1_title: "Star",
    bento1_desc: "Luu repo neu phu hop",
    bento2_title: "Fork",
    bento2_desc: "Thu nghiem rieng",
    bento3_title: "Issue",
    bento3_desc: "Doc issue truoc khi dung",
    bento4_title: "Theo doi",
    bento4_desc: "Theo doi release moi"
  }
];

function softLimit(value, max) {
  const text = String(value || "").trim();
  if (!text) return "";
  return text.length <= max ? text : text.slice(0, max).trim();
}

function normalizeCards(scene, limit = 4) {
  const source = Array.isArray(scene.steps) && scene.steps.length > 0
    ? scene.steps
    : Array.isArray(scene.cards) && scene.cards.length > 0
      ? scene.cards
      : [1, 2, 3, 4]
          .map((idx) => ({
            title: scene[`bento${idx}_title`],
            body: scene[`bento${idx}_desc`],
          }))
          .filter((card) => card.title || card.body);

  return source.slice(0, limit).map((card, idx) => ({
    title: softLimit(card.title || `Buoc ${idx + 1}`, 18),
    body: softLimit(card.body || card.desc || card.description || "", 90),
  }));
}

function repoShortName(context = {}) {
  const value = String(context.repoName || context.repoFullName || "").trim();
  const name = value.split("/").filter(Boolean).pop() || "REPO";
  return name.replace(/[^a-z0-9_-]+/gi, " ").trim().toUpperCase() || "REPO";
}

function normalizedText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, " ")
    .trim();
}

function isGenericGithubHeadline(value) {
  const text = normalizedText(value);
  if (!text) return true;
  return [
    "TEN REPO",
    "CANH MO DAU",
    "VAI TRO",
    "LAYER",
    "GIAI QUYET VAN DE GI",
    "CAI DAT LO TRINH",
    "BAT DAU NHANH",
    "DIEM NOI BAT",
    "TINH NANG CHINH",
    "DANH GIA NHANH",
    "LUU Y TRUOC KHI DUNG",
    "THONG KE REPO",
    "SUC HUT CONG DONG",
    "CLONE REPO",
    "CHAY THU AN TOAN",
    "TONG KET",
    "LUU LAI NEU HUU ICH",
  ].includes(text) || text.includes("VIET HOA") || text.includes("PLACEHOLDER");
}

function githubHeadlinePair(idx, context = {}) {
  const repo = softLimit(repoShortName(context), 16);
  return [
    [repo, "REPO GITHUB"],
    ["USE CASE", `${repo} GIUP GI`],
    [`RUN ${repo}`, "BAT DAU AN TOAN"],
    ["DIEM MANH", `${repo} NOI BAT`],
    ["CHECKLIST", "TRUOC KHI DUNG"],
    ["STATS", "TIN HIEU GITHUB"],
    [`CLONE ${repo}`, "CHAY THU RIENG"],
    ["LUU REPO", "DOC README KY"],
  ][idx] || [repo, "REPO GITHUB"];
}

export function normalizeGithubScenes(scenes, context = {}) {
  if (!Array.isArray(scenes)) {
    return [];
  }

  const normalized = scenes.slice(0, GITHUB_LAYOUT_SCHEMA.length).map((scene, idx) => {
    const merged = {
      ...GITHUB_LAYOUT_SCHEMA[idx],
      ...scene,
      scene: idx + 1,
      repo_url: scene.repo_url || context.repoUrl,
    };
    const cards = normalizeCards(merged, idx === 2 || idx === 7 ? 4 : 3);
    cards.forEach((card, cardIdx) => {
      merged[`bento${cardIdx + 1}_title`] = card.title;
      merged[`bento${cardIdx + 1}_desc`] = card.body;
    });
    if (cards.length > 0) {
      merged.steps = cards;
      merged.content_mode = merged.content_mode || "steps";
    }
    if (isGenericGithubHeadline(merged.headline_line1) || isGenericGithubHeadline(merged.headline_line2)) {
      const [line1, line2] = githubHeadlinePair(idx, context);
      merged.headline_line1 = line1;
      merged.headline_line2 = line2;
    }
    return merged;
  });

  for (let idx = normalized.length; idx < GITHUB_LAYOUT_SCHEMA.length; idx += 1) {
    const scene = {
      ...GITHUB_LAYOUT_SCHEMA[idx],
      scene: idx + 1,
      repo_url: context.repoUrl,
    };
    const [line1, line2] = githubHeadlinePair(idx, context);
    scene.headline_line1 = line1;
    scene.headline_line2 = line2;
    normalized.push(scene);
  }

  return normalized;
}

export async function generateScenes(rawData, format) {
  const { target, repoData, readme, projectAssets = [] } = rawData;
  const providers = buildAiProviders();

  if (!providers.length) {
    throw new Error("Không tìm thấy OPENAI_API_KEY, OPENROUTER_API_KEY hoặc TROLLLLM_API_KEY trong cấu hình .env để chạy luồng sinh kịch bản AI.");
  }

  try {
    console.log(`> Đang gọi OpenAI/OpenRouter để sinh kịch bản GitHub cho format: ${format}...`);
    
    const guideline = STORYTELLING_GUIDELINES[format] || STORYTELLING_GUIDELINES.repo_overview_with_use_cases;

    const prompt = `
      Bạn là chuyên gia biên tập video công nghệ có kinh nghiệm. Hãy viết kịch bản voice-over tiếng Việt và các tiêu đề màn hình cho video giới thiệu repo GitHub sau:
      - Tên Repo: ${repoData.name || target.repo}
      - Mô tả: ${repoData.description || "Không có mô tả"}
      - Ngôn ngữ chính: ${repoData.language || "N/A"}
      - Số sao (Stars): ${repoData.stargazers_count || 0}
      - License: ${repoData.license?.name || "Chưa rõ"}
      - README snippets: ${short(readme, 1200)}
      ${buildProjectAssetsPrompt(projectAssets)}

      HƯỚNG DẪN KỂ CHUYỆN (STORYTELLING GUIDELINE) BẮT BUỘC CHO FORMAT "${format}":
      ${guideline}

      BẠN PHẢI TRẢ VỀ MỘT JSON OBJECT theo đúng cấu trúc mẫu dưới đây (chứa key "scenes" là mảng 8 cảnh):
      {
        "scenes": ${JSON.stringify(GITHUB_LAYOUT_SCHEMA, null, 2)}
      }

      QUY TẮC CỰC KỲ QUAN TRỌNG ĐỂ TRÁNH VỠ CHỮ:
      1. Mảng "scenes" phải chứa đúng 8 object tương tự mẫu trên. Không tự ý thêm bớt cảnh.
      2. Viết lời đọc (voice) bằng tiếng Việt tự nhiên, trôi chảy, dài khoảng 30-40 từ mỗi cảnh.
      3. Giới hạn độ dài text hiển thị:
         - "headline_line1": tối đa 20 ký tự (viết hoa).
         - "headline_line2": tối đa 30 ký tự (viết hoa).
         - "bento1_desc": tối đa 70 ký tự.
         - "bento1_title" đến "bento4_title": tối đa 12 ký tự.
         - "btn_text": Lệnh CLI hoặc chuỗi cực ngắn (<= 30 ký tự).
      4. Khong copy nguyen placeholder headline nhu "CAI DAT / LO TRINH", "BAT DAU NHANH", "TONG KET"; hay viet theo ten repo va ngu canh that.
      5. Voi canh cai dat, clone, demo, checklist hoac outro, dien "content_mode": "steps" va mang "steps" gom 3-4 object { "title", "body" }. Cac bento_title/bento_desc nen khop voi cac step nay.
      6. Khong bia lenh install, API key, port, config, price hoac benchmark neu README khong neu. Neu README thieu lenh, dung buoc an toan nhu "Doc README", "Kiem tra release", "Chay demo nho".
      7. Thong tin Scene 6 (stats) phai chinh xac:
         - "repo_name": "${target.owner}/${target.repo}".toLowerCase()
         - "repo_lang": "${repoData.language || "N/A"}"
         - "repo_stars": "★ ${(repoData.stargazers_count || 0).toLocaleString("vi-VN")}"
      8. Đối với Scene 7, điền "btn_text" là lệnh git clone chính xác: "$ git clone github.com/${target.owner}/${target.repo}".toLowerCase()
    `;

    const { result: response, provider } = await createChatCompletionWithFallback({
      providers,
      request: {
        messages: [
          { role: "system", content: "You are a professional video content editor who outputs JSON strict data." },
          { role: "user", content: prompt }
        ],
        response_format: { type: "json_object" }
      },
      onFallback: ({ from, to, error }) => {
        console.warn(`AI provider ${from.name} lỗi (${error.message}); chuyển sang ${to.name}.`);
      },
    });
    console.log(`> Đã sinh kịch bản GitHub bằng provider: ${provider.name}`);

    const parsed = JSON.parse(response.choices[0].message.content);
    
    // Trích xuất mảng scenes một cách an toàn và linh hoạt
    let scenes = parsed.scenes;
    if (!Array.isArray(scenes)) {
      if (Array.isArray(parsed)) {
        scenes = parsed;
      } else {
        // Tìm bất kỳ key nào chứa mảng có độ dài bằng 8
        const foundKey = Object.keys(parsed).find(
          (k) => Array.isArray(parsed[k]) && parsed[k].length === 8
        );
        if (foundKey) {
          scenes = parsed[foundKey];
        }
      }
    }
    
    scenes = normalizeGithubScenes(scenes, {
      repoName: repoData.name || target.repo,
      repoFullName: `${target.owner}/${target.repo}`,
      repoUrl: `github.com/${target.owner}/${target.repo}`,
    });

    if (Array.isArray(scenes) && scenes.length === 8) {
      // Gắn thêm các assets và sfx mặc định cho từng scene
      return scenes.map((scene, idx) => {
        return baseScene({
          ...scene,
          scene: idx + 1,
          assets: Array.isArray(scene.assets) && scene.assets.length > 0
            ? scene.assets
            : ["character shiba explaining something.png"],
          sfx: "Ding 2.mp3"
        });
      });
    } else {
      throw new Error(`AI trả về số lượng cảnh không hợp lý (cần 8 cảnh, nhận được ${scenes ? scenes.length : 0} cảnh).`);
    }
  } catch (error) {
    throw new Error(`Không thể sinh kịch bản tự động bằng AI: ${error.message}`);
  }
}
