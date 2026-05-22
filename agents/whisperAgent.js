// src/agents/whisperAgent.js
// Transcribe audio → SRT bằng whisper.cpp (binary native).
// Trước đây dùng faster-whisper (Python) nhưng yêu cầu user cài Python + PyTorch.
// whisper.cpp tự chứa, được bundle trong binaries/whisper/whisper-cli.exe + ggml-base.bin.
//
// Fallback: nếu không có binary bundled → thử Python script cũ (legacy).

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { WHISPER_BIN, WHISPER_MODEL, FFMPEG_BIN, getWhisperBin } from '../utils/binPaths.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fmtMs = ms => ms < 60000 ? `${(ms/1000).toFixed(1)}s` : `${Math.floor(ms/60000)}m${Math.round((ms%60000)/1000)}s`;

/**
 * @param {string} audioPath  - file mp3/wav/m4a
 * @param {string} srtPath    - đường dẫn SRT output
 * @param {(msg:string)=>void} [onLog]
 * @param {string} [language]  - 'vi', 'en', hoặc 'auto' (mặc định)
 * @param {'main'|'legacy'} [variant] - 'legacy' = OpenBLAS cho CPU cũ không AVX2
 */
export async function transcribeToSRT(audioPath, srtPath, onLog, language = 'auto', variant = 'main') {
  const whisperExe = getWhisperBin(variant);
  onLog?.(`Whisper${variant === 'legacy' ? ' (CPU cũ)' : ''}: ${path.basename(audioPath)} (lang=${language})`);
  const t0 = Date.now();

  // whisper.cpp cần WAV 16kHz mono — convert tạm bằng ffmpeg
  const wavPath = audioPath + '.16k.wav';
  await new Promise((resolve, reject) => {
    const p = spawn(FFMPEG_BIN, [
      '-y', '-i', audioPath,
      '-ar', '16000', '-ac', '1', '-c:a', 'pcm_s16le',
      wavPath,
    ], { stdio: ['ignore', 'ignore', 'pipe'] });
    let err = '';
    p.stderr.on('data', d => err += d);
    p.on('close', c => c === 0 ? resolve() : reject(new Error('ffmpeg WAV convert lỗi: ' + err.slice(-300))));
  });

  if (!fs.existsSync(WHISPER_MODEL)) {
    fs.unlinkSync(wavPath);
    throw new Error(
      `Không tìm thấy whisper model tại ${WHISPER_MODEL}.\n` +
      `Chạy: node scripts/download-binaries.mjs để tải.`
    );
  }

  // whisper.cpp output prefix — sẽ tự thêm .srt
  const outPrefix = srtPath.replace(/\.srt$/, '');
  const args = [
    '-m', WHISPER_MODEL,
    '-f', wavPath,
    '-l', language || 'auto',  // 'vi', 'en', hoặc 'auto'
    '--output-srt',
    '--output-file', outPrefix,
    '--max-len', '20',     // mỗi caption tối đa 20 ký tự (TikTok karaoke style)
    '--split-on-word',     // không cắt giữa từ
    '-pp',                 // print progress
  ];

  return new Promise((resolve, reject) => {
    const proc = spawn(whisperExe, args, { stdio: ['ignore', 'pipe', 'pipe'] });

    let err = '';
    let lastProgress = 0;
    proc.stderr.on('data', d => {
      err += d;
      const text = d.toString();
      // Bắt progress: "whisper_print_progress_callback: progress = 50%"
      const m = text.match(/progress\s*=\s*(\d+)%/);
      if (m) {
        const p = Number(m[1]);
        if (p >= lastProgress + 20 || p === 100) {
          lastProgress = p;
          onLog?.(`Whisper: ${p}%`);
        }
      }
    });

    proc.on('close', code => {
      try { fs.unlinkSync(wavPath); } catch {}

      // whisper-cli ghi file là "<outPrefix>.srt"
      const generated = outPrefix + '.srt';
      const finalPath = generated === srtPath ? srtPath : srtPath;
      if (generated !== srtPath && fs.existsSync(generated)) {
        try { fs.renameSync(generated, srtPath); } catch {}
      }

      if (code === 0 && fs.existsSync(srtPath)) {
        const srt = fs.readFileSync(srtPath, 'utf8');
        const blocks = srt.trim().split(/\n{2,}/).length;
        onLog?.(`✓ Whisper xong: ${blocks} dòng phụ đề | ${fmtMs(Date.now() - t0)}`);
        resolve();
      } else {
        const fullErr = `whisper-cli exit ${code}: ${err.slice(-500)}`;
        onLog?.(`✗ Whisper lỗi: ${fullErr.slice(0, 200)}`);
        // v1.7.0: Exit 3221225501 = STATUS_ILLEGAL_INSTRUCTION (CPU thiếu AVX2)
        // Gợi ý user chuyển sang "Whisper (CPU cũ)" hoặc "LarVoice" trong Settings.
        if (code === 3221225501 || code === -1073741795) {
          onLog?.('⚠ CPU không hỗ trợ AVX2 → vào Cài đặt → Nguồn phụ đề → chọn "Whisper (CPU cũ)" hoặc "LarVoice".');
        }
        reject(new Error(fullErr));
      }
    });

    proc.on('error', e => {
      try { fs.unlinkSync(wavPath); } catch {}
      onLog?.(`✗ Whisper spawn lỗi: ${e.message}`);
      reject(new Error(
        `Không thể chạy whisper-cli (${whisperExe}). ` +
        `Chạy: node scripts/download-binaries.mjs để tải binary.`
      ));
    });
  });
}
