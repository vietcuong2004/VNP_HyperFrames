import OpenAI from "openai";
import { short, baseScene } from "../main_generateContent.js";

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
const DOCKER_LAYOUT_SCHEMA = [
  {
    scene: 1,
    layout: "intro_docker",
    voice: "Lời dẫn dắt giới thiệu Docker image khoảng 30-40 từ...",
    visual: "Chụp trang Docker Hub, phóng to thông tin image.",
    headline_line1: "TÊN IMAGE (VIẾT HOA)",
    headline_line2: "DOCKER QUICK START",
    repo_url: "hub.docker.com/r/..."
  },
  {
    scene: 2,
    layout: "docker_tag",
    voice: "Lời bàn về cách chọn tag, pin tag ổn định tránh latest...",
    visual: "Terminal hiển thị lệnh pull image kèm tag cụ thể.",
    headline_line1: "CHỌN TAG",
    headline_line2: "RỒI PULL IMAGE",
    btn_text: "$ docker pull ..."
  },
  {
    scene: 3,
    layout: "docker_config",
    voice: "Phân tích các tham số cấu hình: map port, mount volume, biến env...",
    visual: "Sơ đồ docker run mô tả ánh xạ port, volume và môi trường.",
    headline_line1: "CẤU HÌNH",
    headline_line2: "PORT, VOLUME VÀ ENV",
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
    headline_line1: "RUN THỬ",
    headline_line2: "TRƯỚC KHI DEPLOY",
    btn_text: "$ docker run ..."
  },
  {
    scene: 5,
    layout: "outro_docker",
    voice: "Các checklist kiểm tra trước khi đưa lên production và kêu gọi hành động...",
    visual: "Bento card checklist backup và bảo mật.",
    headline_line1: "PRODUCTION",
    headline_line2: "CHECKLIST VÀ BACKUP",
    bento1_title: "Pull",
    bento2_title: "Run",
    bento3_title: "Port",
    bento4_title: "Volume"
  }
];

export async function generateScenes(rawData, format) {
  const { target, info } = rawData;
  const apiKey = process.env.OPENAI_API_KEY || process.env.OPENROUTER_API_KEY;

  const imageRef = `${target.namespace}/${target.image}`;

  if (!apiKey) {
    throw new Error("Không tìm thấy OPENAI_API_KEY hoặc OPENROUTER_API_KEY trong cấu hình .env để chạy luồng sinh kịch bản AI.");
  }

  try {
    console.log(`> Đang gọi OpenAI/OpenRouter để sinh kịch bản Docker cho format: ${format}...`);
    const isOpenRouter = apiKey.startsWith("sk-or-") || process.env.OPENROUTER_API_KEY;
    const client = new OpenAI({
      apiKey: apiKey,
      baseURL: isOpenRouter ? "https://openrouter.ai/api/v1" : undefined
    });

    const modelName = isOpenRouter ? "openai/gpt-4o-mini" : "gpt-4o-mini";
    const guideline = STORYTELLING_GUIDELINES[format] || STORYTELLING_GUIDELINES.container_overview;

    const prompt = `
      Bạn là chuyên gia DevOps và làm video hướng dẫn. Hãy viết kịch bản voice-over tiếng Việt và tiêu đề màn hình cho video giới thiệu Docker Image sau:
      - Tên Image: ${imageRef}
      - Mô tả: ${info.description || "Không có mô tả"}
      - Sao (Stars): ${info.star_count || 0}
      - Lượt Pulls: ${info.pull_count || 0}

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
      4. Đối với Scene 1, điền chính xác "repo_url" là: "hub.docker.com/r/${imageRef}".toLowerCase()
      5. Đối với các scene có lệnh CLI, điền lệnh mẫu Docker thật hợp lý dựa vào tên image.
    `;

    const response = await client.chat.completions.create({
      model: modelName,
      messages: [
        { role: "system", content: "You are a DevOps video script writer who outputs strict JSON structures." },
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
        // Tìm bất kỳ key nào chứa mảng có độ dài bằng 5
        const foundKey = Object.keys(parsed).find(
          (k) => Array.isArray(parsed[k]) && parsed[k].length === 5
        );
        if (foundKey) {
          scenes = parsed[foundKey];
        }
      }
    }
    
    if (Array.isArray(scenes) && scenes.length === 5) {
      return scenes.map((scene, idx) => {
        return baseScene({
          ...scene,
          scene: idx + 1,
          assets: ["character shiba explaining something.png"],
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
