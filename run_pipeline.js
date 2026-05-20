import { execFileSync } from "child_process";

const targetUrl = process.argv[2];
const isWindows = process.platform === "win32";
const npxBin = isWindows ? "npx.cmd" : "npx";
const npmBin = isWindows ? "npm.cmd" : "npm";
const pythonBin = isWindows ? "py" : "python3";

if (!targetUrl) {
  console.error("Lỗi: Vui lòng cung cấp URL cần tạo video.");
  console.error("Ví dụ GitHub: node run_pipeline.js https://github.com/heygen-com/hyperframes");
  console.error("Ví dụ Docker: node run_pipeline.js https://hub.docker.com/_/nginx");
  console.error("Ví dụ web: node run_pipeline.js https://example.com/some-tech-article");
  process.exit(1);
}

function run(command, args) {
  execFileSync(command, args, { stdio: "inherit" });
}

try {
  console.log("\n==================================================");
  console.log("🎬 KHỞI CHẠY PIPELINE TẠO VIDEO TECH TỰ ĐỘNG");
  console.log(`🔗 Target URL: ${targetUrl}`);
  console.log("==================================================\n");

  console.log("Step 1: Phân tích URL, nhận diện loại nội dung và tạo kịch bản JSON...");
  run("node", ["generate_repo_data.js", targetUrl]);

  console.log("\nStep 2: Chụp ảnh màn hình trang nguồn...");
  run("node", ["capture_github.js", targetUrl]);

  console.log("\nStep 3: Tạo giọng đọc AI (TTS) và mốc thời gian phụ đề...");
  run(pythonBin, ["gen_assets.py", "data/github-review.json"]);

  console.log("\nStep 4: Biên dịch kịch bản sang HTML composition...");
  run("node", ["generate.mjs", "data/github-review.json"]);

  console.log("\nStep 5: Kiểm tra composition bằng HyperFrames...");
  run(npxBin, ["hyperframes", "validate"]);

  console.log("\nStep 6: Kết xuất video MP4...");
  run(npmBin, ["run", "render"]);

  console.log("\n==================================================");
  console.log("✅ PIPELINE ĐÃ HOÀN THÀNH");
  console.log("Video mới đã được lưu trong thư mục renders/.");
  console.log("==================================================\n");
} catch (error) {
  console.error("\n❌ Gặp lỗi trong quá trình chạy pipeline:", error.message);
  process.exit(1);
}
