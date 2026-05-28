# Luồng pipeline hiện tại

Entry point chính:

```bash
npm run start
```

UI desktop/server gọi pipeline:

```bash
node pipeline/run_agent_pipeline.js <url-or-topic>
```

## Tổng quan

```txt
URL/topic
  -> fetch metadata + screenshot
  -> ScriptAgent sinh JSON scenes
  -> TTS + SRT/transcript
  -> Visual Planner tạo visual_brief
  -> Scene HTML Agent sinh từng composition
  -> htmlValidator auto-fix + strict checks
  -> local fallback nếu AI fail
  -> lắp index.html
  -> hyperframes validate
  -> hyperframes render
  -> đổi tên MP4
```

## 1. Input và source context

`pipeline/run_agent_pipeline.js` nhận URL hoặc topic.

Nếu là URL:

- Lấy `<title>` và meta description.
- Chụp screenshot bằng `pipeline/capture_github.js`.
- Lưu screenshot vào `assets/images/github_repo.png`.
- Thêm screenshot vào `projectAssets`.

Quy tắc quan trọng: scene cần browser/screenshot/scroll chỉ được nhận screenshot nguồn và logo, không được dùng ảnh bất kỳ trong `assets/images`.

## 2. Script generation

`agents/scriptAgent.js` sinh script JSON gồm các scene:

- `stt`
- `voice`
- `visual`
- thumbnail metadata

`visual` vẫn là text brief tự do. Pipeline sẽ chuẩn hóa nó thành `visual_brief` ở bước sau.

## 3. TTS và subtitle

`agents/ttsAgent.js` chọn provider:

- LarVoice nếu có `LARVOICE_API_KEY` và `USE_LARVOICE` không phải `false`.
- Edge TTS Node fallback nếu không dùng LarVoice.
- Google Translate TTS fallback nếu Edge TTS lỗi.

Pipeline tạo SRT/transcript, gắn vào từng scene:

- `audio_start`
- `audio_duration`
- `audio_path`
- `duration`
- `srt`
- `transcript`

## 4. Visual Planner

`agents/scene/visualPlanner.js` tạo `visual_brief` trước khi sinh HTML.

Vai trò hiện tại:

- Tách nội dung được phép hiện trên màn hình khỏi `voice`.
- Chọn `layout_intent` ban đầu: `browser_scroll`, `terminal_steps`, `architecture_map`, `metric_cards`, `feature_cards`, `checklist`.
- Tạo `primary_text`, `secondary_labels`, `facts`, `main_subject`.
- Loại text yếu như `HTML`, `Scene 1`, `Focus`.
- Loại mô tả art direction như `gradient xanh`, `[ENVIRONMENT]`, `[MOTION]`.

Trong `pipeline/run_agent_pipeline.js`, mỗi scene được gắn `scene.visual_brief` trước khi chọn asset và gọi scene generator.

## 5. Scene HTML generation

`agents/scene/generate.js` tạo prompt HyperFrames và gọi AI sinh HTML từng scene.

Prompt hiện có guard:

- Main content phải dựa trên visual copy block từ `visual_brief`.
- Không copy nguyên câu voice/SRT vào main content.
- Không dùng `drawSVG`.
- Asset trong scene HTML phải dùng path tương đối hợp lệ.

Cần nâng cấp tiếp: chuyển `visual_brief` thành schema nghiêm ngặt hơn và giảm thêm phần prompt tự do.

## 6. Validation và auto-fix

`agents/scene/htmlValidator.js` xử lý:

- Thiếu `window.__timelines`.
- Thiếu `paused: true`.
- `repeat:-1`.
- Path sai trong scene: `./assets/...` -> `../assets/...`.
- `drawSVG` unsupported.
- Voice leak trong main visual DOM.

`pipeline/run_agent_pipeline.js` có strict checks:

- Logo phải có.
- Scene cần screenshot phải dùng `../assets/images/github_repo.png`.
- Không còn copy fallback cũ.
- Không leak voice vào hero/card/title.

Nếu AI HTML fail, pipeline thử gọi `editSceneHTML`. Nếu vẫn fail, dùng `generateLocalFallbackHTML`.

## 7. Local fallback

`pipeline/localFallbackGenerator.js` là fallback an toàn, không phải hướng sản phẩm cuối.

Fallback hiện tại:

- Dùng `visual_brief` nếu có.
- Không dùng các title cũ như `Infinite Possibilities`, `Automated Screenshots`, `HTML -> VIDEO`.
- Không lấy nguyên voice làm card/title.
- Không biến mô tả thiết kế thành nội dung chính.
- Scene screenshot chỉ dùng `github_repo.png`.

Cần nâng cấp tiếp: fallback render theo `layout_intent` thay vì một bộ layout generic.

## 8. Lắp composition tổng

Pipeline ghi:

- `compositions/scene_<n>.html`
- `compositions/thumbnail.html`
- `index.html`
- template snapshot trong `templates/<safe-topic>/<timestamp>/`
- script data trong `data/`

Lưu ý: các file này là output của mỗi lần gen, không nên xem là source chính khi phát triển.

## 9. Validate và render

Pipeline chạy HyperFrames local:

```bash
npx hyperframes validate
npx hyperframes render --workers=2
```

Trong code packaged, pipeline gọi file CLI trong `node_modules/hyperframes/dist/cli.js`.

`npm run check` hiện quét cả nhiều composition cũ trong repo, nên có thể fail vì lint legacy. Khi debug pipeline runtime, ưu tiên xem output của `hyperframes validate` trong Step 6.

## Hướng tiếp theo

Việc cần làm tiếp không phải thêm template, mà là làm `visual_brief` mạnh hơn:

```txt
script scene -> deterministic visual planner -> AI visual planner -> visual_brief validator -> scene HTML agent
```

Mục tiêu là để phần nội dung giữa video có nghĩa với người xem lần đầu, không còn label rỗng nghĩa như `HTML`, `Scene 1`, `Focus`, và không để mô tả giao diện như `gradient xanh` lọt thành nội dung.
