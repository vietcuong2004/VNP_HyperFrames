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

Hiện tại `visual` vẫn là text brief tự do, chưa phải contract chặt. Đây là điểm cần nâng cấp tiếp thành `visual_brief`.

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

## 4. Scene HTML generation

`agents/scene/generate.js` tạo prompt HyperFrames và gọi AI sinh HTML từng scene.

Prompt hiện có đã có guard:

- Không copy nguyên câu voice/SRT vào main content.
- Main content nên dùng visual copy block.
- Không dùng `drawSVG`.
- Asset trong scene HTML phải dùng path tương đối hợp lệ.

Cần nâng cấp tiếp: chèn `visual_brief` có schema vào prompt, thay vì đưa `visual` tự do.

## 5. Validation và auto-fix

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

## 6. Local fallback

`pipeline/localFallbackGenerator.js` chỉ là fallback an toàn, không phải hướng sản phẩm cuối.

Fallback hiện tại:

- Lấy text ngắn từ `[TEXT]` trong visual nếu có.
- Không dùng các title cũ như `Infinite Possibilities`, `Automated Screenshots`.
- Không lấy nguyên voice làm card/title.
- Scene screenshot chỉ dùng `github_repo.png`.

Cần nâng cấp tiếp: fallback render theo `layout_intent` từ `visual_brief`.

## 7. Lắp composition tổng

Pipeline ghi:

- `compositions/scene_<n>.html`
- `compositions/thumbnail.html`
- `index.html`
- template snapshot trong `templates/<safe-topic>/<timestamp>/`
- script data trong `data/`

Lưu ý: các file này là output của mỗi lần gen, không nên xem là source chính khi phát triển.

## 8. Validate và render

Pipeline chạy HyperFrames local:

```bash
npx hyperframes validate
npx hyperframes render --workers=2
```

Trong code packaged, pipeline gọi file CLI trong `node_modules/hyperframes/dist/cli.js`.

`npm run check` hiện quét cả nhiều composition cũ trong repo, nên có thể fail vì lint legacy. Khi debug pipeline runtime, ưu tiên xem output của `hyperframes validate` trong Step 6.

## Hướng tiếp theo

Việc cần làm tiếp không phải thêm template, mà là thêm Visual Planner:

```txt
script scene -> visual planner -> visual_brief validator -> scene HTML agent
```

Mục tiêu là để phần nội dung giữa video có nghĩa với người xem lần đầu, không còn label rỗng nghĩa như `HTML`, `Scene 1`, `Focus`.
