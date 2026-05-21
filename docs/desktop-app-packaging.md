# Kế hoạch chuyển project thành app desktop

## Mục tiêu

Chuyển project hiện tại thành một ứng dụng desktop có thể mở bằng file `.exe`, giữ nguyên luồng tạo video từ URL sang MP4.

Giao diện đang có trong `public/index.html` chỉ nên xem là bản prototype để trực quan hóa workflow: nhập nhiều URL, xem queue, đọc log realtime và preview video. Khi đóng thành app, định hướng là **desktop-first**, không phải tiếp tục phát triển như một web app. Có thể tận dụng prototype này để thiết kế lại màn hình desktop, nhưng không nên để kiến trúc sản phẩm bị ràng buộc bởi cách chạy web dashboard hiện tại.

Hướng kỹ thuật phù hợp cho version đầu vẫn là **Electron**, không phải vì sản phẩm định hướng web, mà vì pipeline hiện tại phụ thuộc nhiều vào Node.js, process con, Puppeteer và CLI. Electron giúp bọc pipeline thành app desktop nhanh nhất, trong khi UI có thể được thiết kế lại như một giao diện desktop đúng nghĩa.

## Định hướng giao diện desktop

Giao diện web hiện tại chỉ là tài liệu tham chiếu cho trải nghiệm người dùng. Khi làm bản desktop, nên giữ các ý tưởng tốt nhưng thiết kế lại theo hướng app:

- Màn hình chính tập trung vào danh sách URL cần tạo video.
- Khu vực queue hiển thị trạng thái từng job: chờ, đang chạy, lỗi, hoàn thành.
- Log hệ thống là panel phụ, không phải trung tâm của giao diện.
- Video thành phẩm có preview, nút mở file và nút mở thư mục xuất.
- Có màn hình Settings để cấu hình output folder, FFmpeg, Tavily API key và các tuỳ chọn render.
- Có màn hình kiểm tra môi trường trước khi render để báo thiếu dependency rõ ràng.

Nói ngắn gọn: `public/index.html` giúp hiểu workflow, còn app desktop nên được thiết kế như một công cụ tạo video cục bộ, không phải một website được đóng khung lại.

## Hiện trạng project

Các phần chính đang có:

| Thành phần | Vai trò |
|---|---|
| `public/index.html` | Prototype giao diện để tham khảo workflow nhập URL, xem queue, log và preview |
| `pipeline/ui_server.js` | Server điều phối tạm thời cho prototype, nhận danh sách URL và chạy từng job |
| `pipeline/run_pipeline.js` | Entry point chạy toàn bộ pipeline tạo video |
| `pipeline/generate_repo_data.js` | Phân tích URL, gọi GitHub/Docker/Tavily, sinh JSON trong `data/` |
| `pipeline/capture_github.js` | Dùng Puppeteer chụp ảnh trang nguồn vào `assets/images/github_repo.png` |
| `pipeline/gen_assets.py` | Dùng `edge-tts`, `ffmpeg`, `ffprobe` để tạo voice-over và timing phụ đề |
| `pipeline/generate.mjs` | Đọc JSON + template, sinh `index.html` composition |
| `templates/` | Template HyperFrames cho GitHub, Docker và Web |
| `assets/` | Ảnh, character, nhạc nền, sound effect |
| `renders/` | Video MP4 thành phẩm |

Luồng prototype hiện tại:

```txt
public/index.html
  -> POST /api/generate
  -> pipeline/ui_server.js
  -> node pipeline/run_pipeline.js <url>
  -> generate_repo_data.js
  -> capture_github.js
  -> gen_assets.py
  -> generate.mjs
  -> npx hyperframes validate
  -> npm run render
  -> renders/<ten-video>.mp4
```

## Vì sao nên dùng Electron

Nên chọn Electron cho version đầu tiên vì project đã phụ thuộc mạnh vào Node.js, Puppeteer và các script CLI. Electron cho phép biến pipeline hiện tại thành app desktop nhanh hơn so với việc viết lại backend.

Điểm cần giữ rõ: Electron ở đây là lớp đóng gói desktop và điều phối runtime. Giao diện app không nhất thiết phải giữ nguyên `public/index.html`; file đó chỉ là bản tham chiếu để biết cần có những màn hình, trạng thái và thao tác nào.

Tauri nhẹ hơn, nhưng không phù hợp bằng ở giai đoạn này vì backend đang là Node pipeline và cần gọi nhiều process con. Nếu dùng Tauri, vẫn phải giữ Node sidecar hoặc viết lại backend sang Rust, làm tăng khối lượng chuyển đổi.

