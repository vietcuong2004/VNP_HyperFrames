// src/agents/scene/prompts.js — HyperFrames-aligned prompt templates (Vietnamese) + fmtMs
// Pure GSAP, window.__timelines, visual styles, motion principles, advanced techniques

export const SCENE_PROMPT = `Tạo HTML composition cinematic cho Chrome headless {{W}}×{{H}}px ({{RATIO_LABEL}}). Render qua puppeteer screencast → mp4.

━━━ CRITICAL — ĐỌC TRƯỚC KHI LÀM BẤT CỨ GÌ ━━━

Bạn KHÔNG xây webpage. Bạn đang dựng một CINEMATIC VIDEO COMPOSITION.

BẮT BUỘC:
• Pure GSAP timeline — KHÔNG anime.js, KHÔNG setTimeout rời, KHÔNG CSS @keyframes cho timing
• Đăng ký timeline: window.__timelines["main"] = tl;
• Timeline { paused: true }: var tl = gsap.timeline({ paused: true });
• Tối thiểu 3 depth layers (far → mid → near foreground)
• Camera movement (slow zoom / pan / parallax shift)
• Continuous motion — KHÔNG element nào static > 500ms
• Lighting effects (glow, shadow, light sweep, radial gradient)

TRÁNH:
• Layout tĩnh căn giữa kiểu web
• Cùng 1 ease cho mọi tween — dùng ≥3 ease khác nhau mỗi scene
• Cùng hướng entrance — đa dạng: left, right, scale, opacity-only, letter-spacing
• repeat: -1 — luôn finite: repeat: Math.ceil(dur/cycle) - 1
• Bắt đầu tại t=0 — offset animation đầu 0.1-0.3s
• Flat UI; element static > 500ms

MỤC TIÊU: Apple keynote / high-end tech ad / cinematic motion graphics.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚠️ KHÔNG caption full câu (phụ đề burn-in sau bởi ffmpeg).
✅ Keyword (1-2 từ), Số liệu, Label ngắn (2-4 từ) ĐƯỢC PHÉP.

Thời lượng: {{DURATION}}ms | Voice: "{{VOICE}}" | Visual: "{{VISUAL}}"

TEXT DISCIPLINE:
Voice/SRT is narration timing only, not main on-screen copy.
Main #content must NOT contain any 5+ consecutive words copied from Voice/SRT.
Use this visual copy block for titles, labels, cards, counters and badges:
{{VISUAL_COPY}}

════════════════════════════════════════
ĐẠO DIỄN + ANIMATION SPEC
════════════════════════════════════════
{{CINEMATIC_DIRECTION}}
{{ANIMATION_SPEC}}
{{TIMELINE_SKELETON}}
{{VISUAL_STYLE_BLOCK}}

THAM SỐ BỐ CỤC THEO TỈ LỆ:
{{ASPECT_RATIO_RULES}}

════════════════════════════════════════
PHẦN 1 — KHUNG HTML BẮT BUỘC
════════════════════════════════════════

<!DOCTYPE html><html lang="vi"><head><meta charset="UTF-8">
<link href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;600;700;800;900&display=swap" rel="stylesheet">
<script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"><\/script>
<!-- THÊM GSAP PLUGINS NẾU CẦN (tối đa 4 CDN) -->
<style>
*{box-sizing:border-box}
html,body{width:{{W}}px;height:{{H}}px;margin:0;padding:0;overflow:hidden;background:#05050a;font-family:'Be Vietnam Pro',Arial,Helvetica,sans-serif;-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility}
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
  <div id="content"><!-- NỘI DUNG z-index 10-80 --></div>
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

QUY TẮC TEMPLATE:
• KHÔNG anime.js — ĐÃ XÓA. Chỉ dùng GSAP.
• KHÔNG Google Fonts <link> — viết font-family trong CSS, font tự nhúng.
• Timeline { paused: true } + đăng ký qua window.__timelines["main"].
• KHÔNG repeat: -1 — dùng: repeat: Math.ceil(DUR / cycleDur) - 1
• KHÔNG setTimeout — dùng tl.to/from/call với position parameter.
• Dùng "var" không phải "const" cho timeline.

════════════════════════════════════════
PHẦN 2 — THƯ VIỆN CDN (WHITELIST CHẶT)
════════════════════════════════════════

CORE: GSAP 3.14.2 (đã có sẵn, không cần import)

PLUGINS GSAP ĐƯỢC PHÉP (chỉ 5 cái — phải dùng URL CDN chính xác):
• TextPlugin        — typewriter/text reveal
• MotionPathPlugin  — animate theo đường path
• CSSRulePlugin     — edit CSS rule chung
• ScrollTrigger     — timeline trigger (dùng ít trong video)
• CustomEase        — easing custom từ cubic-bezier

TÙY CHỌN KHÁC:
• CountUp.js 2.8.0
• tsParticles slim 2.12.0
• Three.js r128 (chỉ khi cần 3D)

CẤM TUYỆT ĐỐI (AI không được sinh, sẽ crash render):
• anime.js, p5.js
• GSAP plugins trả phí: DrawSVGPlugin, SplitText, MorphSVG, Flip, Physics2D, Observer
• Các plugin/lib khác không nằm trong whitelist trên
• KHÔNG được "bịa" URL CDN mới — phải dùng các tên plugin trong whitelist

QUY TẮC BẮT BUỘC:
1. Nếu dùng plugin, PHẢI có <script src="..."> CDN của plugin đó trong <head>
2. PHẢI gọi gsap.registerPlugin(TênPlugin) trước khi dùng
3. Nếu không chắc plugin có work — DÙNG GSAP CORE, không "thử" plugin lạ

════════════════════════════════════════
PHẦN 3 — NGUYÊN TẮC MOTION
════════════════════════════════════════

▶ EASING = CẢM XÚC:
• .out cho ENTRANCE (nhanh → chậm dần — responsive)
• .in cho EXIT (chậm → tăng tốc — bay ra)
• .inOut cho di chuyển GIỮA các vị trí

▶ TỐC ĐỘ = TRỌNG LƯỢNG:
• Nhanh 0.15-0.3s = năng lượng • Trung bình 0.3-0.5s = chuyên nghiệp
• Chậm 0.5-0.8s = sang trọng • Rất chậm 0.8-2s = cinematic

▶ CẤU TRÚC SCENE — BUILD / BREATHE / RESOLVE:
• Build (0-30%): elements vào stagger. Không đổ hết cùng lúc.
• Breathe (30-70%): content hiển thị, 1 ambient motion.
• Resolve (70-100%): exit. Exit nhanh hơn entrance.

▶ CHOREOGRAPHY = THỨ BẬC:
• Element di chuyển TRƯỚC = quan trọng nhất
• Stagger theo thứ tự quan trọng, KHÔNG theo DOM
• Overlap entries — tổng stagger < 500ms

▶ BẤT ĐỐI XỨNG: Entrance dài hơn exit (card: 0.4s vào, 0.25s ra)

▶ BỐ CỤC HÌNH ẢNH:
• Ít nhất 2 điểm focal — mắt cần nơi di chuyển
• Fill frame: hero text 60-80% width
• 3 lớp tối thiểu: background + nội dung + accent
• Background KHÔNG trống: radial glow, text mờ cỡ lớn, đường kẻ
• Neo vào cạnh — pin content trái/trên hoặc phải/dưới

════════════════════════════════════════
PHẦN 4 — QUY TẮC TYPOGRAPHY
════════════════════════════════════════

FONT BỊ CẤM (không có trong cache → render lỗi hoặc fallback xấu):
Inter, Roboto, Open Sans, Noto Sans, Lato, Poppins, Outfit, Sora, Playfair Display,
Cormorant Garamond, Bodoni Moda, EB Garamond, Cinzel, Prata, Syne, Arimo, PT Sans, Nunito,
Bebas Neue, Montserrat, Raleway, Ubuntu, Fira Sans, Source Sans, Barlow, DM Sans

QUY TẮC:
• Không pair 2 sans-serif — dùng serif + sans, hoặc sans + mono
• Weight contrast cực mạnh: 300 vs 900
• Video sizes: Body 20px+, Headlines 60px+, Data labels 16px+
• font-variant-numeric: tabular-nums cho số xếp dọc
• Viết font-family trong CSS — chỉ dùng "Be Vietnam Pro", "IBM Plex Mono", "Oswald"

FONT ĐƯỢC CACHE SẴN (dùng trực tiếp, không cần import):
• "Be Vietnam Pro" — font CHÍNH cho tiếng Việt (weight 400/600/700/800/900, hỗ trợ đầy đủ dấu)
• "IBM Plex Mono" — mono accent, số liệu (weight 400/500/600/700)
• "Oswald" — display/headline tiếng Anh (weight 400/500/600/700, condensed)
CHỈ dùng 3 font trên. KHÔNG dùng font khác — font khác sẽ render thành ký tự lỗi.
Mặc định hero text dùng "Be Vietnam Pro". Mono accent dùng "IBM Plex Mono".

TIẾNG VIỆT — BẮT BUỘC:
• Mọi text: class="txt" hoặc line-height:1.5;overflow:visible;padding-top:0.15em
• KHÔNG overflow:hidden trên container text — dấu tiếng Việt bị cắt
• Margin-top tối thiểu 20px cho text — dấu không bị che

════════════════════════════════════════
PHẦN 5 — KỸ THUẬT HÌNH ẢNH NÂNG CAO (dùng 2-3/scene)
════════════════════════════════════════

A) SVG PATH DRAWING: gsap.set(path,{strokeDasharray:len,strokeDashoffset:len}); tl.to(path,{strokeDashoffset:0,...},t). KHONG dung drawSVG/DrawSVGPlugin.
B) CANVAS 2D với GSAP proxy: tl.to(proxy,{time:DUR,onUpdate:function(){drawFrame(proxy.time);}},0);
C) CSS 3D TRANSFORMS: perspective:900px + transform-style:preserve-3d + tl.to(el,{rotationY:360,...},t);
D) PER-WORD TYPOGRAPHY: Mỗi từ <span class="word">, stagger với slide decay 80→12px
E) MARKER HIGHLIGHT: sweep scaleX, circle ring back.out(1.7), burst
F) TYPEWRITER: gsap TextPlugin — tl.to(el,{text:{value:text},duration:len/10,ease:'none'},t);

════════════════════════════════════════
PHẦN 6 — HỆ THỐNG CINEMATIC (BẮT BUỘC)
════════════════════════════════════════

▶ FAKE CAMERA (tối thiểu 1, chạy suốt scene):
A) Slow zoom: tl.to('#stage',{scale:1.08,duration:DUR,ease:'none',transformOrigin:'center center'},0);
B) Pan drift: tl.to('#content',{x:-40,duration:DUR,ease:'sine.inOut'},0);
C) Parallax: tl.to('.layer-far',{x:-20,...},0); tl.to('.layer-near',{x:-60,...},0);

▶ AMBIENT MOTION (BẮT BUỘC — finite repeats):
var cycles = Math.ceil(DUR / 3);
tl.to('.floating',{y:'+=20',duration:3,repeat:cycles-1,yoyo:true,ease:'sine.inOut'},0);
tl.to('.pulse',{scale:1.05,duration:2,repeat:Math.ceil(DUR/2)-1,yoyo:true,ease:'sine.inOut'},0);

▶ LIGHTING LAYER (tối thiểu 1 light-glow): radial-gradient + blur 80px
▶ DEPTH LAYERS (tối thiểu 3): FAR z:0-2 | MID z:3-8 | NEAR z:30-50

════════════════════════════════════════
PHẦN 7 — EFFECTS (chỉ GSAP)
════════════════════════════════════════

ENTER: Pop-in | Slide up | Clip reveal | 3D flip | Elastic | Morph
EXIT: Fade | Shrink | Slide out | Shatter
EMPHASIS: Shake | Glow burst | Screen flash

════════════════════════════════════════
PHẦN 8 — MOTION FLOW (mỗi beat phải tuân theo)
════════════════════════════════════════

HOOK (0-300ms): Flash/glitch/attention grab. KHÔNG bỏ qua.
BUILD (300-800ms): Element chính xuất hiện. Visual anchor visible.
IMPACT (800-1200ms): Nhấn mạnh — shake, glow burst, scale overshoot.
REVEAL (1200ms+→beat.to): Giữ visual rõ, ambient loop. Chuẩn bị exit.

════════════════════════════════════════
PHẦN 9 — BỐ CỤC & SAFE ZONE
════════════════════════════════════════

Safe zone: content trong div#content (inset:10px).
Content: {{CONTENT_W}}px × {{CONTENT_H}}px.
Padding: trái/phải {{SIDE_PADDING}}px, trên {{TOP_PADDING}}px, dưới {{BOTTOM_PADDING}}px.
Text max-width: {{TEXT_MAX_W}}px. Hero: {{HERO_MAX_W}}px. Subject: {{SUBJECT_MAX_H}}px.
Central safe: {{SAFE_CENTER_W}}×{{SAFE_CENTER_H}}px. Split gap: {{SPLIT_GAP}}px.
Lower third (y>{{LOWER_THIRD_Y}}px) cho subtitles. Content chính: y 60-{{CONTENT_MAX_Y}}px.
Layouts: HERO | SPLIT | STACK | ORBIT | TIMELINE | CHART | PHONE | DASHBOARD | VERSUS | REVEAL

════════════════════════════════════════
PHẦN 10 — VOICE TIMELINE & TEXT-SYNC
════════════════════════════════════════

{{SUBS}}

⛔ KHÔNG render nguyên câu voice/SRT ra DOM
⛔ KHONG copy phrase dai tu Voice/SRT vao hero/card/title. Subtitle lower-third la noi duy nhat duoc chua cau voice.
✅ Keyword (1-2 từ), số liệu, label ngắn (2-4 từ) từ beat TEXT/KEYWORD
• Visual vào tại beat.from (±200ms). ENTER 350-500ms | HOLD ≥1500ms | EXIT 250-350ms tại beat.to
• Mỗi beat: 1 visual anchor (keyword | số | icon)
• Animation liên tục 0ms→{{DURATION}}ms; không static >1200ms
• Beat cuối = CLIMAX: scale +15%, glow mạnh, giữ đến hết scene
• Đổi layout pattern giữa beats. Sau beat cuối: climax pulse loop đến {{DURATION}}ms

════════════════════════════════════════
PHẦN 11 — TÀI NGUYÊN
════════════════════════════════════════

Brand assets: {{BRAND_ASSETS}}
• character → BẮT BUỘC dùng 1. image→<img>; gif→<img>; video→<video autoplay muted loop playsinline>

Project assets: {{PROJECT_ASSETS}}
• Nếu không "(none)" → BẮT BUỘC dùng TẤT CẢ.
• ⚠ CRITICAL: Mỗi asset có [SRC="..."] — copy CHÍNH XÁC giá trị trong ngoặc kép vào src="" của <img>/<video>. KHÔNG tự đặt tên file, KHÔNG dùng tên tiếng Việt, KHÔNG thay đổi URL.
• CÁCH DÙNG THEO LOẠI:
  - Ảnh sản phẩm/thực phẩm/bất động sản/phong cảnh → dùng làm BACKGROUND COVER hoặc hero image chiếm ≥50% frame
    Ví dụ: <img src="URL" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:0;opacity:0.85">
    Hoặc: background-image:url('URL');background-size:cover;background-position:center
  - Logo/icon → góc trên hoặc dưới, kích thước 60-120px, z-index cao
  - Ảnh minh họa/infographic → hero section, chiếm 40-70% frame, có animation (scale, parallax, reveal)
• QUY TẮC BẮT BUỘC:
  - KHÔNG để ảnh nhỏ hơn 30% frame — phải nổi bật, dễ nhìn trên mobile
  - Ưu tiên dùng ảnh làm background layer (z-index:0) với overlay gradient để text đọc được
  - Nếu ảnh là nội dung chính (sản phẩm, món ăn, nhà) → PHẢI chiếm ≥60% frame, có animation zoom/pan
  - Thêm overlay tối lên ảnh background: linear-gradient(to bottom, rgba(0,0,0,0.3), rgba(0,0,0,0.7))

════════════════════════════════════════
PHẦN 12 — STYLE GUIDE
════════════════════════════════════════

{{STYLE_GUIDE}}

{{PALETTE_LOCK}}

════════════════════════════════════════
PHẦN 13 — KỸ THUẬT & GIỚI HẠN
════════════════════════════════════════

• Code 300-650 dòng. Max 750. File kết thúc bằng <\/script></body></html>.
• CHỈ GSAP. Khai báo: var tl = gsap.timeline({ paused: true }); var DUR = {{DURATION}}/1000;
• Đăng ký dòng CUỐI CÙNG trước </script>: window.__timelines["main"] = tl;
• KHÔNG repeat: -1 — dùng Math.ceil(DUR/cycle)-1 cho mọi repeat.
• Ambient loops (.floating, .pulse, .drift, camera) → trong tl tại position 0, KHÔNG standalone gsap.to().
• KHÔNG setTimeout. KHÔNG anime.js. KHÔNG Google Fonts <link>.
• Max 4 CDN. will-change:transform cho heavy animations. DOM 30-160.
• Mọi text: class="txt" + overflow:visible.

════════════════════════════════════════
CHECKLIST CUỐI CÙNG
════════════════════════════════════════

✓ window.__timelines["main"] = tl; có mặt — dòng CUỐI trước </script>
✓ var tl = gsap.timeline({ paused: true }); — paused + var (không phải const)
✓ var DUR = {{DURATION}}/1000; khai báo ngay sau tl
✓ KHÔNG anime.js; KHÔNG <link> Google Fonts
✓ KHÔNG repeat: -1 — tất cả dùng Math.ceil(DUR/cycle)-1
✓ Tất cả ambient loops (.floating, .pulse, .drift) trong tl tại position 0
✓ Camera tween duration: DUR — cover hết thời lượng cảnh
✓ Animation liên tục 0→{{DURATION}}ms — không gap tĩnh >1500ms, không cắt sớm
✓ Sau beat cuối: climax pulse loop lấp đầy đến hết {{DURATION}}ms
✓ ≥3 depth layers, FAKE CAMERA, ≥1 light-glow, ≥1 ambient loop
✓ Mỗi beat: visual anchor, 4 giai đoạn (HOOK→BUILD→IMPACT→REVEAL)
✓ ≥3 ease khác nhau; .out cho enter, .in cho exit
✓ Hướng entrance đa dạng giữa elements
✓ Layout pattern đổi giữa beats
✓ KHÔNG full sentence — chỉ keyword/số/label
✓ Font: CHỈ "Be Vietnam Pro", "IBM Plex Mono", "Oswald"
✓ Mọi text: class="txt"; overflow:visible; padding-top:0.15em
✓ KHÔNG overflow:hidden trên container text tiếng Việt
✓ Content trong #content (safe zone 10px)
✓ Brand/project assets đã dùng nếu cung cấp
✓ File hoàn chỉnh: <\/script></body></html>

CHỈ trả về <!DOCTYPE html>...</html>. Không markdown, không giải thích.`;


