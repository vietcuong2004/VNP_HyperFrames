import https from "https";
import fs from "fs";
import path from "path";

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

function requestText(url, headers = {}) {
  return new Promise((resolve, reject) => {
    https
      .get(url, { headers: { "User-Agent": USER_AGENT, ...headers } }, (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          if (res.statusCode >= 400) {
            reject(new Error(`HTTP ${res.statusCode} khi gọi ${url}`));
            return;
          }
          resolve(data);
        });
      })
      .on("error", reject);
  });
}

async function fetchJson(url, headers = {}) {
  const text = await requestText(url, headers);
  return JSON.parse(text);
}

async function fetchOptionalJson(url, fallback, headers = {}) {
  try {
    return await fetchJson(url, headers);
  } catch (err) {
    console.warn(`Không lấy được dữ liệu từ ${url}: ${err.message}`);
    return fallback;
  }
}

async function fetchOptionalText(url, fallback, headers = {}) {
  try {
    return await requestText(url, headers);
  } catch (err) {
    console.warn(`Không lấy được nội dung từ ${url}: ${err.message}`);
    return fallback;
  }
}

function parseTargetUrl(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    url = new URL(`https://${value}`);
  }

  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  const parts = url.pathname.split("/").filter(Boolean);

  if (host === "github.com" && parts.length >= 2) {
    return {
      platform: "github",
      url: url.toString(),
      owner: parts[0],
      repo: parts[1].replace(/\.git$/, ""),
    };
  }

  if (host === "hub.docker.com" || host === "docker.io" || host === "www.docker.com") {
    const docker = parseDockerPath(host, parts);
    if (docker) {
      return { platform: "docker", url: url.toString(), ...docker };
    }
  }

  throw new Error("Hiện tại chỉ hỗ trợ link GitHub repo hoặc Docker Hub/Docker.io image.");
}

function parseDockerPath(host, parts) {
  if (host === "hub.docker.com") {
    if (parts[0] === "r" && parts.length >= 3) {
      return { namespace: parts[1], image: parts[2] };
    }
    if (parts[0] === "_" && parts[1]) {
      return { namespace: "library", image: parts[1], official: true };
    }
  }

  if (host === "docker.io") {
    if (parts.length === 1) return { namespace: "library", image: parts[0], official: true };
    if (parts.length >= 2) return { namespace: parts[0], image: parts[1] };
  }

  return null;
}

