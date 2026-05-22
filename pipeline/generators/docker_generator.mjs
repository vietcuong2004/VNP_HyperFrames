import { short, baseScene } from "../main_generateContent.js";
import { buildProjectAssetsPrompt } from "../agent_dynamic_flow.mjs";
import { buildAiProviders, createChatCompletionWithFallback } from "../ai_provider.mjs";

// Hướng dẫn kể chuyện khác nhau cho từng format con của Docker Hub
const STORYTELLING_GUIDELINES = {
  container_quick_start: `
    - Đây là image dịch vụ/cơ sở (official hoặc base image): Hãy tập trung hướng dẫn người dùng pull và chạy nhanh nhất.
    - Giải thích cách thiết lập cổng (port) mặc định, biến môi trường tối thiểu và chạy container ở chế độ nền.
    - Giọng điệu trực quan, thiên về tài liệu nhanh.
  `,
  self_host_setup_guide: `
    - Đây là image ứng dụng self-hosted (ví dụ: dashboard, blog, db): Hãy hướng dẫn deploy hoàn chỉnh.
    - Nhấn mạnh vào việc mount volume để lưu trữ dữ liệu bền vững (persistent storage) và thiết lập môi trường bảo mật.
    - Giọng điệu chia sẻ mẹo triển khai hệ thống an toàn.
  `,
  dev_workflow_image_brief: `
    - Đây là image phục vụ phát triển hoặc CI/CD (SDK, runtime, test): Tập trung giải thích việc mount thư mục code local và đồng bộ môi trường dev.
    - Khuyên người xem pin version tag hoặc digest để giữ pipeline ổn định, tránh dùng tag latest mù quáng.
  `,
  container_overview: `
    - Hướng dẫn tổng quát các bước kiểm tra thông số Docker Hub, kiểm tra tag và chạy thử an toàn.
  `
};

// Cấu trúc 5 cảnh (scenes) cố định cho Group 2 (Docker Hub)
export const DOCKER_LAYOUT_SCHEMA = [
  {
    scene: 1,
    layout: "intro_docker",
    voice: "Lời dẫn dắt giới thiệu Docker image khoảng 30-40 từ...",
    visual: "Chụp trang Docker Hub, phóng to thông tin image.",
    headline_line1: "<ten image ngan gon>",
    headline_line2: "<loi ich chay container>",
    repo_url: "hub.docker.com/r/..."
  },
  {
    scene: 2,
    layout: "docker_tag",
    content_mode: "steps",
    voice: "Lời bàn về cách chọn tag, pin tag ổn định tránh latest...",
    visual: "Terminal hiển thị lệnh pull image kèm tag cụ thể.",
    headline_line1: "<tag nen dung>",
    headline_line2: "<ly do can pin tag>",
    btn_text: "$ docker pull ..."
  },
  {
    scene: 3,
    layout: "docker_config",
    content_mode: "steps",
    voice: "Phân tích các tham số cấu hình: map port, mount volume, biến env...",
    visual: "Sơ đồ docker run mô tả ánh xạ port, volume và môi trường.",
    headline_line1: "<config quan trong>",
    headline_line2: "<diem can kiem tra>",
    bento1_title: "Ports",
    bento1_desc: "Hướng dẫn map cổng",
    bento2_title: "Volume",
    bento3_title: "Env"
  },
  {
    scene: 4,
    layout: "terminal_docker",
    voice: "Ví dụ lệnh chạy Docker run hoàn chỉnh để chạy thử...",
    visual: "Màn hình terminal đang khởi chạy container.",
    headline_line1: "<lenh chay thu>",
    headline_line2: "<pham vi thu nghiem>",
    btn_text: "$ docker run ..."
  },
  {
    scene: 5,
    layout: "outro_docker",
    content_mode: "steps",
    voice: "Các checklist kiểm tra trước khi đưa lên production và kêu gọi hành động...",
    visual: "Bento card checklist backup và bảo mật.",
    headline_line1: "<truoc production>",
    headline_line2: "<backup va cap nhat>",
    bento1_title: "Pull",
    bento2_title: "Run",
    bento3_title: "Port",
    bento4_title: "Volume"
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
    title: softLimit(card.title || `Bước ${idx + 1}`, 16),
    body: softLimit(card.body || card.desc || card.description || "Kiểm tra Docker Hub trước khi chạy.", 75),
  }));
}

