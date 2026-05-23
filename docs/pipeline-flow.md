# Pipeline flow hien tai

Entry point chinh:

```bash
npm run start
```

UI desktop/server goi pipeline:

```bash
node pipeline/run_agent_pipeline.js <url-or-topic>
```

## Tong quan

```txt
URL/topic
  -> fetch metadata + screenshot
  -> ScriptAgent sinh JSON scenes
  -> TTS + SRT/transcript
  -> Scene HTML Agent sinh tung composition
  -> htmlValidator auto-fix + strict checks
  -> local fallback neu AI fail
  -> lap index.html
  -> hyperframes validate
  -> hyperframes render
  -> doi ten MP4
```

## 1. Input va source context

`pipeline/run_agent_pipeline.js` nhan URL hoac topic.

Neu la URL:

- Lay `<title>` va meta description.
- Chup screenshot bang `pipeline/capture_github.js`.
- Luu screenshot vao `assets/images/github_repo.png`.
- Them screenshot vao `projectAssets`.

Quy tac quan trong: scene can browser/screenshot/scroll chi duoc nhan screenshot nguon va logo, khong duoc dung anh bat ky trong `assets/images`.

## 2. Script generation

`agents/scriptAgent.js` sinh script JSON gom cac scene:

- `stt`
- `voice`
- `visual`
- thumbnail metadata

Hien tai `visual` van la text brief tu do, chua phai contract chat. Day la diem can nang cap tiep thanh `visual_brief`.

## 3. TTS va subtitle

`agents/ttsAgent.js` chon provider:

- LarVoice neu co `LARVOICE_API_KEY` va `USE_LARVOICE` khong phai `false`.
- Edge TTS Node fallback neu khong dung LarVoice.
- Google Translate TTS fallback neu Edge TTS loi.

Pipeline tao SRT/transcript, gan vao tung scene:

- `audio_start`
- `audio_duration`
- `audio_path`
- `duration`
- `srt`
- `transcript`

## 4. Scene HTML generation

`agents/scene/generate.js` tao prompt HyperFrames va goi AI sinh HTML tung scene.

Prompt hien co da co guard:

- Khong copy nguyen cau voice/SRT vao main content.
- Main content nen dung visual copy block.
- Khong dung `drawSVG`.
- Asset trong scene HTML phai dung path tuong doi hop le.

Can nang cap tiep: chen `visual_brief` co schema vao prompt, thay vi dua `visual` tu do.

## 5. Validation va auto-fix

`agents/scene/htmlValidator.js` xu ly:

- Thieu `window.__timelines`.
- Thieu `paused: true`.
- `repeat:-1`.
- Path sai trong scene: `./assets/...` -> `../assets/...`.
- `drawSVG` unsupported.
- Voice leak trong main visual DOM.

`pipeline/run_agent_pipeline.js` co strict checks:

- Logo phai co.
- Scene can screenshot phai dung `../assets/images/github_repo.png`.
- Khong con copy fallback cu.
- Khong leak voice vao hero/card/title.

Neu AI HTML fail, pipeline thu goi `editSceneHTML`. Neu van fail, dung `generateLocalFallbackHTML`.

## 6. Local fallback

`pipeline/localFallbackGenerator.js` chi la fallback an toan, khong phai huong san pham cuoi.

Fallback hien tai:

- Lay text ngan tu `[TEXT]` trong visual neu co.
- Khong dung cac title cu nhu `Infinite Possibilities`, `Automated Screenshots`.
- Khong lay nguyen voice lam card/title.
- Scene screenshot chi dung `github_repo.png`.

Can nang cap tiep: fallback render theo `layout_intent` tu `visual_brief`.

## 7. Lap composition tong

Pipeline ghi:

- `compositions/scene_<n>.html`
- `compositions/thumbnail.html`
- `index.html`
- template snapshot trong `templates/<safe-topic>/<timestamp>/`
- script data trong `data/`

Luu y: cac file nay la output cua moi lan gen, khong nen xem la source chinh khi phat trien.

## 8. Validate va render

Pipeline chay HyperFrames local:

```bash
npx hyperframes validate
npx hyperframes render --workers=2
```

Trong code packaged, pipeline goi file CLI trong `node_modules/hyperframes/dist/cli.js`.

`npm run check` hien quet ca nhieu composition cu trong repo, nen co the fail vi lint legacy. Khi debug pipeline runtime, uu tien xem output cua `hyperframes validate` trong Step 6.

## Huong tiep theo

Viec can lam tiep khong phai them template, ma la them Visual Planner:

```txt
script scene -> visual planner -> visual_brief validator -> scene HTML agent
```

Muc tieu la de phan noi dung giua video co nghia voi nguoi xem lan dau, khong con label rong nghia nhu `HTML`, `Scene 1`, `Focus`.
