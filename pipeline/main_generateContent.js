import https from "https";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

function loadDotEnv() {
  const envPath = path.join(process.env.APP_ROOT || path.join(__dirname, ".."), ".env");
  if (!fs.existsSync(envPath)) return;

  const lines = fs.readFileSync(envPath, "utf-8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIndex = trimmed.indexOf("=");
    if (eqIndex === -1) continue;

    const key = trimmed.slice(0, eqIndex).trim();
    let value = trimmed.slice(eqIndex + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

loadDotEnv();

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

function requestJsonPost(url, payload, headers = {}) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(payload);
    const target = new URL(url);
    const req = https.request(
      {
        method: "POST",
        hostname: target.hostname,
        path: `${target.pathname}${target.search}`,
        headers: {
          "User-Agent": USER_AGENT,
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(body),
          ...headers,
        },
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          if (res.statusCode >= 400) {
            reject(new Error(`HTTP ${res.statusCode} khi gọi ${url}: ${data.slice(0, 180)}`));
            return;
          }
          try {
            resolve(JSON.parse(data));
          } catch (err) {
            reject(err);
          }
        });
      },
    );
    req.on("error", reject);
    req.write(body);
    req.end();
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

export function parseTargetUrl(value) {
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

  return {
    platform: "web",
    url: url.toString(),
    host,
    pathname: url.pathname,
  };
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

export function getReadmeHeadings(readme) {
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

function getTitleFromHtml(html) {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match ? stripMarkdown(match[1]).replace(/\s+/g, " ").trim() : "";
}

function getMetaDescriptionFromHtml(html) {
  const match =
    html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i) ||
    html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i) ||
    html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i);
  return match ? stripMarkdown(match[1]).replace(/\s+/g, " ").trim() : "";
}

