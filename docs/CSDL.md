# Thiết Kế Cơ Sở Dữ Liệu & Hướng Dẫn Tích Hợp - VNP HyperFrames

Tài liệu này mô tả chi tiết thiết kế Cơ sở dữ liệu (CSDL) cho hệ thống sinh video tự động bằng AI Agents. CSDL được thiết kế linh hoạt để hỗ trợ cả hai mô hình vận hành:
1. **Chế độ Offline (SQLite)**: Chạy hoàn toàn cục bộ trên máy người dùng, không cần cấu hình phức tạp hay cài đặt máy chủ CSDL.
2. **Chế độ Hybrid Cloud (Supabase/PostgreSQL)**: Quản lý hàng đợi tập trung, cập nhật template động mà không cần đóng gói lại ứng dụng, hỗ trợ render song song trên nhiều máy trạm khác nhau.

---

## 1. So Sánh & Lựa Chọn Kiến Trúc CSDL

Dựa trên yêu cầu đóng gói ứng dụng Desktop chuyển cho người dùng cuối và khả năng cập nhật giao diện (template) video linh hoạt, dưới đây là bảng phân tích so sánh:

| Tiêu chí | Chế độ Offline (SQLite) | Chế độ Hybrid Cloud (Supabase) |
| :--- | :--- | :--- |
| **Cài đặt phía User** | **Không cần** (Nhúng file `.db` kèm ứng dụng) | **Không cần** (Kết nối trực tiếp qua Internet/API) |
| **Độ trễ truy vấn** | Siêu nhanh (Đọc/ghi trực tiếp trên ổ cứng cục bộ) | Phụ thuộc tốc độ mạng (~50ms - 200ms) |
| **Cập nhật Template** | Phải gửi bản build mới của App hoặc cài thêm patch | **Tự động đồng bộ** từ Supabase Storage khi mở App |
| **Render song song** | Chỉ giới hạn trên 1 máy khách duy nhất | **Không giới hạn** (Nhiều máy khách kéo job từ cloud) |
| **Quản lý Job tập trung**| Không thể giám sát lỗi/hiệu năng từ xa | Giám sát toàn bộ trạng thái render của các user từ xa |
| **Chế độ ngoại tuyến** | Hoạt động bình thường không cần Internet | Không hoạt động (Trừ khi bật chế độ cache/fallback) |

### Kết luận kiến trúc đề xuất:
Sử dụng **Supabase** làm Cơ sở dữ liệu chính và Kho lưu trữ Template (Storage). Ứng dụng Desktop sẽ tích hợp mã nguồn tự động đồng bộ (sync) các tệp template từ Supabase Storage xuống thư mục cache nội bộ ở máy người dùng mỗi khi khởi chạy. Nếu mất kết nối mạng, ứng dụng sẽ tự động chuyển sang chế độ offline sử dụng template cache có sẵn và SQLite nội bộ để đảm bảo trải nghiệm không bị gián đoạn.

---

## 2. Sơ Đồ Thực Thể Mối Quan Hệ (Entity-Relationship Diagram - ERD)

```mermaid
erDiagram
    SETTINGS {
        varchar key PK
        text value
        timestamp updated_at
    }

    JOBS {
        uuid id PK
        varchar target_url
        varchar platform
        varchar status
        integer progress
        varchar current_stage
        varchar template_group
        varchar template_name
        text error_message
        varchar log_path
        timestamp created_at
        timestamp started_at
        timestamp completed_at
    }

    SCRIPTS {
        uuid id PK
        uuid job_id FK
        varchar title
        varchar content_type
        double duration
        jsonb raw_data
        timestamp created_at
    }

    SCENES {
        uuid id PK
        uuid script_id FK
        integer scene_index
        text voice_text
        varchar audio_path
        varchar srt_path
        text srt_content
        varchar layout_type
        double duration
        double audio_start
        jsonb layout_data
    }

    TRANSCRIPTS {
        uuid id PK
        uuid scene_id FK
        varchar word
        double start_time
        double end_time
    }

    RENDERS {
        uuid id PK
        uuid job_id FK
        varchar file_name
        varchar file_path
        bigint file_size
        double duration
        timestamp rendered_at
    }

    VIDEO_FORMATS {
        uuid id PK
        varchar code UNIQUE
        varchar group_name
        varchar name
        text description
        varchar template_group
        varchar template_name
        timestamp created_at
    }

    JOBS ||--oI SCRIPTS : "generates"
    SCRIPTS ||--o{ SCENES : "contains"
    SCENES ||--o{ TRANSCRIPTS : "splits to words"
    JOBS ||--oI RENDERS : "produces"
```

---

## 3. Bản Vẽ Cấu Trúc Chi Tiết Các Bảng (Table Schemas)

### 3.1. Bảng `settings` (Cấu hình hệ thống & API Keys)
Lưu cấu hình hoạt động của các AI Agent và API Key (OpenAI, Edge TTS, LarVoice...).

| Tên Cột | Kiểu Dữ Liệu | Ràng Buộc | Mô Tả |
| :--- | :--- | :--- | :--- |
| `key` | `VARCHAR(100)` | `PRIMARY KEY` | Khóa cấu hình (ví dụ: `OPENAI_API_KEY`) |
| `value` | `TEXT` | `NOT NULL` | Giá trị cấu hình (mã hóa nếu là key nhạy cảm) |
| `updated_at` | `TIMESTAMP` | `DEFAULT NOW()` | Thời điểm cập nhật cuối cùng |

