# Hướng Dẫn Setup Cơ Sở Dữ Liệu Supabase Đám Mây - VNP HyperFrames

Tài liệu này hướng dẫn bạn từng bước cách cài đặt Cơ sở dữ liệu (CSDL) và Storage đám mây trên **Supabase** cho dự án VNP HyperFrames. 

Sử dụng Supabase là giải pháp tối ưu cho ứng dụng Electron Desktop vì:
1.  **Dễ cài đặt cho khách hàng:** Thư viện kết nối nhẹ (100% Pure JS), không gây lỗi biên dịch phần cứng khi đóng gói app.
2.  **Đồng bộ Template động:** Cập nhật giao diện video từ xa ngay lập tức mà không cần cài lại app.
3.  **Quản lý License & Hàng đợi:** Quản lý bản quyền người dùng và xử lý song song các công việc render.

---

## BƯỚC 1: CÀI ĐẶT THƯ VIỆN KẾT NỐI (DEPENDENCIES)

Mở cửa sổ dòng lệnh (Terminal / Command Prompt / Powershell) tại thư mục dự án `VNP_HyperFrames` và chạy lệnh sau để cài đặt thư viện kết nối:

```bash
npm install @supabase/supabase-js
```

---

## BƯỚC 2: TẠO DỰ ÁN MỚI TRÊN SUPABASE CLOUD

1.  Mở trình duyệt và truy cập trang web: [https://supabase.com](https://supabase.com).
2.  Bấm vào nút **Start your project** hoặc **Sign In** ở góc trên bên phải. Đăng nhập trực tiếp bằng tài khoản **GitHub** của bạn để thuận tiện nhất.
3.  Tại trang chính (Dashboard), chọn **New Project** (Dự án mới).
4.  Điền thông tin cấu hình dự án:
    *   **Organization**: Chọn tên tài khoản của bạn.
    *   **Name**: Nhập tên dự án (ví dụ: `VNP_HyperFrames`).
    *   **Database Password**: Nhập mật khẩu CSDL của bạn (hãy sao chép và lưu mật khẩu này).
    *   **Region**: Chọn máy chủ gần nhất là **Singapore (ap-southeast-1)** để có tốc độ phản hồi nhanh nhất.
    *   **Pricing Plan**: Chọn gói **Free** (Miễn phí).
5.  Bấm **Create new project** và đợi khoảng 1 - 3 phút để hệ thống tạo máy chủ PostgreSQL cho bạn.

---

## BƯỚC 3: TẠO CÁC BẢNG DỮ LIỆU BẰNG SQL EDITOR

Khi dự án đã chuyển sang trạng thái hoạt động (Active):
1.  Tìm thanh menu bên trái màn hình, bấm chọn biểu tượng **SQL Editor** (hình trang giấy có chữ `SQL`).
2.  Bấm vào nút **New query** ở góc trên cùng để mở một tab soạn thảo mới.
3.  Mở tệp tài liệu [CSDL.md](file:///c:/CONG_VIEC/VNP_HyperFrames/docs/CSDL.md), kéo xuống mục **4.1. Kịch bản DDL dành cho Supabase** và sao chép (Copy) toàn bộ mã SQL từ dòng đầu tiên (`CREATE EXTENSION...`) đến dòng cuối cùng (các lệnh `ALTER TABLE... DISABLE ROW LEVEL SECURITY;`).
4.  Dán (Paste) mã SQL vừa copy vào khung soạn thảo trên website Supabase.
5.  Bấm nút **Run** ở góc dưới cùng bên phải màn hình soạn thảo (hoặc nhấn tổ hợp phím `Ctrl + Enter`).
6.  Bạn sẽ thấy thông báo **Success. No rows returned** hiển thị phía dưới. Các bảng biểu và cấu trúc dữ liệu đã được tạo xong!

---

## BƯỚC 4: THIẾT LẬP STORAGE ĐỂ LƯU TRỮ TEMPLATES

Storage giúp lưu trữ và tự động đồng bộ giao diện HTML/CSS/JS xuống máy người dùng:
1.  Ở thanh menu bên trái Supabase, chọn biểu tượng **Storage** (hình hộp lưu trữ).
2.  Bấm nút **New Bucket** (Tạo thùng chứa mới).
3.  Đặt tên chính xác cho Bucket là: `video-templates` (viết thường, không dấu, ngăn cách bởi dấu gạch ngang).
4.  **Quan trọng:** Bật công tắc **Public** sang màu xanh lá cây (để ứng dụng client có thể tự do tải các tệp tin template về máy mà không cần phân quyền phức tạp).
5.  Bấm **Save** để tạo.
6.  Click chọn vào bucket `video-templates` mới tạo, sau đó kéo và thả các thư mục template trên máy tính của bạn lên đây (ví dụ: kéo thư mục `G1_github` chứa các tệp `scenes.mjs`, `style.css`, `template.mjs` vào giao diện tải lên).

---

## BƯỚC 5: LẤY THÔNG TIN API KEYS KẾT NỐI

1.  Bấm vào biểu tượng bánh răng **Project Settings** (Cài đặt dự án) ở menu bên trái dưới cùng.
2.  **Lấy Project URL:** Trong menu bên trái, nhìn xuống mục **INTEGRATIONS**, hãy click vào **`Data API`**. Tại trang này, dưới mục **API URL**, bạn bấm nút **Copy** để sao chép địa chỉ.
    *(Lưu ý cực kỳ quan trọng: Khi dán vào file `.env`, bạn hãy **xóa phần `/rest/v1/` ở đuôi đi**, chỉ lấy phần trước đó là: `https://lrtxigajmucfhyuvehgm.supabase.co`).*
3.  **Lấy API Key (Anon Key):** Trong menu bên trái dưới mục **CONFIGURATION**, chọn **`API Keys`**. 
    *   Bấm vào tab **`Legacy anon, service_role API keys`** (như trong ảnh thứ 2 bạn chụp).
    *   Sao chép chuỗi ký tự rất dài ở dòng **`anon public`** (bắt đầu bằng `eyJ...`).



---

## BƯỚC 6: CẤU HÌNH FILE `.env` VÀ KHỞI CHẠY

Mở file `.env` ở thư mục gốc của dự án lên và cấu hình như sau:

```env
# Kích hoạt chế độ CSDL Supabase Cloud
DB_MODE=supabase

# Điền URL và Anon Key của dự án mà bạn đã copy ở Bước 5
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your-long-anon-key-string-here
```

Sau khi lưu file `.env`, bạn mở terminal và khởi chạy máy chủ hoặc giao diện phát triển:
```bash
npm start
```

*Ứng dụng của bạn hiện đã được kết nối hoàn chỉnh tới cơ sở dữ liệu Supabase, sẵn sàng quản lý tiến trình render, tự động tải template về máy khi bắt đầu chạy và cập nhật lịch sử video.*