function classifyWebContent({ title, description, answer, results, host }) {
  const text = `${title} ${description} ${answer} ${results.map((item) => `${item.title || ""} ${item.content || ""}`).join(" ")}`.toLowerCase();

  if (hasAny(text, ["documentation", "docs", "api reference", "guide", "quickstart", "tutorial"])) {
    return {
      contentType: "web_docs",
      videoFormat: "web_docs_explainer",
      reason: "Trang có tín hiệu là tài liệu kỹ thuật hoặc hướng dẫn sử dụng.",
    };
  }

  if (hasAny(text, ["github", "open source", "developer tool", "sdk", "api", "cli", "framework", "library"])) {
    return {
      contentType: "web_tool",
      videoFormat: "web_tool_overview",
      reason: "Trang có tín hiệu là tool, SDK, API hoặc sản phẩm cho developer.",
    };
  }

  if (hasAny(text, ["blog", "article", "post", "explained", "deep dive", "case study", "announcement"])) {
    return {
      contentType: "web_article",
      videoFormat: "web_article_digest",
      reason: "Trang có tín hiệu là bài viết hoặc nội dung phân tích.",
    };
  }

  if (hasAny(text, ["pricing", "customers", "product", "platform", "solution", "features"])) {
    return {
      contentType: "web_product_page",
      videoFormat: "web_product_brief",
      reason: "Trang có tín hiệu là landing page sản phẩm hoặc nền tảng.",
    };
  }

  return {
    contentType: "web_unknown",
    videoFormat: "web_context_digest",
    reason: `Không đủ tín hiệu từ ${host}, dùng format tóm tắt ngữ cảnh web.`,
  };
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

// Xuất các helpers dùng chung cho các Generators
export function short(value, max = 120) {
  const clean = stripMarkdown(value || "");
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max - 1).trim()}…`;
}

export function baseScene(overrides) {
  return {
    assets: ["character shiba explaining something.png"],
    sfx: "Ding 2.mp3",
    ...overrides,
  };
}

export function githubStatsScene(repoData, owner, repo, headlineLine2) {
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

// Builders đóng vai trò nạp dữ liệu thô và gọi Group Generator tương ứng
export async function buildGithubData(target) {
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

  // Dynamic import G1_github generator
  const { generateScenes } = await import("./generators/github_generator.mjs");
  const scenes = await generateScenes({ target, repoData, readme, rootFiles }, classification.videoFormat);

  return {
    template: "G1_github",
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

export async function buildDockerData(target) {
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

  // Dynamic import G2_docker generator
  const { generateScenes } = await import("./generators/docker_generator.mjs");
  const scenes = await generateScenes({ target, info }, classification.videoFormat);

  return {
    template: "G2_docker",
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

async function analyzeUrlWithTavily(target) {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) {
    console.warn("Không có TAVILY_API_KEY, fallback sang title/meta HTML của URL.");
    return null;
  }

  const query = [
    "Analyze this URL for a short Vietnamese technology explainer video.",
    "Identify what the page is about, the target audience, key points, and how the video should be structured.",
    target.url,
  ].join(" ");

  return await requestJsonPost("https://api.tavily.com/search", {
    api_key: apiKey,
    query,
    search_depth: "advanced",
    include_answer: true,
    include_raw_content: false,
    max_results: 5,
  });
}

function summarizeTavilyResults(tavilyData) {
  if (!tavilyData) return [];
  return Array.isArray(tavilyData.results)
    ? tavilyData.results
        .map((item) => ({
          title: item.title || "",
          url: item.url || "",
          content: item.content || "",
          score: item.score || 0,
        }))
        .filter((item) => item.title || item.content)
        .slice(0, 5)
    : [];
}

function pickWebTitle(target, html, results) {
  const htmlTitle = getTitleFromHtml(html);
  if (htmlTitle) return htmlTitle;
  const firstResultTitle = results.find((item) => item.title)?.title;
  if (firstResultTitle) return firstResultTitle;
  return target.host;
}

export async function buildWebData(target) {
  console.log(`Đang phân tích web URL: ${target.url}`);

  const html = await fetchOptionalText(target.url, "");
  let tavilyData = null;
  try {
    tavilyData = await analyzeUrlWithTavily(target);
  } catch (err) {
    console.warn(`Không phân tích được bằng Tavily: ${err.message}`);
  }

  const results = summarizeTavilyResults(tavilyData);
  const title = pickWebTitle(target, html, results);
  const description = getMetaDescriptionFromHtml(html) || results[0]?.content || "";
  const answer = tavilyData?.answer || description || title;
  const classification = classifyWebContent({
    title,
    description,
    answer,
    results,
    host: target.host,
  });

  // Dynamic import G3_web generator
  const { generateScenes } = await import("./generators/web_generator.mjs");
  const scenes = await generateScenes({ target, webInfo: { title, description, answer, results } }, classification.videoFormat);

  return {
    template: "G3_web",
    source_url: target.url,
    platform: "web",
    content_type: classification.contentType,
    video_format: classification.videoFormat,
    classification_reason: classification.reason,
    visual_theme: "web",
    metadata: {
      host: target.host,
      title,
      description,
      tavily_used: Boolean(tavilyData),
      tavily_results: results,
    },
    scenes,
  };
}

async function main() {
  const urlArg = process.argv[2];
  if (!urlArg) {
    console.error("Lỗi: Vui lòng cung cấp link GitHub repo hoặc Docker image URL.");
    console.error("Ví dụ: node main_generateContent.js https://github.com/heygen-com/hyperframes");
    console.error("Ví dụ: node main_generateContent.js https://hub.docker.com/_/nginx");
    process.exit(1);
  }

  const target = parseTargetUrl(urlArg);
  let data;
  if (target.platform === "github") {
    data = await buildGithubData(target);
  } else if (target.platform === "docker") {
    data = await buildDockerData(target);
  } else {
    data = await buildWebData(target);
  }

  const outputDir = process.env.DATA_DIR || path.join(process.cwd(), "data");
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const dateObj = new Date();
  const day = String(dateObj.getDate()).padStart(2, '0');
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const year = dateObj.getFullYear();
  const hours = String(dateObj.getHours()).padStart(2, '0');
  const minutes = String(dateObj.getMinutes()).padStart(2, '0');

  // Build video name from content metadata
  const repoOrImage = data.metadata.repo || data.metadata.image || '';
  const rawTitle = repoOrImage || data.metadata.title || data.metadata.host || 'video';
  let safeName = rawTitle.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase().replace(/-+/g, '-').replace(/^-|-$/g, '').substring(0, 30);
  const jsonFilename = `${safeName}-${day}-${month}-${year}-${hours}-${minutes}.json`;

  const outputPath = path.join(outputDir, jsonFilename);
  fs.writeFileSync(outputPath, JSON.stringify(data, null, 2), "utf-8");

  console.log(`\nNền tảng: ${data.platform}`);
  console.log(`Loại nội dung: ${data.content_type}`);
  console.log(`Format video: ${data.video_format}`);
  console.log(`Lý do chọn format: ${data.classification_reason}`);
  console.log(`Đã tạo kịch bản UTF-8 tại: ${outputPath}`);
}

const isCliEntrypoint = process.argv[1] && path.resolve(process.argv[1]) === __filename;

if (isCliEntrypoint) {
  main().catch((err) => {
    console.error("Lỗi:", err.message);
    process.exit(1);
  });
}