function dockerImageName(context = {}) {
  return String(context.imageRef || "docker")
    .split("/")
    .pop()
    .replace(/[:@].*$/, "")
    .replace(/[^a-z0-9_-]+/gi, " ")
    .trim()
    .toUpperCase() || "DOCKER";
}

function isGenericDockerHeadline(value) {
  const text = String(value || "").toUpperCase();
  return [
    "DOCKER QUICK START",
    "CHỌN TAG",
    "RỒI PULL IMAGE",
    "CẤU HÌNH",
    "PORT, VOLUME VÀ ENV",
    "RUN THỬ",
    "TRƯỚC KHI DEPLOY",
    "PRODUCTION",
    "CHECKLIST VÀ BACKUP",
  ].some((generic) => text === generic || text.includes(generic));
}

function dockerHeadlinePair(idx, context = {}) {
  const image = dockerImageName(context);
  const pairs = [
    [image, "CHẠY CONTAINER"],
    ["PIN TAG", `${image} ỔN ĐỊNH`],
    [`CONFIG ${image}`, "KIỂM TRA TRƯỚC"],
    [`RUN ${image}`, "THỬ TRÊN MÁY PHỤ"],
    ["TRƯỚC PROD", "BACKUP VÀ UPDATE"],
  ];
  return pairs[idx] || [image, "KIỂM TRA IMAGE"];
}

