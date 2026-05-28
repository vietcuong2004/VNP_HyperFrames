/**
 * Dựng cấu trúc timeline gợi ý dưới dạng text block để hướng dẫn AI căn chỉnh animation.
 * @param {any} animSpec - Đặc tả hoạt ảnh
 * @param {Array<{ from: number, to: number, text: string }>} beats - Các phân đoạn phụ đề được nhóm
 * @returns {string}
 */
export function timelineToPromptBlock(animSpec, beats) {
  const lines = [
    `SUGGESTED GSAP TIMELINE STRUCTURE (SKELETON):`,
    `Below is the chronological breakdown of voice-over beats. You MUST program your GSAP timeline`,
    `to synchronize visual changes precisely at these times (specified in seconds):`,
    ``
  ];

  if (!beats || beats.length === 0) {
    lines.push(`• No beats detected. Apply default continuous animation across 0s to ${(animSpec.duration / 1000).toFixed(1)}s.`);
    return lines.join('\n');
  }

  beats.forEach((beat, idx) => {
    const fromSec = (beat.from / 1000).toFixed(3);
    const toSec = (beat.to / 1000).toFixed(3);
    const durSec = ((beat.to - beat.from) / 1000).toFixed(3);
    const isLast = idx === beats.length - 1;

    lines.push(`• Beat ${idx + 1} [t = ${fromSec}s to ${toSec}s, duration = ${durSec}s]`);
    lines.push(`  - Voice text: "${beat.text}"`);
    lines.push(`  - Enter: Animate visual element (card, text, highlight) starting at ${fromSec}s (duration ~0.35s).`);
    if (isLast) {
      lines.push(`  - Climax Loop: Keep this final visual element on stage, trigger zoom/glow pulse loop from ${fromSec}s until end of scene at ${(animSpec.duration / 1000).toFixed(3)}s.`);
    } else {
      lines.push(`  - Exit: Animate visual element out starting at ${(beat.to / 1000 - 0.25).toFixed(3)}s (duration ~0.25s).`);
    }
    lines.push(``);
  });

  return lines.join('\n');
}
