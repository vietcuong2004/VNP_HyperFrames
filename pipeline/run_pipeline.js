import { spawnSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Resolve __dirname for ES module context
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
  const result1 = spawnSync("node", [path.join(__dirname, "generate_repo_data.js"), targetUrl], { encoding: "utf-8", shell: isWindows });
  if (result1.error) throw result1.error;
  if (result1.status !== 0) throw new Error(`Command failed: ${result1.stderr || result1.stdout}`);
  console.log(result1.stdout);
  
  const match = result1.stdout.match(/Đã tạo kịch bản UTF-8 tại:\s*(.*\.json)/);
  if (!match) throw new Error("Không tìm thấy đường dẫn file JSON đã tạo trong output.");
  const jsonPath = match[1].trim();

  // Extract base name from JSON for renaming the video: e.g. "nginx-20-05-2026-16-01"
  const jsonBaseName = path.basename(jsonPath, '.json'); // e.g. nginx-20-05-2026-16-01

  console.log("\nStep 2: Chụp ảnh màn hình trang nguồn...");
  run("node", [path.join(__dirname, "capture_github.js"), targetUrl]);

  console.log("\nStep 3: Tạo giọng đọc AI (TTS) và mốc thời gian phụ đề...");
  run(pythonBin, [path.join(__dirname, "gen_assets.py"), jsonPath]);

  console.log("\nStep 4: Biên dịch kịch bản sang HTML composition...");
  run("node", [path.join(__dirname, "generate.mjs"), jsonPath]);

  console.log("\nStep 5: Kiểm tra composition bằng HyperFrames...");
  run(npxBin, ["hyperframes", "validate"]);

  console.log("\nStep 6: Kết xuất video MP4...");
  run(npmBin, ["run", "render"]);

  // Rename the latest rendered MP4 to match the video name
  console.log("\nStep 6b: Đổi tên video theo định dạng tên-video-date-time...");
  const rendersDir = path.join(process.cwd(), "renders");
  if (fs.existsSync(rendersDir)) {
    const mp4Files = fs.readdirSync(rendersDir)
      .filter(f => f.endsWith(".mp4"))
      .map(f => ({ name: f, mtime: fs.statSync(path.join(rendersDir, f)).mtimeMs }))
      .sort((a, b) => b.mtime - a.mtime);
    
    if (mp4Files.length > 0) {
      const latestMp4 = mp4Files[0].name;
      const newMp4Name = `${jsonBaseName}.mp4`;
      const oldPath = path.join(rendersDir, latestMp4);
      const newPath = path.join(rendersDir, newMp4Name);
      if (latestMp4 !== newMp4Name) {
        fs.renameSync(oldPath, newPath);
        console.log(`✅ Video đã đổi tên: ${latestMp4} → ${newMp4Name}`);
      } else {
        console.log(`Video đã có tên đúng: ${newMp4Name}`);
      }
    }
  }

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
  console.log(`Video mới đã được lưu trong thư mục renders/ với tên: ${jsonBaseName}.mp4`);
  console.log("==================================================\n");
} catch (error) {
  console.error("\n❌ Gặp lỗi trong quá trình chạy pipeline:", error.message);
  process.exit(1);
}
