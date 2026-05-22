// src/agents/scene/compositionBuilder.js
// Builds a multi-scene composition by INLINING all scene HTML bodies
// into one root HTML — no fetch() needed, works with file:// protocol.

/**
 * Extract body content, head styles, and inline script text from a scene HTML.
 */
function extractSceneParts(html) {
  if (!html) return { bodyContent: '', headStyles: '', scriptTags: '', cdnScripts: [] };

  const headStyles = (html.match(/<style[^>]*>([\s\S]*?)<\/style>/gi) || [])
    .map(s => s.replace(/<\/?style[^>]*>/gi, ''))
    .join('\n');

  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  let bodyContent = bodyMatch ? bodyMatch[1] : '';
  bodyContent = bodyContent.replace(/<script[\s\S]*?<\/script>/gi, '');

  // Collect CDN script src URLs (e.g. tsParticles, gsap plugins)
  const cdnScripts = [];
  const srcRegex = /<script[^>]+\bsrc\s*=\s*["']([^"']+)["'][^>]*>\s*<\/script>/gi;
  let srcMatch;
  while ((srcMatch = srcRegex.exec(html)) !== null) {
    cdnScripts.push(srcMatch[1]);
  }

  // Only inline scripts (no src attribute)
  const scriptTags = (html.match(/<script(?![^>]*\bsrc\b)[^>]*>([\s\S]*?)<\/script>/gi) || [])
    .map(s => s.replace(/<\/?script[^>]*>/gi, ''))
    .join('\n');

  return { bodyContent, headStyles, scriptTags, cdnScripts };
}

/**
 * Build GSAP transition code between scenes.
 */
function buildTransitionCode(scenes, type, durSec) {
  if (scenes.length <= 1) return '// Single scene — no transitions';
  const lines = [];
  let timeOffset = 0;
  for (let i = 0; i < scenes.length - 1; i++) {
    const transStart = ((timeOffset + scenes[i].duration) / 1000 - durSec).toFixed(3);
    timeOffset += scenes[i].duration;
    const cur  = scenes[i].stt;
    const next = scenes[i + 1].stt;
    switch (type) {
      case 'push':
        lines.push(`tl.to('#scene-${cur}',{xPercent:-100,duration:${durSec},ease:'power2.inOut'},${transStart});`);
        lines.push(`tl.fromTo('#scene-${next}',{xPercent:100,opacity:1},{xPercent:0,duration:${durSec},ease:'power2.inOut'},${transStart});`);
        break;
      case 'zoom':
        lines.push(`tl.to('#scene-${cur}',{scale:1.3,opacity:0,duration:${durSec},ease:'power3.in'},${transStart});`);
        lines.push(`tl.fromTo('#scene-${next}',{scale:0.7,opacity:0},{scale:1,opacity:1,duration:${durSec},ease:'power3.out'},${transStart});`);
        break;
      case 'blur':
        lines.push(`tl.to('#scene-${cur}',{opacity:0,filter:'blur(20px)',duration:${durSec},ease:'power2.inOut'},${transStart});`);
        lines.push(`tl.fromTo('#scene-${next}',{opacity:0,filter:'blur(20px)'},{opacity:1,filter:'blur(0px)',duration:${durSec},ease:'power2.inOut'},${transStart});`);
        break;
      default: // crossfade
        lines.push(`tl.to('#scene-${cur}',{opacity:0,duration:${durSec},ease:'power2.inOut'},${transStart});`);
        lines.push(`tl.fromTo('#scene-${next}',{opacity:0},{opacity:1,duration:${durSec},ease:'power2.inOut'},${transStart});`);
    }
  }
  return lines.join('\n      ');
}

/**
 * Build root composition HTML — all scene bodies inlined, GSAP controls transitions.
 * @param {{ html: string, stt: number, duration: number }[]} scenes
 * @param {{ w: number, h: number, transitionType?: string, transitionDuration?: number }} opts
 * @returns {string}
 */
export function buildRootComposition(scenes, opts) {
  const { w, h, transitionType = 'crossfade', transitionDuration = 0.4 } = opts;

  let timeOffset = 0;
  const blocks = scenes.map(s => {
    const start = (timeOffset / 1000).toFixed(3);
    const dur   = (s.duration / 1000).toFixed(3);
    timeOffset += s.duration;
    return { stt: s.stt, start, dur, ...extractSceneParts(s.html) };
  });

  const transCode = buildTransitionCode(scenes, transitionType, transitionDuration);
  const firstStt  = scenes[0]?.stt ?? 1;

  // Collect ALL CDN script URLs from all scenes, deduplicate
  const cdnSet = new Set();
  // Always include GSAP
  cdnSet.add('https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js');
  for (const b of blocks) {
    for (const url of (b.cdnScripts || [])) {
      cdnSet.add(url);
    }
  }
  // Remove GSAP from CDN set — it's already first
  cdnSet.delete('https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js');
  const extraCdnTags = [...cdnSet].map(url => `<script src="${url}"><\\/script>`).join('\n');

  // Scoped CSS per scene
  const allStyles = blocks.map(b =>
    `#scene-${b.stt}{position:absolute;top:0;left:0;width:${w}px;height:${h}px;overflow:hidden;}\n${b.headStyles || ''}`
  ).join('\n\n');

  // Inlined scene divs (hidden by default — GSAP transitions them)
  const sceneDivs = blocks.map(b => `
  <div id="scene-${b.stt}" data-scene="${b.stt}" data-start="${b.start}" data-duration="${b.dur}"
       style="position:absolute;top:0;left:0;width:${w}px;height:${h}px;overflow:hidden;opacity:0;">
    ${b.bodyContent}
  </div>`).join('\n');

  // Per-scene animation scripts, each in its own IIFE, timeline key renamed
  const sceneScripts = blocks.map(b => {
    if (!b.scriptTags.trim()) return `// scene-${b.stt}: no inline script`;
    let fixed = b.scriptTags
      // Rename main timeline registration to per-scene key
      .replace(/window\.__timelines\s*\[\s*["']main["']\s*\]/g,
               `window.__timelines["scene-${b.stt}"]`)
      // Remove redundant re-initialization of __timelines object
      .replace(/window\.__timelines\s*=\s*window\.__timelines\s*\|\|\s*\{\s*\}\s*;?/g, '');
    return `// scene-${b.stt}\n(function(){\ntry {\n${fixed}\n} catch(e) { console.warn('[Scene ${b.stt}] init error:', e.message); }\n})();`;
  }).join('\n\n');

  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8">
<script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"><\/script>
${extraCdnTags}
<style>
*{box-sizing:border-box;}
html,body{width:${w}px;height:${h}px;margin:0;padding:0;overflow:hidden;background:#05050a;}
#cr{position:relative;width:${w}px;height:${h}px;overflow:hidden;}
${allStyles}
</style></head><body>
<div id="cr">${sceneDivs}
</div>
<script>
window.__timelines = window.__timelines || {};
${sceneScripts}
(function(){
  var tl = gsap.timeline({ paused: true });
  gsap.set('#scene-${firstStt}', { opacity: 1 });
  ${transCode}
  window.__timelines["main"] = tl;
  window.__compReady = true;
  console.log('[Comp] ready | dur=' + tl.duration().toFixed(2) + 's');
})();
<\/script>
</body></html>`;
}

/**
 * Wrap a scene HTML as a sub-composition (kept for b5-html.js compatibility).
 * In the inline approach, buildRootComposition reads html directly — this is a no-op passthrough.
 */
export function wrapAsSubComposition(html, compositionId, w, h) {
  return html;
}

// EOF: src/agents/scene/compositionBuilder.js
