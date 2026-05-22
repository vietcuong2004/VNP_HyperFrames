// src/agents/scene/srt-parser_en.js — English version of srt-parser.js

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
 * Groups small SRT chunks (1-2 words) into larger "beats" based on silence gaps:
 * - If gap between 2 chunks < GAP_THRESHOLD ms → merge into the same beat
 * - Returns array { from, to, text, words[] } of merged beats
 */
export function groupSRTIntoBeats(subsArr, gapThresholdMs = 400) {
  if (!subsArr.length) return [];
  const beats = [];
  let current = { ...subsArr[0], words: subsArr[0].text.trim().split(/\s+/).filter(Boolean) };

  for (let i = 1; i < subsArr.length; i++) {
    const chunk = subsArr[i];
    const gap = chunk.from - current.to;
    if (gap < gapThresholdMs) {
      // Merge into current beat
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
 * Builds a VOICE TIMELINE string as a clear table to inject into the prompt:
 * AI knows exactly which text to display at which timestamp.
 *
 * Format per line:
 * [beat N] from→to ms | "full text" | keyword: "most important word"
 */
export function buildVoiceTimeline(subsArr) {
  const beats = groupSRTIntoBeats(subsArr, 400);
  if (!beats.length) return '(no SRT available)';

  const lines = beats.map((b, i) => {
    const durationMs = b.to - b.from;
    // Keyword = longest word, or number/abbreviation in beat
    const keyword = b.words.reduce((best, w) => {
      // Priority: numbers, ALL_CAPS words, longest word
      if (/[0-9]/.test(w) && w.length > best.length) return w;
      if (w === w.toUpperCase() && w.length > 2 && w.length > best.length) return w;
      if (w.length > best.length) return w;
      return best;
    }, '');
    return `  [Beat ${i + 1}] ${b.from}ms → ${b.to}ms (${durationMs}ms) | TEXT: "${b.text}" | KEYWORD: "${keyword}"`;
  });

  return lines.join('\n');
}

// EOF: agents/scene/srt-parser_en.js