## Những việc cần làm

### 1. Tách pipeline core khỏi prototype UI

Không nên để app desktop phụ thuộc trực tiếp vào cách `pipeline/ui_server.js` phục vụ web prototype. Cần tách rõ hai lớp:

- Pipeline core: nhận URL, chạy các bước tạo video, trả trạng thái/log/output.
- UI adapter: web prototype, Electron renderer hoặc giao diện desktop sau này.

Hiện `pipeline/ui_server.js` tự listen cứng ở port `3001` và dùng `process.cwd()` làm thư mục gốc. Nếu vẫn dùng server nội bộ trong bản Electron MVP, cần chỉnh để có thể:

- Nhận port từ biến môi trường, ví dụ `PORT=0` để hệ điều hành tự cấp port trống.
- Export hàm `startServer({ rootDir, port })` hoặc tốt hơn là gọi một service pipeline chung.
- Vẫn hỗ trợ chạy độc lập bằng `npm run start`.
- Trả về URL thật sau khi server start, ví dụ `http://127.0.0.1:51234`.

File cần sửa:

```txt
pipeline/ui_server.js
```

Kết quả mong muốn:

```js
const server = await startServer({
  rootDir: appRoot,
  port: Number(process.env.PORT || 3001),
});
```

### 2. Thêm Electron main process

Tạo file main process để:

- Xác định thư mục app khi chạy dev và khi đã đóng gói.
- Khởi động pipeline service hoặc server nội bộ cho bản MVP.
- Tạo `BrowserWindow`.
- Load URL local của server.
- Chặn app thoát khi server chưa tắt sạch.
- Ghi log lỗi khởi động ra file để debug bản build.

File nên tạo:

```txt
desktop/main.js
```

Luồng khởi động:

```txt
Electron main
  -> resolve appRoot
  -> start pipeline service
  -> create BrowserWindow
  -> load desktop UI
```

Trong MVP, desktop UI có thể tạm load lại prototype hiện có. Sau đó nên thay bằng renderer được tổ chức riêng cho desktop, ví dụ `desktop/renderer/`, để tránh nhầm đây là một web product.

### 3. Thêm script desktop vào `package.json`

Cần thêm dependency và script:

```json
{
  "devDependencies": {
    "electron": "...",
    "electron-builder": "..."
  },
  "scripts": {
    "desktop": "electron .",
    "dist": "electron-builder --win"
  },
  "main": "desktop/main.js"
}
```

Nên cân nhắc đưa `hyperframes` vào dependency cố định thay vì gọi `npx --yes hyperframes@0.6.24` ở runtime. Lý do: bản desktop không nên phụ thuộc việc `npx` tải package từ mạng mỗi lần render.

### 4. Cố định cách gọi HyperFrames

Hiện `package.json` dùng:

```txt
npx --yes hyperframes@0.6.24 ...
```

Khi đóng app, nên đổi sang một trong hai cách:

1. Cài `hyperframes@0.6.24` vào dependency và gọi local binary trong `node_modules/.bin`.
2. Giữ CLI bên ngoài, nhưng yêu cầu người dùng cài Node/npm/npx sẵn trên máy.

Khuyến nghị: dùng cách 1 cho bản desktop thật sự.

File cần sửa:

```txt
package.json
pipeline/run_pipeline.js
```

### 5. Xử lý TTS và FFmpeg

Pipeline ban đầu phụ thuộc:

- Binary: `ffmpeg` và `ffprobe`.

Ở Giai đoạn 2, phần TTS đã được chuyển từ Python `edge_tts` sang Node package `node-edge-tts`. Điều này bỏ yêu cầu cài Python/module Python trên máy người dùng. TTS vẫn cần mạng vì Microsoft Edge TTS là dịch vụ online, nhưng không cần API key.

Có hai hướng đóng gói FFmpeg:

| Hướng | Ưu điểm | Nhược điểm |
|---|---|---|
| Yêu cầu người dùng cài FFmpeg | Dễ làm, ít thay đổi | Chưa phải app “mở là chạy” trên máy sạch |
| Bundle FFmpeg sidecar | Trải nghiệm tốt hơn | Build lớn hơn, cần cấu hình path runtime |

Khuyến nghị theo giai đoạn:

