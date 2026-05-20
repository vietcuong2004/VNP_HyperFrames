# Skill: Tạo Video Tech Từ Link

## Quy ước tài liệu

Tất cả file trong thư mục `docs/` phải dùng UTF-8 và viết tiếng Việt có dấu. Không tạo tài liệu tiếng Việt không dấu trong thư mục này.

## Mục tiêu

Skill này dùng để phân tích một link công nghệ và tự chọn format video phù hợp. Cùng là link GitHub, nhưng repo chia sẻ một tool cần video theo hướng demo giá trị và cách dùng; repo tổng hợp tài nguyên như `awesome-nlp` cần video theo hướng bản đồ tri thức, phân nhóm chủ đề và gợi ý cách khai thác.

Phạm vi hỗ trợ:

- GitHub repository
- Docker Hub / Docker.io image
- Web URL bất kỳ (docs, landing page, bài viết kỹ thuật)

Entry point:

```bash
node run_pipeline.js <url>
```

Ví dụ:

```bash
node run_pipeline.js https://github.com/heygen-com/hyperframes
node run_pipeline.js https://github.com/keon/awesome-nlp
node run_pipeline.js https://hub.docker.com/_/nginx
node run_pipeline.js https://docs.python.org/3/tutorial/
```

## Hệ thống template

Mỗi nền tảng có template riêng với phong cách thiết kế khác biệt:

| Template | Nền tảng | Phong cách |
|---|---|---|
| `G1_github` | GitHub | Gradient vàng/xanh, khung trình duyệt web |
| `G2_docker` | Docker Hub | Xanh Docker, khung Terminal/Console |
| `G3_web` | Web bất kỳ | Gradient xanh dương/vàng, khung trình duyệt |

Mỗi template nằm trong `templates/<tên>/` và gồm:

- `template.mjs` — Cấu trúc HTML chính, audio, GSAP timeline, phụ đề karaoke
- `style.css` — CSS thiết kế riêng cho nền tảng
- `hyperframesReview.mjs` — Layout và animation cho từng scene

## Cấu hình TTS

Pipeline sử dụng **edge-tts** (Microsoft Edge online TTS) để tạo giọng đọc tiếng Việt.

| Tham số | Giá trị |
|---|---|
| Engine | `edge-tts` (`pip install edge-tts`) |
| Giọng đọc | `vi-VN-NamMinhNeural` (nam, miền Nam) |
| Tốc độ tăng | 1.18x (qua ffmpeg atempo) |
| Hệ số text pacing | 85% thời lượng audio |
| Cách truyền text | Qua file tạm UTF-8 với cờ `--file` |

Giọng khả dụng khác: `vi-VN-HoaiMyNeural` (nữ).

## Quy tắc đặt tên file

File JSON kịch bản và file MP4 video đều tuân theo quy tắc:

```txt
<tên-video>-<DD>-<MM>-<YYYY>-<HH>-<mm>
```

Trong đó `tên-video` được lấy từ:

- Tên repo (GitHub): `edge-tts`, `pnpm`, `awesome-nlp`
- Tên image (Docker): `nginx`, `postgres`, `redis`
- Tiêu đề trang hoặc domain (Web): `python-docs`, `vercel`

Ví dụ:

```txt
data/nginx-20-05-2026-16-06.json
renders/nginx-20-05-2026-16-06.mp4
```

## Luồng tự động

Pipeline chạy theo thứ tự:

1. Nhận URL đầu vào.
2. Nhận diện nền tảng: GitHub, Docker hoặc web.
3. Thu thập metadata từ API hoặc trang nguồn.
4. Phân loại nội dung.
5. Chọn `video_format` và `template`.
6. Sinh file JSON kịch bản với scene phù hợp.
7. Chụp ảnh trang nguồn.
8. Tạo TTS bằng edge-tts, sinh HTML, validate và render.
9. Đổi tên video MP4 theo quy tắc.
10. Dọn dẹp file audio tạm.

## Nguyên tắc chung

Mỗi link đầu vào phải được phân loại trước khi viết kịch bản:

1. Xác định nền tảng: `github.com`, `hub.docker.com`, `docker.io`, hoặc web bất kỳ.
2. Xác định loại nội dung: tool, library, framework, template, curated list, dataset, docs, container image.
3. Xác định ý định người xem: học nhanh, cài đặt dùng ngay, đánh giá có nên dùng, tổng hợp tài nguyên, so sánh giải pháp.
4. Chọn format video riêng theo loại link.
5. Tạo data scene với thông tin, visual, CTA, nhân vật và screen capture phù hợp.

Không áp một format duy nhất cho mọi link.

## Phân loại GitHub

