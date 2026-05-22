// Node.js v22+ có global fetch built-in — không cần node-fetch
import fs from 'fs';
import { spawn } from 'child_process';
import { FFMPEG_BIN, FFPROBE_BIN } from '../utils/binPaths.js';

const LARVOICE_API      = 'https://larvoice.com/api/v2';
const DEFAULT_LARVOICE_ID = 1;

const fmtMs = ms => ms < 60000
  ? `${(ms / 1000).toFixed(1)}s`
  : `${Math.floor(ms / 60000)}m${Math.round((ms % 60000) / 1000)}s`;

function probeAudioDuration(file) {
  return new Promise((resolve, reject) => {
    const p = spawn(FFPROBE_BIN, ['-v', 'error', '-show_entries', 'format=duration',
      '-of', 'default=noprint_wrappers=1:nokey=1', file]);
    let out = '';
    p.stdout.on('data', d => out += d);
    p.on('close', c => c === 0 ? resolve(parseFloat(out)) : reject(new Error('ffprobe failed')));
  });
}

/**
 * @param {string} text
 * @param {string} outputPath  — đường dẫn file .mp3 đầu ra
 * @param {(msg:string)=>void} [onLog]
 * @param {{ larvoiceKeys?: string[], larvoiceKey?: string, larvoiceVoiceId?: string|number, outputLanguage?: string, sessionId?: string }} [keys]
 */
export async function generateTTS(text, outputPath, onLog, keys = {}) {
  // Sequential TTS per session — tránh LarVoice server mix up response khi
  // nhiều request concurrent cùng account (nguyên nhân "voice sai cảnh/trùng lặp").
  // Whisper + SRT chạy SAU generateTTS nên vẫn parallel được ở bước kế.
  const sessionId = keys?.sessionId || '_default';
  return withTTSLock(sessionId, () => generateTTS_LarVoice(text, outputPath, onLog, keys));
}

// ─── Per-session TTS mutex ────────────────────────────────────────────────
// Queue mỗi TTS call cùng session đi tuần tự (1 task 1 lúc).
// Sessions khác nhau vẫn parallel bình thường.
const _ttsLocks = new Map(); // sessionId → Promise chain

async function withTTSLock(sessionId, fn) {
  const prev = _ttsLocks.get(sessionId) || Promise.resolve();
  // Gắn vào cuối chain — task mới chờ task trước xong (kể cả fail) mới chạy
  const next = prev.then(fn, fn);
  // Lưu next lên map — `.catch(() => {})` để 1 task fail không block queue
  _ttsLocks.set(sessionId, next.catch(() => {}));
  return next;
}

/** Clear TTS lock khi pipeline kết thúc (gọi từ orchestrator cùng với clearTTSKeyState). */
export function clearTTSLock(sessionId) {
  if (sessionId) _ttsLocks.delete(sessionId);
}

// ─── Multi-key rotation state ────────────────────────────────────────────
// Sticky per-session: dùng key đầu tiên cho tới khi gặp lỗi auth/credit/rate-limit
// → rotate sang key kế tiếp. Các scene TTS parallel cùng session chia sẻ index.
// Map: sessionId → { idx, exhausted: Set<number> }
const _sessionKeyState = new Map();

function getSessionKeyState(sessionId) {
  if (!sessionId) return { idx: 0, exhausted: new Set() };
  let s = _sessionKeyState.get(sessionId);
  if (!s) {
    s = { idx: 0, exhausted: new Set() };
    _sessionKeyState.set(sessionId, s);
  }
  return s;
}

