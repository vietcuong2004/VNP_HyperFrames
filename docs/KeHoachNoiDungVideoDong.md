# Kế hoạch nội dung và visual động

Tài liệu này mô tả contract nội dung cần có để scene AI không sinh text giữa video vô nghĩa.

## Nguyên tắc

Mỗi scene có 3 lớp thông tin riêng:

1. `voice`: lời đọc tự nhiên.
2. `visual_brief`: nội dung được phép hiện trên màn hình.
3. `html`: scene composition do AI sinh từ `visual_brief`.

Không dùng `voice` làm nguồn text chính. Nếu cần subtitle, subtitle/burn-in nằm riêng ở lower-third.

## Trạng thái triển khai

Đã có bản đầu tiên của Visual Planner tại `agents/scene/visualPlanner.js`.

Bản này hiện làm các việc sau:

- Tạo `main_subject`, `primary_text`, `secondary_labels`, `facts`, `layout_intent` từ `scene.visual`, `scene.voice` và `source_url`.
- Chặn các nhãn rỗng nghĩa như `HTML`, `Scene 1`, `Focus`, `Module`, `Overview`.
- Ưu tiên repo/domain/metric/command thật khi có URL nguồn.
- Lọc mô tả art direction như `gradient xanh`, `[ENVIRONMENT]`, `[MOTION]`, `3 lớp depth` để không biến chúng thành copy chính.
- Cấp visual copy block cho `generateSceneHTML` và local fallback.

Đây là guardrail deterministic, chưa phải AI planner hoàn chỉnh.

## Visual Brief mục tiêu

```json
{
  "scene_goal": "explain_value",
  "layout_intent": "metric_cards",
  "main_subject": "RTK CLI proxy",
  "primary_text": "TOKEN CUT 60-90%",
  "secondary_labels": ["Rust binary", "Local proxy", "Cache"],
  "facts": [
    "CLI proxy that reduces LLM token consumption by 60-90%",
    "single Rust binary",
    "zero dependencies"
  ],
  "visual_objects": ["terminal", "token meter", "cache node"],
  "asset_requirements": ["logo"],
  "avoid_text": ["HTML", "Scene 1", "Focus", "Infinite possibilities"]
}
```

## Layout Intent

Danh sách ban đầu:

| Intent | Khi dùng | Visual nên có |
|---|---|---|
| `browser_scroll` | Cần hiện trang nguồn, GitHub, Docker Hub, docs | Screenshot lớn, browser chrome, callout ngắn |
| `terminal_steps` | Install, clone, run, config | Command block, step cards, progress |
| `architecture_map` | Giải thích proxy, library, data flow | Nodes, arrows, label ngắn |
| `metric_cards` | Có number/benefit rõ | Number lớn, 2-3 card phụ |
| `feature_cards` | Liệt kê tính năng | Cards ngắn, icon/shape liên quan |
| `checklist` | Outro, warning, next action | Checklist, CTA, repo/domain |

AI không tự phát minh intent ngoài danh sách nếu chưa có renderer/fallback.

## Rule chống text vô nghĩa

Text hiện giữa video bị xem là fail nếu:

- Chỉ là từ chung chung: `HTML`, `Scene`, `Focus`, `Module`, `Overview`, `Dynamic`, `Visual`.
- Không chứa keyword nào từ URL/source.
- Copy 5+ từ liên tiếp từ `voice`.
- Lấy mô tả thiết kế làm nội dung, ví dụ `gradient xanh`, `ánh sáng`, `camera`, `motion`, `environment`.
- Không giúp người xem hiểu scene đang nói về cái gì.

Text tốt nên có:

- Tên repo/image/product/domain.
- Một metric hoặc lợi ích cụ thể.
- Command/keyword thật nếu source có.
- 1-4 từ mỗi label, nhưng đủ nghĩa.

## Normalize đề xuất

Nếu `primary_text` yếu:

1. Lấy `[TEXT] '...'` trong `scene.visual` nếu có và không phải art direction.
2. Lấy repo/image/domain name từ source metadata.
3. Lấy number/metric trong description/README.
4. Kết hợp thành label ngắn, ví dụ:
   - `RTK PROXY`
   - `TOKEN CUT 60-90%`
   - `RUST CLI`
   - `LOCAL CACHE`

Nếu vẫn không có dữ liệu, dùng fallback có bối cảnh:

```txt
<repo-name> OVERVIEW
<domain> SUMMARY
<image-name> QUICKSTART
```

Không fallback về `Scene 1` hoặc `HTML -> VIDEO`.

## Test cần có

Đã có test cho Visual Planner và fallback động:

- `tests/visual_planner.test.mjs`
- `tests/dynamic_fallback_content.test.mjs`

Các case cần tiếp tục mở rộng:

- `rtk-ai/rtk`: primary text phải có `RTK`, `TOKEN`, `60-90`, `Rust` hoặc `proxy`.
- GitHub repo có README: scene install phải dùng `terminal_steps` nếu có command.
- Docker Hub: scene run/config phải dùng command/checklist nếu có lệnh.
- Web docs: scene browser phải dùng screenshot nguồn.
- Validator phải bắt voice leak ngoài caption.