### 3.2. Bảng `jobs` (Quản lý Hàng Đợi & Trạng Thế Render)
Lưu trạng thái xử lý video. Hỗ trợ đa tiến trình đọc/ghi đồng thời để xử lý song song.

| Tên Cột | Kiểu Dữ Liệu | Ràng Buộc | Mô Tả |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` / `TEXT` | `PRIMARY KEY` | Định danh duy nhất cho Job |
| `target_url` | `VARCHAR(512)` | `NOT NULL` | URL nguồn đầu vào (GitHub repo, Docker Image, Web link) |
| `platform` | `VARCHAR(50)` | `NOT NULL` | Phân loại nguồn (`github`, `docker`, `web`) |
| `status` | `VARCHAR(50)` | `DEFAULT 'queued'` | Trạng thái: `queued`, `running`, `completed`, `failed` |
| `progress` | `INTEGER` | `DEFAULT 0` | Tiến độ xử lý của Job (từ `0` đến `100`%) |
| `current_stage` | `VARCHAR(100)` | `DEFAULT 'queued'` | Giai đoạn xử lý (`scraping`, `scripting`, `rendering`,...) |
| `template_group` | `VARCHAR(100)` | | Tên nhóm template sử dụng (`G1_github`, `G2_docker`...) |
| `template_name` | `VARCHAR(50)` | | Tên template/phiên bản giao diện cụ thể (`template1`, `template2`...) |
| `error_message` | `TEXT` | | Nội dung chi tiết lỗi nếu render thất bại |
| `log_path` | `VARCHAR(256)` | | Đường dẫn tệp log cục bộ (`logs/job_id.log`) |
| `created_at` | `TIMESTAMP` | `DEFAULT NOW()` | Thời điểm tạo job |
| `started_at` | `TIMESTAMP` | | Thời điểm bắt đầu chạy render |
| `completed_at` | `TIMESTAMP` | | Thời điểm render xong hoặc báo lỗi |

### 3.3. Bảng `scripts` (Kịch bản video dạng JSON)
Lưu trữ thông tin kịch bản tổng quan được biên dịch từ URL nguồn bởi `ScriptAgent`.

| Tên Cột | Kiểu Dữ Liệu | Ràng Buộc | Mô Tả |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` / `TEXT` | `PRIMARY KEY` | Định danh duy nhất cho Kịch bản |
| `job_id` | `UUID` / `TEXT` | `UNIQUE`, `REFERENCES jobs(id)` | Khóa ngoại liên kết tới Job |
| `title` | `VARCHAR(256)` | `NOT NULL` | Tiêu đề tổng quát của video |
| `content_type` | `VARCHAR(100)` | | Loại nội dung chính (`repo_overview`...) |
| `duration` | `DOUBLE` | `NOT NULL` | Tổng thời lượng ước tính của video (giây) |
| `raw_data` | `JSONB` / `TEXT` | `NOT NULL` | File kịch bản JSON gốc để dự phòng |
| `created_at` | `TIMESTAMP` | `DEFAULT NOW()` | Ngày tạo kịch bản |

### 3.4. Bảng `scenes` (Phân cảnh chi tiết của Video)
Lưu trữ thông tin của từng phân cảnh để dựng timeline video.

| Tên Cột | Kiểu Dữ Liệu | Ràng Buộc | Mô Tả |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` / `TEXT` | `PRIMARY KEY` | Định danh phân cảnh |
| `script_id` | `UUID` / `TEXT` | `REFERENCES scripts(id) ON DELETE CASCADE`| Khóa ngoại trỏ đến Kịch bản gốc |
| `scene_index` | `INTEGER` | `NOT NULL` | Thứ tự phân cảnh trong video (1, 2, 3...) |
| `voice_text` | `TEXT` | `NOT NULL` | Nội dung thuyết minh (giọng đọc) |
| `audio_path` | `VARCHAR(256)` | | Đường dẫn file TTS tạm thời (`assets/audio/scene_X.mp3`) |
| `srt_path` | `VARCHAR(256)` | | Đường dẫn file phụ đề gốc (`assets/audio/scene_X.srt`) |
| `srt_content` | `TEXT` | | Nội dung phụ đề đã qua lọc lỗi chính tả (SRT format) |
| `layout_type` | `VARCHAR(100)` | `NOT NULL` | Layout trực quan (`evidence_cards`, `terminal`...) |
| `duration` | `DOUBLE` | `NOT NULL` | Thời lượng phân cảnh (giây) |
| `audio_start` | `DOUBLE` | `NOT NULL` | Điểm bắt đầu phát nhạc của cảnh (giây) |
| `layout_data` | `JSONB` / `TEXT` | | Lưu trữ các biến nội dung visual động đặc thù cho từng layout (`headline_line1`, `bento1_title`, `steps`, `btn_text`...) |

### 3.5. Bảng `transcripts` (Chữ chạy karaoke cấp độ từ)
Lưu trữ phân phối thời gian của từng từ đơn phục vụ cho thuật toán hiển thị chữ chạy Karaoke mượt mà khớp giọng nói (Word-level timing).

| Tên Cột | Kiểu Dữ Liệu | Ràng Buộc | Mô Tả |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` / `TEXT` | `PRIMARY KEY` | Định danh bản ghi |
| `scene_id` | `UUID` / `TEXT` | `REFERENCES scenes(id) ON DELETE CASCADE` | Khóa ngoại trỏ đến Phân cảnh |
| `word` | `VARCHAR(100)` | `NOT NULL` | Từ đơn (ví dụ: "Chào", "bạn") |
| `start_time` | `DOUBLE` | `NOT NULL` | Điểm xuất hiện của từ trên dòng thời gian (giây) |
| `end_time` | `DOUBLE` | `NOT NULL` | Điểm ẩn đi của từ trên dòng thời gian (giây) |

