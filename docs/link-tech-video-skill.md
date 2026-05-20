# Skill: Tạo Video Tech Từ Link

## Quy ước tài liệu

Tất cả file trong thư mục `docs/` phải dùng UTF-8 và viết tiếng Việt có dấu. Không tạo tài liệu tiếng Việt không dấu trong thư mục này.

## Mục tiêu

Skill này dùng để phân tích một link công nghệ và tự chọn format video phù hợp. Cùng là link GitHub, nhưng repo chia sẻ một tool cần video theo hướng demo giá trị và cách dùng; repo tổng hợp tài nguyên như `awesome-nlp` cần video theo hướng bản đồ tri thức, phân nhóm chủ đề và gợi ý cách khai thác.

Phạm vi đầu tiên:

- GitHub repository
- Docker Hub / Docker.io image

Entry point mong muốn:

```bash
node run_pipeline.js <url>
```

Ví dụ:

```bash
node run_pipeline.js https://github.com/heygen-com/hyperframes
node run_pipeline.js https://github.com/keon/awesome-nlp
node run_pipeline.js https://hub.docker.com/_/nginx
```

## Luồng tự động

Pipeline nên chạy theo thứ tự:

1. Nhận URL đầu vào.
2. Nhận diện nền tảng: GitHub hoặc Docker.
3. Thu thập metadata từ API hoặc trang nguồn.
4. Phân loại nội dung.
5. Chọn `video_format`.
6. Sinh `data/github-review.json` với scene phù hợp.
7. Chụp ảnh trang nguồn.
8. Tạo TTS, sinh HTML, validate và render.

## Nguyên tắc chung

Mỗi link đầu vào phải được phân loại trước khi viết kịch bản:

1. Xác định nền tảng: `github.com`, `hub.docker.com`, `docker.io`.
2. Xác định loại nội dung: tool, library, framework, template, curated list, dataset, docs, container image.
3. Xác định ý định người xem: học nhanh, cài đặt dùng ngay, đánh giá có nên dùng, tổng hợp tài nguyên, so sánh giải pháp.
4. Chọn format video riêng theo loại link.
5. Tạo data scene với thông tin, visual, CTA, nhân vật và screen capture phù hợp.

Không áp một format duy nhất cho mọi link GitHub.

## Phân loại GitHub

### 1. Repo Tool / App / CLI

Dấu hiệu:

- README có các mục như `Installation`, `Usage`, `Quick Start`, `CLI`, `Demo`.
- Repo có binary, command, package, Dockerfile hoặc cách chạy rõ ràng.
- Mô tả tập trung vào việc giải quyết một vấn đề cụ thể.

Format video nên dùng: **Tool Review + Quick Demo**

Mục tiêu video:

- Nói nhanh tool làm gì.
- Cho thấy vấn đề trước khi dùng tool.
- Nêu cách cài đặt và lệnh chạy đầu tiên.
- Kết thúc bằng lý do nên star hoặc thử dùng.

Cảnh gợi ý:

1. Hook: tool này giải quyết vấn đề gì?
2. Problem: người dùng đang đau ở điểm nào.
3. Core value: 2-3 lợi ích lớn nhất.
4. Quick start: lệnh install, clone hoặc chạy.
5. Demo flow: input -> xử lý -> output.
6. Use cases: ai nên dùng.
7. Social proof: stars, language, release, contributors.
8. CTA: star repo, thử chạy, follow tác giả.

Visual nên có:

- Screenshot trang repo.
- Terminal command.
- README quick start.
- Diagram input/output.
- UI/demo nếu có.

### 2. Repo Library / Framework

Dấu hiệu:

- README nói về API, SDK, package, integration.
- Có package manager như npm, pip, cargo, go, maven.
- Giá trị nằm ở việc lập trình viên tích hợp vào sản phẩm.

Format video nên dùng: **Developer Integration Brief**

Mục tiêu video:

- Giải thích library dùng để làm gì.
- Nêu tính năng API chính.
- Cho snippet cài đặt và snippet sử dụng ngắn.
- Đặt kỳ vọng: khi nào nên dùng, khi nào không nên dùng.

Cảnh gợi ý:

1. Hook: use case lập trình viên gặp hằng ngày.
2. What it is: library/framework này nằm ở lớp nào trong stack.
3. Install: package command.
4. Minimal code: ví dụ ngắn nhất có thể.
5. Advanced feature: điểm khác biệt.
6. Integration map: dùng với framework nào.
7. Risk/checklist: license, maintenance, maturity.
8. CTA: xem docs, star, test trong project phụ.

### 3. Repo Curated / Awesome List

Ví dụ: `awesome-nlp`.

Dấu hiệu:

- Tên repo bắt đầu bằng `awesome-` hoặc README là danh sách link.
- Nội dung gồm nhiều mục tài nguyên, bài viết, paper, thư viện, dataset, benchmark.
- Không có một sản phẩm/tool duy nhất để demo.

Format video nên dùng: **Knowledge Map / Resource Digest**

Mục tiêu video:

- Không review như một tool.
- Biến danh sách dài thành bản đồ học tập để người xem biết bắt đầu từ đâu.
- Chia các nhóm tài nguyên quan trọng.
- Nêu ai nên bookmark repo này.

Cảnh gợi ý:

1. Hook: nếu bạn muốn học NLP nhưng bị ngợp tài nguyên.
2. Repository identity: đây là hub tổng hợp, không phải tool cài đặt.
3. Topic map: chia 4-6 nhóm lớn, ví dụ paper, dataset, library, course, benchmark, production.
4. Beginner path: bắt đầu từ mục nào trước.
5. Practitioner path: mục nào dùng cho người đang build sản phẩm.
6. Hidden gems: 2-3 mục đáng chú ý trong README.
7. How to use: bookmark, search theo keyword, theo dõi update.
8. CTA: star để lưu lại, chia sẻ cho team hoặc học nhóm.

Visual nên có:

- README được highlight theo mục.
- Mind map / knowledge graph.
- Timeline học tập.
- Tag cloud các chủ đề.
- Card `Beginner`, `Builder`, `Researcher`.

Những điều cần tránh:

- Không nói "cài đặt repo này để dùng ngay" nếu repo chỉ là danh sách.
- Không tạo cảnh terminal clone làm trọng tâm.
- Không phóng đại số sao thành bằng chứng chất lượng của từng tài nguyên con.

### 4. Repo Dataset / Benchmark

Dấu hiệu:

- README nói về data, samples, labels, benchmark, leaderboard.
- Có file CSV, JSONL, parquet hoặc script tải data.

Format video nên dùng: **Dataset Explainer**

Cảnh gợi ý:

1. Dataset này trả lời bài toán nào.
2. Cấu trúc dữ liệu.
3. Cách tải về và license.
4. Ví dụ một record.
5. Task có thể train/evaluate.
6. Cảnh báo bias, size, usage limit.
7. CTA: đọc license và thử với baseline nhỏ.

## Phân loại Docker Hub / Docker.io

### 1. Official / Base Image

Dấu hiệu:

- Image là `nginx`, `postgres`, `redis`, `node`, `python`, `ubuntu`.
- Có tag version rõ ràng và tài liệu official.

Format video nên dùng: **Container Quick Start**

Mục tiêu video:

- Nói image dùng để chạy service/base runtime nào.
- Nêu tag nên dùng.
- Cho lệnh `docker pull` và `docker run` tối thiểu.
- Chỉ ra volume, port, env quan trọng.

### 2. App Image / Self-hosted Tool

Dấu hiệu:

- Image chạy một ứng dụng cụ thể: dashboard, automation, AI tool, CMS.
- README hoặc mô tả có `docker compose`, env secrets, database dependency.

Format video nên dùng: **Self-host Setup Guide**

### 3. Developer Runtime Image

Dấu hiệu:

- Image dùng cho build, CI/CD, devcontainer, test runner.
- Tên hoặc mô tả có `sdk`, `builder`, `runtime`, `ci`, `dev`.

Format video nên dùng: **Dev Workflow Image Brief**

## Router chọn format

```txt
if domain is github.com:
  if repo name starts with awesome- or README mostly contains link lists:
    format = knowledge_map_resource_digest
  else if README focuses on dataset/benchmark:
    format = dataset_explainer
  else if package manifest exists and README has API examples:
    format = developer_integration_brief
  else if README has install + usage + command/demo:
    format = tool_review_quick_demo
  else:
    format = repo_overview_with_use_cases

if domain is hub.docker.com or docker.io:
  if image is official/base/service:
    format = container_quick_start
  else if image runs a complete app:
    format = self_host_setup_guide
  else if image is runtime/builder/ci:
    format = dev_workflow_image_brief
  else:
    format = container_overview
```

## Output schema gợi ý

```json
{
  "source_url": "https://github.com/example/awesome-nlp",
  "platform": "github",
  "content_type": "curated_list",
  "video_format": "knowledge_map_resource_digest",
  "classification_reason": "README giống một danh sách tài nguyên/tổng hợp nhiều link.",
  "metadata": {
    "owner": "example",
    "repo": "awesome-nlp",
    "readme_headings": ["Papers", "Libraries", "Datasets"]
  },
  "scenes": [
    {
      "stt": 1,
      "voice": "Nếu bạn muốn học NLP nhưng bị ngợp trong hàng trăm tài nguyên...",
      "visual": "README được zoom vào, các mục lớn hiện thành knowledge map",
      "headline_line1": "AWESOME NLP",
      "headline_line2": "BẢN ĐỒ TÀI NGUYÊN ĐÁNG LƯU"
    }
  ]
}
```

## Quy tắc viết kịch bản

- GitHub tool: nói bằng ngôn ngữ hành động, ưu tiên demo và quick start.
- GitHub awesome/curated list: nói bằng ngôn ngữ định hướng, ưu tiên bản đồ chủ đề và lộ trình học.
- GitHub library/framework: nói với developer, ưu tiên API, snippet, integration.
- Docker image: nói với người triển khai, ưu tiên command, port, env, volume, tag.
- Nếu thông tin không có trong link, không tự bịa đặt. Có thể tạo cảnh "cần check trước khi dùng" thay vì khẳng định.

## Ví dụ khác biệt

Với GitHub repo là tool:

- Headline: "Tool này giúp bạn làm X nhanh hơn"
- CTA: "Clone và chạy thử"
- Visual chính: terminal + demo result

Với GitHub repo là `awesome-nlp`:

- Headline: "Bản đồ tài nguyên NLP đáng bookmark"
- CTA: "Star để lưu lộ trình học"
- Visual chính: README sections + mind map

Với Docker image:

- Headline: "Chạy service này bằng một lệnh Docker"
- CTA: "Pin version tag trước khi đưa lên production"
- Visual chính: Docker Hub tags + terminal + port mapping