/** Rotate sang key kế tiếp chưa exhausted. Return index mới, hoặc -1 nếu hết key. */
function rotateToNextKey(sessionId, totalKeys, failedIdx, onLog) {
  const s = getSessionKeyState(sessionId);
  // Chỉ mark exhausted nếu chính key `failedIdx` đang active (tránh double rotate khi parallel)
  if (failedIdx === s.idx) {
    s.exhausted.add(failedIdx);
    // Tìm key kế tiếp chưa exhausted
    let next = (s.idx + 1) % totalKeys;
    let steps = 0;
    while (s.exhausted.has(next) && steps < totalKeys) {
      next = (next + 1) % totalKeys;
      steps++;
    }
    if (s.exhausted.size >= totalKeys) return -1;
    s.idx = next;
    onLog?.(`🔄 LarVoice: chuyển sang key #${next + 1}/${totalKeys}`);
  }
  // Return current idx (có thể đã được call khác rotate rồi)
  return s.exhausted.size >= totalKeys ? -1 : s.idx;
}

/** Phân loại lỗi — có nên rotate key không? */
function isKeyExhaustedError(err) {
  const msg = (err?.message || '').toLowerCase();
  return /http 40[13]/i.test(msg)           // 401, 403
    || /http 429/i.test(msg)                 // rate limit
    || /invalid token/i.test(msg)
    || /key không hợp lệ/i.test(msg)
    || /insufficient/i.test(msg)
    || /credit|quota/i.test(msg)
    || /too many request/i.test(msg);
}

/** Clear rotation state khi pipeline kết thúc (gọi từ orchestrator). */
export function clearTTSKeyState(sessionId) {
  if (sessionId) _sessionKeyState.delete(sessionId);
}

/** Normalize keys input: hỗ trợ cả `larvoiceKeys[]` (mới) và `larvoiceKey` (cũ). */
function normalizeKeyList(keysObj) {
  const arr = Array.isArray(keysObj.larvoiceKeys) ? keysObj.larvoiceKeys : [];
  const list = arr.length ? arr : (keysObj.larvoiceKey ? [keysObj.larvoiceKey] : []);
  return list
    .map(k => String(k || '').trim().replace(/^Bearer\s+/i, ''))
    .filter(Boolean);
}

/**
 * Pre-validate LarVoice API keys — fail-fast trước khi chạy pipeline
 * để tránh tốn AI credits cho B2/B2.5 khi tất cả key đều sai.
 * Chấp nhận CHỈ CẦN 1 key hợp lệ — key khác có thể hết credit/sai, sẽ rotate khi chạy TTS.
 * @param {string[]|string} keysInput
 * @throws {Error} nếu tất cả key đều invalid hoặc network fail
 */
export async function validateLarvoiceKey(keysInput) {
  const list = Array.isArray(keysInput)
    ? keysInput.map(k => String(k || '').trim().replace(/^Bearer\s+/i, '')).filter(Boolean)
    : (keysInput ? [String(keysInput).trim().replace(/^Bearer\s+/i, '')] : []);
  if (!list.length) throw new Error('Thiếu LarVoice API key — nhập key trong AI Setting');

  const errors = [];
  for (let i = 0; i < list.length; i++) {
    const key = list[i];
    try {
      const res = await fetch(`${LARVOICE_API}/me`, {
        headers: { Authorization: `Bearer ${key}` },
        signal: AbortSignal.timeout(15000),
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => '');
        errors.push(`Key #${i + 1}: HTTP ${res.status} ${txt.slice(0, 80)}`);
        continue;
      }
      const data = await res.json().catch(() => ({}));
      if (data?.status === 'error' || data?.error) {
        errors.push(`Key #${i + 1}: ${data.error || 'lỗi'}`);
        continue;
      }
      // Tìm thấy 1 key hợp lệ → OK
      return;
    } catch (e) {
      errors.push(`Key #${i + 1}: ${e.message}`);
    }
  }
  // Tất cả key fail
  throw new Error(`Tất cả ${list.length} LarVoice key đều lỗi: ${errors.join(' | ').slice(0, 400)}`);
}


// ─── LarVoice TTS ────────────────────────────────────────────────────────────

