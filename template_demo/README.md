# Template Demo Preview

Folder này dùng để xem nhanh tất cả template mà không cần gen nội dung bằng AI và không cần render MP4.

## Chuẩn bị data demo

```powershell
node template_demo/write-demo-data.mjs
```

Lệnh này tạo 9 file JSON trong `template_demo/data/`:

- `G1_github-template1.json`
- `G1_github-template2.json`
- `G1_github-template3.json`
- `G2_docker-template1.json`
- `G2_docker-template2.json`
- `G2_docker-template3.json`
- `G3_web-template1.json`
- `G3_web-template2.json`
- `G3_web-template3.json`

## Xem một template

Ví dụ xem `G1_github/template1`:

```powershell
node template_demo/preview-template.mjs G1_github template1
npm run dev
```

Sau đó mở URL mà HyperFrames in ra. Khi muốn đổi template, giữ dev server đang chạy, mở terminal khác và chạy:

```powershell
node template_demo/preview-template.mjs G1_github template2
```

Rồi refresh preview.

## Xem lần lượt tất cả template

```powershell
node template_demo/preview-template.mjs G1_github template1
node template_demo/preview-template.mjs G1_github template2
node template_demo/preview-template.mjs G1_github template3

node template_demo/preview-template.mjs G2_docker template1
node template_demo/preview-template.mjs G2_docker template2
node template_demo/preview-template.mjs G2_docker template3

node template_demo/preview-template.mjs G3_web template1
node template_demo/preview-template.mjs G3_web template2
node template_demo/preview-template.mjs G3_web template3
```

Mỗi lần chạy script sẽ ghi đè `index.html` bằng template được chọn. Đây chỉ là file preview, không render video.

## Xem tất cả template cùng một màn hình

```powershell
node template_demo/build-overview.mjs
```

Sau đó mở:

```text
template_demo/index.html
```

Màn hình này hiển thị đồng thời 9 template bằng iframe. Mỗi iframe tự chạy timeline để xem layout, card, animation và asset shiba cùng lúc.

## Ghi chú

- Không cần API key.
- Không tạo audio TTS, nên preview chỉ tập trung vào layout, text, card, animation và asset shiba.
- Nếu muốn reset data demo, chạy lại `node template_demo/write-demo-data.mjs`.
