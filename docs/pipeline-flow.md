# Luồng Chạy Pipeline Tạo Video Từ URL

## Mục tiêu

Tài liệu này mô tả luồng hiện tại để biến một URL công nghệ thành video MP4 bằng HyperFrames.

Entry point chính:

```bash
node run_pipeline.js <url>
```

Ví dụ:

```bash
node run_pipeline.js https://github.com/heygen-com/hyperframes
node run_pipeline.js https://github.com/keon/awesome-nlp
node run_pipeline.js https://hub.docker.com/_/nginx
```

## Tổng quan luồng

Pipeline hiện tại gồm 6 bước chính:

1. Phân tích URL và sinh kịch bản JSON.
2. Chụp ảnh trang nguồn.
3. Tạo giọng đọc và timing phụ đề.
4. Generate `index.html` từ template.
5. Kiểm tra composition bằng HyperFrames.
6. Render MP4.

## Bước 1: Phân tích URL

Script:

```bash
node generate_repo_data.js <url>
```

Nhiệm vụ:

- Nhận URL đầu vào.
- Xác định nền tảng: GitHub hoặc Docker.
- Nếu không phải GitHub/Docker, chuyển sang luồng `web`.
- Gọi API nguồn nếu có thể.
- Với URL web không rõ ràng, gọi Tavily nếu có `TAVILY_API_KEY`.
- Lấy metadata cơ bản.
- Phân loại nội dung.
- Chọn `video_format`.
- Sinh file JSON tại:

```txt
data/github-review.json
```

Các format GitHub hiện có:

- `tool_review_quick_demo`
- `developer_integration_brief`
- `knowledge_map_resource_digest`
- `dataset_explainer`
- `repo_overview_with_use_cases`

Các format Docker hiện có:

- `container_quick_start`
- `self_host_setup_guide`
- `dev_workflow_image_brief`
- `container_overview`

Các format web không rõ ràng hiện có:

- `web_docs_explainer`
- `web_tool_overview`
- `web_article_digest`
- `web_product_brief`
- `web_context_digest`

## Tavily cho URL không rõ ràng

Tavily chỉ được dùng cho URL không thuộc GitHub/Docker. Điều này giúp giữ luồng GitHub/Docker ổn định và deterministic hơn.

Thiết lập key:

```bash
set TAVILY_API_KEY=your_api_key_here
```

Hoặc trong PowerShell:

```powershell
$env:TAVILY_API_KEY="your_api_key_here"
```

Khi có key, pipeline sẽ gọi Tavily để lấy:

- Tóm tắt nội dung chính.
- Các nguồn/kết quả liên quan.
- Ngữ cảnh giúp chọn format video.
- Gợi ý điểm cần đưa vào scene.

Khi không có key, pipeline fallback sang:

- `<title>` của trang.
- Meta description.
- Ảnh chụp trực tiếp bằng Puppeteer.

Không nên dùng Tavily để thay thế GitHub API hoặc Docker Hub API khi link đã rõ nền tảng.

## Bước 2: Chụp ảnh trang nguồn

Script:

```bash
node capture_github.js <url>
```

Nhiệm vụ:

- Mở URL bằng Puppeteer.
- Dùng viewport dọc cố định.
- Ẩn header, footer, banner và popup gây nhiễu.
- Chụp ảnh màn hình.
- Lưu ảnh chính tại:

```txt
assets/images/github_repo.png
```

Tên file này đang được template hiện tại sử dụng, kể cả khi URL là Docker Hub.

## Bước 3: Tạo TTS và timing phụ đề

Script:

```bash
py gen_assets.py data/github-review.json
```

Nhiệm vụ:

- Đọc từng scene trong JSON.
- Tạo audio voice-over tiếng Việt bằng gTTS.
- Tăng tốc audio theo `SPEECH_SPEED`.
- Dùng `ffprobe` để lấy duration thật.
- Gắn các trường sau vào từng scene:

```json
{
  "audio_start": 0.5,
  "audio_duration": 10.2,
  "audio_path": "assets/audio/github-review_scene_1.wav",
  "transcript": []
}
```

Sau bước này, `data/github-review.json` sẽ được ghi lại với duration, audio path và transcript word-level giả lập.

## Quy tắc viết lời đọc và phụ đề

Lời đọc trong field `voice` phải được viết từ góc nhìn của một người xem lần đầu gặp nội dung, không viết từ góc nhìn của hệ thống đang tạo video.

Nên viết:

- "Nếu bạn vừa mở trang này, điều đầu tiên cần nắm là..."
- "Điểm đáng chú ý nằm ở..."
- "Trước khi áp dụng, hãy kiểm tra..."
- "Cách đọc nhanh là..."

