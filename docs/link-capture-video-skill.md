# Skill: Chụp Ảnh Và Quay Video Khi Mở Link

## Mục tiêu

Skill này chỉ tập trung vào việc mở một link công nghệ trong trình duyệt, chụp ảnh màn hình hoặc quay lại phần hiển thị cần dùng làm asset cho video. Tài liệu này không quyết định link đó thuộc loại tool, library, curated list hay Docker image; phần phân tích nội dung nằm ở tài liệu khác.

Đầu vào:

- Một URL GitHub, Docker Hub, trang docs, landing page sản phẩm hoặc bài viết kỹ thuật.

Đầu ra:

- Ảnh chụp màn hình sạch trong `assets/images/`.
- Video quay màn hình ngắn trong `assets/videos/` nếu cần.
- Metadata mô tả asset: URL nguồn, vùng chụp, kích thước viewport, thời điểm chụp, mục đích sử dụng.

## Nguyên tắc chung

1. Luôn mở link trong trình duyệt headless bằng viewport cố định để kết quả lặp lại được.
2. Ưu tiên chụp phần nội dung chính, không để banner cookie, footer, header sticky hoặc popup che mất nội dung.
3. Chụp ảnh theo đúng mục đích scene: hero repo, README, bảng tag, command install, Docker tag, trang docs.
4. Nếu cần quay video, chỉ quay đoạn có chuyển động hoặc thao tác thật sự có ích: scroll README, hover tag, mở tab docs, chuyển tag Docker.
5. Không dùng `Date.now()`, random hoặc thao tác không ổn định trong composition. Nếu cần nhiều khung hình, đặt thứ tự file rõ ràng.

## Loại asset nên tạo

### 1. Ảnh overview

Dùng cho cảnh mở đầu.

Ví dụ:

- Trang GitHub repo ở đầu trang.
- Docker Hub image overview.
- Trang docs hoặc landing page công cụ.

Tên file gợi ý:

```txt
assets/images/source_overview.png
```

### 2. Ảnh chi tiết README hoặc docs

Dùng cho cảnh phân tích nội dung.

Ví dụ:

- README section `Installation`.
- README section `Usage`.
- Mục lục của `awesome-*`.
- Docker image tag list.
- Ví dụ `docker run`.

Tên file gợi ý:

```txt
assets/images/source_readme_section.png
assets/images/source_install_section.png
assets/images/source_tags.png
```

### 3. Video scroll ngắn

Dùng khi muốn tạo cảm giác đang duyệt thật.

Ví dụ:

- Scroll từ đầu README xuống mục chính.
- Scroll qua danh sách tài nguyên của repo `awesome-*`.
- Scroll qua Docker tags.

Tên file gợi ý:

```txt
assets/videos/source_scroll.mp4
```

### 4. Video thao tác ngắn

Dùng khi có tương tác đáng xem.

Ví dụ:

- Click tab `Tags` trên Docker Hub.
- Mở dropdown release/tag.
- Highlight command trong README.

Tên file gợi ý:

```txt
assets/videos/source_interaction.mp4
```

## Viewport chuẩn

Viewport mặc định cho asset dọc:

```txt
width: 640
height: 3800
deviceScaleFactor: 2
```

Lý do:

- Phù hợp để crop vào video dọc 1080x1920.
- Chữ GitHub/Docker vẫn đủ nét khi zoom.
- Có thể chụp một vùng dài của README mà không cần ghép ảnh.

Viewport thay thế cho asset ngang:

```txt
width: 1440
height: 1200
deviceScaleFactor: 1.5
```

Dùng khi scene cần hiển thị layout desktop, bảng nhiều cột hoặc dashboard.

## Quy trình chụp ảnh

1. Mở URL bằng Puppeteer.
2. Đặt viewport cố định.
3. Đặt user agent ổn định.
4. Bật dark mode nếu trang hỗ trợ và phù hợp với video.
5. Chờ `networkidle2`.
6. Ẩn các thành phần gây nhiễu: header, footer, banner, cookie popup, signup banner.
7. Chờ thêm một khoảng ngắn để font và layout ổn định.
8. Chụp ảnh.
9. Lưu file vào `assets/images/`.