### 1. Repo Tool / App / CLI

Dấu hiệu:

- README có các mục như `Installation`, `Usage`, `Quick Start`, `CLI`, `Demo`.
- Repo có binary, command, package, Dockerfile hoặc cách chạy rõ ràng.

Format video: **Tool Review + Quick Demo** (`tool_review_quick_demo`)

### 2. Repo Library / Framework

Dấu hiệu:

- README nói về API, SDK, package, integration.
- Có package manager như npm, pip, cargo, go, maven.

Format video: **Developer Integration Brief** (`developer_integration_brief`)

### 3. Repo Curated / Awesome List

Dấu hiệu:

- Tên repo bắt đầu bằng `awesome-` hoặc README là danh sách link.
- Không có một sản phẩm/tool duy nhất để demo.

Format video: **Knowledge Map / Resource Digest** (`knowledge_map_resource_digest`)

### 4. Repo Dataset / Benchmark

Dấu hiệu:

- README nói về data, samples, labels, benchmark, leaderboard.
- Có file CSV, JSONL, parquet hoặc script tải data.

Format video: **Dataset Explainer** (`dataset_explainer`)

## Phân loại Docker Hub / Docker.io

### 1. Official / Base Image

Ví dụ: `nginx`, `postgres`, `redis`, `node`, `python`.

Format video: **Container Quick Start** (`container_quick_start`)

### 2. App Image / Self-hosted Tool

Ví dụ: dashboard, CMS, automation tool.

Format video: **Self-host Setup Guide** (`self_host_setup_guide`)

### 3. Developer Runtime Image

Ví dụ: SDK, builder, CI runner, devcontainer.

Format video: **Dev Workflow Image Brief** (`dev_workflow_image_brief`)

## Phân loại Web

### 1. Trang tài liệu

Format video: **Web Docs Explainer** (`web_docs_explainer`)

### 2. Trang tool/SDK

Format video: **Web Tool Overview** (`web_tool_overview`)

### 3. Bài viết kỹ thuật

Format video: **Web Article Digest** (`web_article_digest`)

### 4. Trang sản phẩm

Format video: **Web Product Brief** (`web_product_brief`)

## Router chọn format

```txt
if domain is github.com:
  if repo name starts with awesome- or README mostly contains link lists:
    format = knowledge_map_resource_digest, template = G1_github
  else if README focuses on dataset/benchmark:
    format = dataset_explainer, template = G1_github
  else if package manifest exists and README has API examples:
    format = developer_integration_brief, template = G1_github
  else if README has install + usage + command/demo:
    format = tool_review_quick_demo, template = G1_github
  else:
    format = repo_overview_with_use_cases, template = G1_github

if domain is hub.docker.com or docker.io:
  if image is official/base/service:
    format = container_quick_start, template = G2_docker
  else if image runs a complete app:
    format = self_host_setup_guide, template = G2_docker
  else if image is runtime/builder/ci:
    format = dev_workflow_image_brief, template = G2_docker
  else:
    format = container_overview, template = G2_docker

else (web):
  classify based on page content, template = G3_web
```

## Quy tắc viết kịch bản

- GitHub tool: nói bằng ngôn ngữ hành động, ưu tiên demo và quick start.
- GitHub awesome/curated list: nói bằng ngôn ngữ định hướng, ưu tiên bản đồ chủ đề và lộ trình học.
- GitHub library/framework: nói với developer, ưu tiên API, snippet, integration.
- Docker image: nói với người triển khai, ưu tiên command, port, env, volume, tag.
- Web: tóm tắt nội dung chính, đặt câu hỏi thực tế, hướng dẫn hành động tiếp theo.
- Nếu thông tin không có trong link, không tự bịa đặt. Có thể tạo cảnh "cần check trước khi dùng" thay vì khẳng định.

## Ví dụ khác biệt giữa các nền tảng

Với GitHub repo là tool:

- Headline: "Tool này giúp bạn làm X nhanh hơn"
- CTA: "Clone và chạy thử"
- Visual chính: khung trình duyệt + demo result

Với GitHub repo là `awesome-nlp`:

- Headline: "Bản đồ tài nguyên NLP đáng bookmark"
- CTA: "Star để lưu lộ trình học"
- Visual chính: README sections + mind map

Với Docker image:

- Headline: "Chạy service này bằng một lệnh Docker"
- CTA: "Pin version tag trước khi đưa lên production"
- Visual chính: khung Terminal + docker pull/run + port mapping

Với Web URL:

- Headline: "Trang này nói gì và bạn cần biết gì"
- CTA: "Mở nguồn và kiểm chứng"
- Visual chính: khung trình duyệt + highlight nội dung chính
