# Kế hoạch phát triển hiện tại

Tài liệu này thay thế các bản kế hoạch cũ dựa trên template cố định G1/G2/G3. Hướng mới của dự án là pipeline agentic: AI sinh kịch bản, voice, phụ đề, scene HTML, thumbnail và một phần art direction; code giữ vai trò guardrail, validation, asset routing và fallback an toàn.

## Trạng thái hiện tại

Pipeline chính nằm ở `pipeline/run_agent_pipeline.js`.

Luồng hiện tại đã có các phần sau:

- Lấy URL/topic, trích metadata cơ bản và chụp screenshot nguồn vào `assets/images/github_repo.png`.
- Sinh script JSON bằng `agents/scriptAgent.js`.
- Sinh TTS bằng LarVoice nếu có key, hoặc Edge TTS Node fallback.
- Tạo SRT/transcript, gắn timing vào từng scene.
- Tạo `visual_brief` bước đầu bằng `agents/scene/visualPlanner.js`.
- Gọi `agents/scene/generate.js` để AI sinh HTML cho từng scene dựa trên visual copy block đã chuẩn hóa.
- Auto-fix một số lỗi render phổ biến trong `agents/scene/htmlValidator.js`.
- Nếu AI fail hoặc scene vi phạm rule quan trọng, fallback sang `pipeline/localFallbackGenerator.js`.
- Lắp `index.html`, validate bằng HyperFrames, render MP4.

Đã sửa gần đây:

- Không fallback ảnh tùy tiện khi scene cần chụp/scroll trang nguồn. Scene cần screenshot chỉ nhận screenshot nguồn và logo.
- Không để AI/fallback copy nguyên câu voice vào hero/card/title. Voice chỉ dùng cho narration/subtitle.
- Thêm Visual Planner deterministic để tạo `primary_text`, `secondary_labels`, `facts`, `layout_intent` và loại các nhãn rỗng nghĩa như `HTML`, `Scene 1`, `Focus`.
- Intro fallback không còn hiện `HTML -> VIDEO`; nội dung chính ưu tiên tên repo/domain, metric, keyword hoặc command thật.
- Lọc mô tả art direction như `gradient xanh`, `[ENVIRONMENT]`, `[MOTION]`, `3 lớp depth` để chúng không lọt thành text giữa video.
- Tự động sửa path asset trong scene HTML: `./assets/...` -> `../assets/...`.
- Tự động loại `drawSVG`, vì DrawSVGPlugin không có trong runtime.
- TTS Edge fallback không phụ thuộc Python `edge_tts`.

## Vấn đề còn lại

Phần nội dung chính giữa video đã bớt hardcode, nhưng vẫn chưa phải sản phẩm cuối. Bản Visual Planner hiện tại là deterministic guardrail, chưa phải agent AI có schema đầy đủ. Vì vậy một số scene vẫn có thể đúng về mặt kỹ thuật nhưng chưa đủ hay hoặc chưa giải thích được nội dung theo cách người xem lần đầu hiểu ngay.

Không nên sửa việc này bằng cách thêm template cố định. Hướng đúng là biến `visual_brief` thành contract chính thức, sau đó để AI chỉ render theo contract đó.

## Kiến trúc mục tiêu

### 1. Tách Scene Brief khỏi Voice

Mỗi scene cần có hai nhóm dữ liệu riêng:

```json
{
  "voice": "Lời đọc tự nhiên cho người xem.",
  "visual_brief": {
    "scene_goal": "explain_value",
    "layout_intent": "metric_cards",
    "main_subject": "RTK CLI proxy",
    "primary_text": "TOKEN CUT 60-90%",
    "secondary_labels": ["Rust binary", "Local proxy", "Cache"],
    "facts": ["reduces LLM token consumption by 60-90%"],
    "avoid_text": ["HTML", "Scene 1", "Infinite possibilities"]
  }
}
```

`voice` không được dùng làm nguồn text chính. `visual_brief` mới là nguồn cho title, cards, badge, number, command block và diagram label.