function stripMarkdown(value = "") {
  return value
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/!\[[^\]]*]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)]\([^)]*\)/g, "$1")
    .replace(/[#*_`>|-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getReadmeHeadings(readme) {
  return [...readme.matchAll(/^#{1,3}\s+(.+)$/gim)]
    .map((match) => match[1].trim())
    .slice(0, 12);
}

function countMarkdownLinks(readme) {
  return (readme.match(/\[[^\]]+]\(https?:\/\/[^)]+\)/g) || []).length;
}

function hasAny(text, words) {
  const lower = text.toLowerCase();
  return words.some((word) => lower.includes(word));
}

function classifyGithubRepo(repoData, readme, rootFiles) {
  const name = repoData.name || "";
  const description = repoData.description || "";
  const lowerReadme = readme.toLowerCase();
  const files = rootFiles.map((file) => file.toLowerCase());
  const linkCount = countMarkdownLinks(readme);
  const headingCount = getReadmeHeadings(readme).length;

  if (
    name.toLowerCase().startsWith("awesome-") ||
    (linkCount >= 20 && headingCount >= 4 && !hasAny(lowerReadme, ["installation", "quick start", "usage"]))
  ) {
    return {
      contentType: "curated_list",
      videoFormat: "knowledge_map_resource_digest",
      reason: "README giống một danh sách tài nguyên/tổng hợp nhiều link.",
    };
  }

  if (
    hasAny(lowerReadme, ["api", "sdk", "import ", "from ", "npm install", "pip install", "cargo add", "go get"]) ||
    files.some((file) =>
      ["package.json", "pyproject.toml", "requirements.txt", "cargo.toml", "go.mod", "pom.xml"].includes(file),
    )
  ) {
    return {
      contentType: "library_framework",
      videoFormat: "developer_integration_brief",
      reason: "Repo có dấu hiệu là thư viện/framework để tích hợp vào code.",
    };
  }

  if (
    hasAny(`${name} ${description}`.toLowerCase(), ["dataset", "benchmark", "corpus"]) ||
    hasAny(lowerReadme, ["training data", "dataset download", "data split", "leaderboard"]) ||
    files.some((file) => /\.(csv|jsonl|parquet|arrow)$/.test(file))
  ) {
    return {
      contentType: "dataset_benchmark",
      videoFormat: "dataset_explainer",
      reason: "Repo tập trung vào dữ liệu, benchmark hoặc tập mẫu.",
    };
  }

  if (
    hasAny(lowerReadme, ["installation", "install", "usage", "quick start", "cli", "demo", "docker run"]) ||
    files.some((file) => ["dockerfile", "docker-compose.yml", "compose.yml"].includes(file))
  ) {
    return {
      contentType: "tool_app_cli",
      videoFormat: "tool_review_quick_demo",
      reason: "Repo có hướng dẫn cài đặt/chạy thử rõ ràng.",
    };
  }

  return {
    contentType: "repo_overview",
    videoFormat: "repo_overview_with_use_cases",
    reason: "Không đủ tín hiệu mạnh, dùng format tổng quan có use case.",
  };
}

function classifyDockerImage(info, target) {
  const text = `${target.namespace}/${target.image} ${info.description || ""} ${info.full_description || ""}`.toLowerCase();
  const officialImages = new Set(["nginx", "postgres", "redis", "node", "python", "ubuntu", "mysql", "mongo", "alpine"]);

  if (target.official || target.namespace === "library" || officialImages.has(target.image.toLowerCase())) {
    return {
      contentType: "docker_official_base_image",
      videoFormat: "container_quick_start",
      reason: "Image có vẻ là official/base/service image phổ biến.",
    };
  }

  if (hasAny(text, ["dashboard", "self-host", "self hosted", "cms", "server", "web app", "application"])) {
    return {
      contentType: "docker_self_hosted_app",
      videoFormat: "self_host_setup_guide",
      reason: "Image có vẻ dùng để chạy một ứng dụng self-hosted.",
    };
  }

  if (hasAny(text, ["sdk", "builder", "runtime", "ci", "devcontainer", "test runner"])) {
    return {
      contentType: "docker_dev_runtime",
      videoFormat: "dev_workflow_image_brief",
      reason: "Image có vẻ phục vụ workflow dev/build/CI.",
    };
  }

  return {
    contentType: "docker_image",
    videoFormat: "container_overview",
    reason: "Không đủ tín hiệu mạnh, dùng format tổng quan container.",
  };
}

function short(value, max = 120) {
  const clean = stripMarkdown(value || "");
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max - 1).trim()}…`;
}

function baseScene(overrides) {
  return {
    assets: ["character shiba explaining something.png"],
    sfx: "Ding 2.mp3",
    ...overrides,
  };
}

function githubStatsScene(repoData, owner, repo, headlineLine2) {
  return baseScene({
    voice: `Về tín hiệu cộng đồng, ${repoData.name || repo} hiện có khoảng ${(repoData.stargazers_count || 0).toLocaleString("vi-VN")} sao, ngôn ngữ chính là ${repoData.language || "chưa rõ"}, và đây là điểm nên kiểm tra trước khi đưa vào dự án thật.`,
    visual: "Thẻ thống kê repo với sao, ngôn ngữ, owner và trạng thái theo dõi.",
    headline_line1: `${(repoData.name || repo).toUpperCase()} STATS`,
    headline_line2: headlineLine2,
    repo_name: `${owner}/${repo}`.toLowerCase(),
    repo_lang: repoData.language || "N/A",
    repo_stars: `★ ${(repoData.stargazers_count || 0).toLocaleString("vi-VN")}`,
    repo_trend: "▲ Repo",
    repo_trend_label: "GitHub",
  });
}

function buildGithubScenes(target, repoData, readme, rootFiles, classification) {
  const { owner, repo } = target;
  const repoName = repoData.name || repo;
  const description = repoData.description || "một repo công nghệ trên GitHub";
  const headings = getReadmeHeadings(readme);
  const topics = repoData.topics || [];
  const firstHeadings = headings.slice(0, 5).join(", ") || "README, docs, examples";
  const fileSummary = rootFiles.slice(0, 5).join(", ") || "README";

  const commonIntro = {
    repo_url: `github.com/${owner}/${repo}`.toLowerCase(),
    headline_line1: repoName.toUpperCase(),
  };

  if (classification.videoFormat === "knowledge_map_resource_digest") {
    return [
      baseScene({
        ...commonIntro,
        voice: `${repoName} không nên được review như một tool để cài rồi chạy ngay. Đây giống một bản đồ tài nguyên: ${short(description, 100)}.`,
        visual: "Chụp README, zoom vào các mục chính và biến chúng thành bản đồ tri thức.",
        headline_line2: "BẢN ĐỒ TÀI NGUYÊN ĐÁNG LƯU",
        sfx: "yeah_tre_con.mp3",
      }),
      baseScene({
        voice: `Điểm quan trọng đầu tiên là phân nhóm. README đang có các mốc như ${firstHeadings}. Hãy xem nó như mục lục để biết nên học phần nào trước.`,
        visual: "Bento card chia README thành các nhóm chủ đề lớn.",
        headline_line1: "KHÔNG PHẢI TOOL",
        headline_line2: "ĐÂY LÀ HUB KIẾN THỨC",
        bento1_title: "Nhóm chủ đề",
        bento1_desc: short(firstHeadings, 80),
        bento2_title: "Tài liệu",
        bento3_title: "Thư viện",
      }),
      baseScene({
        voice: `Nếu bạn mới bắt đầu, hãy tìm course, introduction hoặc tutorial trước. Nếu đang build sản phẩm, hãy nhảy vào phần thư viện, dataset, benchmark và production note.`,
        visual: "Ba luồng sử dụng: Beginner, Builder, Researcher.",
        headline_line1: "LỘ TRÌNH XEM",
        headline_line2: "TÙY THEO MỤC TIÊU",
        bento1_title: "Beginner",
        bento2_title: "Builder",
        bento3_title: "Researcher",
        bento4_title: "Team Lead",
      }),
      baseScene({
        voice: `Với repo dạng tổng hợp, đừng chỉ nhìn số sao rồi kết luận tất cả link đều tốt. Cách đúng là dùng nó như danh sách kiểm tra và tự xác minh từng nguồn quan trọng.`,
        visual: "Biểu tượng checklist xác minh nguồn, ngày cập nhật, chất lượng tài liệu.",
        headline_line1: "CÁCH DÙNG ĐÚNG",
        headline_line2: "BOOKMARK RỒI LỌC",
        btn_text: "Kiểm tra từng nguồn trước khi áp dụng",
      }),
      baseScene({
        voice: `Các nhãn và topic của repo này gồm ${topics.slice(0, 5).join(", ") || "nhiều chủ đề liên quan"}. Chúng giúp bạn search nhanh hơn thay vì cuộn toàn bộ README.`,
        visual: "Tag cloud topic và thanh search trong README.",
        headline_line1: "SEARCH THEO TAG",
        headline_line2: "ĐỠ NGỘP TÀI NGUYÊN",
        bento1_title: "Topic",
        bento1_desc: short(topics.join(", ") || "Chưa có topic rõ ràng", 80),
        bento2_title: "Keyword",
        bento3_title: "README",
      }),
      githubStatsScene(repoData, owner, repo, "TÍN HIỆU CỘNG ĐỒNG"),
      baseScene({
        voice: `Với ${repoName}, hành động hợp lý không phải là clone ngay, mà là star để lưu, mở README, rồi đánh dấu những mục phù hợp với lộ trình học hoặc công việc của bạn.`,
        visual: "Màn hình README với các highlight bookmark.",
        headline_line1: "LƯU LẠI",
        headline_line2: "DÙNG NHƯ LỘ TRÌNH",
        btn_text: `$ bookmark github.com/${owner}/${repo}`.toLowerCase(),
      }),
      baseScene({
        voice: `Tóm lại, đây là kiểu link nên biến thành video bản đồ kiến thức: giúp người xem biết bắt đầu từ đâu, xem mục nào trước, và tránh bị chìm trong một danh sách quá dài.`,
        visual: "Outro với mind map thu gọn và CTA star repo.",
        headline_line1: "STAR ĐỂ LƯU",
        headline_line2: "CHIA SẺ CHO TEAM HỌC CÙNG",
        bento1_title: "Star",
        bento2_title: "Bookmark",
        bento3_title: "Lọc nguồn",
        bento4_title: "Chia sẻ",
        sfx: "yeah_tre_con.mp3",
      }),
    ];
  }

  if (classification.videoFormat === "developer_integration_brief") {
    return [
      baseScene({
        ...commonIntro,
        voice: `Hôm nay mình phân tích ${repoName}: ${short(description, 110)}. Link này hợp với format developer brief, vì trọng tâm là tích hợp vào code.`,
        visual: "Chụp trang repo và highlight README/API.",
        headline_line2: "DEV INTEGRATION BRIEF",
        sfx: "yeah_tre_con.mp3",
      }),
      baseScene({
        voice: `Trước tiên cần hiểu nó nằm ở lớp nào trong stack. Repo có các dấu hiệu như ${fileSummary}, nên hãy xem phần cài đặt và API trước.`,
        visual: "Bento card stack layer, package file và API usage.",
        headline_line1: "NẰM Ở LỚP NÀO",
        headline_line2: "TRONG TECH STACK?",
        bento1_title: "Package",
        bento1_desc: short(fileSummary, 80),
        bento2_title: "API",
        bento3_title: "Docs",
      }),
      baseScene({
        voice: `Nếu README có lệnh cài đặt, scene này nên đưa thẳng snippet ngắn nhất lên màn hình. Người xem cần biết mất bao lâu để thử trong project phụ.`,
        visual: "Terminal cài package và snippet code tối thiểu.",
        headline_line1: "CÀI ĐẶT",
        headline_line2: "RỒI TEST NHANH",
        bento1_title: "Install",
        bento2_title: "Import",
        bento3_title: "Minimal code",
        bento4_title: "Output",
      }),
      baseScene({
        voice: `Sau đó mới nói tới điểm khác biệt: API tiện hơn, hiệu năng tốt hơn, hoặc tích hợp được với framework hiện đại. Đừng biến nó thành quảng cáo chung chung.`,
        visual: "Sơ đồ integration từ app tới library/framework.",
        headline_line1: "GIÁ TRỊ CHÍNH",
        headline_line2: "NẰM Ở API",
        btn_text: "Đọc usage trước khi đưa vào production",
      }),
      baseScene({
        voice: `Checklist trước khi dùng gồm license, release gần nhất, số issue mở, ví dụ code và mức độ bảo trì. Đây là phần rất quan trọng với repo library.`,
        visual: "Checklist license, release, issues, examples.",
        headline_line1: "CHECKLIST",
        headline_line2: "TRƯỚC KHI TÍCH HỢP",
        bento1_title: "License",
        bento1_desc: repoData.license?.name || "Cần kiểm tra",
        bento2_title: "Release",
        bento3_title: "Issues",
      }),
      githubStatsScene(repoData, owner, repo, "ĐỘ TIN CẬY BAN ĐẦU"),
      baseScene({
        voice: `Cách thử an toàn là tạo một project phụ, copy ví dụ nhỏ nhất, rồi đo xem nó giải quyết đúng vấn đề của mình không.`,
        visual: "Terminal chạy project phụ.",
        headline_line1: "THỬ AN TOÀN",
        headline_line2: "TRONG PROJECT PHỤ",
        btn_text: `$ git clone github.com/${owner}/${repo}`.toLowerCase(),
      }),
      baseScene({
        voice: `Nếu repo này khớp use case, hãy star để theo dõi update và đọc kỹ docs trước khi đưa vào hệ thống thật.`,
        visual: "CTA star, docs, follow releases.",
        headline_line1: "STAR VÀ ĐỌC DOCS",
        headline_line2: "TRƯỚC KHI DÙNG THẬT",
        bento1_title: "Star",
        bento2_title: "Docs",
        bento3_title: "Release",
        bento4_title: "Test",
        sfx: "yeah_tre_con.mp3",
      }),
    ];
  }

  if (classification.videoFormat === "dataset_explainer") {
    return [
      baseScene({
        ...commonIntro,
        voice: `${repoName} nên được xem như một repo dữ liệu hoặc benchmark: ${short(description, 110)}. Video cần giải thích dữ liệu, không chỉ review mã nguồn.`,
        visual: "Chụp README và highlight phần dataset/benchmark.",
        headline_line2: "DATASET EXPLAINER",
        sfx: "yeah_tre_con.mp3",
      }),
      baseScene({
        voice: `Hãy bắt đầu từ bài toán mà dataset này phục vụ, sau đó mới nói tới cấu trúc file, nhãn, kích thước và cách tải về.`,
        visual: "Bento card bài toán, schema, sample record.",
        headline_line1: "DỮ LIỆU NÀY",
        headline_line2: "GIẢI BÀI TOÁN GÌ?",
        bento1_title: "Task",
        bento1_desc: short(description, 80),
        bento2_title: "Schema",
        bento3_title: "Sample",
      }),
      baseScene({
        voice: `Với dataset, license và bias là hai điểm phải nhắc rõ. Không nên khuyên người xem dùng cho production nếu chưa kiểm tra điều kiện sử dụng.`,
        visual: "Checklist license, bias, usage limit.",
        headline_line1: "CẨN THẬN",
        headline_line2: "LICENSE VÀ BIAS",
        bento1_title: repoData.license?.name || "License?",
        bento2_title: "Bias",
        bento3_title: "Size",
        bento4_title: "Limit",
      }),
      githubStatsScene(repoData, owner, repo, "TÍN HIỆU DATASET"),
      baseScene({
        voice: `Nếu muốn thử, hãy đọc hướng dẫn download, chạy baseline nhỏ và so sánh metric trước khi đầu tư thời gian train lớn.`,
        visual: "Terminal tải dataset và chạy baseline.",
        headline_line1: "THỬ NHỎ",
        headline_line2: "TRƯỚC KHI TRAIN LỚN",
        btn_text: "Đọc license trước khi tải dữ liệu",
      }),
    ];
  }

  return [
    baseScene({
      ...commonIntro,
      voice: `Hôm nay mình phân tích ${repoName}: ${short(description, 110)}. Link này hợp với format tool review vì người xem cần biết nó làm gì và thử nhanh ra sao.`,
      visual: "Chụp trang repo GitHub, mở đầu bằng tên repo và mô tả ngắn.",
      headline_line2: "TOOL REVIEW + QUICK DEMO",
      sfx: "yeah_tre_con.mp3",
    }),
    baseScene({
      voice: `Vấn đề mà repo này đang nhắm tới là giúp developer tiết kiệm thời gian ở một tác vụ cụ thể. Hãy mở README và tìm phần quick start hoặc usage trước.`,
      visual: "Bento card problem, value, quick start.",
      headline_line1: "GIẢI QUYẾT",
      headline_line2: "VẤN ĐỀ GÌ?",
      bento1_title: "Use case",
      bento1_desc: short(description, 80),
      bento2_title: "Quick start",
      bento3_title: "Demo",
    }),
    baseScene({
      voice: `Ba điểm nên đưa vào video là cách cài đặt, luồng input ra output, và tình huống thực tế nào nên dùng tool này.`,
      visual: "Sơ đồ input -> tool -> output.",
      headline_line1: "BA ĐIỂM CHÍNH",
      headline_line2: "CẦN DEMO",
      bento1_title: "Install",
      bento2_title: "Input",
      bento3_title: "Output",
      bento4_title: "Use case",
    }),
    baseScene({
      voice: `Nếu repo có Dockerfile, package manifest hoặc hướng dẫn CLI, hãy biến chúng thành scene terminal thay vì chỉ đọc mô tả.`,
      visual: "Terminal command và README quick start.",
      headline_line1: "QUICK START",
      headline_line2: "PHẢI THẤY LỆNH CHẠY",
      btn_text: `$ git clone github.com/${owner}/${repo}`.toLowerCase(),
    }),
    baseScene({
      voice: `Khi đánh giá tool, đừng bỏ qua giới hạn: license, issue mở, release mới nhất và mức độ bảo trì. Đây là phần giúp video có giá trị thật.`,
      visual: "Checklist đánh giá repo.",
      headline_line1: "ĐÁNH GIÁ NHANH",
      headline_line2: "TRƯỚC KHI DÙNG",
      bento1_title: repoData.license?.name || "License?",
      bento1_desc: short(fileSummary, 80),
      bento2_title: "Issues",
      bento3_title: "Release",
    }),
    githubStatsScene(repoData, owner, repo, "SỨC HÚT TRÊN GITHUB"),
    baseScene({
      voice: `Tóm lại, với repo dạng tool, format video tốt nhất là: nêu vấn đề, chạy thử thật nhanh, rồi nói rõ ai nên dùng và ai nên bỏ qua.`,
      visual: "CTA clone, star và thử trong dự án phụ.",
      headline_line1: "THỬ TRONG",
      headline_line2: "DỰ ÁN PHỤ",
      btn_text: `$ git clone github.com/${owner}/${repo}`.toLowerCase(),
    }),
    baseScene({
      voice: `Nếu thấy phù hợp, hãy star repo để theo dõi update và quay lại docs khi cần triển khai nghiêm túc hơn.`,
      visual: "Outro star repo, docs, follow releases.",
      headline_line1: "STAR REPO",
      headline_line2: "NẾU TOOL NÀY HỮU ÍCH",
      bento1_title: "Star",
      bento2_title: "Docs",
      bento3_title: "Demo",
      bento4_title: "Follow",
      sfx: "yeah_tre_con.mp3",
    }),
  ];
}

function buildDockerScenes(target, info, classification) {
  const imageRef = `${target.namespace}/${target.image}`;
  const description = info.description || info.full_description || "một Docker image";
  const pullCommand = target.namespace === "library" ? `docker pull ${target.image}` : `docker pull ${imageRef}`;
  const runCommand = target.namespace === "library" ? `docker run ${target.image}` : `docker run ${imageRef}`;

  if (classification.videoFormat === "self_host_setup_guide") {
    return [
      baseScene({
        repo_url: `hub.docker.com/r/${imageRef}`,
        voice: `${imageRef} phù hợp với format self-host setup guide. Đây là image để chạy một ứng dụng hoặc service cụ thể: ${short(description, 110)}.`,
        visual: "Chụp Docker Hub và giới thiệu image.",
        headline_line1: target.image.toUpperCase(),
        headline_line2: "SELF-HOST SETUP GUIDE",
        sfx: "yeah_tre_con.mp3",
      }),
      baseScene({
        voice: `Scene quan trọng nhất là cấu hình chạy: image này cần port, volume, biến môi trường và có thể cần database hoặc token đi kèm.`,
        visual: "Sơ đồ container, port, volume, env.",
        headline_line1: "TRƯỚC KHI CHẠY",
        headline_line2: "CHECK PORT VÀ ENV",
        bento1_title: "Ports",
        bento1_desc: "Đọc docs Docker Hub trước khi deploy",
        bento2_title: "Volumes",
        bento3_title: "Env",
      }),
      baseScene({
        voice: `Lệnh khởi đầu nên được đưa lên màn hình thật rõ. Với image này, bước đầu tiên thường là ${pullCommand}.`,
        visual: "Terminal docker pull/run.",
        headline_line1: "PULL IMAGE",
        headline_line2: "RỒI CHẠY THỬ",
        btn_text: `$ ${pullCommand}`,
      }),
      baseScene({
        voice: `Khi đưa lên VPS hoặc production, hãy pin version tag, backup volume và kiểm tra cách update trước khi chạy lâu dài.`,
        visual: "Checklist production Docker.",
        headline_line1: "PRODUCTION",
        headline_line2: "PIN TAG VÀ BACKUP",
        bento1_title: "Pin tag",
        bento2_title: "Backup",
        bento3_title: "Healthcheck",
        bento4_title: "Update",
      }),
    ];
  }

  if (classification.videoFormat === "dev_workflow_image_brief") {
    return [
      baseScene({
        repo_url: `hub.docker.com/r/${imageRef}`,
        voice: `${imageRef} nên được trình bày như một dev workflow image. Giá trị chính là tạo môi trường build, test hoặc CI đồng nhất.`,
        visual: "Docker Hub image và pipeline CI.",
        headline_line1: target.image.toUpperCase(),
        headline_line2: "DEV WORKFLOW IMAGE",
        sfx: "yeah_tre_con.mp3",
      }),
      baseScene({
        voice: `Video nên tập trung vào cách mount source code, chạy task build hoặc test, và tái sử dụng trong CI/CD.`,
        visual: "Sơ đồ local folder mount vào container.",
        headline_line1: "MOUNT CODE",
        headline_line2: "CHẠY BUILD/TEST",
        bento1_title: "Mount",
        bento1_desc: "$PWD:/app",
        bento2_title: "Build",
        bento3_title: "CI",
      }),
      baseScene({
        voice: `Câu lệnh mẫu nên ngắn và dễ copy, ví dụ bắt đầu bằng ${pullCommand}, sau đó chạy task cụ thể trong container.`,
        visual: "Terminal docker run với mount volume.",
        headline_line1: "COMMAND MẪU",
        headline_line2: "CHO PIPELINE",
        btn_text: `$ ${pullCommand}`,
      }),
      baseScene({
        voice: `Điểm cần nhắc là pin tag hoặc digest để pipeline không vỡ khi image latest thay đổi.`,
        visual: "Tag pinning và digest.",
        headline_line1: "ĐỪNG DÙNG",
        headline_line2: "LATEST MỘT CÁCH MÙ QUÁNG",
        btn_text: "Pin version tag trước khi dùng trong CI",
      }),
    ];
  }

  return [
    baseScene({
      repo_url: target.namespace === "library" ? `hub.docker.com/_/${target.image}` : `hub.docker.com/r/${imageRef}`,
      voice: `${imageRef} phù hợp với format container quick start. Image này dùng để chạy hoặc làm nền cho service: ${short(description, 110)}.`,
      visual: "Chụp Docker Hub, tag và mô tả image.",
      headline_line1: target.image.toUpperCase(),
      headline_line2: "CONTAINER QUICK START",
      sfx: "yeah_tre_con.mp3",
    }),
    baseScene({
      voice: `Bước đầu tiên là pull image và chọn tag rõ ràng. Nếu làm production, tránh phụ thuộc vào latest khi chưa kiểm soát version.`,
      visual: "Terminal docker pull và danh sách tag.",
      headline_line1: "CHỌN TAG",
      headline_line2: "RỒI PULL IMAGE",
      btn_text: `$ ${pullCommand}`,
    }),
    baseScene({
      voice: `Tiếp theo là xác định port, volume và biến môi trường. Đây là ba thứ quyết định container chạy được trong môi trường thật hay không.`,
      visual: "Sơ đồ port mapping, env, volume.",
      headline_line1: "PORT",
      headline_line2: "VOLUME VÀ ENV",
      bento1_title: "Port",
      bento1_desc: "Map đúng cổng service",
      bento2_title: "Volume",
      bento3_title: "Env",
    }),
    baseScene({
      voice: `Lệnh chạy thử nên đơn giản trước, ví dụ ${runCommand}. Sau đó mới thêm port, volume và cấu hình bảo mật.`,
      visual: "Terminal docker run.",
      headline_line1: "RUN THỬ",
      headline_line2: "TRƯỚC KHI DEPLOY",
      btn_text: `$ ${runCommand}`,
    }),
    baseScene({
      voice: `Kết luận: với Docker image, video phải giúp người xem chạy được container, hiểu tag nào nên dùng và biết những cấu hình tối thiểu trước production.`,
      visual: "Outro checklist Docker.",
      headline_line1: "PIN TAG",
      headline_line2: "KIỂM TRA TRƯỚC PRODUCTION",
      bento1_title: "Pull",
      bento2_title: "Run",
      bento3_title: "Port",
      bento4_title: "Volume",
      sfx: "yeah_tre_con.mp3",
    }),
  ];
}

async function buildGithubData(target) {
  const { owner, repo } = target;
  console.log(`Đang phân tích GitHub repo: ${owner}/${repo}`);

  const repoData = await fetchOptionalJson(`https://api.github.com/repos/${owner}/${repo}`, {
    name: repo,
    description: "Repo công nghệ trên GitHub.",
    stargazers_count: 0,
    language: "N/A",
    topics: [],
  });

  const readme = await fetchOptionalText(
    `https://api.github.com/repos/${owner}/${repo}/readme`,
    "",
    { Accept: "application/vnd.github.raw" },
  );

  const contents = await fetchOptionalJson(`https://api.github.com/repos/${owner}/${repo}/contents`, []);
  const rootFiles = Array.isArray(contents) ? contents.map((item) => item.name || "").filter(Boolean) : [];
  const classification = classifyGithubRepo(repoData, readme, rootFiles);
  const scenes = buildGithubScenes(target, repoData, readme, rootFiles, classification);

  return {
    template: "news",
    source_url: target.url,
    platform: "github",
    content_type: classification.contentType,
    video_format: classification.videoFormat,
    classification_reason: classification.reason,
    metadata: {
      owner,
      repo,
      description: repoData.description || "",
      stars: repoData.stargazers_count || 0,
      language: repoData.language || "N/A",
      topics: repoData.topics || [],
      readme_headings: getReadmeHeadings(readme),
      root_files: rootFiles,
    },
    scenes,
  };
}