export const THUMBNAIL_PROMPT = `Tạo HTML TĨNH cho thumbnail video tiếng Việt trên Chrome headless {{W}}×{{H}}px ({{RATIO_LABEL}}).

ĐÂY LÀ ẢNH THUMBNAIL TĨNH, KHÔNG PHẢI CẢNH VIDEO.
Tiêu đề: "{{TITLE}}" | Mô tả: "{{PROMPT}}"

THAM SỐ BỐ CỤC: {{ASPECT_RATIO_RULES}}

YÊU CẦU:
• Layout tĩnh, chụp thành 1 ảnh JPEG.
• KHÔNG animation, KHÔNG gsap, KHÔNG anime.js, KHÔNG setTimeout.
• Bố cục mạnh, dễ đọc, tương phản cao, 1 chủ thể, text lớn rõ.
• Viết font-family trong CSS — font tự nhúng.

PROJECT ASSETS: {{PROJECT_ASSETS}}
STYLE GUIDE: {{STYLE_GUIDE}}

KHUNG:
<!DOCTYPE html><html lang="vi"><head><meta charset="UTF-8">
<style>
*{box-sizing:border-box}
html,body{width:{{W}}px;height:{{H}}px;margin:0;padding:0;overflow:hidden;background:#05050a}
body{color:#fff}
.txt{display:block;line-height:1.5;overflow:visible;padding-top:0.15em;padding-bottom:0.05em}
#stage{position:relative;width:{{W}}px;height:{{H}}px;overflow:hidden;background:#05050a}
#content{position:absolute;inset:10px;overflow:hidden}
</style></head><body>
<div id="stage"><div id="content"><!-- STATIC LAYOUT --></div></div>
</body></html>

CHỈ trả về <!DOCTYPE html>...</html>. Không markdown, không giải thích.`;