## Quy trình quay video

1. Mở URL bằng Puppeteer.
2. Đặt viewport cố định.
3. Chờ trang ổn định.
4. Bắt đầu ghi màn hình.
5. Thực hiện thao tác deterministic:
   - Scroll theo số pixel cố định.
   - Click selector cụ thể.
   - Chờ số mili giây cố định.
6. Dừng ghi.
7. Lưu file vào `assets/videos/`.
8. Nếu cần, dùng `ffmpeg` để cắt ngắn, đổi fps hoặc tối ưu kích thước.

## Quy tắc cho GitHub

### Repo tool / app / CLI

Ảnh nên chụp:

- Đầu trang repo.
- README phần `Installation`.
- README phần `Usage` hoặc `Quick Start`.
- Nếu có ảnh demo trong README, chụp vùng đó riêng.

Video nên quay:

- Scroll từ mô tả repo xuống quick start.
- Highlight command cài đặt nếu có.

### Repo curated / awesome list

Ảnh nên chụp:

- Đầu trang repo để thấy tên và mô tả.
- Mục lục README.
- Các nhóm tài nguyên lớn.

Video nên quay:

- Scroll qua mục lục hoặc danh sách tài nguyên để thể hiện đây là hub tổng hợp.

Không nên:

- Quay cảnh clone repo làm trọng tâm.
- Chỉ chụp stars rồi coi đó là nội dung chính.

### Repo library / framework

Ảnh nên chụp:

- README phần install.
- Ví dụ API ngắn nhất.
- Bảng compatibility hoặc framework support nếu có.

Video nên quay:

- Scroll từ install sang code example.

## Quy tắc cho Docker Hub / Docker.io

Ảnh nên chụp:

- Overview image.
- Tag list.
- Pull command.
- README phần env, port, volume nếu có.

Video nên quay:

- Chuyển từ overview sang tags.
- Scroll qua phần quick start hoặc compose example.

Không nên:

- Chỉ chụp logo Docker mà không có tag/command.
- Dùng `latest` như khuyến nghị production nếu docs không nói rõ.

## Metadata asset

Mỗi lần chụp hoặc quay nên ghi metadata dạng JSON để dễ debug:

```json
{
  "source_url": "https://github.com/keon/awesome-nlp",
  "platform": "github",
  "asset_type": "screenshot",
  "purpose": "readme_overview",
  "path": "assets/images/source_overview.png",
  "viewport": {
    "width": 640,
    "height": 3800,
    "deviceScaleFactor": 2
  },
  "notes": "Đã ẩn header, footer và banner trước khi chụp."
}
```

## Tên file ổn định

Nên dùng tên file ổn định để template không phải đổi nhiều:

```txt
assets/images/github_repo.png
assets/images/source_overview.png
assets/images/source_detail.png
assets/videos/source_scroll.mp4
```

Nếu cùng một pipeline chỉ dùng một ảnh chính, có thể tiếp tục ghi vào:

```txt
assets/images/github_repo.png
```

Tên này đang được template hiện tại sử dụng.

## Kiểm tra sau khi tạo asset

Sau khi chụp hoặc quay:

1. Mở file asset để kiểm tra không bị trắng.
2. Kiểm tra chữ chính có đọc được khi đưa vào khung video dọc.
3. Kiểm tra không có popup, banner hoặc header che nội dung.
4. Kiểm tra file nằm đúng thư mục.
5. Nếu dùng trong composition, chạy preview trước khi render.

## Khi nào cần quay video thay vì chụp ảnh

Chỉ quay video khi chuyển động giúp người xem hiểu tốt hơn:

- README rất dài và cần thể hiện sự phong phú.
- Docker tags nhiều và cần lướt qua nhanh.
- Trang có demo tương tác rõ ràng.
- Cần hiệu ứng browser scroll tự nhiên trong scene mở đầu.

Nếu ảnh tĩnh đã đủ rõ, ưu tiên ảnh tĩnh để render ổn định và nhẹ hơn.
