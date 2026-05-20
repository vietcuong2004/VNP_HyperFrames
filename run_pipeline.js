import { spawnSync } from "child_process";
import fs from "fs";
import path from "path";

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
  const result = spawnSync(command, args, { stdio: "inherit", shell: isWindows });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`Command ${command} failed with exit code ${result.status}`);
}

try {
  console.log("\n==================================================");
  console.log("🎬 KHỞI CHẠY PIPELINE TẠO VIDEO TECH TỰ ĐỘNG");
  console.log(`🔗 Target URL: ${targetUrl}`);
  console.log("==================================================\n");

  console.log("Step 1: Phân tích URL, nhận diện loại nội dung và tạo kịch bản JSON...");
  const result1 = spawnSync("node", ["generate_repo_data.js", targetUrl], { encoding: "utf-8", shell: isWindows });
  if (result1.error) throw result1.error;
  if (result1.status !== 0) throw new Error(`Command failed: ${result1.stderr || result1.stdout}`);
  console.log(result1.stdout);
  
  const match = result1.stdout.match(/Đã tạo kịch bản UTF-8 tại:\s*(.*\.json)/);
  if (!match) throw new Error("Không tìm thấy đường dẫn file JSON đã tạo trong output.");
  const jsonPath = match[1].trim();

  console.log("\nStep 2: Chụp ảnh màn hình trang nguồn...");
  run("node", ["capture_github.js", targetUrl]);

  console.log("\nStep 3: Tạo giọng đọc AI (TTS) và mốc thời gian phụ đề...");
  run(pythonBin, ["gen_assets.py", jsonPath]);

  console.log("\nStep 4: Biên dịch kịch bản sang HTML composition...");
  run("node", ["generate.mjs", jsonPath]);

  console.log("\nStep 5: Kiểm tra composition bằng HyperFrames...");
  run(npxBin, ["hyperframes", "validate"]);

  console.log("\nStep 6: Kết xuất video MP4...");
  run(npmBin, ["run", "render"]);

  console.log("\nStep 7: Dọn dẹp file audio tạm...");
  const audioDir = path.join(process.cwd(), "assets", "audio");
  if (fs.existsSync(audioDir)) {
    const files = fs.readdirSync(audioDir);
    let deletedCount = 0;
    for (const file of files) {
      if (file.endsWith(".wav")) {
        fs.unlinkSync(path.join(audioDir, file));
        deletedCount++;
      }
    }
    console.log(`Đã xóa ${deletedCount} file .wav trong thư mục assets/audio.`);
  }

  console.log("\n==================================================");
  console.log("✅ PIPELINE ĐÃ HOÀN THÀNH");
  console.log("Video mới đã được lưu trong thư mục renders/.");
  console.log("==================================================\n");
} catch (error) {
  console.error("\n❌ Gặp lỗi trong quá trình chạy pipeline:", error.message);
  process.exit(1);
}