### 3.6. Bảng `renders` (Video thành phẩm đầu ra)
Lưu thông tin thành phẩm video MP4 cuối cùng đã hoàn tất dựng hình.

| Tên Cột | Kiểu Dữ Liệu | Ràng Buộc | Mô Tả |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` / `TEXT` | `PRIMARY KEY` | Định danh video |
| `job_id` | `UUID` / `TEXT` | `REFERENCES jobs(id) ON DELETE SET NULL`| Khóa ngoại liên kết tới Job |
| `file_name` | `VARCHAR(256)` | `NOT NULL` | Tên tệp tin theo chuẩn (`tên-video_dd-mm-yyyy-giờ-phút.mp4`) |
| `file_path` | `VARCHAR(512)` | `NOT NULL` | Đường dẫn lưu trữ thành phẩm |
| `file_size` | `BIGINT` | `NOT NULL` | Dung lượng tệp tin (bytes) |
| `duration` | `DOUBLE` | `NOT NULL` | Thời lượng video thực tế đầu ra (giây) |
| `rendered_at` | `TIMESTAMP` | `DEFAULT NOW()` | Thời điểm render hoàn tất |

### 3.7. Bảng `video_formats` (Định nghĩa định dạng Video và Mẫu Template tương ứng)
Lưu trữ danh sách các định dạng video thuộc về từng nền tảng/nhóm mẫu, mô tả định dạng, nhóm template và phiên bản template áp dụng.

| Tên Cột | Kiểu Dữ Liệu | Ràng Buộc | Mô Tả |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | `PRIMARY KEY` | Định danh duy nhất bằng UUID |
| `code` | `VARCHAR(100)` | `UNIQUE`, `NOT NULL` | Mã định dạng duy nhất (ví dụ: `tool_review_quick_demo`) |
| `group_name` | `VARCHAR(100)` | `NOT NULL` | Nhóm nền tảng (`GitHub`, `Docker`, `Web`) |
| `name` | `VARCHAR(256)` | `NOT NULL` | Tên mô tả ngắn của định dạng |
| `description` | `TEXT` | | Mô tả chi tiết chức năng hoặc ca sử dụng |
| `template_group` | `VARCHAR(100)` | `NOT NULL` | Nhóm template áp dụng (`G1_github`, `G2_docker`, `G3_web`) |
| `template_name` | `VARCHAR(50)` | `NOT NULL` | Phiên bản template cụ thể (`template1`, `template2`, `template3`...) |
| `created_at` | `TIMESTAMP` | `DEFAULT NOW()` | Ngày tạo bản ghi |

---

## 4. Kịch Bản Khởi Tạo DDL (SQL Scripts)

### 4.1. Kịch bản DDL dành cho Supabase (PostgreSQL Cloud)
Dán đoạn mã này vào **SQL Editor** trên giao diện điều khiển của Supabase để khởi tạo cơ sở dữ liệu:

```sql
-- Kích hoạt extension UUID và gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tắt kiểm tra bảng cũ nếu cần setup lại
DROP TABLE IF EXISTS renders CASCADE;
DROP TABLE IF EXISTS transcripts CASCADE;
DROP TABLE IF EXISTS scenes CASCADE;
DROP TABLE IF EXISTS scripts CASCADE;
DROP TABLE IF EXISTS jobs CASCADE;
DROP TABLE IF EXISTS settings CASCADE;

-- 1. Bảng settings (Cấu hình hệ thống)
CREATE TABLE settings (
    key VARCHAR(100) PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Tự động cập nhật updated_at
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_settings_modtime 
    BEFORE UPDATE ON settings 
    FOR EACH ROW EXECUTE FUNCTION update_modified_column();

-- 2. Bảng jobs (Quản lý hàng đợi)
CREATE TABLE jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    target_url VARCHAR(512) NOT NULL,
    platform VARCHAR(50) NOT NULL,
    status VARCHAR(50) DEFAULT 'queued' NOT NULL,
    progress INTEGER DEFAULT 0 NOT NULL,
    current_stage VARCHAR(100) DEFAULT 'queued' NOT NULL,
    template_group VARCHAR(100),
    template_name VARCHAR(50),
    error_message TEXT,
    log_path VARCHAR(256),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE
);

CREATE TRIGGER update_jobs_modtime
    BEFORE UPDATE ON jobs
    FOR EACH ROW EXECUTE FUNCTION update_modified_column();

-- 3. Bảng kịch bản (scripts)
CREATE TABLE scripts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID UNIQUE REFERENCES jobs(id) ON DELETE CASCADE,
    title VARCHAR(256) NOT NULL,
    content_type VARCHAR(100),
    duration DOUBLE PRECISION NOT NULL,
    raw_data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 4. Bảng phân cảnh (scenes)
