import { execSync } from "child_process";

const repoUrl = process.argv[2];

if (!repoUrl) {
  console.error("Lỗi: Vui lòng cung cấp link GitHub Repo URL!");
  console.error("Ví dụ: node run_pipeline.js https://github.com/heygen-com/hyperframes");
  process.exit(1);
}

try {
  console.log("\n==================================================");
  console.log("🎬 KHỞI CHẠY PIPELINE TẠO VIDEO TUẦN TỰ TỰ ĐỘNG");
  console.log(`🔗 Target URL: ${repoUrl}`);
  console.log("==================================================\n");

  console.log("Step 1: Thu thập thông tin repo và tạo kịch bản JSON...");
  execSync(`node generate_repo_data.js "${repoUrl}"`, { stdio: "inherit" });

  console.log("\nStep 2: Chụp ảnh màn hình giao diện GitHub...");
  execSync(`node capture_github.js "${repoUrl}"`, { stdio: "inherit" });

  console.log("\nStep 3: Tạo giọng đọc AI (TTS) & mốc thời gian phụ đề...");
  execSync(`python gen_assets.py data/github-review.json`, { stdio: "inherit" });

  console.log("\nStep 4: Biên dịch sang mã HTML...");
  execSync(`node generate.mjs data/github-review.json`, { stdio: "inherit" });

  console.log("\nStep 5: Kiểm tra và xác thực chất lượng mã video...");
  execSync(`npx hyperframes validate`, { stdio: "inherit" });

  console.log("\nStep 6: Kết xuất (Render) video MP4 thành phẩm...");
  execSync(`npm run render`, { stdio: "inherit" });

  console.log("\n==================================================");
  console.log("🎉 PIPELINE ĐÃ HOÀN THÀNH XUẤT SẮC!");
  console.log("Video mới đã được lưu trong thư mục: D:\\hyperframes\\my-video\\renders\\");
  console.log("==================================================\n");
} catch (error) {
  console.error("\n❌ Gặp lỗi trong quá trình thực thi pipeline:", error.message);
  process.exit(1);
}