async function generateTTS_LarVoice(text, outputPath, onLog, keys = {}) {
  const keyList = normalizeKeyList(keys);
  if (!keyList.length) throw new Error('Thiếu LarVoice API key — nhập key trên giao diện');

  const voiceId = Number(keys.larvoiceVoiceId) || DEFAULT_LARVOICE_ID;
  const language = keys.outputLanguage === 'en' ? 'en' : 'vi';
  const sessionId = keys.sessionId || null;
  const preview = text.slice(0, 60) + (text.length > 60 ? '…' : '');
  const t0 = Date.now();
  const MAX_RETRIES_PER_KEY = 3;

  // Outer loop: rotate qua từng key nếu key hiện tại exhausted
  const startIdx = getSessionKeyState(sessionId).idx;
  for (let keyAttempt = 0; keyAttempt < keyList.length; keyAttempt++) {
    const state = getSessionKeyState(sessionId);
    const currentIdx = state.idx;
    // Nếu key đã exhausted (do call khác rotate) → skip
    if (state.exhausted.has(currentIdx)) {
      if (state.exhausted.size >= keyList.length) {
        throw new Error(`Tất cả ${keyList.length} LarVoice key đều hết credit/lỗi auth`);
      }
      continue;
    }
    const apiKey = keyList[currentIdx];
    const keyLabel = keyList.length > 1 ? ` [key #${currentIdx + 1}/${keyList.length}]` : '';

    // Inner loop: retry cùng key cho lỗi transient (500/timeout/network)
    let rotateNeeded = false;
    let lastErr;
    for (let attempt = 1; attempt <= MAX_RETRIES_PER_KEY; attempt++) {
      if (attempt > 1) onLog?.(`TTS LarVoice${keyLabel}: Thử lại lần ${attempt}/${MAX_RETRIES_PER_KEY}...`);
      try {
        onLog?.(`TTS LarVoice${keyLabel}: "${preview}" (voice=${voiceId}, lang=${language})`);
        onLog?.(`TTS LarVoice${keyLabel}: Gửi yêu cầu tới LarVoice...`);
        const createRes = await fetch(`${LARVOICE_API}/tts_stream`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text, ref_voice_id: voiceId, language,
            audio_format: 'mp3', quality: 'mini',
            speed: 1.0, run_speed: 1.0, pitch: 1.0, volume: 1.0, strength: 2.2,
          }),
          signal: AbortSignal.timeout(60000),
        });

        if (!createRes.ok) {
          const errText = await createRes.text().catch(() => '');
          throw new Error(`LarVoice HTTP ${createRes.status}: ${errText.slice(0, 200)}`);
        }

        const createData = await createRes.json();
        onLog?.(`TTS LarVoice${keyLabel}: raw response = ${JSON.stringify(createData).slice(0, 200)}`);
        if (createData.status !== 'success') {
          throw new Error(`LarVoice tạo task thất bại: ${JSON.stringify(createData)}`);
        }

        const data = createData.data || createData;
        const audioUrl = data.download_url || data.downloadUrl;
        const streamStatusUrl = data.stream_status_url || `${LARVOICE_API}/download/${data.uuid}/stream_status`;
        // v1.6.9: LarVoice trả subtitle_url (SRT chuẩn) — app có thể dùng thay Whisper local
        // để né crash CPU không AVX2 + tăng tốc pipeline (skip Whisper + SRT fix AI).
        // Trim vì API đôi khi trả URL có trailing space.
        const subtitleUrl = (data.subtitle_url || data.subtitleUrl || '').trim() || null;
        if (!audioUrl) throw new Error(`LarVoice không có download_url: ${JSON.stringify(createData)}`);

        // Fix 4: Sanity check uuid ↔ download_url — nếu LarVoice server mix up
        // response khi nhiều request concurrent, UUID sẽ không có trong URL.
        // Pattern thường: https://cdn.../tts/<uuid>.mp3 hoặc .../audio/<uuid>/...
        const uuidStr = String(data.uuid || data.task_id || '').trim();
        if (uuidStr && uuidStr.length >= 8 && !audioUrl.includes(uuidStr)) {
          onLog?.(`⚠ LarVoice response mismatch: uuid=${uuidStr.slice(0, 12)} KHÔNG có trong url=${audioUrl.slice(0, 100)} — có thể bị lẫn cảnh, thử lại...`);
          throw new Error(`LarVoice response mismatch (uuid=${uuidStr.slice(0, 12)})`);
        }

        onLog?.(`TTS LarVoice${keyLabel}: Chờ render hoàn tất...`);
        await waitForStreamComplete(apiKey, streamStatusUrl, onLog);

        onLog?.(`TTS LarVoice${keyLabel}: Tải audio từ ${audioUrl.slice(0, 80)}...`);
        const audioRes = await fetch(audioUrl, { signal: AbortSignal.timeout(120000) });
        if (!audioRes.ok) throw new Error(`Download audio HTTP ${audioRes.status}`);
        const buffer = Buffer.from(await audioRes.arrayBuffer());
        fs.writeFileSync(outputPath, buffer);

        const duration = await probeAudioDuration(outputPath);
        const kb = (fs.statSync(outputPath).size / 1024).toFixed(0);
        const uuid = data.uuid || data.task_id || '';
        onLog?.(`✓ TTS LarVoice${keyLabel} xong: ${duration.toFixed(1)}s audio (${kb} KB) | uuid=${String(uuid).slice(0, 12)} | ${fmtMs(Date.now() - t0)}`);
        return { duration, uuid: String(uuid), subtitleUrl };

      } catch (err) {
        lastErr = err;
        onLog?.(`TTS LarVoice${keyLabel}: Lỗi lần ${attempt}: ${err.message}`);
        // Key exhausted/auth fail → rotate ngay, không retry với key này
        if (isKeyExhaustedError(err)) {
          rotateNeeded = true;
          break;
        }
        // Transient error → retry với cùng key
        if (attempt === MAX_RETRIES_PER_KEY) break;
        await new Promise(r => setTimeout(r, 3000));
      }
    }

    // Hết retry cho key hiện tại
    if (rotateNeeded && keyList.length > 1) {
      const nextIdx = rotateToNextKey(sessionId, keyList.length, currentIdx, onLog);
      if (nextIdx === -1) {
        throw new Error(`Tất cả ${keyList.length} LarVoice key đều hết credit/lỗi auth. Lỗi cuối: ${lastErr?.message || 'unknown'}`);
      }
      continue; // dùng key mới
    }
    // Không phải lỗi key → throw luôn (dù có nhiều key, lỗi này không rotate được)
    if (lastErr) {
      // Nếu là auth error mà chỉ có 1 key → message rõ
      if (isKeyExhaustedError(lastErr) && keyList.length === 1) {
        throw new Error(`LarVoice key không hợp lệ hoặc hết credit (${lastErr.message.slice(0, 100)}) — kiểm tra lại key trong AI Setting`);
      }
      throw lastErr;
    }
  }
  throw new Error(`Tất cả ${keyList.length} LarVoice key đều không dùng được (đã thử từ key #${startIdx + 1})`);
}

/** Poll stream_status cho đến khi render xong (started → processing → completed) */
async function waitForStreamComplete(apiKey, streamStatusUrl, onLog) {
  const MAX_WAIT = 150; // ~5 phút (150 * 2s)
  for (let i = 0; i < MAX_WAIT; i++) {
    await new Promise(r => setTimeout(r, 2000));
    try {
      const res = await fetch(streamStatusUrl, {
        headers: { Authorization: `Bearer ${apiKey}` },
        signal: AbortSignal.timeout(15000),
      });
      if (!res.ok) continue;
      const data = await res.json();
      const status = data.status || data.global_status;
      if (i % 3 === 0) onLog?.(`TTS LarVoice: stream_status=${status}`);
      if (status === 'completed' || status === 'done') {
        onLog?.(`TTS LarVoice: ✓ Render hoàn tất`);
        return;
      }
      if (status === 'failed' || status === 'error') {
        throw new Error(`LarVoice render thất bại: ${JSON.stringify(data)}`);
      }
    } catch (e) {
      if (e.message.includes('render thất bại')) throw e;
      // Network error → retry silently
    }
  }
  throw new Error('LarVoice TTS timeout — render chưa xong sau 5 phút');
}
