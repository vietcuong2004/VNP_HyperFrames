# Kế hoạch phát triển: Tích hợp OpenAI & Tái cấu trúc Bộ sinh kịch bản

Tài liệu này mô tả chi tiết phương án nâng cấp và tái cấu trúc hệ thống tạo video tự động của **VNP HyperFrames**, chuyển đổi từ cơ chế sinh kịch bản cứng (Template-based) sang cơ chế sinh thông minh bằng AI (OpenAI) kết hợp tối ưu hóa kiến trúc mã nguồn.

---

## 1. Hiện trạng & Thách thức hiện tại

Hiện tại, file `pipeline/main_generateContent.js` đang gánh vác cả 3 vai trò:
1. **Phân tích dữ liệu nguồn:** Tải thông tin từ API GitHub, Docker Hub hoặc quét nội dung Web.
2. **Phân loại định dạng video:** Xác định xem URL thuộc nhóm nào trong 15 format con.
3. **Sinh kịch bản chi tiết:** Chứa toàn bộ logic render cứng cho tất cả các format, dẫn đến code phình to (> 1000 dòng) và lời thoại video bị rập khuôn.

---

## 2. Kiến trúc mới đề xuất (Strategy Pattern)

Để tăng tính đa dạng trong nội dung kể chuyện (Storytelling) mà vẫn đảm bảo tính ổn định của layout video, chúng ta sẽ áp dụng nguyên lý:
> **Mỗi Group (GitHub, Docker, Web) có một cấu trúc Layout (Visual Scenes) cố định, nhưng nội dung kể chuyện (Storytelling) thay đổi linh hoạt theo từng thể loại con thông qua OpenAI.**

### Sơ đồ cấu trúc thư mục mới:
```txt
pipeline/
├── generators/
│   ├── github_generator.mjs  # Quản lý 8 cảnh của G1_github
│   ├── docker_generator.mjs  # Quản lý 4-5 cảnh của G2_docker
│   ├── web_generator.mjs     # Quản lý 6 cảnh của G3_web
│   └── default_generator.mjs # Trình sinh kịch bản dự phòng (không cần API key)
├── main_generateContent.js     # Đóng vai trò Router phân phối
└── ...
```

---

## 3. Chi tiết triển khai

### Bước 1: Khởi tạo & Cài đặt Thư viện
1. Cài đặt SDK OpenAI chính thức:
   ```bash
   npm install openai
   ```
2. Thêm cấu hình khóa API vào file `.env`:
   ```env
   OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxxxxxx
   ```

### Bước 2: Tái cấu trúc Router chính (`main_generateContent.js`)
File này sẽ được rút gọn lại chỉ làm nhiệm vụ: **Quét dữ liệu thô (Scraping) -> Phân loại (Classification) -> Gọi Generator**.

```javascript
// Mã giả minh họa luồng Router chính
import { classifyGithubRepo } from './classifier.mjs';

async function main() {
  const target = parseTargetUrl(process.argv[2]);
  const rawData = await fetchRawData(target);
  
  // Xác định Group và Format
  const { group, format } = classify(target, rawData); 
  
  // Dynamic import generator tương ứng theo Group
  const { generateScenes } = await import(`./generators/${group}_generator.mjs`);
  
  // Tiến hành sinh kịch bản (AI hoặc Fallback)
  const scenes = await generateScenes(rawData, format);
  
  await saveJsonScript(rawData, scenes);
}
```

### Bước 3: Xây dựng các Group Generator (`github_generator.mjs`, v.v.)
Mỗi file generator sẽ đóng vai trò quản lý **Layout Schema** cố định của group đó và gửi kèm **Storytelling Prompt** tương ứng với format con cho OpenAI.

> **Lưu ý quan trọng để tránh vỡ giao diện video:**
> Chúng ta bắt buộc phải giới hạn số lượng ký tự đầu ra của AI trong prompt (ví dụ: Title <= 20 ký tự, Bento Desc <= 60 ký tự).

#### Sơ đồ hoạt động của Generator:
1. Nhận dữ liệu thô & Format con.
2. Kiểm tra có `OPENAI_API_KEY` hay không.
3. Nếu có: Lấy Storytelling Prompt tương ứng, gọi OpenAI sinh JSON theo Schema cố định, và trả về Scenes.
4. Nếu không: Chạy kịch bản điền biến cứng cũ làm Fallback, và trả về Scenes.

#### Thiết lập Hướng dẫn kể chuyện (Storytelling Guidelines) mẫu cho GitHub:
```javascript
const STORYTELLING_GUIDELINES = {
  tool_review_quick_demo: 
    "Giọng điệu hào hứng, tập trung vào cách cài đặt nhanh bằng CLI và trải nghiệm thực tế.",
  developer_integration_brief: 
    "Giọng điệu kỹ thuật chuyên nghiệp, tập trung vào cấu trúc code, cách import và các API.",
  knowledge_map_resource_digest: 
    "Giọng điệu chia sẻ, hướng dẫn cách sử dụng repo này như một thư viện tài liệu tra cứu."
};
```

---

## 4. Kế hoạch kiểm thử & Phòng ngừa rủi ro

| Rủi ro | Giải pháp phòng ngừa |
|---|---|
| **AI sinh chữ quá dài gây vỡ khung hình** | Chỉ định rõ giới hạn ký tự `max_characters` cho từng key trong Prompt và kích hoạt chế độ `response_format: json_object`. |
| **Hết hạn API Key hoặc mất mạng** | Luôn viết cơ chế dự phòng (Fallback) bằng code điền biến cứng cũ trong trường hợp gọi API của OpenAI thất bại. |
| **Tốn chi phí token** | Sử dụng model `gpt-4o-mini` cho các tác vụ sinh kịch bản thông thường để tối ưu chi phí và tăng tốc độ phản hồi. |

---

## 5. Lộ trình thực hiện đề xuất

- [ ] **Pha 1 (Tái cấu trúc nền tảng):** Chia tách `main_generateContent.js` thành các file generator theo nhóm cấu trúc. Chạy thử nghiệm bằng kịch bản cứng cũ để đảm bảo không lỗi.
- [ ] **Pha 2 (Tích hợp OpenAI):** Cài đặt SDK, viết prompt động và cấu trúc hóa JSON đầu ra của OpenAI.
- [ ] **Pha 3 (Kiểm thử & Tinh chỉnh):** Test thử nghiệm tối thiểu 3 URL đại diện cho 3 nhóm trên UI Desktop và tinh chỉnh lại độ dài chữ hiển thị.
