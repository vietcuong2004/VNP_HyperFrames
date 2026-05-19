import https from "https";
import fs from "fs";
import path from "path";

// Parse repository URL to get owner and repo name
function parseGithubUrl(url) {
  try {
    const cleaned = url.replace(/\/$/, ""); // Remove trailing slash
    const parts = cleaned.split("/");
    if (parts.length < 2) return null;
    const repo = parts.pop();
    const owner = parts.pop();
    return { owner, repo };
  } catch {
    return null;
  }
}

// Helper to make HTTPS requests with User-Agent header (required by GitHub API)
function fetchJson(url) {
  return new Promise((resolve, reject) => {
    const options = {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    };
    https
      .get(url, options, (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(e);
          }
        });
      })
      .on("error", reject);
  });
}

async function main() {
  const urlArg = process.argv[2];
  if (!urlArg) {
    console.error("Lỗi: Vui lòng cung cấp đường dẫn GitHub Repo URL!");
    console.error("Ví dụ: node generate_repo_data.js https://github.com/heygen-com/hyperframes");
    process.exit(1);
  }

  const parsed = parseGithubUrl(urlArg);
  if (!parsed) {
    console.error("Lỗi: Link GitHub Repo URL không đúng định dạng!");
    process.exit(1);
  }

  const { owner, repo } = parsed;
  console.log(`Đang lấy thông tin repo từ GitHub API cho: ${owner}/${repo}...`);

  let repoData;
  try {
    repoData = await fetchJson(`https://api.github.com/repos/${owner}/${repo}`);
    if (repoData.message && repoData.message.includes("Not Found")) {
      throw new Error("Repository không tồn tại hoặc ở trạng thái Private!");
    }
  } catch (err) {
    console.warn(
      `Không thể lấy dữ liệu từ GitHub API (${err.message}). Sử dụng thông tin mặc định.`,
    );
    repoData = {
      name: repo,
      description: "Dự án mã nguồn mở cực kỳ thú vị trên GitHub.",
      stargazers_count: 5000,
      language: "JavaScript",
    };
  }

  const repoName = repoData.name || repo;
  const description = repoData.description || "Dự án mã nguồn mở cực kỳ hữu ích.";
  const stars = repoData.stargazers_count || 1200;
  const language = repoData.language || "TypeScript";

  console.log(`- Tên Repo: ${repoName}`);
  console.log(`- Mô tả: ${description}`);
  console.log(`- Số sao: ${stars}`);
  console.log(`- Ngôn ngữ: ${language}`);

  // Create Vietnamese review script scenes using the metadata
  const scriptJson = {
    template: "news",
    scenes: [
      {
        stt: 1,
        voice: `Chào anh em! Hôm nay mình sẽ review một repo siêu hot trên GitHub: ${repoName} - ${description.substring(0, 100)} cực kỳ chất lượng!`,
        visual: `Nền: Grid chuyển động. Yếu tố chính: Mockup trình duyệt GitHub hiển thị trang repo.`,
        assets: ["character shiba explaining something.png"],
        sfx: "yeah_tre_con.mp3",
        repo_url: `github.com/${owner}/${repo}`.toLowerCase(),
        headline_line1: repoName.toUpperCase(),
        headline_line2: "DỰ ÁN NGUỒN MỞ SIÊU HOT",
      },
      {
        stt: 2,
        voice: `Dự án này được tối ưu hóa cực kỳ tốt, hỗ trợ lập trình bằng ${language}. Giúp anh em phát triển ứng dụng một cách nhanh chóng, sạch sẽ và vô cùng hiệu quả.`,
        visual: "Yếu tố chính: Bento card giới thiệu các ưu điểm lớn.",
        assets: ["character shiba developer.png"],
        sfx: "Ding 2.mp3",
        headline_line1: "ƯU ĐIỂM",
        headline_line2: `PHÁT TRIỂN BẰNG ${language.toUpperCase()}`,
        bento1_title: "Mã nguồn sạch",
        bento1_desc: "Cấu trúc rõ ràng, chuẩn hóa cao và dễ đọc",
        bento2_title: "Triển khai nhanh",
        bento3_title: "Tối ưu hiệu năng",
      },
      {
        stt: 3,
        voice: `Đặc biệt, dự án sở hữu bốn tính năng cốt lõi vượt trội: Hiệu năng tối đa, Tương thích đa nền tảng, Cộng đồng hỗ trợ cực kỳ đông đảo và Độ ổn định cao trong môi trường thực tế.`,
        visual: "Giao diện Bento grid chia làm 4 ô tính năng nổi bật.",
        assets: ["character shiba explaining something.png"],
        sfx: "transition 1.mp3",
        headline_line1: "BỐN TÍNH NĂNG",
        headline_line2: "VƯỢT TRỘI NHẤT",
        bento1_title: "Hiệu năng tối đa",
        bento2_title: "Đa nền tảng",
        bento3_title: "Cộng đồng lớn",
        bento4_title: "Độ ổn định cao",
      },
      {
        stt: 4,
        voice: `Được thiết kế để vận hành trơn tru trên mọi môi trường sản xuất. Đảm bảo tính nhất quán, an toàn tuyệt đối và không xảy ra các sự cố ngoài ý muốn.`,
        visual: "Biểu tượng tích xanh kiểm định nổi bật kèm Shiba giải thích.",
        assets: ["character shiba explaining something.png"],
        sfx: "Ding 2.mp3",
        headline_line1: "ĐỘ TIN CẬY",
        headline_line2: "VẬN HÀNH ỔN ĐỊNH 100%",
        btn_text: "An toàn & Tin cậy tuyệt đối",
      },
      {
        stt: 5,
        voice: `Cơ chế tích hợp rất linh hoạt và thông minh, tương thích với hầu hết các thư viện và framework hiện đại phổ biến hiện nay.`,
        visual: "Bento card giới thiệu khả năng tích hợp linh hoạt.",
        assets: ["character shiba developer.png"],
        sfx: "transition 1.mp3",
        headline_line1: "TÍCH HỢP",
        headline_line2: "HỖ TRỢ FRAMEWORK HIỆN ĐẠI",
        bento1_title: "Kết nối linh hoạt",
        bento1_desc: "Hỗ trợ nhiều adapter và cấu hình mở rộng",
        bento2_title: "Độ trễ tối thiểu",
        bento3_title: "Dễ bảo trì",
      },
      {
        stt: 6,
        voice: `Nhờ những đột phá này, repo đã đạt mốc hơn ${stars.toLocaleString()} lượt yêu thích trên GitHub, trở thành dự án dẫn đầu xu thế công nghệ mới.`,
        visual: "Biểu đồ Candlestick tăng trưởng tài chính và huy hiệu vương miện repo.",
        assets: ["character shiba explaining something.png"],
        sfx: "yeah_tre_con.mp3",
        headline_line1: `${repoName.toUpperCase()} THỐNG KÊ`,
        headline_line2: "SỨC HÚT LỚN TRÊN GITHUB",
        repo_name: `${owner}/${repo}`.toLowerCase(),
        repo_lang: language,
        repo_stars: `★ ${stars.toLocaleString()}`,
        repo_trend: "▲ Hot",
        repo_trend_label: "this week",
      },
      {
        stt: 7,
        voice: `Để bắt đầu cài đặt và trải nghiệm dự án ngay lập tức, anh em chỉ cần clone mã nguồn này về và chạy lệnh khởi tạo đơn giản.`,
        visual: "Dòng lệnh cài đặt trong Terminal.",
        assets: ["character shiba developer.png"],
        sfx: "Ding 2.mp3",
        headline_line1: "KHỞI CHẠY NHANH",
        headline_line2: "CÀI ĐẶT TRONG MỘT NỐT NHẠC",
        btn_text: `$ git clone github.com/${owner}/${repo}`.toLowerCase(),
      },
      {
        stt: 8,
        voice: `Nếu anh em thấy dự án này thú vị và hữu ích, hãy thả một sao ủng hộ tác giả trên GitHub nhé! Cảm ơn anh em và hẹn gặp lại!`,
        visual: "Bảng tương tác kêu gọi Đăng ký, Like và Thả sao ủng hộ.",
        assets: ["character shiba explaining something.png"],
        sfx: "yeah_tre_con.mp3",
        headline_line1: "ỦNG HỘ TÁC GIẢ",
        headline_line2: "THẢ 1 STAR CHO REPO NHÉ!",
        bento1_title: "Thả 1 Star",
        bento2_title: "Yêu thích",
        bento3_title: "Bình luận ngay",
        bento4_title: "Đăng ký kênh",
      },
    ],
  };

  const outputDir = path.join(process.cwd(), "data");
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const outputPath = path.join(outputDir, "github-review.json");
  fs.writeFileSync(outputPath, JSON.stringify(scriptJson, null, 2), "utf-8");
  console.log(`\nThành công! Đã tạo kịch bản dynamic tại: ${outputPath}`);
}

main().catch((err) => {
  console.error("Lỗi:", err);
  process.exit(1);
});
