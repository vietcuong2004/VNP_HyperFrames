# Kế hoạch thay template video cố định

## Mục tiêu

Hiện tại các template `G1_github`, `G2_docker`, `G3_web` vẫn còn nhiều visual và text được thiết kế cố định theo một vài trường hợp mẫu. Kế hoạch này mô tả hướng thay toàn bộ template video thành hệ template linh hoạt hơn, chưa triển khai trong code.

Mục tiêu cuối:

- Một URL đầu vào khác nhau phải tạo video có bố cục, nhịp hiển thị và nội dung phù hợp hơn.
- Không còn cảm giác mọi video dùng cùng một khung bento/headline/CTA lặp lại.
- Template không hardcode theo nginx, HyperFrames, Remotion hoặc một repo/image mẫu.
- Vẫn giữ số scene, timing và contract đủ ổn định để pipeline render tự động.

## Vấn đề hiện tại

Các template đang bị cố định ở ba lớp:

1. **Nội dung**: nhiều headline, bento title, CTA và fallback còn quá chung chung hoặc bám vào ví dụ cũ.
2. **Layout trong scene**: mỗi scene thường chỉ có một kiểu bento, terminal hoặc icon lớn, chưa chọn layout theo loại nội dung.
3. **Visual identity**: font, màu, icon và nhịp animation gần như giống nhau giữa nhiều video, làm video bị lặp.

Một số scene hướng dẫn như install, clone, setup, config, deploy nên là step cards hoặc command walkthrough, nhưng hiện vẫn có thể rơi về bento card.

## Hướng thiết kế mới

### 1. Tách content contract khỏi visual template

Mỗi scene nên có dữ liệu chuẩn:

```json
{
  "scene": 3,
  "layout": "install",
  "content_mode": "steps",
  "headline_line1": "CLONE REPO",
  "headline_line2": "CHẠY THỬ RIÊNG",
  "cards": [],
  "steps": [],
  "commands": [],
  "stats": {},
  "warnings": []
}
```

Generator chịu trách nhiệm sinh content. Template chịu trách nhiệm chọn visual phù hợp từ `content_mode` và các field phụ.

### 2. Mỗi scene có nhiều biến thể render

Không nên để một layout chỉ có một kiểu render. Ví dụ:

| Scene type | Biến thể đề xuất |
|---|---|
| Intro | Browser screenshot, repo badge, hero title, split terminal |
| Install/Clone | Step cards, terminal command, checklist, command timeline |
| Feature | Bento grid, comparison, architecture map, stacked cards |
| Config | Key-value cards, risk checklist, command + notes |
| Stats | Badge, trend card, repo/image metadata, compact dashboard |
| Outro | Checklist, next action, star/save/follow, docs reminder |

Generator không cần chọn HTML trực tiếp. Nó chỉ chọn `content_mode` và metadata. Template có thể chọn biến thể bằng rule an toàn.

### 3. Có registry template theo group

Đề xuất tạo registry nội bộ:

```txt
templates/
  G1_github/
    variants/
      intro_browser
      install_steps
      install_terminal
      feature_bento
      feature_map
      outro_checklist
  G2_docker/
    variants/
      hub_intro
      tag_terminal
      config_cards
      config_steps
      run_terminal
      production_checklist
  G3_web/
    variants/
      page_intro
      insight_cards
      docs_steps
      action_plan
```

Chưa cần tách file ngay. Có thể triển khai từng bước bằng helper trong `scenes.mjs`, sau đó mới tách variant khi code đủ lớn.

## Kế hoạch triển khai

### Pha 1: Chuẩn hóa dữ liệu scene

- Tạo helper normalize chung cho `cards`, `steps`, `commands`, `warnings`.
- Giữ tương thích với `bento*_title`, `bento*_desc`.
- Thêm test cho từng group để đảm bảo scene hướng dẫn render bằng step/command, không rơi về bento cố định.

### Pha 2: Thêm biến thể layout trong template hiện tại

Ưu tiên theo tác động:

1. GitHub: install/clone thành command walkthrough hoặc step cards.
2. Docker: config/run/checklist thành step cards hoặc command timeline.
3. Web: docs/action scenes thành action plan thay vì bento chung.

Mỗi lần chỉ thêm một biến thể và có test HTML render.

### Pha 3: Tách style hệ thống

- Dùng font local hỗ trợ tiếng Việt cho mọi group.
- Chuẩn hóa headline line-height, padding, overflow để không mất dấu.
- Thêm class dùng chung cho step cards, command blocks, warning cards.
- Tránh inline style quá nhiều trong `scenes.mjs`.

### Pha 4: Template selection an toàn

Template chỉ chọn variant từ danh sách cho phép:

```txt
if content_mode === "steps" -> render step variant
else if commands.length > 0 -> render terminal variant
else if cards.length > 0 -> render card variant
else -> fallback generic
```

Không để AI trả về tên component tùy ý rồi render trực tiếp.

### Pha 5: Visual refresh theo group

Sau khi content động ổn định, mới đổi visual identity:

- GitHub: cảm giác repo review, README, code, issue/release.
- Docker: terminal, image layer, config, deploy checklist.
- Web: source/page type, insight cards, action plan.

Không làm visual refresh trước khi content contract ổn, vì dễ tạo thêm lỗi render.

## Tiêu chí hoàn thành

- Không còn scene hướng dẫn quan trọng nào bị ép vào bento cố định.
- Headline tiếng Việt hiển thị đúng dấu, không cắt dấu, không lúc to lúc nhỏ bất thường.
- Mỗi group có ít nhất 2-3 biến thể render dùng được thật.
- Generator không còn copy placeholder vào output.
- Test bao phủ normalize và HTML render cho GitHub, Docker, Web.
- Pipeline render được trên app desktop sau khi đóng gói.

## Phạm vi chưa làm

- Chưa đổi toàn bộ cấu trúc thư mục template.
- Chưa tạo variant registry thật.
- Chưa thiết kế lại visual identity toàn bộ group.
- Chưa cho AI tự quyết định layout tùy ý.

Tài liệu này là kế hoạch để triển khai sau, không phải thay đổi code trong lần này.