- MVP: kiểm tra và báo thiếu dependency rõ ràng trong UI.
- Giai đoạn 2: dùng Node TTS, cài HyperFrames local, đưa output vào workspace.
- Bản phát hành: bundle `ffmpeg`; `ffprobe` là optional vì app có fallback đọc duration qua `ffmpeg`.

Việc cần làm:

- Thêm màn hình hoặc API kiểm tra môi trường: Node, HyperFrames, `ffmpeg`, optional `ffprobe`.
- Khi thiếu dependency, hiển thị lỗi dễ hiểu thay vì chỉ đẩy log raw vào console.
- Cho phép cấu hình đường dẫn `ffmpeg` qua settings ở giai đoạn sau.

### 6. Chuyển các đường dẫn sang app data/workspace

Hiện project ghi trực tiếp vào:

```txt
data/
assets/audio/
assets/images/github_repo.png
index.html
renders/
```

Trong app desktop, không nên ghi vào thư mục đã đóng gói của ứng dụng vì thư mục cài đặt có thể read-only. Cần tách:

- App resources: template, public UI, assets gốc.
- Workspace người dùng: data sinh ra, audio tạm, screenshot, render output.

Trên Electron nên dùng:

```txt
app.getPath("userData")
```

Ví dụ workspace:

```txt
%APPDATA%/VNP HyperFrames/workspace/
  data/
  assets/audio/
  assets/images/
  renders/
  index.html
```

Cần sửa các script để nhận `WORKSPACE_DIR` hoặc `--workspace` thay vì luôn dùng `process.cwd()`.

### 7. Thiết kế lại queue và log cho desktop

Hiện `pipeline/ui_server.js` xử lý queue tuần tự trong memory để phục vụ prototype. Khi làm app desktop, nên đưa queue thành một phần của app logic và bổ sung:

- Trạng thái job rõ ràng: queued, running, done, error.
- Nút mở thư mục `renders`.
- Nút mở file video sau khi render xong.
- Lưu log job vào file trong workspace.
- Không dùng `Math.random()` cho job id nếu cần deterministic hoặc cần truy vết; có thể dùng timestamp + counter nội bộ.

File liên quan ở giai đoạn đầu:

```txt
pipeline/ui_server.js
public/index.html
desktop/renderer/   # tạo sau nếu tách UI desktop riêng
```

### 8. Đóng gói assets và thư mục cần đi kèm

Electron build cần include các thư mục:

```txt
public/
pipeline/
templates/
assets/
compositions/
hyperframes.json
meta.json
package.json
node_modules/
```

Không nên đóng gói các thư mục output lớn vào installer:

```txt
renders/
data/
assets/audio/
```

Các thư mục output nên được tạo trong workspace khi app chạy lần đầu.

### 9. Cấu hình build Windows

Với `electron-builder`, cấu hình tối thiểu trong `package.json`:

```json
{
  "build": {
    "appId": "vn.vnp.hyperframes",
    "productName": "VNP HyperFrames",
    "directories": {
      "output": "dist"
    },
    "files": [
      "desktop/**",
      "public/**",
      "pipeline/**",
      "templates/**",
      "assets/**",
      "compositions/**",
      "hyperframes.json",
      "meta.json",
      "package.json",
      "node_modules/**"
    ],
    "extraResources": [
      {
        "from": "assets",
        "to": "assets"
      }
    ],
    "win": {
      "target": "nsis"
    }
  }
}
```

Cần điều chỉnh sau khi quyết định có bundle Python/FFmpeg hay không.

### 10. Kiểm thử trước khi build

Trước khi build desktop:

```bash
npm run start
npm run check
node pipeline/run_pipeline.js https://github.com/heygen-com/hyperframes
```

Sau khi thêm Electron:

```bash
npm run desktop
```

Sau khi build:

```bash
npm run dist
```

Cần test ít nhất 3 loại URL:

- GitHub repo.
- Docker Hub image.
- Web URL thường.

Với mỗi case cần kiểm tra:

- JSON được sinh trong workspace.
- Screenshot được tạo.
- TTS chạy và có duration đúng.
- `index.html` composition được generate.
- HyperFrames validate không lỗi.
- MP4 xuất hiện trong `renders`.
- UI preview được video.
- App đóng/mở lại không mất file thành phẩm.

## Rủi ro cần xử lý

### Phụ thuộc mạng

Pipeline hiện cần mạng để:

- Gọi GitHub API.
- Gọi Docker Hub API.
- Mở URL nguồn để chụp ảnh.
- Gọi Tavily nếu có `TAVILY_API_KEY`.
- Dùng `edge-tts`.
- Có thể tải `hyperframes` qua `npx` nếu chưa cache.

