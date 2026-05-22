# Kế hoạch nội dung video động

## Mục tiêu

Các generator GitHub, Docker và Web đã bắt đầu sinh nội dung hiển thị theo context đầu vào thay vì bám hoàn toàn vào text mẫu. Mục tiêu là giữ layout ổn định, nhưng để các phần sau được viết theo đúng repo, Docker image hoặc trang web thật:

- `headline_line1`, `headline_line2`
- `bento*_title`, `bento*_desc`
- `steps`, `cards`
- `btn_text`

Video không nên còn các cụm chung chung như `Bước 1`, `Bước 2`, `Cấu hình`, `Production`, `Checklist` nếu nguồn đầu vào có đủ dữ liệu cụ thể hơn.

## Trạng thái hiện tại

Đã triển khai bước đầu cho:

- `G3_web`: generator và template có thể nhận nội dung động, dùng `steps/cards` cho các scene hướng dẫn.
- `G2_docker`: headline được normalize theo image, config/outro dùng nội dung step/card động, outro có hành động cuối rõ hơn.
- `G1_github`: generator nhận `steps/cards`, thay headline placeholder bằng headline theo repo, scene install/clone dùng step cards, headline dùng font local an toàn cho tiếng Việt.

Chưa hoàn tất:

- Chưa thay toàn bộ template visual cố định thành hệ template động.
- Chưa áp dụng step/card mode nhất quán cho mọi scene có tính hướng dẫn.
- Chưa tách contract scene thành module dùng chung cho cả ba group.

## Nguyên tắc thiết kế

### Layout cố định, nội dung động

AI không được tự thay số scene hoặc layout chính. Mỗi group vẫn giữ cấu trúc:

| Group | Số scene | Vai trò |
|---|---:|---|
| GitHub | 8 | Review repo, install/clone, tính năng, stats, kết luận |
| Docker | 5 | Docker image, tag, config, run command, checklist |
| Web | 6 | Tóm tắt web, câu hỏi chính, điểm đáng chú ý, hành động tiếp theo |

AI chỉ sinh nội dung cho field hiển thị. Hệ thống vẫn kiểm soát `scene`, `layout`, asset, sfx, timing và media path.

### Không copy placeholder

Schema mẫu không nên chứa text thành phẩm quá cụ thể. Ví dụ thay vì:

```json
{
  "headline_line1": "CẤU HÌNH",
  "headline_line2": "PORT, VOLUME VÀ ENV"
}
```

Nên dùng:

```json
{
  "headline_line1": "<từ khóa ngắn bám vào nguồn thật>",
  "headline_line2": "<lợi ích hoặc cảnh báo cụ thể của scene>"
}
```

Sau khi AI trả về, generator cần normalize để thay các headline quá chung chung bằng fallback theo metadata thật.

### Bento cho phân tích, step cards cho hướng dẫn

Scene phân tích tính năng, rủi ro, use case hoặc checklist tổng quan có thể dùng bento.

Scene cài đặt, clone, cấu hình, deploy, quickstart hoặc lộ trình nên dùng:

```json
{
  "content_mode": "steps",
  "steps": [
    { "title": "Clone", "body": "Clone repo về project phụ." },
    { "title": "Cài deps", "body": "Dùng package manager được nêu trong README." },
    { "title": "Chạy thử", "body": "Chạy ví dụ nhỏ nhất trước khi tích hợp thật." }
  ]
}
```

Template nên đọc dữ liệu theo thứ tự ưu tiên:

1. `scene.steps`
2. `scene.cards`
3. `bento*_title` và `bento*_desc`

## Ràng buộc nội dung

| Field | Giới hạn đề xuất |
|---|---:|
| `headline_line1` | 16-20 ký tự |
| `headline_line2` | 24-32 ký tự |
| `bento*_title` | 10-14 ký tự |
| `bento*_desc` | 45-70 ký tự |
| `step.title` | 10-16 ký tự |
| `step.body` | 45-75 ký tự |
| `btn_text` | 30-42 ký tự tùy layout |

Nếu AI sinh quá dài, generator nên cắt mềm theo từ, ưu tiên giữ danh từ chính như repo name, image name, command, tag hoặc domain.

## Quy tắc chống bịa nội dung

Generator prompt cần nhấn mạnh:

- Không bịa port, env, API key, price, benchmark hoặc command nếu nguồn không nêu.
- Nếu README/Docker page thiếu lệnh cụ thể, dùng bước an toàn như `Đọc README`, `Kiểm tra release`, `Chạy demo nhỏ`.
- Với Docker image không rõ port/env, nói theo hướng kiểm tra docs thay vì gán mặc định `80:80` hoặc `latest`.
- Với GitHub repo, lệnh clone có thể tạo từ URL thật, nhưng lệnh install/run chỉ dùng nếu README có tín hiệu rõ.

## Checklist khi sửa tiếp

- Mỗi generator có normalize riêng cho headline, cards và steps.
- Template có helper `getSceneCards(scene, limit)`.
- Scene hướng dẫn không render bằng bento nếu `content_mode === "steps"`.
- Headline dùng font local có hỗ trợ tiếng Việt, line-height đủ rộng để không mất dấu.
- Test cần kiểm tra cả dữ liệu normalize và HTML render.

## Phạm vi chưa làm

Tài liệu này không thay thế kế hoạch thay template tổng thể. Nó chỉ mô tả contract nội dung động hiện tại và các quy tắc cần giữ khi mở rộng.