### 2. Nâng Visual Planner thành agent có schema

Bản hiện tại trong `agents/scene/visualPlanner.js` đã tạo brief bằng rule deterministic. Bước tiếp theo là thêm agent AI trước `generateSceneHTML`:

```txt
script scene -> deterministic context -> AI visual planner -> validated visual brief -> HTML scene generator
```

Visual Planner nên nhận topic, metadata, scene voice, screenshot context và trả về JSON ngắn gọn:

- `scene_goal`: hook, explain, compare, demo, warning, outro.
- `layout_intent`: browser_scroll, terminal_steps, architecture_map, metric_cards, checklist.
- `primary_text`: text lớn nhất trên màn hình.
- `supporting_text`: tối đa 3-5 label ngắn.
- `visual_objects`: các đối tượng nên vẽ bằng HTML/CSS/SVG.
- `asset_requirements`: screenshot, logo, character, none.

### 3. Validate Visual Brief trước khi generate HTML

Guard cần giữ và mở rộng:

- `primary_text` không được là `HTML`, `Scene 1`, `Focus`, `Module`, `Overview` nếu không có ngữ cảnh rõ.
- Không copy 5+ từ liên tiếp từ `voice`.
- Không dùng mô tả art direction làm nội dung chính.
- Phải có ít nhất một danh từ riêng hoặc keyword lấy từ URL/source: repo name, image name, domain, product, command, metric.
- Nếu scene là browser/scroll, asset screenshot là bắt buộc.

Nếu brief fail, regenerate brief hoặc fallback bằng rule deterministic.

### 4. HTML Generator chỉ render theo Visual Brief

Prompt HTML nên giảm phụ thuộc vào `voice`. Nó chỉ được dùng:

- `visual_brief`
- `srt/beat timeline` để căn animation timing
- `projectAssets`
- style guide và HyperFrames rules

`voice` chỉ nên đưa vào prompt như cảnh báo: "do not copy this narration into main content".

### 5. Fallback cũng phải là dynamic visual fallback

Fallback hiện tại đã dùng `visual_brief` và đã bỏ nhiều copy cũ. Bước tiếp theo là tách renderer theo `layout_intent`:

- `browser_scroll`: screenshot lớn + 2-3 callout label.
- `terminal_steps`: command/step cards.
- `architecture_map`: node/link diagram.
- `metric_cards`: cards với number/keyword rõ.
- `checklist`: next actions/warnings.

Fallback không cần đẹp như AI, nhưng phải để người xem hiểu nội dung.

## Thứ tự ưu tiên tiếp theo

1. Biến `visual_brief` thành schema chính thức và lưu vào script data để debug được từng scene.
2. Thêm AI Visual Planner, nhưng giữ deterministic planner làm fallback.
3. Sửa prompt `generateSceneHTML` để HTML agent chỉ render từ `visual_brief`, không tự bốc text từ `voice`.
4. Tách fallback renderer theo `layout_intent`.
5. Thêm test snapshot cho các URL đã gặp lỗi: `rtk-ai/rtk`, GitHub repo, Docker Hub, web docs.
6. Chỉ sau khi visual brief ổn định mới refresh thiết kế animation/style.

## Tiêu chí hoàn thành gần nhất

- Video của `https://github.com/rtk-ai/rtk` phải có text giữa màn hình dễ hiểu với người xem lần đầu, ví dụ `TOKEN CUT 60-90%`, `Rust CLI proxy`, `Local cache`.
- Không scene nào hiện text chung chung như `HTML`, `Scene 1`, `Module`, `Focus` nếu không có bối cảnh.
- Không hero/card/title nào copy nguyên câu voice.
- Không để mô tả thiết kế như `gradient xanh`, `3 lớp depth`, `environment`, `motion` xuất hiện như nội dung chính.
- Scene browser/scroll dùng screenshot nguồn thật, không dùng ảnh asset có sẵn.
- `npx hyperframes validate` không có console error.