CREATE TABLE scenes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    script_id UUID REFERENCES scripts(id) ON DELETE CASCADE,
    job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
    scene_index INTEGER NOT NULL,
    voice_text TEXT NOT NULL,
    audio_path VARCHAR(256),
    srt_path VARCHAR(256),
    srt_content TEXT,
    layout_type VARCHAR(100) NOT NULL,
    duration DOUBLE PRECISION NOT NULL,
    audio_start DOUBLE PRECISION NOT NULL,
    layout_data JSONB
);

-- 5. Bảng chữ chạy timing (transcripts)
CREATE TABLE transcripts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scene_id UUID REFERENCES scenes(id) ON DELETE CASCADE,
    word VARCHAR(100) NOT NULL,
    start_time DOUBLE PRECISION NOT NULL,
    end_time DOUBLE PRECISION NOT NULL
);

-- 6. Bảng renders (Thành phẩm đầu ra)
CREATE TABLE renders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
    file_name VARCHAR(256) NOT NULL,
    file_path VARCHAR(512) NOT NULL,
    file_size BIGINT NOT NULL,
    duration DOUBLE PRECISION NOT NULL,
    rendered_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 7. Bảng video_formats (Định nghĩa định dạng Video & Templates tương ứng)
CREATE TABLE video_formats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(100) UNIQUE NOT NULL,
    group_name VARCHAR(100) NOT NULL,
    name VARCHAR(256) NOT NULL,
    description TEXT,
    template_group VARCHAR(100) NOT NULL,
    template_name VARCHAR(50) NOT NULL DEFAULT 'template1',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Tạo các chỉ mục tối ưu hiệu năng
CREATE INDEX idx_jobs_status_created ON jobs(status, created_at);
CREATE INDEX idx_scenes_script_index ON scenes(script_id, scene_index);
CREATE INDEX idx_scenes_job_id ON scenes(job_id);
CREATE INDEX idx_transcripts_scene_start ON transcripts(scene_id, start_time);
CREATE INDEX idx_renders_date ON renders(rendered_at DESC);

-- Tắt Row Level Security (RLS) để cho phép client ghi nhận Job/Render trực tiếp
ALTER TABLE jobs DISABLE ROW LEVEL SECURITY;
ALTER TABLE scripts DISABLE ROW LEVEL SECURITY;
ALTER TABLE scenes DISABLE ROW LEVEL SECURITY;
ALTER TABLE transcripts DISABLE ROW LEVEL SECURITY;
ALTER TABLE renders DISABLE ROW LEVEL SECURITY;
ALTER TABLE settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE video_formats DISABLE ROW LEVEL SECURITY;

-- Chèn dữ liệu mẫu cho các định dạng video
INSERT INTO video_formats (code, group_name, name, description, template_group, template_name) VALUES
('tool_review_quick_demo', 'GitHub', 'Repo dạng tool/app/CLI', 'Video giới thiệu nhanh về công cụ, ứng dụng hoặc giao diện dòng lệnh.', 'G1_github', 'template1'),
('developer_integration_brief', 'GitHub', 'Repo dạng thư viện/framework', 'Video hướng dẫn tích hợp thư viện hoặc framework dành cho nhà phát triển.', 'G1_github', 'template2'),
('knowledge_map_resource_digest', 'GitHub', 'Repo dạng awesome/curated list', 'Video tổng hợp các tài nguyên hữu ích hoặc danh sách chọn lọc từ awesome list.', 'G1_github', 'template3'),
('dataset_explainer', 'GitHub', 'Repo dạng dataset/benchmark', 'Video giải thích về các bộ dữ liệu (dataset) hoặc kết quả benchmark.', 'G1_github', 'template1'),
('repo_overview_with_use_cases', 'GitHub', 'Repo không xác định rõ', 'Video tổng quan về dự án GitHub đi kèm các ca sử dụng thực tế.', 'G1_github', 'template1'),

('container_quick_start', 'Docker', 'Official/base image', 'Video hướng dẫn chạy nhanh một Docker Image chính thức hoặc base image.', 'G2_docker', 'template1'),
('self_host_setup_guide', 'Docker', 'Ứng dụng self-hosted', 'Video hướng dẫn chi tiết cách triển khai ứng dụng tự host bằng Docker/Docker Compose.', 'G2_docker', 'template2'),
('dev_workflow_image_brief', 'Docker', 'Dev/CI runtime', 'Video giới thiệu về môi trường phát triển hoặc CI/CD runtime trong Docker.', 'G2_docker', 'template1'),
('container_overview', 'Docker', 'Image không xác định rõ', 'Video giới thiệu tổng quan về cấu trúc và cách chạy một Docker Image bất kỳ.', 'G2_docker', 'template1'),