Không nên viết:

- "Tavily cho thấy..."
- "Metadata trang cho thấy..."
- "Scene này nên..."
- "Video nên..."
- "Format này phù hợp..."
- "Mình đang phân tích link..."

Nếu dữ liệu lấy từ Tavily hoặc HTML còn thô, không đưa nguyên văn vào lời đọc. Hãy dùng dữ liệu đó để hiểu ngữ cảnh, rồi viết lại thành câu tiếng Việt tự nhiên, ngắn, dễ nghe và có ích cho người xem.

## Bước 4: Generate HTML composition

Script:

```bash
node generate.mjs data/github-review.json
```

Nhiệm vụ:

- Đọc field `template` trong JSON.
- Load template tương ứng trong `templates/`.
- Sinh `index.html`.

Với data hiện tại:

```json
{
  "template": "news"
}
```

Template được dùng:

```txt
templates/news/template.mjs
templates/news/style.css
```

## Bước 5: Check composition

Command:

```bash
npm run check
```

Lệnh này chạy:

```bash
npx --yes hyperframes@0.6.24 lint
npx --yes hyperframes@0.6.24 validate
npx --yes hyperframes@0.6.24 inspect
```

Yêu cầu:

- Không được có error.
- Warning có thể tồn tại tạm thời, nhưng nên được xử lý dần nếu ảnh hưởng bảo trì hoặc render.

Warning hiện tại thường gặp:

- `duplicate_media_discovery_risk`
- `composition_file_too_large`
- `composition_self_attribute_selector`
- `caption_transcript_parse_error`

## Bước 6: Render MP4

Command:

```bash
npm run render
```

Output nằm trong:

```txt
renders/
```

Ví dụ:

```txt
renders/my-video_2026-05-20_11-08-22.mp4
```

## Preview local

Command:

```bash
npm run dev
```

Trên Windows, có thể dùng script helper:

```bash
scripts/start-preview.cmd
```

Server preview thường chạy tại:

```txt
http://localhost:3002
```

Nếu port thay đổi, xem log:

```txt
preview.log
preview.err.log
```

## Luồng đầy đủ trong `run_pipeline.js`

`run_pipeline.js` đang chạy tuần tự:

```txt
generate_repo_data.js
capture_github.js
gen_assets.py
generate.mjs
npx hyperframes validate
npm run render
```

Điểm cần lưu ý:

- `run_pipeline.js` hiện render luôn MP4.
- Nếu chỉ muốn preview, chạy thủ công đến bước `generate.mjs`, sau đó start `npm run dev`.
- Nếu thay URL mới, ảnh `assets/images/github_repo.png` và audio `assets/audio/github-review_scene_*.wav` sẽ bị ghi đè.

## Luồng chỉ preview, chưa render

Dùng khi muốn kiểm tra nhanh:

```bash
node generate_repo_data.js <url>
node capture_github.js <url>
py gen_assets.py data/github-review.json
node generate.mjs data/github-review.json
npm run check
npm run dev
```

## Luồng render đầy đủ

Dùng khi muốn xuất MP4:

```bash
node run_pipeline.js <url>
```

Hoặc chạy thủ công:

```bash
node generate_repo_data.js <url>
node capture_github.js <url>
py gen_assets.py data/github-review.json
node generate.mjs data/github-review.json
npm run check
npm run render
```

## Vai trò của từng file chính

```txt
run_pipeline.js
```

Entry point tự động chạy toàn bộ luồng.

```txt
generate_repo_data.js
```

Router phân tích URL, phân loại nội dung và sinh scene JSON.

```txt
capture_github.js
```

Chụp ảnh trang nguồn bằng Puppeteer.

```txt
gen_assets.py
```

Tạo TTS, tính duration và transcript.

```txt
generate.mjs
```

Biên dịch JSON + template thành `index.html`.

```txt
templates/news/
```

Template HTML/CSS/scene layout đang dùng cho video.

## Cải tiến nên làm tiếp

1. Tách output theo slug URL để không ghi đè `github-review.json`, audio và ảnh.
2. Đổi tên `capture_github.js` thành tên trung tính hơn, ví dụ `capture_source.js`.
3. Thêm mode `--preview` cho `run_pipeline.js` để không render.
4. Thêm mode `--render` hoặc giữ default render như hiện tại.
5. Lưu metadata asset chụp ảnh vào JSON riêng.
6. Sửa dần warning HyperFrames để composition sạch hơn.
7. Tạo template riêng cho Docker thay vì dùng lại layout GitHub.
