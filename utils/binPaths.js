import path from 'path';
import ffmpeg from 'ffmpeg-static';
import ffprobe from 'ffprobe-static';

const appRoot = process.env.APP_ROOT || process.cwd();

// Phân giải đường dẫn tĩnh từ các thư viện npm đã được cài đặt sẵn
export const FFMPEG_BIN = ffmpeg;
export const FFPROBE_BIN = ffprobe.path || ffprobe;

// Các đường dẫn cho whisper.cpp local (nếu được tải về sau này)
export const WHISPER_BIN = path.resolve(appRoot, 'binaries', 'whisper', 'whisper-cli.exe');
export const WHISPER_MODEL = path.resolve(appRoot, 'binaries', 'whisper', 'ggml-base.bin');

/**
 * Trả về đường dẫn binary whisper phù hợp với cấu hình CPU
 * @param {'main'|'legacy'} variant 
 * @returns {string}
 */
export function getWhisperBin(variant = 'main') {
  if (variant === 'legacy') {
    return path.resolve(appRoot, 'binaries', 'whisper', 'whisper-cli-openblas.exe');
  }
  return WHISPER_BIN;
}