Bản desktop không thể offline hoàn toàn nếu vẫn tạo video từ URL và dùng cloud TTS.

### Quyền ghi file

Nếu app ghi vào thư mục cài đặt, bản build có thể lỗi quyền ghi. Cần chuyển output sang workspace trong `userData`.

### Đường dẫn có dấu và khoảng trắng

Assets hiện có nhiều tên file tiếng Việt hoặc ký tự đặc biệt. Khi spawn process cần luôn truyền args dạng array, không ghép chuỗi command. Riêng `gen_assets.py` đang có đoạn gọi `ffprobe` bằng string + `shell=True`; nên đổi sang array để giảm lỗi quote path.

### Kích thước app

Electron + Chromium + Puppeteer + assets âm thanh/ảnh có thể làm installer rất lớn. Cần quyết định:

- Có bundle toàn bộ sound effect/background music không.
- Có tách asset pack tải riêng không.
- Có dọn các asset không dùng trước khi phát hành không.

## Lộ trình đề xuất

### Giai đoạn 1: Desktop MVP

- Thêm Electron main.
- Refactor `ui_server.js` để start được từ Electron.
- Giữ yêu cầu máy người dùng đã có Python, `edge_tts`, FFmpeg.
- Giữ output trong thư mục project hoặc workspace đơn giản.
- Build được `.exe` chạy trên máy dev.

### Giai đoạn 2: App desktop dùng được ổn định

- Chuyển toàn bộ output sang workspace trong `userData`.
- Cài `hyperframes` local, bỏ phụ thuộc `npx --yes` ở runtime.
- Thêm API kiểm tra môi trường.
- Thêm UI báo thiếu dependency.
- Lưu log job theo file.
- Thêm nút mở video và mở thư mục render.
- Thay `gen_assets.py` bằng `gen_assets.mjs` để bỏ phụ thuộc Python cho bước TTS.

### Giai đoạn 3: Bản phát hành cho người dùng khác

- Bundle FFmpeg/FFprobe.
- Quyết định có cần bundle FFmpeg sidecar hay bắt người dùng cài FFmpeg ngoài.
- Thêm installer NSIS.
- Thêm icon, app name, version.
- Ký code nếu phát hành rộng.
- Test trên máy sạch không có môi trường dev.

## Danh sách file dự kiến tạo/sửa

| File | Hành động | Ghi chú |
|---|---|---|
| `desktop/main.js` | Tạo mới | Electron main process |
| `pipeline/ui_server.js` | Sửa | Export `startServer`, nhận `rootDir` và `port` |
| `pipeline/run_pipeline.js` | Sửa | Nhận workspace, gọi HyperFrames local, log rõ hơn |
| `pipeline/gen_assets.mjs` | Tạo mới | Node TTS, timing phụ đề, bỏ phụ thuộc Python |
| `package.json` | Sửa | Thêm Electron scripts, dependency, build config |
| `public/index.html` | Tham khảo hoặc sửa tạm | Dùng làm prototype cho MVP, không phải định hướng UI cuối |
| `desktop/renderer/` | Tạo sau | Giao diện desktop thật nếu tách khỏi prototype web |
| `docs/desktop-app-packaging.md` | Tạo mới | Tài liệu kế hoạch chuyển desktop |

## Kết luận

Không cần viết lại project từ đầu. Hướng thực tế nhất là giữ pipeline đang có, dùng Electron làm lớp desktop wrapper/runtime, sau đó thiết kế lại UI theo hướng app desktop. Giao diện web hiện tại chỉ là prototype để nhìn workflow, không phải định hướng sản phẩm.

Điểm cần làm sớm nhất là refactor `pipeline/ui_server.js` và thêm `desktop/main.js`. Điểm khó nhất không nằm ở UI desktop, mà nằm ở việc đóng gói các phụ thuộc ngoài Node như Python, `edge_tts`, FFmpeg/FFprobe và HyperFrames CLI.

## Trạng thái hiện tại của desktop app

Tại ngày 2026-05-21, bản desktop đã có thể build thành installer Windows bằng Electron:

```bash
npm run dist
```

Installer được tạo trong `dist/`, ví dụ:

```txt
dist/VNP HyperFrames Setup 0.1.0.exe
```

Khi cài đặt, app chạy từ:

```txt
%LOCALAPPDATA%\Programs\my-video\resources\app
```

Workspace runtime của người dùng nằm tại:

