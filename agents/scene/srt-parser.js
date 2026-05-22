export function parseSRT(srt) {
  const blocks = srt.replace(/\r\n/g, '\n').trim().split(/\n\n+/);
  return blocks.map(b => {
    const lines = b.split('\n');
    const time = lines[1] || '';
    const [from, to] = time.split(' --> ').map(t => t.trim());
    return { from, to, text: lines.slice(2).join(' ') };
  }).filter(x => x.from && x.to);
}

export function srtToMs(t) {
  const [h, m, rest] = t.split(':');
  const [s, ms] = rest.split(',');
  return (+h) * 3600000 + (+m) * 60000 + (+s) * 1000 + (+ms);
}

/**
 * Gom các SRT chunk nhỏ (1-2 từ) thành "beats" lớn hơn dựa trên khoảng lặng:
 * - Nếu gap giữa 2 chunk < GAP_THRESHOLD ms → merge vào cùng 1 beat
 * - Trả về array { from, to, text, words[] } đã được gom
 */
export function groupSRTIntoBeats(subsArr, gapThresholdMs = 400) {
  if (!subsArr.length) return [];
  const beats = [];
  let current = { ...subsArr[0], words: subsArr[0].text.trim().split(/\s+/).filter(Boolean) };

  for (let i = 1; i < subsArr.length; i++) {
    const chunk = subsArr[i];
    const gap = chunk.from - current.to;
    if (gap < gapThresholdMs) {
      // Merge vào beat hiện tại
      current.to = chunk.to;
      current.text = (current.text + ' ' + chunk.text).trim();
      current.words.push(...chunk.text.trim().split(/\s+/).filter(Boolean));
    } else {
      beats.push(current);
      current = { ...chunk, words: chunk.text.trim().split(/\s+/).filter(Boolean) };
    }
  }
  beats.push(current);
  return beats;
}

/**
 * Tạo VOICE TIMELINE string dạng bảng rõ ràng để inject vào prompt:
 * AI biết chính xác text nào cần hiển thị tại thời điểm nào.
 *
 * Format mỗi dòng:
 * [beat N] from→to ms | "text đầy đủ" | keyword: "từ quan trọng nhất"
 */
export function buildVoiceTimeline(subsArr) {
  const beats = groupSRTIntoBeats(subsArr, 400);
  if (!beats.length) return '(không có SRT)';

  const lines = beats.map((b, i) => {
    const durationMs = b.to - b.from;
    // Keyword = từ dài nhất hoặc từ số/viết tắt trong beat
    const keyword = b.words.reduce((best, w) => {
      // Ưu tiên: số, viết hoa ALL_CAPS, từ dài
      if (/[0-9]/.test(w) && w.length > best.length) return w;
      if (w === w.toUpperCase() && w.length > 2 && w.length > best.length) return w;
      if (w.length > best.length) return w;
      return best;
    }, '');
    return `  [Beat ${i + 1}] ${b.from}ms → ${b.to}ms (${durationMs}ms) | TEXT: "${b.text}" | KEYWORD: "${keyword}"`;
  });

  return lines.join('\n');
}

// EOF: agents/scene/srt-parser.js
