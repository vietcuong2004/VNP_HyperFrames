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
node run_pipeline.js https://hub.docker.com/_/nginx
node run_pipeline.js https://example.com/some-tech-article
```

## Tổng quan luồng

Pipeline hiện tại gồm 7 bước chính:

1. Phân tích URL và sinh kịch bản JSON.
2. Chụp ảnh trang nguồn.
3. Tạo giọng đọc (TTS) và timing phụ đề.
4. Generate `index.html` từ template.
5. Kiểm tra composition bằng HyperFrames.
6. Render MP4 và đổi tên theo quy tắc.
7. Dọn dẹp file audio tạm.

## Bước 1: Phân tích URL

Script:

```bash
node generate_repo_data.js <url>
```

Nhiệm vụ:

- Nhận URL đầu vào.
- Xác định nền tảng: GitHub, Docker hoặc web.
- Gọi API nguồn nếu có thể.
- Với URL web không rõ ràng, gọi Tavily nếu có `TAVILY_API_KEY`.
- Lấy metadata cơ bản.
- Phân loại nội dung.
- Chọn `video_format` và `template` tương ứng.
- Sinh file JSON tại thư mục `data/`.

### Quy tắc đặt tên file JSON

Nội dung để gen video sẽ lưu vào file JSON được đặt tên theo định dạng:

```txt
data/<tên-video>-<DD>-<MM>-<YYYY>-<HH>-<mm>.json
```

Ví dụ:

```txt
data/edge-tts-20-05-2026-16-06.json
data/nginx-20-05-2026-16-06.json
data/pnpm-20-05-2026-16-06.json
```

Tên video được lấy từ metadata: tên repo (GitHub), tên image (Docker) hoặc tiêu đề trang (web).

### Các template hiện có

| Template | Nền tảng | Thư mục |
|---|---|---|
| `G1_github` | GitHub | `templates/G1_github/` |
| `G2_docker` | Docker Hub | `templates/G2_docker/` |
| `G3_web` | Web bất kỳ | `templates/G3_web/` |

### Các format video theo nền tảng

**GitHub:**

- `tool_review_quick_demo` — Repo dạng tool/app/CLI
- `developer_integration_brief` — Repo dạng thư viện/framework
- `knowledge_map_resource_digest` — Repo dạng awesome/curated list
- `dataset_explainer` — Repo dạng dataset/benchmark
- `repo_overview_with_use_cases` — Repo không xác định rõ

**Docker:**

- `container_quick_start` — Official/base image
- `self_host_setup_guide` — Ứng dụng self-hosted
- `dev_workflow_image_brief` — Dev/CI runtime
- `container_overview` — Image không xác định rõ

**Web:**

- `web_docs_explainer` — Trang tài liệu
- `web_tool_overview` — Trang tool/SDK
- `web_article_digest` — Bài viết/phân tích
- `web_product_brief` — Trang sản phẩm
- `web_context_digest` — Web không xác định rõ

## Tavily cho URL không rõ ràng

Tavily chỉ được dùng cho URL không thuộc GitHub/Docker. Điều này giúp giữ luồng GitHub/Docker ổn định và deterministic hơn.

Thiết lập key trong file `.env`:

```txt
TAVILY_API_KEY=your_api_key_here
```

Khi có key, pipeline sẽ gọi Tavily để lấy tóm tắt nội dung, nguồn liên quan và ngữ cảnh. Khi không có key, pipeline fallback sang `<title>` và meta description của trang.

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

## Bước 3: Tạo TTS và timing phụ đề

Script:

```bash
py gen_assets.py <đường_dẫn_file_json>
```

Nhiệm vụ:

- Đọc từng scene trong JSON.
- Tạo audio voice-over tiếng Việt bằng **edge-tts** (giọng `vi-VN-NamMinhNeural` — giọng nam miền Nam).
- Sử dụng cờ `--file` thay vì `--text` để tránh lỗi mã hóa UTF-8 trên Windows.
- Tăng tốc audio theo `SPEECH_SPEED` (hiện tại: 1.18x) bằng ffmpeg.
- Dùng `ffprobe` để lấy duration thật.
- Tính toán transcript word-level với hệ số 85% thời lượng audio (để text chạy nhanh hơn, khớp với giọng đọc).
- Gắn `audio_start`, `audio_duration`, `audio_path`, `transcript` vào từng scene.

### Cấu hình TTS

| Tham số | Giá trị |
|---|---|
| Engine | `edge-tts` (Microsoft Edge TTS) |
| Giọng đọc | `vi-VN-NamMinhNeural` (nam, miền Nam) |
| Tốc độ tăng | 1.18x |
| Hệ số text pacing | 85% thời lượng audio |

## Quy tắc viết lời đọc và phụ đề

Lời đọc trong field `voice` phải được viết từ góc nhìn của một người xem lần đầu gặp nội dung, không viết từ góc nhìn của hệ thống đang tạo video.

Nên viết:

- "Nếu bạn vừa mở trang này, điều đầu tiên cần nắm là..."
- "Điểm đáng chú ý nằm ở..."
- "Trước khi áp dụng, hãy kiểm tra..."

Không nên viết:

- "Tavily cho thấy..."
- "Metadata trang cho thấy..."
- "Scene này nên..."
- "Mình đang phân tích link..."

## Bước 4: Generate HTML composition

Script:

```bash
node generate.mjs <đường_dẫn_file_json>
```

Nhiệm vụ:

- Đọc field `template` trong JSON.
- Load template tương ứng trong `templates/`.
- Sinh `index.html`.

Mỗi template bao gồm:

```txt
templates/<tên_template>/
├── template.mjs          # Cấu trúc HTML chính
├── style.css             # CSS thiết kế
└── hyperframesReview.mjs # Layout cho từng scene
```

## Bước 5: Kiểm tra composition

Command:

```bash
npm run check
```

Yêu cầu: không được có error. Warning có thể tồn tại tạm thời.

## Bước 6: Render MP4 và đổi tên

Command:

```bash
npm run render
```

Sau khi render xong, pipeline tự động đổi tên file MP4 mới nhất trong `renders/` theo cùng quy tắc với file JSON:

```txt
renders/<tên-video>-<DD>-<MM>-<YYYY>-<HH>-<mm>.mp4
```

Ví dụ:

```txt
renders/nginx-20-05-2026-16-06.mp4
renders/edge-tts-20-05-2026-16-06.mp4
```

## Bước 7: Dọn dẹp

Pipeline tự động xóa các file `.wav` trong `assets/audio/` sau khi render thành công.

## Preview local

Command:

```bash
npm run dev
```

Server preview chạy tại:

```txt
http://localhost:3002
```

## Luồng đầy đủ trong `run_pipeline.js`

```txt
generate_repo_data.js   → Sinh JSON kịch bản
capture_github.js       → Chụp ảnh trang nguồn
gen_assets.py           → TTS + timing phụ đề
generate.mjs            → Biên dịch HTML
hyperframes validate    → Kiểm tra composition
npm run render          → Kết xuất MP4
(đổi tên MP4)           → Theo quy tắc tên-video-date-time
(dọn dẹp audio)         → Xóa file .wav tạm
```

## Vai trò của từng file chính

| File | Vai trò |
|---|---|
| `run_pipeline.js` | Entry point tự động chạy toàn bộ luồng |
| `generate_repo_data.js` | Phân tích URL, phân loại nội dung, sinh scene JSON |
| `capture_github.js` | Chụp ảnh trang nguồn bằng Puppeteer |
| `gen_assets.py` | Tạo TTS bằng edge-tts, tính duration và transcript |
| `generate.mjs` | Biên dịch JSON + template thành `index.html` |
| `templates/G1_github/` | Template cho video GitHub |
| `templates/G2_docker/` | Template cho video Docker (phong cách Terminal) |
| `templates/G3_web/` | Template cho video web |

## Ghi chú cho bản desktop packaged

Khi pipeline chạy bên trong app desktop đã cài đặt, app root và workspace không còn là thư mục repo gốc:

```txt
App root: %LOCALAPPDATA%\Programs\my-video\resources\app
Workspace: %APPDATA%\my-video\workspace
```

`desktop_app/workspace.mjs` chuẩn bị workspace trước khi chạy job: copy template/assets/data cần thiết, tạo `vendor/`, tạo thư mục output/log và copy GSAP local vào `workspace\vendor\gsap.min.js`.

`desktop_app/ui_server.js` gọi pipeline với env runtime đã được hợp nhất từ:

- env của tiến trình app
- env bundle trong app, ví dụ `desktop_app/app.env`
- env riêng của workspace nếu có
- đường dẫn Node, FFmpeg/FFprobe và Puppeteer browser runtime

Trong app desktop, bước validate/render HyperFrames dùng CLI local:

```txt
node_modules/hyperframes/dist/cli.js
```

Không dùng wrapper `node_modules\.bin\hyperframes.cmd` trong bản packaged.

Composition sinh ra dùng GSAP local `./vendor/gsap.min.js`. Các `@import` Google Fonts trong CSS template được loại bỏ khi generate HTML để tránh phụ thuộc CDN trong lúc HyperFrames validate/render.

## Đóng gói và phân phối desktop app

Luồng pipeline không yêu cầu người dùng cuối có source repo. Người làm app build installer bằng:

```bash
npm run dist
```

File phân phối cho máy khác:

```txt
dist\VNP HyperFrames Setup 0.1.0.exe
```

Không cần gửi thêm `.rar`, không cần gửi `node_modules`, không cần gửi `dist\win-unpacked`. Installer đã chứa app root và các dependency runtime cần thiết.

Khi cài trên máy người dùng:

```txt
App root: %LOCALAPPDATA%\Programs\my-video\resources\app
Workspace: %APPDATA%\my-video\workspace
```

Pipeline desktop dùng:

- Node local từ `resources\app\node_modules\node\bin\node.exe`.
- HyperFrames local từ `resources\app\node_modules\hyperframes\dist\cli.js`.
- FFmpeg/FFprobe từ package bundled.
- GSAP local từ `workspace\vendor\gsap.min.js`.
- Key AI từ env bundle trong app hoặc env workspace nếu có.

Máy người dùng vẫn cần mạng cho AI, Edge TTS và lần đầu tải Chrome for Testing nếu workspace chưa có cache browser. Sau khi Chrome đã cache trong `%APPDATA%\my-video\workspace\.puppeteer-cache`, các lần sau app dùng lại cache đó.

## Agent dynamic HTML

Luồng mới chạy theo thứ tự:

1. `run_pipeline.js` chụp URL bằng Puppeteer trước khi sinh kịch bản.
2. Ảnh chụp được lưu tại `assets/images/github_repo.png`.
3. Pipeline đọc kích thước PNG thật và ghi manifest `agent_output/project_assets.json`.
4. `main_generateContent.js` đọc manifest qua `PROJECT_ASSETS_PATH`, truyền `projectAssets` vào Script Agent, rồi gắn `render_mode: "agent_html"`.
5. `generate.mjs` không load template tĩnh nếu thấy `render_mode: "agent_html"`. Thay vào đó, nó sinh các scene HTML vào `agent_output/scenes/` và tạo root `index.html` tham chiếu các sub-composition.

Mọi file runtime do luồng agent dynamic sinh ra phải nằm trong:

```txt
agent_output/
├── project_assets.json
└── scenes/
    ├── scene-1.html
    └── ...
```

Không trộn file HTML sinh theo luồng mới vào `templates/`. `templates/` chỉ còn là fallback cho luồng static cũ.