('web_docs_explainer', 'Web', 'Trang tài liệu', 'Video tóm tắt và giải thích nội dung trang tài liệu hướng dẫn (documentation).', 'G3_web', 'template1'),
('web_tool_overview', 'Web', 'Trang tool/SDK', 'Video giới thiệu các công cụ web hoặc bộ phát triển phần mềm SDK.', 'G3_web', 'template2'),
('web_article_digest', 'Web', 'Bài viết/phân tích', 'Video phân tích, tóm tắt bài báo, tin tức hoặc blog công nghệ trên trang web.', 'G3_web', 'template1'),
('web_product_brief', 'Web', 'Trang sản phẩm', 'Video giới thiệu tính năng nổi bật của một trang web sản phẩm/dịch vụ.', 'G3_web', 'template1'),
('web_context_digest', 'Web', 'Web không xác định rõ', 'Video tóm tắt nhanh nội dung của một trang web bất kỳ.', 'G3_web', 'template1')
ON CONFLICT (code) DO NOTHING;

```

### 4.2. Kịch bản DDL dành cho SQLite (Offline Mode)
Nếu người dùng ngắt mạng hoặc bạn muốn cấu hình chạy offline hoàn toàn trên máy cục bộ, hãy khởi chạy file SQLite cục bộ với cấu trúc sau:

```sql
-- 1. Bảng settings
CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Trigger cập nhật updated_at cho settings
CREATE TRIGGER IF NOT EXISTS trg_settings_updated_at 
AFTER UPDATE ON settings
BEGIN
    UPDATE settings SET updated_at = CURRENT_TIMESTAMP WHERE key = NEW.key;
END;

-- 2. Bảng jobs
CREATE TABLE IF NOT EXISTS jobs (
    id TEXT PRIMARY KEY, -- Sử dụng chuỗi UUID sinh bằng Node.js (crypto.randomUUID())
    target_url TEXT NOT NULL,
    platform TEXT NOT NULL,
    status TEXT DEFAULT 'queued' NOT NULL,
    progress INTEGER DEFAULT 0 NOT NULL,
    current_stage TEXT DEFAULT 'queued' NOT NULL,
    template_group TEXT,
    template_name TEXT,
    error_message TEXT,
    log_path TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    started_at DATETIME,
    completed_at DATETIME
);

-- 3. Bảng scripts
CREATE TABLE IF NOT EXISTS scripts (
    id TEXT PRIMARY KEY,
    job_id TEXT UNIQUE,
    title TEXT NOT NULL,
    content_type TEXT,
    duration REAL NOT NULL,
    raw_data TEXT NOT NULL, -- SQLite lưu JSON dưới dạng chuỗi TEXT
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(job_id) REFERENCES jobs(id) ON DELETE CASCADE
);

-- 4. Bảng scenes
CREATE TABLE IF NOT EXISTS scenes (
    id TEXT PRIMARY KEY,
    script_id TEXT,
    scene_index INTEGER NOT NULL,
    voice_text TEXT NOT NULL,
    audio_path TEXT,
    srt_path TEXT,
    srt_content TEXT,
    layout_type TEXT NOT NULL,
    duration REAL NOT NULL,
    audio_start REAL NOT NULL,
    layout_data TEXT, -- SQLite lưu JSON dưới dạng chuỗi TEXT
    FOREIGN KEY(script_id) REFERENCES scripts(id) ON DELETE CASCADE
);

-- 5. Bảng transcripts
CREATE TABLE IF NOT EXISTS transcripts (
    id TEXT PRIMARY KEY,
    scene_id TEXT,
    word TEXT NOT NULL,
    start_time REAL NOT NULL,
    end_time REAL NOT NULL,
    FOREIGN KEY(scene_id) REFERENCES scenes(id) ON DELETE CASCADE
);

-- 6. Bảng renders
CREATE TABLE IF NOT EXISTS renders (
    id TEXT PRIMARY KEY,
    job_id TEXT,
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    duration REAL NOT NULL,
    rendered_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(job_id) REFERENCES jobs(id) ON DELETE SET NULL
);

-- Tạo chỉ mục SQLite
CREATE INDEX IF NOT EXISTS idx_jobs_status_created ON jobs(status, created_at);
CREATE INDEX IF NOT EXISTS idx_scenes_script_index ON scenes(script_id, scene_index);
CREATE INDEX IF NOT EXISTS idx_transcripts_scene_start ON transcripts(scene_id, start_time);
CREATE INDEX IF NOT EXISTS idx_renders_date ON renders(rendered_at DESC);
```

---

## 5. Xử Lý Song Song & Quản Lý Hàng Đợi (Concurrency Control)

Để tránh hiện tượng tranh chấp dữ liệu (Race Condition) khi render nhiều video đồng thời (ví dụ: mở 3 luồng công việc chạy song song), ta cần xử lý hàng đợi một cách an toàn.

### 5.1. Cơ chế đối với Supabase (PostgreSQL)
Sử dụng cú pháp nâng cao `FOR UPDATE SKIP LOCKED`. Khi một worker (luồng render) thực hiện truy vấn này, nó sẽ khóa dòng dữ liệu của Job đầu tiên trong hàng đợi và loại trừ các dòng đã bị các worker khác khóa, giúp các worker khác có thể lấy các Job tiếp theo ngay lập tức.

```sql
-- Lấy và khóa Job cũ nhất đang ở trạng thái 'queued'
BEGIN;

SELECT id FROM jobs
WHERE status = 'queued'
ORDER BY created_at ASC
LIMIT 1
FOR UPDATE SKIP LOCKED;

-- (Giả sử lấy được id 'job-uuid-123')
UPDATE jobs 
SET status = 'running', started_at = CURRENT_TIMESTAMP
WHERE id = 'job-uuid-123';

