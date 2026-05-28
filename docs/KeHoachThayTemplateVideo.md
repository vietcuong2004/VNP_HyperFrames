# Legacy: thay template video cố định

Tài liệu này được giữ lại như ghi chú lịch sử. Hướng "thay template G1/G2/G3 bằng nhiều variant template" không còn là hướng chính.

Hướng hiện tại:

- Không tiếp tục mở rộng template cố định theo group.
- AI sinh scene HTML trực tiếp qua `agents/scene/generate.js`.
- Code chỉ giữ các guardrail: asset routing, visual brief validation, HyperFrames validation, auto-fix và fallback.
- Nếu cần fallback, fallback phải bám theo `visual_brief`/`layout_intent`, không bám theo template mẫu có sẵn.

Tài liệu cần đọc trước khi phát triển tiếp:

- `docs/KeHoachPhatTrien.md`
- `docs/KeHoachNoiDungVideoDong.md`
- `docs/pipeline-flow.md`

## Bài học vẫn còn đúng

Một số nguyên tắc trong kế hoạch cũ vẫn dùng được:

- Không để video nào lặp lại text mẫu như `Infinite Possibilities`, `Automated Screenshots`, `Start Generating Today`.
- Scene hướng dẫn nên hiện steps/commands, không ép vào bento card chung chung.
- Text hiển thị phải ngắn, rõ, bám vào nguồn thật.
- Không để AI trả về component tùy ý rồi render trực tiếp nếu chưa validate.

## Điểm khác với hướng mới

Trước đây:

```txt
URL -> classify G1/G2/G3 -> template variant -> fill content
```

Bây giờ:

```txt
URL/topic -> script agent -> visual planner -> scene HTML agent -> validator/autofix -> fallback nếu cần
```

Công việc tiếp theo không phải tạo thêm template, mà là tạo `visual_brief` đủ rõ để scene HTML agent không sinh các label vô nghĩa như `HTML`, `Scene 1`, `Focus`.
