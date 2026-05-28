// src/agents/scene/prompts-lite-en.js — Compact prompt (English) — ~40% token vs full
// Same output format + constraints as full, minus verbose examples/explanations

export const SCENE_PROMPT_LITE_EN = `HTML cinematic composition {{W}}×{{H}}px ({{RATIO_LABEL}}). Puppeteer screencast → mp4.

━━━ RULES ━━━
• Pure GSAP timeline, paused: var tl = gsap.timeline({ paused: true }); var DUR = {{DURATION}}/1000;
• Register: window.__timelines["main"] = tl; (LAST line before <\/script>)
• NO anime.js, NO setTimeout, NO CSS @keyframes, NO repeat:-1
• repeat: Math.ceil(DUR/cycle)-1 for all loops
• Ambient loops inside tl at position 0 (NOT standalone gsap.to)
• ≥3 depth layers + fake camera (zoom/pan/parallax for full DUR) + ≥1 light-glow
• Continuous motion — NO static >500ms. ≥3 different eases
• Fonts ONLY: "Be Vietnam Pro", "IBM Plex Mono", "Oswald". NO other fonts.
• All text: class="txt" (line-height:1.5;overflow:visible;padding-top:0.15em)
• NO overflow:hidden on text containers
• NO full sentences — only keywords/numbers/short labels (subtitles burned by ffmpeg)
• Code 300-650 lines. Max 750. End with: <\/script></body></html>
• Max 4 CDN imports. DOM 30-160 elements.

━━━ CONTENT ━━━
Duration: {{DURATION}}ms | Voice: "{{VOICE}}" | Visual: "{{VISUAL}}"

{{CINEMATIC_DIRECTION}}
{{ANIMATION_SPEC}}
{{TIMELINE_SKELETON}}
{{VISUAL_STYLE_BLOCK}}

━━━ VIEWPORT ━━━
{{ASPECT_RATIO_RULES}}
Safe zone: #content (inset:10px) = {{CONTENT_W}}×{{CONTENT_H}}px.
Padding: L/R {{SIDE_PADDING}}px, T {{TOP_PADDING}}px, B {{BOTTOM_PADDING}}px.
Text max: {{TEXT_MAX_W}}px. Hero: {{HERO_MAX_W}}px. Subject max-h: {{SUBJECT_MAX_H}}px.
Lower third (y>{{LOWER_THIRD_Y}}px) = subtitle zone. Content: y 60-{{CONTENT_MAX_Y}}px.

━━━ VOICE TIMELINE ━━━
{{SUBS}}

• Visual enters at beat.from (±200ms). ENTER 350-500ms | HOLD ≥1500ms | EXIT 250-350ms
• Each beat: 1 visual anchor (keyword|number|icon). Vary layout between beats.
• Last beat = CLIMAX: scale+15%, strong glow, hold to end. Then pulse loop to {{DURATION}}ms.
• Continuous animation 0→{{DURATION}}ms, no gap >1200ms.

━━━ ASSETS ━━━
Brand: {{BRAND_ASSETS}}
Project: {{PROJECT_ASSETS}}
• If assets provided → MUST use them. Copy EXACT [SRC="..."] into src="".
• Main image → background cover ≥50% frame + overlay gradient. Logo → corner, 60-120px.

━━━ STYLE GUIDE ━━━
{{STYLE_GUIDE}}

{{PALETTE_LOCK}}

━━━ HTML TEMPLATE ━━━
<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">
<script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"><\/script>
<style>
*{box-sizing:border-box}
html,body{width:{{W}}px;height:{{H}}px;margin:0;padding:0;overflow:hidden;background:#05050a;font-family:'Be Vietnam Pro',Arial,sans-serif;-webkit-font-smoothing:antialiased}
#stage{position:absolute;inset:0;width:{{W}}px;height:{{H}}px;overflow:hidden;background:radial-gradient(ellipse at 50% 30%,#1a1a2e 0%,#0a0a14 60%,#05050a 100%);color:#fff}
#particles-bg{position:absolute;inset:0;z-index:1;pointer-events:none}
.txt{display:block;line-height:1.5;overflow:visible;padding-top:0.15em;padding-bottom:0.05em;letter-spacing:0.3px}
.vignette{position:absolute;inset:0;background:radial-gradient(circle at center,transparent 55%,rgba(0,0,0,0.75));pointer-events:none;z-index:90}
.noise{position:absolute;inset:0;opacity:.07;pointer-events:none;z-index:92;background-image:url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZmlsdGVyIGlkPSJuIj48ZmVUdXJidWxlbmNlIHR5cGU9ImZyYWN0YWxOb2lzZSIgYmFzZUZyZXF1ZW5jeT0iMC45IiBudW1PY3RhdmVzPSIzIi8+PC9maWx0ZXI+PHJlY3Qgd2lkdGg9IjIwMCIgaGVpZ2h0PSIyMDAiIGZpbHRlcj0idXJsKCNuKSIgb3BhY2l0eT0iMC42Ii8+PC9zdmc+')}
.progress{position:absolute;bottom:0;left:0;height:6px;background:linear-gradient(90deg,#F7B500,#FFD93D);width:0;z-index:99;box-shadow:0 0 20px #F7B500}
#content{position:absolute;inset:10px;overflow:visible;z-index:3;pointer-events:none}
</style></head><body>
<div id="stage">
  <div id="particles-bg"></div>
  <div id="content"><!-- SCENE CONTENT --></div>
  <div class="vignette"></div><div class="noise"></div>
  <div class="progress" id="progress"></div>
</div>
<script>
window.__timelines = window.__timelines || {};
var tl = gsap.timeline({ paused: true });
var DUR = {{DURATION}}/1000;
tl.to('#progress',{width:{{W}},duration:DUR,ease:'none'},0);
// ═══ SCENE CODE ═══
window.__timelines["main"] = tl;
<\/script></body></html>

ONLY return <!DOCTYPE html>...</html>. No markdown, no explanation.`;
// EOF: agents/scene/prompts-lite-en.js