COMMIT;
```

### 5.2. Cơ chế đối với SQLite (Cục bộ)
SQLite mặc định khóa toàn bộ file cơ sở dữ liệu khi ghi. Để hỗ trợ xử lý song song tốt nhất trong SQLite:
1. **Bật chế độ WAL (Write-Ahead Logging)**: Cho phép nhiều tiến trình đọc dữ liệu đồng thời trong khi một tiến trình khác đang ghi.
2. **Sử dụng Transaction loại `IMMEDIATE`**: Khóa ngay lập tức quyền ghi để tránh lỗi `SQLITE_BUSY` nửa chừng.

```javascript
// Cấu hình SQLite kết nối song song an toàn bằng better-sqlite3
import Database from 'better-sqlite3';

const db = new Database('hyperframes.db', { timeout: 8000 }); // Đợi tối đa 8 giây nếu file bị khóa
db.pragma('journal_mode = WAL'); // Bật chế độ WAL

/**
 * Lấy Job tiếp theo một cách an toàn trong SQLite
 */
export function getNextJobSQLite() {
  const getJobTransaction = db.transaction(() => {
    // 1. Tìm job trong hàng đợi
    const job = db.prepare(`
      SELECT * FROM jobs 
      WHERE status = 'queued' 
      ORDER BY created_at ASC 
      LIMIT 1
    `).get();

    if (!job) return null;

    // 2. Chuyển ngay trạng thái sang 'running' để các luồng khác không lấy trùng
    db.prepare(`
      UPDATE jobs 
      SET status = 'running', started_at = datetime('now'), current_stage = 'starting'
      WHERE id = ?
    `).run(job.id);

    return job;
  });

  // Chạy transaction dạng IMMEDIATE
  return getJobTransaction.immediate();
}
```

---

## 6. Hướng Dẫn Tải & Đồng Bộ Template Động từ Cloud (Supabase Storage)

Để giải quyết bài toán: **"Thư mục templates thay đổi liên tục, làm sao máy khách tự cập nhật mà không cần cài lại app?"**

### 6.1. Tổ Chức Thư Mục Trên Supabase Storage
1. Tạo một bucket tên là `video-templates` ở chế độ **Public**.
2. Thư mục tải lên sẽ phản ánh chính xác cấu trúc phân cấp nền tảng và phiên bản (variants) như sau:
   ```text
   video-templates/
   ├── G1_github/                 <-- Tương ứng cột `template_group` trong DB
   │   ├── template1/             <-- Tương ứng cột `template_name` trong DB
   │   │   ├── scenes.mjs
   │   │   ├── style.css
   │   │   └── template.mjs
   │   ├── template2/
   │   │   └── ...
   │   ├── template3/
   │   │   └── ...
   │   ├── scenes.mjs             <-- Files mặc định cấp nền tảng
   │   ├── style.css
   │   └── template.mjs
   ├── G2_docker/
   │   ├── template1/
   │   │   └── ...
   │   ├── template2/
   │   │   └── ...
   │   ├── scenes.mjs
   │   ├── style.css
   │   └── template.mjs
   └── G3_web/
       ├── template1/
       │   └── ...
       ├── template2/
       │   └── ...
       ├── scenes.mjs
       ├── style.css
       └── template.mjs
   ```

*Lưu ý:* Việc phân chia cấu trúc thư mục như trên giúp ứng dụng dễ dàng định vị đường dẫn file render dựa vào hai trường `template_group` (ví dụ: `G1_github`) và `template_name` (ví dụ: `template1`) được truy vấn trực tiếp từ bảng `jobs`.


### 6.2. Thuật Toán Đồng Bộ Thông Minh (Smart Sync)
Thay vì tải lại toàn bộ file mỗi lần chạy (gây tốn băng thông và làm chậm ứng dụng), ứng dụng sẽ so sánh dung lượng (`file_size`) hoặc mã băm của file cục bộ với file trên Cloud. Chỉ tải về những file có thay đổi.

Đoạn mã Node.js hoàn chỉnh tích hợp vào ứng dụng Desktop:

```javascript
import { createClient } from '@supabase/supabase-js';
import fs from 'fs/promises';
import path from 'path';

const supabase = createClient(
  process.env.SUPABASE_URL, 
  process.env.SUPABASE_ANON_KEY
);

/**
 * Kiểm tra xem một file cục bộ có khớp kích thước với file trên cloud không
 */
async function isFileUpToDate(localPath, remoteSize) {
  try {
    const stats = await fs.stat(localPath);
    return stats.size === remoteSize;
  } catch {
    return false; // File chưa tồn tại cục bộ
  }
}

/**
 * Đồng bộ hóa thông minh thư mục templates từ Supabase Storage về máy khách
 * @param {string} localDir - Thư mục lưu template cục bộ (ví dụ: path.join(process.cwd(), 'templates'))
 */