async function buildDockerData(target) {
  console.log(`Đang phân tích Docker image: ${target.namespace}/${target.image}`);

  const pathPart =
    target.namespace === "library"
      ? `repositories/library/${target.image}/`
      : `repositories/${target.namespace}/${target.image}/`;

  const info = await fetchOptionalJson(`https://hub.docker.com/v2/${pathPart}`, {
    name: target.image,
    namespace: target.namespace,
    description: "Docker image.",
    full_description: "",
  });

  const classification = classifyDockerImage(info, target);
  const scenes = buildDockerScenes(target, info, classification);

  return {
    template: "news",
    source_url: target.url,
    platform: "docker",
    content_type: classification.contentType,
    video_format: classification.videoFormat,
    classification_reason: classification.reason,
    metadata: {
      namespace: target.namespace,
      image: target.image,
      description: info.description || "",
      star_count: info.star_count || 0,
      pull_count: info.pull_count || 0,
    },
    scenes,
  };
}

async function main() {
  const urlArg = process.argv[2];
  if (!urlArg) {
    console.error("Lỗi: Vui lòng cung cấp link GitHub repo hoặc Docker image URL.");
    console.error("Ví dụ: node generate_repo_data.js https://github.com/heygen-com/hyperframes");
    console.error("Ví dụ: node generate_repo_data.js https://hub.docker.com/_/nginx");
    process.exit(1);
  }

  const target = parseTargetUrl(urlArg);
  const data = target.platform === "github" ? await buildGithubData(target) : await buildDockerData(target);

  const outputDir = path.join(process.cwd(), "data");
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const outputPath = path.join(outputDir, "github-review.json");
  fs.writeFileSync(outputPath, JSON.stringify(data, null, 2), "utf-8");

  console.log(`\nNền tảng: ${data.platform}`);
  console.log(`Loại nội dung: ${data.content_type}`);
  console.log(`Format video: ${data.video_format}`);
  console.log(`Lý do chọn format: ${data.classification_reason}`);
  console.log(`Đã tạo kịch bản UTF-8 tại: ${outputPath}`);
}

main().catch((err) => {
  console.error("Lỗi:", err.message);
  process.exit(1);
});
