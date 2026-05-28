// src/agents/scene/prompts-en.js — HyperFrames-aligned prompt templates (English)
// Pure GSAP, window.__timelines, visual styles, motion principles, advanced techniques

export const SCENE_PROMPT_EN = `Create a cinematic HTML composition for Chrome headless {{W}}×{{H}}px ({{RATIO_LABEL}}). Render via puppeteer screencast → mp4.

━━━ CRITICAL — READ BEFORE DOING ANYTHING ━━━

You are NOT building a webpage. You are constructing a CINEMATIC VIDEO COMPOSITION.

MANDATORY:
• Pure GSAP timeline — NO anime.js, NO disconnected setTimeout, NO CSS @keyframes for timing
• Register timeline: window.__timelines["main"] = tl;
• Timeline { paused: true }: var tl = gsap.timeline({ paused: true });
• Minimum 3 depth layers (far → mid → near foreground)
• Camera movement (slow zoom / pan / parallax shift)
• Continuous motion — NO element static > 500ms
• Lighting effects (glow, shadow, light sweep, radial gradient)

AVOID:
• Static center-aligned web layouts
• Same ease on every tween — use at least 3 different eases per scene
• Same entrance direction — vary: left, right, scale, opacity-only, letter-spacing
• repeat: -1 — always finite: repeat: Math.ceil(dur/cycle) - 1
• Starting at t=0 — offset first animation 0.1-0.3s
• Flat UI; any element static > 500ms

GOAL: Apple keynote / high-end tech ad / cinematic motion graphics.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚠️ NO full-sentence captions (subtitles burn-in later via ffmpeg).
✅ Keywords (1-2 words), Statistics, Short labels (2-4 words) ALLOWED.

Duration: {{DURATION}}ms | Voice: "{{VOICE}}" | Visual: "{{VISUAL}}"

════════════════════════════════════════
DIRECTOR + ANIMATION SPEC
════════════════════════════════════════
{{CINEMATIC_DIRECTION}}
{{ANIMATION_SPEC}}
{{TIMELINE_SKELETON}}
{{VISUAL_STYLE_BLOCK}}

COMPOSITION PARAMETERS BY RATIO:
{{ASPECT_RATIO_RULES}}

════════════════════════════════════════
PART 1 — MANDATORY HTML FRAMEWORK
════════════════════════════════════════

<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">
<script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"><\/script>
<!-- ADD GSAP PLUGINS IF NEEDED (max 4 total CDNs) -->
<style>
*{box-sizing:border-box}
html,body{width:{{W}}px;height:{{H}}px;margin:0;padding:0;overflow:hidden;background:#05050a;font-family:'Be Vietnam Pro',sans-serif;-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility}
#stage{position:absolute;inset:0;width:{{W}}px;height:{{H}}px;overflow:hidden;background:radial-gradient(ellipse at 50% 30%,#1a1a2e 0%,#0a0a14 60%,#05050a 100%);color:#fff}
#particles-bg{position:absolute;inset:0;z-index:1;pointer-events:none}
.grid-bg{position:absolute;inset:0;background-image:linear-gradient(rgba(247,181,0,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(247,181,0,0.04) 1px,transparent 1px);background-size:60px 60px;pointer-events:none;z-index:2}
.txt{display:block;line-height:1.5;overflow:visible;padding-top:0.15em;padding-bottom:0.05em;letter-spacing:0.3px}
.vignette{position:absolute;inset:0;background:radial-gradient(circle at center,transparent 55%,rgba(0,0,0,0.75));pointer-events:none;z-index:90}
.scan{position:absolute;inset:0;background:repeating-linear-gradient(180deg,rgba(255,255,255,0.025) 0px,rgba(255,255,255,0.025) 2px,transparent 2px,transparent 4px);pointer-events:none;z-index:91}
.noise{position:absolute;inset:0;opacity:.07;pointer-events:none;z-index:92;background-image:url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZmlsdGVyIGlkPSJuIj48ZmVUdXJidWxlbmNlIHR5cGU9ImZyYWN0YWxOb2lzZSIgYmFzZUZyZXF1ZW5jeT0iMC45IiBudW1PY3RhdmVzPSIzIi8+PC9maWx0ZXI+PHJlY3Qgd2lkdGg9IjIwMCIgaGVpZ2h0PSIyMDAiIGZpbHRlcj0idXJsKCNuKSIgb3BhY2l0eT0iMC42Ii8+PC9zdmc+')}
.progress{position:absolute;bottom:0;left:0;height:6px;background:linear-gradient(90deg,#F7B500,#FFD93D);width:0;z-index:99;box-shadow:0 0 20px #F7B500}
#content{position:absolute;inset:10px;overflow:visible;z-index:3;pointer-events:none}
</style></head><body>
<div id="stage">
  <div id="particles-bg"></div>
  <div class="grid-bg"></div>
  <div id="content"><!-- ALL CONTENT z-index 10-80 --></div>
  <div class="vignette"></div><div class="scan"></div><div class="noise"></div>
  <div class="progress" id="progress"></div>
</div>
<script>
window.__timelines = window.__timelines || {};
var tl = gsap.timeline({ paused: true });
var DUR = {{DURATION}}/1000;
tl.to('#progress',{width:{{W}},duration:DUR,ease:'none'},0);
// ═══ SCENE CODE HERE ═══
window.__timelines["main"] = tl;
<\/script></body></html>

CRITICAL TEMPLATE RULES:
• NO anime.js — REMOVED. Use ONLY GSAP.
• NO Google Fonts <link> — write font-family in CSS, fonts auto-embedded.
• Timeline is { paused: true } + registered via window.__timelines["main"].
• NO repeat: -1 — use: repeat: Math.ceil(DUR / cycleDur) - 1
• NO setTimeout — use tl.to/from/call with position parameter.
• For background ambient loops: use finite repeat count.

════════════════════════════════════════
PART 2 — CDN LIBRARIES (STRICT WHITELIST)
════════════════════════════════════════

CORE (always loaded): GSAP 3.14.2

GSAP PLUGINS — ONLY these 5 are supported (use EXACTLY these URLs):
• TextPlugin       — typewriter/text reveal
  <script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/TextPlugin.min.js"><\/script>
• MotionPathPlugin — path animation
  <script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/MotionPathPlugin.min.js"><\/script>
• CSSRulePlugin    — manipulate CSS rules (shared styling)
  <script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/CSSRulePlugin.min.js"><\/script>
• ScrollTrigger    — rarely needed for video, but supported
  <script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/ScrollTrigger.min.js"><\/script>
• CustomEase       — custom cubic-bezier easing
  <script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/CustomEase.min.js"><\/script>

OPTIONAL:
• CountUp.js 2.8.0: <script src="https://cdnjs.cloudflare.com/ajax/libs/countup.js/2.8.0/countUp.umd.js"><\/script>
• tsParticles slim 2.12.0: <script src="https://cdn.jsdelivr.net/npm/tsparticles-slim@2.12.0/tsparticles.slim.bundle.min.js"><\/script>
• Three.js r128 (ONLY when 3D needed): <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"><\/script>

BANNED (will crash render, DO NOT use or invent URLs for these):
• anime.js, p5.js
• Paid GSAP plugins: DrawSVGPlugin, SplitText, MorphSVG, Flip, Physics2D, Observer
• Any other JS lib not listed above — do NOT fabricate CDN URLs

REQUIRED:
1. If using a plugin, MUST include its <script src="..."> in <head>
2. MUST call gsap.registerPlugin(PluginName) before using it
3. If unsure — use GSAP core only, don't guess plugin availability

════════════════════════════════════════
PART 3 — MOTION PRINCIPLES (follow strictly)
════════════════════════════════════════

▶ EASING IS EMOTION:
• .out eases for ENTRANCES (starts fast, decelerates — feels responsive)
• .in eases for EXITS (starts slow, accelerates away)
• .inOut for elements MOVING BETWEEN positions
Using ease-in for entrances feels sluggish. Using ease-out for exits feels reluctant. Don't!

▶ SPEED = WEIGHT:
• Fast 0.15-0.3s = energy, urgency • Medium 0.3-0.5s = professional
• Slow 0.5-0.8s = gravity, luxury • Very slow 0.8-2s = cinematic, atmospheric

▶ SCENE STRUCTURE — BUILD / BREATHE / RESOLVE:
• Build (0-30%): elements enter staggered. Don't dump everything at once.
• Breathe (30-70%): content visible, ONE ambient motion. Not static.
• Resolve (70-100%): exit/decisive end. Exits faster than entrances.

▶ CHOREOGRAPHY = HIERARCHY:
• Element that moves first = perceived as most important
• Stagger in order of importance, NOT DOM order
• Overlap entries — total stagger sequence under 500ms regardless of item count

▶ ASYMMETRY: Entrances longer than exits (card: 0.4s appear, 0.25s disappear)

▶ VISUAL COMPOSITION:
• Two focal points minimum — eye needs somewhere to travel
• Fill the frame: hero text 60-80% of width. No web-sized elements.
• Three layers minimum: background treatment + foreground content + accent elements
• Background is NOT empty: radial glows, oversized faded type, hairline rules
• Anchor to edges — pin content left/top or right/bottom
• Use structural elements: rules, dividers, border panels — they animate well (scaleX from 0)

════════════════════════════════════════
PART 4 — TYPOGRAPHY RULES
════════════════════════════════════════

CACHED FONTS (use directly — no import needed, already embedded):
• "Be Vietnam Pro" — main sans-serif (weight 400/600/700/800/900, italic available)
• "IBM Plex Mono" — mono accent, data labels (weight 400/500/600/700)
• "Oswald" — condensed display/headline (weight 400/500/600/700)
USE ONLY these 3 fonts. Any other font will render as fallback system font.
Default: hero headlines → "Oswald", body/labels → "Be Vietnam Pro", data → "IBM Plex Mono".

BANNED FONTS (not in cache → renders as ugly fallback):
Inter, Roboto, Open Sans, Noto Sans, Lato, Poppins, Outfit, Sora, Playfair Display,
Cormorant Garamond, Bodoni Moda, EB Garamond, Cinzel, Prata, Syne, Arimo, PT Sans, Nunito,
Bebas Neue, Montserrat, Raleway, Ubuntu, Fira Sans, Source Sans, Barlow, DM Sans

RULES:
• Don't pair two sans-serifs — cross the boundary: serif + sans, or sans + mono
• Weight contrast must be extreme: 300 vs 900. Not 400 vs 700.
• Video sizes: Body 20px min, Headlines 60px+, Data labels 16px+
• Tracking tighter than web: -0.03em to -0.05em on display sizes
• font-variant-numeric: tabular-nums on any stacked numbers
• Dark backgrounds: use font-weight 350 instead of 400 for body text
• Just write font-family in CSS — fonts auto-embedded, only use the 3 cached fonts above

════════════════════════════════════════
PART 5 — ADVANCED VISUAL TECHNIQUES (use 2-3 per scene)
════════════════════════════════════════

A) SVG PATH DRAWING — reveal diagrams, arrows, brand marks:
var path = document.querySelector('.draw-path');
var len = path.getTotalLength();
gsap.set(path, {strokeDasharray: len, strokeDashoffset: len});
tl.to(path, {strokeDashoffset: 0, duration: 0.7, ease: 'power2.out'}, 0.5);

B) CANVAS 2D PROCEDURAL ART — noise, particles, data viz with GSAP proxy:
var proxy = {time: 0};
tl.to(proxy, {time: DUR, duration: DUR, ease: 'none', onUpdate: function(){ drawFrame(proxy.time); }}, 0);
Use deterministic hash function — no Math.random().

C) CSS 3D TRANSFORMS — perspective rotations for depth:
<div style="perspective:900px"><div class="card-3d" style="transform-style:preserve-3d">
tl.to('.card-3d', {rotationY: 360, rotationX: 15, duration: 1.2, ease: 'sine.inOut'}, 0);

D) PER-WORD KINETIC TYPOGRAPHY — words appear one-by-one:
Wrap each word in <span class="word">, stagger with tl.from('.word', {x: slides[i], y: 14, opacity: 0, duration: 0.35, ease: 'power2.out'}, timings[i]);
Slide distance DECAYS per word (80→12px) — mimics camera settling.

E) MARKER HIGHLIGHT — sweep, circle, burst on emphasis words:
Highlight sweep: tl.to('#hl-bar', {scaleX: 1, duration: 0.5, ease: 'power2.out'}, time);
Circle ring: tl.to('#circle', {scale: 1, duration: 0.6, ease: 'back.out(1.7)'}, time);

F) TYPEWRITER EFFECT — with GSAP TextPlugin (NOT setTimeout):
gsap.registerPlugin(TextPlugin);
tl.to('#typed', {text: {value: text}, duration: text.length / 10, ease: 'none'}, startTime);

════════════════════════════════════════
PART 6 — CINEMATIC SYSTEMS (MANDATORY)
════════════════════════════════════════

▶ FAKE CAMERA (MANDATORY — at least 1, runs throughout):
Option A — Slow zoom-in:
  tl.to('#stage', { scale: 1.08, duration: DUR, ease: 'none', transformOrigin: 'center center' }, 0);
Option B — Pan drift:
  tl.to('#content', { x: -40, duration: DUR, ease: 'sine.inOut' }, 0);
Option C — Parallax (3+ layers):
  tl.to('.layer-far', { x: -20, duration: DUR, ease: 'none' }, 0);
  tl.to('.layer-near', { x: -60, duration: DUR, ease: 'none' }, 0);

▶ AMBIENT MOTION (MANDATORY — use FINITE repeats):
var cycles = Math.ceil(DUR / 3);
tl.to('.floating', { y: '+=20', duration: 3, repeat: cycles - 1, yoyo: true, ease: 'sine.inOut' }, 0);
tl.to('.pulse', { scale: 1.05, duration: 2, repeat: Math.ceil(DUR/2) - 1, yoyo: true, ease: 'sine.inOut' }, 0);
tl.to('.drift', { x: '+=30', y: '+=15', duration: 5, repeat: Math.ceil(DUR/5) - 1, yoyo: true, ease: 'sine.inOut' }, 0);

▶ LIGHTING LAYER (MANDATORY — min 1 light element):
CSS: .light-glow { position:absolute; width:500px; height:500px;
  background:radial-gradient(circle, rgba(PRIMARY_COLOR,0.25), transparent 70%);
  filter:blur(80px); pointer-events:none; z-index:5; }
Place 1-2 div.light-glow in corners or behind subject, animate with drift.

▶ DEPTH LAYERS (MANDATORY — min 3):
• FAR  (z:0-2): grid-bg, starfield, noise — opacity 0.03-0.08
• MID  (z:3-8): bokeh circles, light-glow, lines — opacity 0.1-0.3
• NEAR (z:30-50): hero text, main icon, cards — opacity 1.0, drop-shadow

════════════════════════════════════════
PART 7 — EFFECTS LIBRARY
════════════════════════════════════════

ENTER (choose 1/element, GSAP only):
A) Pop-in glow: tl.from(el, {scale:0, opacity:0, filter:'blur(20px)', duration:0.5, ease:'back.out(1.7)'}, t)
B) Slide up: tl.from(el, {y:80, opacity:0, duration:0.6, ease:'expo.out'}, t)
C) Clip reveal: tl.from(el, {clipPath:'inset(0 100% 0 0)', duration:0.7, ease:'power3.inOut'}, t)
D) 3D flip: tl.from(el, {rotationX:90, opacity:0, duration:0.5, ease:'back.out(1.4)'}, t)
E) Elastic: tl.from(el, {scale:0, duration:0.8, ease:'elastic.out(1,0.5)'}, t)
F) Morph: tl.from(el, {borderRadius:'50%', scale:0.3, duration:0.6, ease:'expo.out'}, t)

EXIT:
A) Fade: tl.to(el, {opacity:0, duration:0.3, ease:'power2.in'}, exitTime)
B) Shrink: tl.to(el, {scale:0.8, opacity:0, duration:0.35, ease:'power2.in'}, exitTime)
C) Slide out: tl.to(el, {y:-60, opacity:0, duration:0.4, ease:'power3.in'}, exitTime)
D) Shatter: tl.to(el, {scale:1.15, opacity:0, filter:'blur(20px)', duration:0.5}, exitTime)

EMPHASIS at keywords:
• Shake: tl.to(el, {x:[-12,12,-8,8,-4,4,0], duration:0.5}, emphTime)
• Glow burst: tl.to(el, {textShadow:'0 0 60px #F7B500', duration:0.3}, emphTime)
• Screen flash: tl.fromTo('.flash-overlay', {opacity:0}, {opacity:0.12, duration:0.09, yoyo:true, repeat:1}, emphTime)

════════════════════════════════════════
PART 8 — MOTION FLOW (every beat must follow)
════════════════════════════════════════

HOOK (0–300ms from beat.from): Flash/glitch/attention grab. Never skip.
BUILD (300–800ms): Main element appears. Visual anchor visible before end.
IMPACT (800–1200ms): Emphasis — shake, scale overshoot, glow burst. Strongest state.
REVEAL (1200ms+ → beat.to): Hold clear visuals, ambient loop. Prepare exit.
Short beat (<1500ms): HOOK+BUILD 0-500ms, IMPACT 500-800ms, REVEAL 800ms+.

════════════════════════════════════════
PART 9 — VISUAL COMPOSITION & SAFE ZONE
════════════════════════════════════════

Safe zone: ALL content in div#content (inset:10px, overflow:visible).
Content area: width={{CONTENT_W}}px, height={{CONTENT_H}}px.
Padding: left/right {{SIDE_PADDING}}px, top {{TOP_PADDING}}px, bottom {{BOTTOM_PADDING}}px.
Text max-width: {{TEXT_MAX_W}}px. Hero max-width: {{HERO_MAX_W}}px.
Subject max-height: {{SUBJECT_MAX_H}}px. Text block max-height: {{TEXT_BLOCK_MAX_H}}px.
Central safe area: {{SAFE_CENTER_W}}px × {{SAFE_CENTER_H}}px.
Split gap: {{SPLIT_GAP}}px min.
Lower third (y > {{LOWER_THIRD_Y}}px) reserved for subtitles — keep clean.
Main content: y = 60px to {{CONTENT_MAX_Y}}px.

Layouts: HERO | SPLIT | STACK | ORBIT | TIMELINE | CHART | PHONE MOCKUP | DASHBOARD | VERSUS | REVEAL
Choose by ratio: 9:16 → HERO/STACK/PHONE; 16:9 → SPLIT/TIMELINE/CHART; 1:1 → HERO/ORBIT

Depth z-index: 0=three-bg | 1=particles | 2=grid | 10-20=deco | 30-50=content | 60-80=foreground | 90-99=overlays

════════════════════════════════════════
PART 10 — VOICE TIMELINE & TEXT-SYNC
════════════════════════════════════════

{{SUBS}}

TEXT-SYNC RULES:
⛔ NO full voiceover sentences on screen
✅ Keywords (1-2 words), statistics, short labels (2-4 words) from beat TEXT/KEYWORD
• Visual enters at beat.from (±200ms max deviation)
• ENTER: 350-500ms | HOLD: min 1500ms (with pulse/glow/float) | EXIT: 250-350ms ending at beat.to
• Each beat: 1 clear visual anchor (keyword | number | icon)
• Animation continuous 0ms→{{DURATION}}ms; no static gap >1200ms
• Final beat = CLIMAX: scale +15%, glow intensify, hold until {{DURATION}}ms
• Vary layout patterns between beats (HERO → SPLIT → STACK → back to HERO etc.)
• After last beat.to: climax pulse loop fills remaining time until {{DURATION}}ms
• CRITICAL: timeline must reach exactly {{DURATION}}ms — no early cutoff, no dead silence at end

════════════════════════════════════════
PART 11 — BRAND & PROJECT ASSETS
════════════════════════════════════════

Brand assets (NAME | TYPE | PATH [| DURATION]):
{{BRAND_ASSETS}}
• character → MANDATORY use 1 fitting character. Max 1 character + 1 background.
• image → <img src="PATH">; gif → <img src="PATH">; video → <video src="PATH" autoplay muted loop playsinline>

Project assets (NAME | TYPE | PATH | ASPECT_RATIO):
{{PROJECT_ASSETS}}
• If not "(none)" → MANDATORY use ALL listed assets. Each asset has [SRC="..."] — copy the EXACT value inside quotes into src="" of <img>/<video>. Do NOT invent filenames. Do NOT modify the URL.
• USAGE BY TYPE:
  - Product/food/real-estate/landscape photos → use as BACKGROUND COVER or hero image filling ≥50% of frame
    Example: <img src="PATH" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:0;opacity:0.85">
    Or: background-image:url('PATH');background-size:cover;background-position:center
  - Logo/icon → corner placement, 60-120px size, high z-index
  - Illustration/infographic → hero section, 40-70% of frame, with animation (scale, parallax, reveal)
• MANDATORY RULES:
  - NEVER make images smaller than 30% of frame — must be prominent, visible on mobile
  - Prefer using photos as background layer (z-index:0) with gradient overlay for text readability
  - If image IS the main content (product, food, house) → MUST fill ≥60% of frame, animate with zoom/pan
  - Add dark overlay on background images: linear-gradient(to bottom, rgba(0,0,0,0.3), rgba(0,0,0,0.7))

════════════════════════════════════════
PART 12 — STYLE GUIDE
════════════════════════════════════════

{{STYLE_GUIDE}}

{{PALETTE_LOCK}}

════════════════════════════════════════
PART 13 — TECHNICAL SPECS & CONSTRAINTS
════════════════════════════════════════

• Code: 300-650 lines. Max 750 lines. File MUST end with <\/script></body></html>.
• GSAP ONLY — NO anime.js. Declaration: var tl = gsap.timeline({ paused: true }); var DUR = {{DURATION}}/1000;
• Register as LAST statement: window.__timelines["main"] = tl;
• NO repeat: -1 anywhere — use Math.ceil(DUR/cycle)-1 for every repeat.
• All ambient loops (.floating, .pulse, .drift, camera) → inside tl at position 0, NOT standalone gsap.to().
• NO setTimeout for timing — use tl.to/from/call with position parameter.
• NO Google Fonts <link> — write font-family in CSS. ONLY use: "Oswald", "Be Vietnam Pro", "IBM Plex Mono".
• Max 4 CDN imports. Use will-change:transform for heavy animations.
• DOM elements: 30-160. Easing: explicit on every tween.
• Three.js: core only, alpha:true, particles ≤5000, camera drift slow.
• FORBIDDEN: external images, external video, heavy WebGL textures, iframes, flex on body.
• All text: class="txt" or line-height:1.5 + overflow:visible + padding-top:0.15em.

════════════════════════════════════════
FINAL CHECKLIST
════════════════════════════════════════

✓ window.__timelines["main"] = tl; is present — LAST LINE before </script>
✓ var tl = gsap.timeline({ paused: true }); — MUST be paused + var (not const)
✓ var DUR = {{DURATION}}/1000; declared right after tl
✓ NO anime.js anywhere; NO <link> for Google Fonts
✓ NO repeat: -1 anywhere — all repeats use Math.ceil(DUR/cycle)-1
✓ All ambient loops (.floating, .pulse, .drift) are INSIDE tl at position 0 — not gsap.to()
✓ Camera tween uses duration: DUR — covers full scene length
✓ Animation fills 0ms→{{DURATION}}ms — no dead gap >1500ms, no early cutoff
✓ After last beat.to: climax pulse loop fills remaining time until {{DURATION}}ms
✓ Final beat = climax, scale +15%, glow intensify, held until {{DURATION}}ms
✓ ≥3 depth layers, FAKE CAMERA, ≥1 light-glow, ≥1 ambient loop
✓ Each beat: visual anchor, 4 stages (HOOK→BUILD→IMPACT→REVEAL)
✓ Each element: enter + exit at correct times; exit at beat.to
✓ Eases: at least 3 different eases; .out for enter, .in for exit
✓ Entrance directions varied across elements
✓ Layout patterns vary between beats
✓ NO full sentences on screen — only keywords/stats/labels
✓ Fonts: ONLY "Oswald", "Be Vietnam Pro", "IBM Plex Mono" — no other fonts
✓ All text: class="txt" or line-height:1.5 + overflow:visible + padding-top:0.15em
✓ All content in #content (safe zone 10px), layout follows ratio rules
✓ Brand/project assets used if provided
✓ File complete: ends with <\/script></body></html>

ONLY return <!DOCTYPE html>...</html>. NO markdown fences, NO explanations.`;

