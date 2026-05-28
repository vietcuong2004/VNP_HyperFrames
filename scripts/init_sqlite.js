// scripts/init_sqlite.js
import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'hyperframes.db');
console.log(`Đang khởi tạo cơ sở dữ liệu SQLite tại: ${dbPath}`);

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

const ddl = `
-- 1. Bảng settings
CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. Bảng jobs
CREATE TABLE IF NOT EXISTS jobs (
    id TEXT PRIMARY KEY,
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
    raw_data TEXT NOT NULL,
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
    layout_data TEXT,
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
`;

try {
  db.exec(ddl);
  console.log('Chúc mừng! Đã setup thành công CSDL SQLite cục bộ.');
} catch (error) {
  console.error('Lỗi khi chạy DDL khởi tạo SQLite:', error.message);
} finally {
  db.close();
}
