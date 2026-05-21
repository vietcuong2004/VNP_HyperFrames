# Tình Hình App (Cơ chế sinh kịch bản)

Hiện tại dự án đang sử dụng cơ chế **Template-based** (Kịch bản cố định có điền biến) chứ không dùng AI (như ChatGPT/Claude) để sinh ra lời đọc (voice) hoàn toàn mới cho mỗi video.

Nếu bạn xem trong file `pipeline/generate_repo_data.js`, quy trình sinh kịch bản đang diễn ra như sau:

1. **Phân loại URL (Classification):** 
   Hệ thống sẽ fetch thông tin của URL (chẳng hạn đọc file `README`, đếm số link, xem có file `package.json` hay `Dockerfile` không...). Từ đó nó chia URL thành các dạng khác nhau. 
   Ví dụ với GitHub: `library_framework` (thư viện), `curated_list` (tổng hợp link), `tool_app_cli` (công cụ)...

2. **Áp dụng Kịch bản tương ứng (Templating):** 
   Dựa vào phân loại trên, nó sẽ gọi các hàm như `buildGithubScenes()`, `buildDockerScenes()`, `buildWebScenes()`. Trong các hàm này, lời đọc (`voice`) đã được viết sẵn cứng (hardcode) và chỉ chèn thêm các biến lấy được từ API vào.

Ví dụ một đoạn kịch bản cứng trong `buildGithubScenes`:

```javascript
voice: `Về tín hiệu cộng đồng, ${repoData.name || repo} hiện có khoảng ${(repoData.stargazers_count || 0).toLocaleString("vi-VN")} sao, ngôn ngữ chính là ${repoData.language || "chưa rõ"}, và đây là điểm nên kiểm tra trước khi đưa vào dự án thật.`
```

### Ưu điểm của cách này:

- Chạy rất nhanh, ổn định và không tốn tiền gọi API của các LLM (trừ phần dùng Tavily cho Web).
- Thời lượng và nhịp điệu video luôn được kiểm soát tốt.

### Nhược điểm:

- Nghe nhiều sẽ thấy video nào cũng có văn phong giống nhau, hơi rập khuôn.
- Đôi khi lời đọc không ăn khớp hoàn toàn với ngữ cảnh đặc biệt của repo.