// ═══════════════════════════════════════════════════════════════
// EDIT HTML PROMPT
// ═══════════════════════════════════════════════════════════════

export const EDIT_HTML_PROMPT = `You are an expert HTML animation editor. Modify the HTML below per the user's request.

EDIT REQUEST:
{{EDIT_PROMPT}}

CURRENT HTML:
{{CURRENT_HTML}}

MANDATORY RULES:
• Only change what is requested; keep everything else intact.
• Preserve: #stage, #content, vignette, scan, noise, progress, window.__timelines registration.
• Preserve timing, GSAP timeline, CDN imports.
• File must end with <\/script></body></html>.
• NO anime.js — use ONLY GSAP. NO repeat: -1 — finite repeats only.
• ONLY return <!DOCTYPE html>...</html>. No markdown, no explanations.`;

// ═══════════════════════════════════════════════════════════════
// EDIT THUMBNAIL PROMPT
// ═══════════════════════════════════════════════════════════════

export const EDIT_THUMBNAIL_HTML_PROMPT = `You are an expert static HTML thumbnail editor.

EDIT REQUEST:
{{EDIT_PROMPT}}

CURRENT HTML:
{{CURRENT_HTML}}

MANDATORY RULES:
• This is a STATIC THUMBNAIL — no video scene.
• Only change what is requested.
• NO animations, NO anime.js, NO gsap timelines, NO requestAnimationFrame, NO setTimeout.
• Static layout, clear subject, large text, strong contrast.
• ONLY return <!DOCTYPE html>...</html>. No markdown, no explanations.`;

// EOF: agents/scene/prompts-en.js