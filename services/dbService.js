import { createClient } from '@supabase/supabase-js';
import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Tự động load .env từ thư mục gốc dự án
try {
  const rootEnvPath = path.join(__dirname, '..', '.env');
  if (fsSync.existsSync(rootEnvPath)) {
    const content = fsSync.readFileSync(rootEnvPath, 'utf8');
    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIndex = trimmed.indexOf('=');
      if (eqIndex === -1) continue;
      const key = trimmed.slice(0, eqIndex).trim();
      let value = trimmed.slice(eqIndex + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      if (key && !process.env[key]) {
        process.env[key] = value;
      }
    }
  }
} catch (e) {
  // Bỏ qua lỗi nếu không tìm thấy file .env
}

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

export const supabase = (supabaseUrl && supabaseAnonKey)
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

if (!supabase) {
  console.warn('[DB] Cảnh báo: Thiếu SUPABASE_URL hoặc SUPABASE_ANON_KEY trong file .env. Kết nối tới database sẽ tạm thời bị vô hiệu hóa.');
}


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
 * @param {string} localDir - Thư mục lưu template cục bộ
 */
export async function syncTemplates(localDir) {
  if (!supabase) {
    console.warn('[Sync] Supabase chưa được cấu hình. Bỏ qua đồng bộ templates.');
    return;
  }
  console.log('[Sync] Khởi động quá trình kiểm tra đồng bộ templates từ Supabase Storage...');
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
      // Bỏ qua nếu là thư mục rỗng
      if (file.metadata && Object.keys(file.metadata).length === 0) continue;
      if (file.name.endsWith('.keep') || file.name.endsWith('/')) continue;

      const remotePath = file.name;
      const localPath = path.join(localDir, remotePath);
      const remoteSize = file.metadata?.size || 0;

      // Kiểm tra xem file local đã có chưa và có cùng dung lượng không
      const upToDate = await isFileUpToDate(localPath, remoteSize);

      if (!upToDate) {
        console.log(`[Sync] Đang tải file mới/cập nhật: ${remotePath} (${(remoteSize/1024).toFixed(2)} KB)`);

        // Đảm bảo thư mục cha cục bộ của file tồn tại
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

/**
 * 1. Khởi tạo một Job mới vào hàng đợi
 */
export async function createJob(jobId, targetUrl, platform, templateGroup, templateName) {
  if (!supabase) return null;
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
  if (error) {
    console.error('[DB Error] Lỗi tạo job:', error.message);
    throw error;
  }
  return data[0];
}

/**
 * 2. Cập nhật trạng thái, tiến trình (0-100%) và phân đoạn hiện tại của Job
 */
export async function updateJobProgress(jobId, updates) {
  if (!supabase) return;
  const dbUpdates = { ...updates };
  if (updates.status === 'running') {
    dbUpdates.started_at = new Date().toISOString();
  } else if (updates.status === 'completed' || updates.status === 'failed') {
    dbUpdates.completed_at = new Date().toISOString();
    if (updates.status === 'completed') dbUpdates.progress = 100;
  }

  const { error } = await supabase
    .from('jobs')
    .update(dbUpdates)
    .eq('id', jobId);
  if (error) {
    console.error(`[DB Error] Lỗi cập nhật status job ${jobId}:`, error.message);
  }
}

/**
 * 3. Lưu trữ kịch bản video (Script) và các Phân cảnh (Scenes) kèm Timing Karaoke (Transcripts)
 */
export async function saveVideoScriptAndStructure(jobId, scriptData) {
  if (!supabase) return null;
  const scriptId = crypto.randomUUID();

  // A. Lưu Script tổng quát
  const { error: scriptError } = await supabase
    .from('scripts')
    .insert([{
      id: scriptId,
      job_id: jobId,
      title: scriptData.title || 'Untitled',
      content_type: scriptData.contentType || 'repo_overview',
      duration: scriptData.duration || 0,
      raw_data: scriptData
    }]);
  if (scriptError) {
    console.error('[DB Error] Lỗi lưu script:', scriptError.message);
    throw scriptError;
  }

  // B. Lưu từng Scene & Transcripts đi kèm
  if (Array.isArray(scriptData.scenes)) {
    for (let i = 0; i < scriptData.scenes.length; i++) {
      const s = scriptData.scenes[i];
      const sceneId = crypto.randomUUID();
      s.id = sceneId; // Lưu lại ID database để dùng cập nhật thông tin âm thanh/phụ đề sau đó

      // Tách riêng layout_data động chứa các thông tin visual (headline, bento, steps, button...)
      const { voice, layout, duration, audioStart, audioPath, srtPath, srtContent, ...visualFields } = s;

      // Lưu Scene
      const { error: sceneError } = await supabase
        .from('scenes')
        .insert([{
          id: sceneId,
          script_id: scriptId,
          job_id: jobId,
          scene_index: i + 1,
          voice_text: voice || '',
          audio_path: audioPath || null,
          srt_path: srtPath || null,
          srt_content: srtContent || null,
          layout_type: layout || 'intro',
          duration: duration || 0,
          audio_start: audioStart || 0,
          layout_data: visualFields
        }]);
      if (sceneError) {
        console.error('[DB Error] Lỗi lưu scene:', sceneError.message);
        throw sceneError;
      }

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
        if (tsError) {
          console.error('[DB Error] Lỗi lưu transcripts:', tsError.message);
          throw tsError;
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
  if (!supabase) return null;
  const renderId = crypto.randomUUID();

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
  if (error) {
    console.error('[DB Error] Lỗi lưu renders:', error.message);
  }
  return renderId;
}

/**
 * 5. Cập nhật thông tin file âm thanh và phụ đề của phân cảnh sau khi sinh xong
 */
export async function updateSceneAudioAndSrt(sceneId, audioPath, srtPath, srtContent) {
  if (!supabase) return;
  const { error } = await supabase
    .from('scenes')
    .update({
      audio_path: audioPath,
      srt_path: srtPath,
      srt_content: srtContent
    })
    .eq('id', sceneId);
  if (error) {
    console.error(`[DB Error] Lỗi cập nhật scene ${sceneId}:`, error.message);
  }
}

/**
 * 6. Lấy danh sách 20 Jobs gần đây nhất kèm theo tệp Render (nếu có)
 */
export async function getRecentJobs(limit = 20) {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('jobs')
    .select('*, renders(file_path)')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) {
    console.error('[DB Error] Lỗi lấy danh sách job:', error.message);
    return [];
  }
  return data;
}