export function normalizeDockerScenes(scenes, context = {}) {
  if (!Array.isArray(scenes)) {
    return [];
  }

  const normalized = scenes.slice(0, DOCKER_LAYOUT_SCHEMA.length).map((scene, idx) => {
    const schema = DOCKER_LAYOUT_SCHEMA[idx];
    const merged = {
      ...schema,
      ...scene,
      scene: idx + 1,
      layout: schema.layout,
      repo_url: scene.repo_url || context.repoUrl || schema.repo_url,
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

    if (isGenericDockerHeadline(merged.headline_line1) || isGenericDockerHeadline(merged.headline_line2)) {
      const [headline1, headline2] = dockerHeadlinePair(idx, context);
      merged.headline_line1 = headline1;
      merged.headline_line2 = headline2;
    }

    merged.headline_line1 = softLimit(merged.headline_line1 || context.imageRef || "DOCKER", 20);
    merged.headline_line2 = softLimit(merged.headline_line2 || schema.headline_line2 || "KIỂM TRA IMAGE", 32);
    return merged;
  });

  for (let idx = normalized.length; idx < DOCKER_LAYOUT_SCHEMA.length; idx += 1) {
    normalized.push({
      ...DOCKER_LAYOUT_SCHEMA[idx],
      scene: idx + 1,
      repo_url: context.repoUrl || DOCKER_LAYOUT_SCHEMA[idx].repo_url,
      headline_line1: softLimit(DOCKER_LAYOUT_SCHEMA[idx].headline_line1 || context.imageRef || "DOCKER", 20),
      headline_line2: softLimit(DOCKER_LAYOUT_SCHEMA[idx].headline_line2 || "KIỂM TRA IMAGE", 32),
    });
  }

  return normalized;
}

export async function generateScenes(rawData, format) {
  const { target, info, projectAssets = [] } = rawData;
  const imageRef = `${target.namespace}/${target.image}`;
  const providers = buildAiProviders();

  if (!providers.length) {
    throw new Error("Không tìm thấy OPENAI_API_KEY, OPENROUTER_API_KEY hoặc TROLLLLM_API_KEY trong cấu hình .env để chạy luồng sinh kịch bản AI.");
  }

  try {
    console.log(`> Đang gọi OpenAI/OpenRouter để sinh kịch bản Docker cho format: ${format}...`);
    const guideline = STORYTELLING_GUIDELINES[format] || STORYTELLING_GUIDELINES.container_overview;

    const prompt = `
      Bạn là chuyên gia DevOps và làm video hướng dẫn. Hãy viết kịch bản voice-over tiếng Việt và tiêu đề màn hình cho video giới thiệu Docker Image sau:
      - Tên Image: ${imageRef}
      - Mô tả: ${info.description || "Không có mô tả"}
      - Sao (Stars): ${info.star_count || 0}
      - Lượt Pulls: ${info.pull_count || 0}
      ${buildProjectAssetsPrompt(projectAssets)}

      HƯỚNG DẪN KỂ CHUYỆN BẮT BUỘC CHO FORMAT "${format}":
      ${guideline}

      BẠN PHẢI TRẢ VỀ MỘT JSON OBJECT theo đúng cấu trúc mẫu dưới đây (chứa key "scenes" là mảng 5 cảnh):
      {
        "scenes": ${JSON.stringify(DOCKER_LAYOUT_SCHEMA, null, 2)}
      }

      QUY TẮC CỰC KỲ QUAN TRỌNG ĐỂ TRÁNH VỠ CHỮ:
      1. Mảng "scenes" phải chứa đúng 5 object tương tự mẫu trên. Không tự ý thêm bớt cảnh.
      2. Viết lời đọc (voice) bằng tiếng Việt tự nhiên, trôi chảy, dài khoảng 30-40 từ mỗi cảnh.
      3. Giới hạn độ dài text hiển thị:
         - "headline_line1": tối đa 20 ký tự (viết hoa).
         - "headline_line2": tối đa 30 ký tự (viết hoa).
         - "bento1_desc": tối đa 70 ký tự.
         - "bento1_title" đến "bento4_title": tối đa 12 ký tự.
         - "btn_text": Lệnh CLI hoặc chuỗi cực ngắn (<= 30 ký tự).
         - "steps": Tối đa 3-4 object, mỗi object có "title" <= 16 ký tự và "body" <= 75 ký tự.
      4. Đối với Scene 1, điền chính xác "repo_url" là: "hub.docker.com/r/${imageRef}".toLowerCase()
      5. Đối với các scene có lệnh CLI, điền lệnh mẫu Docker thật hợp lý dựa vào tên image.
      6. Không copy placeholder trong schema. Mọi headline, bento title, bento desc và step phải viết theo image thật.
         Ví dụ với Ubuntu không viết "DOCKER QUICK START", "CHỌN TAG", "CẤU HÌNH"; hãy viết kiểu "UBUNTU", "PIN TAG", "CONFIG UBUNTU".
      7. Với scene chọn tag, cấu hình, docker run hoặc production checklist, ưu tiên "content_mode": "steps" và sinh các bước cụ thể.
      8. Nếu không đủ dữ liệu chắc chắn, hãy viết theo hướng kiểm tra docs; không bịa port, env, password, volume path hoặc command.
    `;

    const { result: response, provider } = await createChatCompletionWithFallback({
      providers,
      request: {
        messages: [
          { role: "system", content: "You are a DevOps video script writer who outputs strict JSON structures." },
          { role: "user", content: prompt }
        ],
        response_format: { type: "json_object" }
      },
      onFallback: ({ from, to, error }) => {
        console.warn(`AI provider ${from.name} lỗi (${error.message}); chuyển sang ${to.name}.`);
      },
    });
    console.log(`> Đã sinh kịch bản Docker bằng provider: ${provider.name}`);

    const parsed = JSON.parse(response.choices[0].message.content);
    
    // Trích xuất mảng scenes một cách an toàn và linh hoạt
    let scenes = parsed.scenes;
    if (!Array.isArray(scenes)) {
      if (Array.isArray(parsed)) {
        scenes = parsed;
      } else {
        // Tìm bất kỳ key nào chứa mảng có độ dài bằng 5
        const foundKey = Object.keys(parsed).find(
          (k) => Array.isArray(parsed[k]) && parsed[k].length === 5
        );
        if (foundKey) {
          scenes = parsed[foundKey];
        }
      }
    }
    
    scenes = normalizeDockerScenes(scenes, {
      imageRef,
      repoUrl: `hub.docker.com/r/${imageRef}`.toLowerCase(),
    });

    if (Array.isArray(scenes) && scenes.length === 5) {
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
      throw new Error(`AI trả về số lượng cảnh không hợp lý (cần 5 cảnh, nhận được ${scenes ? scenes.length : 0} cảnh).`);
    }
  } catch (error) {
    throw new Error(`Không thể sinh kịch bản tự động bằng AI: ${error.message}`);
  }
}