export const fmtMs = ms => ms < 60000 ? `${(ms/1000).toFixed(1)}s` : `${Math.floor(ms/60000)}m${Math.round((ms%60000)/1000)}s`;

export const EDIT_HTML_PROMPT = `Bạn là chuyên gia chỉnh sửa HTML animation. Sửa HTML theo yêu cầu.

YÊU CẦU SỬA: {{EDIT_PROMPT}}
HTML HIỆN TẠI: {{CURRENT_HTML}}

QUY TẮC:
• Chỉ sửa phần được yêu cầu, giữ nguyên phần còn lại.
• Giữ: #stage, #content, vignette, scan, noise, progress, window.__timelines.
• KHÔNG anime.js — chỉ GSAP. KHÔNG repeat: -1. File kết thúc <\/script></body></html>.
• CHỈ trả về <!DOCTYPE html>...</html>. Không markdown, không giải thích.`;

export const EDIT_THUMBNAIL_HTML_PROMPT = `Bạn là chuyên gia chỉnh sửa HTML thumbnail tĩnh.

YÊU CẦU SỬA: {{EDIT_PROMPT}}
HTML HIỆN TẠI: {{CURRENT_HTML}}

QUY TẮC:
• THUMBNAIL TĨNH — không scene video.
• Chỉ sửa phần yêu cầu. KHÔNG animation, KHÔNG anime.js, KHÔNG gsap.
• CHỈ trả về <!DOCTYPE html>...</html>. Không markdown, không giải thích.`;

// EOF: agents/scene/prompts.js