export async function syncTemplates(localDir) {
  console.log('[Sync] Khởi động quá trình kiểm tra đồng bộ templates...');
  try {
    // 1. Đảm bảo thư mục đích cục bộ tồn tại
    await fs.mkdir(localDir, { recursive: true });

    // 2. Lấy danh sách file đệ quy từ Bucket 'video-templates'
    const { data: remoteFiles, error } = await supabase.storage
      .from('video-templates')
      .list('', { recursive: true, limit: 1000 });

    if (error) {
      throw new Error(`Không thể kết nối Supabase Storage: ${error.message}`);
    }

    let downloadCount = 0;

    // 3. Quét từng tệp tin và kiểm tra xem có cần cập nhật không
    for (const file of remoteFiles) {
      // Bỏ qua nếu là thư mục rỗng (placeholder)
      if (file.metadata && Object.keys(file.metadata).length === 0) continue;
      if (file.name.endsWith('.keep') || file.name.endsWith('/')) continue;

      const remotePath = file.name;
      const localPath = path.join(localDir, remotePath);
      const remoteSize = file.metadata?.size || 0;

      // Kiểm tra xem file local đã có chưa và có cùng dung lượng không
      const upToDate = await isFileUpToDate(localPath, remoteSize);
      
      if (!upToDate) {
        console.log(`[Sync] Đang tải file mới/cập nhật: ${remotePath} (${(remoteSize/1024).toFixed(2)} KB)`);
        
        // Đảm bảo thư mục chi cục bộ của file tồn tại
        await fs.mkdir(path.dirname(localPath), { recursive: true });

        // Tải file từ Cloud
        const { data: blob, error: dlError } = await supabase.storage
          .from('video-templates')
          .download(remotePath);

        if (dlError) {
          console.error(`[Sync] Lỗi tải file ${remotePath}:`, dlError.message);
          continue;
        }

        // Ghi đè vào thư mục cache cục bộ
        const buffer = Buffer.from(await blob.arrayBuffer());
        await fs.writeFile(localPath, buffer);
        downloadCount++;
      }
    }

    if (downloadCount > 0) {
      console.log(`[Sync] Hoàn tất đồng bộ! Đã cập nhật ${downloadCount} tệp tin.`);
    } else {
      console.log('[Sync] Tất cả templates cục bộ đã khớp phiên bản mới nhất trên Cloud.');
    }
  } catch (err) {
    console.warn('[Sync Fallback] Không thể đồng bộ qua Cloud, sử dụng phiên bản cache offline:', err.message);
  }
}
```

---

## 7. Mã Nguồn Mẫu Tích Hợp Quản Lý Tiến Trình (Node.js SDK)

Dưới đây là module JavaScript quản lý vòng đời của một Job sinh video, hoạt động đa năng cho cả Supabase và SQLite:

```javascript
import { createClient } from '@supabase/supabase-js';
import Database from 'better-sqlite3';
import crypto from 'crypto';

// Đọc cấu hình chế độ từ file cấu hình hoặc biến môi trường
const DB_MODE = process.env.DB_MODE || 'supabase'; // 'supabase' | 'sqlite'

let supabase = null;
let sqliteDb = null;

if (DB_MODE === 'supabase') {
  supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
} else {
  sqliteDb = new Database('hyperframes.db');
  sqliteDb.pragma('journal_mode = WAL');
}

/**
 * 1. Khởi tạo một Job mới vào hàng đợi
 */
export async function createJob(targetUrl, platform, templateGroup, templateName) {
  const jobId = crypto.randomUUID();

  if (DB_MODE === 'supabase') {
    const { data, error } = await supabase
      .from('jobs')
      .insert([{
        id: jobId,
        target_url: targetUrl,
        platform: platform,
        template_group: templateGroup,
        template_name: templateName,
        status: 'queued',
        progress: 0,
        current_stage: 'queued'
      }])
      .select();
    if (error) throw error;
    return data[0];
  } else {
    sqliteDb.prepare(`
      INSERT INTO jobs (id, target_url, platform, template_group, template_name, status, progress, current_stage)
      VALUES (?, ?, ?, ?, ?, 'queued', 0, 'queued')
    `).run(jobId, targetUrl, platform, templateGroup, templateName);
    
    return { id: jobId, target_url: targetUrl, platform, template_group: templateGroup, template_name: templateName, status: 'queued', progress: 0, current_stage: 'queued' };
  }
}

/**
 * 2. Cập nhật trạng thái, tiến trình (0-100%) và phân đoạn hiện tại của Job
 */
export async function updateJobProgress(jobId, updates) {
  // updates có thể chứa: status ('running', 'completed', 'failed'), progress (number), current_stage (string), error_message
  const dbUpdates = { ...updates };
  if (updates.status === 'running') {
    dbUpdates.started_at = new Date().toISOString();
  } else if (updates.status === 'completed' || updates.status === 'failed') {
    dbUpdates.completed_at = new Date().toISOString();
    if (updates.status === 'completed') dbUpdates.progress = 100;
  }

  if (DB_MODE === 'supabase') {
    const { error } = await supabase
      .from('jobs')
      .update(dbUpdates)
      .eq('id', jobId);
    if (error) console.error(`[DB Error] Lỗi cập nhật tiến trình job ${jobId}:`, error.message);
  } else {
    const keys = Object.keys(dbUpdates);
    const setClause = keys.map(k => `${k} = ?`).join(', ');
    const values = keys.map(k => dbUpdates[k]);
    values.push(jobId);

    sqliteDb.prepare(`
      UPDATE jobs 
      SET ${setClause}
      WHERE id = ?
    `).run(...values);
  }
}