```txt
%APPDATA%\my-video\workspace
```

Trong workspace này có `assets/`, `data/`, `renders/`, `logs/`, `vendor/` và `.puppeteer-cache/`. Video thành phẩm nằm trong `workspace\renders`.

Những điểm đã được đóng gói/tự động hóa:

- Node.js runtime riêng cho app.
- FFmpeg và FFprobe sidecar.
- HyperFrames package local.
- GSAP local tại `workspace\vendor\gsap.min.js`.
- Puppeteer browser runtime/cache tại `workspace\.puppeteer-cache`.
- Server nội bộ trong `desktop_app/ui_server.js`.
- Cấu hình env runtime đọc từ app bundled env và workspace env.

HyperFrames trong bản packaged phải được gọi bằng file CLI thật:

```txt
node_modules/hyperframes/dist/cli.js
```

Không dùng `node_modules\.bin\hyperframes.cmd` trong app đã cài, vì wrapper `.cmd` có thể trỏ sai đường dẫn trong `resources\app`.

Nếu cần bundle key AI để người dùng không phải nhập, đặt env riêng của app trong:

```txt
desktop_app/app.env
```

Key này sẽ đi kèm installer nếu `desktop_app/**` được khai báo trong `package.json` `build.files`. Nên dùng key riêng cho app, có quota/routing giới hạn và có khả năng thu hồi; không nên bundle key chính.

Phần bên trên là kế hoạch/thiết kế ban đầu và chỉ còn giá trị tham chiếu lịch sử. Khi có xung đột, ưu tiên mục "Trạng thái hiện tại của desktop app" này.

## Quy trình đóng gói bản gửi người dùng

Chỉ build installer trên máy của người làm app, nơi có đầy đủ dependency và file cấu hình runtime cần bundle.

1. Cài dependency:

```bash
npm install
```

2. Chuẩn bị key runtime nếu muốn người dùng không phải nhập key:

```txt
desktop_app/app.env
```

`desktop_app/app.env` là file local, không commit lên Git. File này có thể chứa `OPENROUTER_API_KEY`, `OPENAI_API_KEY`, `TAVILY_API_KEY` hoặc các biến runtime khác. Nên dùng key riêng cho app, có quota/routing giới hạn và có thể thu hồi.

3. Build installer:

```bash
npm run dist
```

4. Gửi cho người dùng file:

```txt
dist\VNP HyperFrames Setup 0.1.0.exe
```

Không cần nén `.rar` nếu chỉ mục tiêu là gửi app để cài và chạy. Không gửi kèm `.env`, `desktop_app/app.env`, source repo, `node_modules` hay `dist\win-unpacked`. Các phần cần thiết đã được đóng vào installer.

Installer hiện đóng gói:

- `desktop_app/**`: Electron main, UI server, workspace/runtime helpers và env bundled nếu có `desktop_app/app.env`.
- `pipeline/**`: toàn bộ luồng phân tích URL, sinh JSON, TTS, generate HTML, validate và render.
- `public/**`: giao diện desktop/web prototype đang được Electron load.
- `templates/**`: template G1 GitHub, G2 Docker, G3 Web.
- `assets/**`, `compositions/**`, `hyperframes.json`, `meta.json`.
- Dependency runtime trong `node_modules` theo `package.json`, gồm `node`, `hyperframes`, `ffmpeg-static`, `ffprobe-static`, `puppeteer`, `gsap`, `openai`, `node-edge-tts`.

Các đường dẫn quan trọng sau khi cài:

```txt
App root: %LOCALAPPDATA%\Programs\my-video\resources\app
Workspace: %APPDATA%\my-video\workspace
Output video: %APPDATA%\my-video\workspace\renders
Log job: %APPDATA%\my-video\workspace\logs
Browser cache: %APPDATA%\my-video\workspace\.puppeteer-cache
```

Các lỗi dễ nhầm:

- `Runtime: Missing runtime`: thường là app đang chạy bản cũ hoặc kiểm runtime theo đường dẫn cũ. Bản mới kiểm HyperFrames tại `node_modules\hyperframes\dist\cli.js`.
- `HyperFrames CLI: Cài hyperframes local trong project`: không nên xuất hiện với installer mới nếu `node_modules\hyperframes\dist\cli.js` đã được đóng gói.
- AI trả thiếu số cảnh: bản mới có schema GitHub đủ 8 cảnh và có bước chuẩn hóa để tránh chết pipeline khi AI trả thiếu cảnh.