/**
 * 3. Lưu trữ kịch bản video (Script) và các Phân cảnh (Scenes) kèm Timing Karaoke (Transcripts)
 */
export async function saveVideoScriptAndStructure(jobId, scriptData) {
  const scriptId = crypto.randomUUID();
  const rawDataStr = JSON.stringify(scriptData);

  // A. Lưu Script tổng quát
  if (DB_MODE === 'supabase') {
    const { error } = await supabase
      .from('scripts')
      .insert([{
        id: scriptId,
        job_id: jobId,
        title: scriptData.title || 'Untitled',
        content_type: scriptData.contentType || 'repo_overview',
        duration: scriptData.duration || 0,
        raw_data: scriptData
      }]);
    if (error) throw error;
  } else {
    sqliteDb.prepare(`
      INSERT INTO scripts (id, job_id, title, content_type, duration, raw_data)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(scriptId, jobId, scriptData.title || 'Untitled', scriptData.contentType || 'repo_overview', scriptData.duration || 0, rawDataStr);
  }

  // B. Lưu từng Scene & Transcripts đi kèm
  if (Array.isArray(scriptData.scenes)) {
    for (let i = 0; i < scriptData.scenes.length; i++) {
      const s = scriptData.scenes[i];
      const sceneId = crypto.randomUUID();

      // Tách riêng layout_data động chứa các thông tin visual (headline, bento, steps, button...)
      const { voice, layout, duration, audioStart, audioPath, srtPath, srtContent, ...visualFields } = s;

      if (DB_MODE === 'supabase') {
        // Lưu Scene
        const { error: sceneError } = await supabase
          .from('scenes')
          .insert([{
            id: sceneId,
            script_id: scriptId,
            scene_index: i + 1,
            voice_text: voice || '',
            audio_path: audioPath || null,
            srt_path: srtPath || null,
            srt_content: srtContent || null,
            layout_type: layout || 'intro',
            duration: duration || 0,
            audio_start: audioStart || 0,
            layout_data: visualFields // Supabase tự động lưu JSONB
          }]);
        if (sceneError) throw sceneError;

        // Lưu Transcripts cấp độ từ (Karaoke Word Timing)
        if (Array.isArray(s.words) && s.words.length > 0) {
          const rows = s.words.map(w => ({
            id: crypto.randomUUID(),
            scene_id: sceneId,
            word: w.word,
            start_time: w.start,
            end_time: w.end
          }));
          const { error: tsError } = await supabase.from('transcripts').insert(rows);
          if (tsError) throw tsError;
        }
      } else {
        // Lưu Scene trong SQLite
        sqliteDb.prepare(`
          INSERT INTO scenes (id, script_id, scene_index, voice_text, audio_path, srt_path, srt_content, layout_type, duration, audio_start, layout_data)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          sceneId, scriptId, i + 1, voice || '', audioPath || null, srtPath || null, srtContent || null, 
          layout || 'intro', duration || 0, audioStart || 0, JSON.stringify(visualFields)
        );

        // Lưu Transcripts cấp độ từ trong SQLite
        if (Array.isArray(s.words) && s.words.length > 0) {
          const insertStmt = sqliteDb.prepare(`
            INSERT INTO transcripts (id, scene_id, word, start_time, end_time)
            VALUES (?, ?, ?, ?, ?)
          `);
          const insertMany = sqliteDb.transaction((words) => {
            for (const w of words) {
              insertStmt.run(crypto.randomUUID(), sceneId, w.word, w.start, w.end);
            }
          });
          insertMany(s.words);
        }
      }
    }
  }

  return scriptId;
}

/**
 * 4. Đăng ký tệp Render thành phẩm
 */
export async function registerRender(jobId, fileName, filePath, fileSize, duration) {
  const renderId = crypto.randomUUID();

  if (DB_MODE === 'supabase') {
    const { error } = await supabase
      .from('renders')
      .insert([{
        id: renderId,
        job_id: jobId,
        file_name: fileName,
        file_path: filePath,
        file_size: fileSize,
        duration: duration
      }]);
    if (error) console.error('[DB Error] Lỗi lưu renders:', error.message);
  } else {
    sqliteDb.prepare(`
      INSERT INTO renders (id, job_id, file_name, file_path, file_size, duration)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(renderId, jobId, fileName, filePath, fileSize, duration);
  }
  return renderId;
}
```

---

## 8. Triển Khai Thực Tế Trong Ứng Dụng Electron / Desktop

Khi đóng gói ứng dụng Desktop, bạn có thể triển khai luồng vận hành tối ưu sau:

1. **Khởi động ứng dụng**: Gọi hàm `syncTemplates(localTemplatesFolder)` để đồng bộ nhanh các thay đổi giao diện từ Supabase Storage về máy người dùng.
2. **Kích hoạt rendering song song**: Mở số lượng Worker mong muốn (ví dụ: `MAX_CONCURRENT_JOBS = 2`). Mỗi Worker chạy một vòng lặp để kéo job từ database (sử dụng query lock ở Mục 5) để xử lý mà không sợ bị xung đột hoặc chồng chéo log.
3. **Môi trường chạy**: Cấu hình các key bí mật (`SUPABASE_URL`, `SUPABASE_ANON_KEY`) vào tệp `.env` đóng gói kèm ứng dụng hoặc tải từ một máy chủ cấu hình trực tuyến.