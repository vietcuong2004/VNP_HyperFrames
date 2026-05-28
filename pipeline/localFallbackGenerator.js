import fs from 'fs';
import path from 'path';
import { createVisualBrief } from '../agents/scene/visualPlanner.js';

const FORBIDDEN_FALLBACK_COPY = [
  'OPEN SOURCE ENGINE',
  'Write HTML. Render Video. Built for Agents.',
  'Automated Screenshots',
  'Infinite Possibilities',
  'GET STARTED',
  'Start Generating Today',
];

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function stripVisualTags(value) {
  return String(value || '')
    .replace(/\[[^\]]+\]/g, ' ')
    .replace(/['"`]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function toWords(value) {
  return String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9+#./-]+/g, ' ')
    .split(/\s+/)
    .map((word) => word.trim())
    .filter(Boolean);
}

function titleCase(words) {
  return words
    .map((word) => {
      if (/^[A-Z0-9+#./-]{2,}$/.test(word)) return word;
      return word.slice(0, 1).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
}

function shortText(value, maxLength) {
  const text = stripVisualTags(value);
  if (text.length <= maxLength) return text;
  const words = text.split(/\s+/);
  let out = '';
  for (const word of words) {
    const next = `${out} ${word}`.trim();
    if (next.length > maxLength) break;
    out = next;
  }
  return out || text.slice(0, maxLength).trim();
}

function extractQuotedText(value) {
  const text = String(value || '');
  const match = text.match(/['"]([^'"]{3,40})['"]/);
  return match?.[1]?.trim() || '';
}

function cleanVisualDescription(value) {
  return stripVisualTags(String(value || '').split(/B[aá]t bu[oộ]c/i)[0]);
}

function conciseBody(value, fallback) {
  const text = shortText(value, 44);
  return text || fallback;
}

function displayTagline(dynamic) {
  const cardText = dynamic.cards?.map((card) => card.title).filter(Boolean).join(' / ');
  return cardText || dynamic.subject || dynamic.title;
}

export function containsForbiddenFallbackCopy(html) {
  const lower = String(html || '').toLowerCase();
  return FORBIDDEN_FALLBACK_COPY.some((phrase) => lower.includes(phrase.toLowerCase()));
}

export function deriveFallbackSceneContent(scene = {}) {
  const brief = createVisualBrief(scene);
  const briefLabels = Array.isArray(brief.secondary_labels) ? brief.secondary_labels : [];
  const quoted = extractQuotedText(scene.visual);
  const visualDescription = cleanVisualDescription(scene.visual);
  const visualWords = toWords(quoted || brief.primary_text || visualDescription);
  const allWords = visualWords.filter((word) => word.length > 1);
  const stop = new Set([
    'main', 'focus', 'motion', 'flow', 'text', 'style', 'scene', 'center', 'entry', 'idle', 'exit',
    'visual', 'voice', 'mot', 'canh', 'dung', 'giup', 'ban', 'nhanh', 'trong', 'voi', 'cua', 'cho',
  ]);
  const picked = [];
  for (const word of allWords) {
    const key = word.toLowerCase();
    if (stop.has(key)) continue;
    if (picked.some((item) => item.toLowerCase() === key)) continue;
    picked.push(word);
    if (picked.length >= 3) break;
  }

  const titleWords = toWords(brief.primary_text || quoted || picked.join(' ')).slice(0, 4);
  const title = (titleWords.length ? titleWords.join(' ') : `Scene ${scene.stt || 1}`).toUpperCase();
  const subtitle = shortText(brief.facts?.[0] || visualDescription || quoted || title, 92);
  const subject = titleCase(toWords(brief.main_subject || picked.slice(0, 2).join(' ') || titleWords.join(' ')).slice(0, 3));
  const label = `SCENE ${String(scene.stt || 1).padStart(2, '0')}`;
  const cards = [
    { title: briefLabels[0] || picked[0] || subject || 'Signal', body: conciseBody(brief.facts?.[0] || quoted || visualDescription, 'Visual summary') },
    { title: briefLabels[1] || picked[1] || 'Motion', body: conciseBody(brief.facts?.[1] || visualDescription, 'Motion from scene brief') },
    { title: briefLabels[2] || picked[2] || 'Signal', body: conciseBody(brief.facts?.[2] || quoted || subject, 'Key signal') },
  ];

  return {
    title: title.slice(0, 34),
    label,
    subtitle,
    subject,
    cards,
  };
}

/**
 * localFallbackGenerator.js
 * Generates highly aesthetic, premium HTML/CSS/GSAP scene compositions locally
 * as a fallback when AI models are rate-limited or unavailable.
 */

export function generateLocalFallbackHTML({ scene, projectAssets = [], outputAspectRatio = '9:16', audioDurationMs }) {
  const duration = (audioDurationMs ? audioDurationMs : (scene.duration ? scene.duration * 1000 : 8000)) / 1000;
  const dynamic = deriveFallbackSceneContent(scene);

  // Get the captured source screenshot only. Do not fall back to arbitrary
  // project images here, because this layout scrolls the source page.
  const screenshot = projectAssets.find((a) =>
    a.name === 'github_repo.png' ||
    String(a.fileUrl || '').replace(/\\/g, '/').endsWith('/assets/images/github_repo.png')
  );
  const screenshotUrl = screenshot ? screenshot.fileUrl : '../assets/images/github_repo.png';

  // Words parsing from transcript for karaoke highlight
  let wordsHtml = '';
  let wordsTimelineJs = '';

  if (scene.transcript && Array.isArray(scene.transcript)) {
    scene.transcript.forEach((w, idx) => {
      const escapedText = w.text.replace(/"/g, '&quot;');
      wordsHtml += `<span class="word" id="w-${idx}">${escapedText}</span> `;
      
      const start = w.start;
      const end = w.end;
      
      wordsTimelineJs += `
    // Word ${idx}: "${escapedText}"
    tl.to('#w-${idx}', { color: '#F7B500', scale: 1.15, fontWeight: '800', textShadow: '0 0 10px rgba(247, 181, 0, 0.6)', duration: 0.1 }, ${start.toFixed(3)});
    tl.to('#w-${idx}', { color: '#ffffff', scale: 1.0, fontWeight: 'normal', textShadow: 'none', duration: 0.1 }, ${end.toFixed(3)});
      `;
    });
  } else {
    // Fallback if no word-level transcript
    const cleanVoice = scene.voice.replace(/"/g, '&quot;');
    wordsHtml = `<span class="word">${cleanVoice}</span>`;
  }

  // Generate scene specific layout
  let contentHtml = '';
  let customStyle = '';
  let animationsJs = '';

  const stt = Number(scene.stt);

  if (stt === 1) {
    // --- INTRO SCENE ---
    contentHtml = `
      <div class="intro-container">
        <div class="glow-bg"></div>
        <div class="brand-badge">${escapeHtml(dynamic.label)}</div>
        <h1 class="main-title">${escapeHtml(dynamic.title)}</h1>
        <div class="subtitle-badge">${escapeHtml(dynamic.subject || dynamic.label)}</div>
        <p class="tagline">${escapeHtml(displayTagline(dynamic))}</p>
        <div class="tech-lines">
          <div class="line"></div>
          <div class="line"></div>
        </div>
      </div>
    `;

    customStyle = `
      .intro-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100%;
        text-align: center;
        position: relative;
        padding: 60px;
        z-index: 10;
      }
      .glow-bg {
        position: absolute;
        width: 600px;
        height: 600px;
        background: radial-gradient(circle, rgba(0, 112, 243, 0.25) 0%, rgba(247, 181, 0, 0.05) 50%, transparent 70%);
        top: 35%;
        left: 50%;
        transform: translate(-50%, -50%);
        pointer-events: none;
        z-index: -1;
      }
      .brand-badge {
        font-size: 18px;
        font-weight: 800;
        letter-spacing: 6px;
        color: #F7B500;
        background: rgba(247, 181, 0, 0.1);
        padding: 8px 20px;
        border-radius: 40px;
        border: 1px solid rgba(247, 181, 0, 0.25);
        margin-bottom: 30px;
        text-transform: uppercase;
        backdrop-filter: blur(10px);
      }
      .main-title {
        font-size: 76px;
        font-weight: 900;
        letter-spacing: -2px;
        margin: 0 0 15px 0;
        background: linear-gradient(135deg, #ffffff 0%, #a5b4fc 50%, #6366f1 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        text-shadow: 0 10px 40px rgba(99, 102, 241, 0.3);
      }
      .subtitle-badge {
        font-size: 26px;
        font-weight: 700;
        letter-spacing: 4px;
        color: #6366f1;
        margin-bottom: 30px;
      }
      .tagline {
        font-size: 24px;
        color: rgba(255, 255, 255, 0.7);
        max-width: 600px;
        line-height: 1.6;
        margin: 0;
      }
      .tech-lines {
        margin-top: 40px;
        display: flex;
        gap: 15px;
      }
      .tech-lines .line {
        height: 4px;
        width: 120px;
        background: linear-gradient(90deg, transparent, #F7B500, transparent);
      }
    `;

    animationsJs = `
      // Entrance
      tl.from('.brand-badge', { y: -50, opacity: 0, duration: 1.2, ease: 'power4.out' }, 0.2);
      tl.from('.main-title', { scale: 0.85, opacity: 0, filter: 'blur(10px)', duration: 1.5, ease: 'power3.out' }, 0.4);
      tl.from('.subtitle-badge', { y: 20, opacity: 0, duration: 1.0, ease: 'power2.out' }, 0.8);
      tl.from('.tagline', { opacity: 0, y: 15, duration: 1.2 }, 1.0);
      tl.from('.tech-lines .line', { width: 0, opacity: 0, stagger: 0.2, duration: 1.0, ease: 'power2.out' }, 1.2);
      
      // Continuous camera motion
      tl.to('#content', { scale: 1.05, duration: DUR, ease: 'none' }, 0);
      tl.to('.glow-bg', { scale: 1.2, rotate: 45, duration: DUR, ease: 'none' }, 0);
      
      // Exit transition
      tl.to('.intro-container', { opacity: 0, y: -30, filter: 'blur(5px)', duration: 0.5 }, DUR - 0.5);
    `;

  } else if (stt === 2) {
    // --- WEB SHOWCASE SCENE (with screen mockup scroll) ---
    contentHtml = `
      <div class="showcase-container">
        <div class="glow-bg"></div>
        <div class="tech-header">
          <div class="title-wrap">
            <span class="sec-label">${escapeHtml(dynamic.label)}</span>
            <h2 class="section-title">${escapeHtml(dynamic.title)}</h2>
          </div>
        </div>
        
        <div class="browser-mockup">
          <div class="browser-header">
            <div class="dots">
              <span class="dot red"></span>
              <span class="dot yellow"></span>
              <span class="dot green"></span>
            </div>
            <div class="url-bar">${escapeHtml(scene.source_url || scene.repo_url || 'source capture')}</div>
          </div>
          <div class="browser-body">
            <img id="screenshot-img" src="${screenshotUrl}" alt="GitHub Screenshot" />
          </div>
        </div>
        
        <div class="code-box">
          <div class="code-line"><span class="c-key">const</span> frames = <span class="c-fun">Puppeteer</span>.capture(<span class="c-str">'url'</span>);</div>
          <div class="code-line"><span class="c-fun">HyperFrames</span>.render(frames);</div>
        </div>
      </div>
    `;

    customStyle = `
      .showcase-container {
        display: flex;
        flex-direction: column;
        height: 100%;
        padding: 50px 40px;
        position: relative;
        z-index: 10;
      }
      .glow-bg {
        position: absolute;
        width: 500px;
        height: 500px;
        background: radial-gradient(circle, rgba(16, 185, 129, 0.2) 0%, transparent 70%);
        top: 20%;
        right: -10%;
        pointer-events: none;
        z-index: -1;
      }
      .tech-header {
        margin-bottom: 40px;
      }
      .sec-label {
        font-size: 14px;
        font-weight: 800;
        color: #10b981;
        letter-spacing: 4px;
        display: block;
        margin-bottom: 8px;
      }
      .section-title {
        font-size: 40px;
        font-weight: 900;
        margin: 0;
        letter-spacing: -1px;
        background: linear-gradient(135deg, #fff 0%, #10b981 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
      }
      .browser-mockup {
        width: 100%;
        height: 1000px;
        background: rgba(10, 10, 20, 0.7);
        border: 1px solid rgba(255, 255, 255, 0.15);
        border-radius: 20px;
        box-shadow: 0 30px 60px rgba(0, 0, 0, 0.5), 0 0 40px rgba(16, 185, 129, 0.1);
        overflow: hidden;
        display: flex;
        flex-direction: column;
        backdrop-filter: blur(15px);
        margin-bottom: 40px;
      }
      .browser-header {
        height: 48px;
        background: rgba(255, 255, 255, 0.05);
        border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        display: flex;
        align-items: center;
        padding: 0 20px;
        gap: 20px;
      }
      .dots {
        display: flex;
        gap: 8px;
      }
      .dot {
        width: 12px;
        height: 12px;
        border-radius: 50%;
      }
      .dot.red { background: #ff5f56; }
      .dot.yellow { background: #ffbd2e; }
      .dot.green { background: #27c93f; }
      .url-bar {
        flex: 1;
        background: rgba(0, 0, 0, 0.3);
        border-radius: 8px;
        font-size: 14px;
        color: rgba(255, 255, 255, 0.5);
        padding: 6px 15px;
        font-family: monospace;
        text-overflow: ellipsis;
        white-space: nowrap;
        overflow: hidden;
        border: 1px solid rgba(255, 255, 255, 0.05);
      }
      .browser-body {
        flex: 1;
        overflow: hidden;
        position: relative;
        background: #0d1117; /* GitHub dark mode bg */
      }
      #screenshot-img {
        width: 100%;
        position: absolute;
        top: 0;
        left: 0;
      }
      .code-box {
        background: rgba(10, 10, 20, 0.6);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 12px;
        padding: 20px;
        font-family: 'Courier New', Courier, monospace;
        font-size: 18px;
        line-height: 1.6;
        backdrop-filter: blur(10px);
      }
      .code-line {
        margin: 4px 0;
      }
      .c-key { color: #f43f5e; font-weight: bold; }
      .c-fun { color: #60a5fa; }
      .c-str { color: #34d399; }
    `;

    animationsJs = `
      // Entrance
      tl.from('.tech-header', { x: -40, opacity: 0, duration: 1.0, ease: 'power3.out' }, 0.2);
      tl.from('.browser-mockup', { y: 100, opacity: 0, rotateX: -10, transformOrigin: 'bottom center', duration: 1.5, ease: 'power4.out' }, 0.4);
      tl.from('.code-box', { opacity: 0, y: 30, duration: 1.0 }, 1.0);
      
      // Screenshot Scrolling (Mock vertical website inspection)
      // Since github_repo is usually tall, scroll it slowly
      tl.to('#screenshot-img', { y: '-40%', duration: DUR * 0.8, ease: 'power1.inOut' }, 0.8);
      
      // Code lines highlight typing
      tl.from('.code-line', { opacity: 0, x: -10, stagger: 0.3, duration: 0.8 }, 1.2);
      
      // Continuous camera zoom/pan
      tl.to('.browser-mockup', { scale: 1.02, rotateY: 2, duration: DUR, ease: 'none' }, 0);
      
      // Exit
      tl.to('.showcase-container', { opacity: 0, x: -50, duration: 0.5 }, DUR - 0.5);
    `;

  } else if (stt === 3) {
    // --- TEMPLATE RENDER SCENE ---
    contentHtml = `
      <div class="render-container">
        <div class="glow-bg"></div>
        <div class="tech-header">
          <div class="title-wrap">
            <span class="sec-label">${escapeHtml(dynamic.label)}</span>
            <h2 class="section-title">${escapeHtml(dynamic.title)}</h2>
          </div>
        </div>
        
        <div class="preview-deck">
          <div class="card card-1">
            <div class="card-glow"></div>
            <div class="card-icon">⚡</div>
            <h3>${escapeHtml(dynamic.cards[0].title)}</h3>
            <p>${escapeHtml(dynamic.cards[0].body)}</p>
          </div>
          
          <div class="card card-2 active-card">
            <div class="card-glow"></div>
            <div class="card-icon">🎨</div>
            <h3>${escapeHtml(dynamic.cards[1].title)}</h3>
            <p>${escapeHtml(dynamic.cards[1].body)}</p>
            <div class="render-badge">${escapeHtml(dynamic.subject)}</div>
          </div>
          
          <div class="card card-3">
            <div class="card-glow"></div>
            <div class="card-icon">🎥</div>
            <h3>${escapeHtml(dynamic.cards[2].title)}</h3>
            <p>${escapeHtml(dynamic.cards[2].body)}</p>
          </div>
        </div>
      </div>
    `;

    customStyle = `
      .render-container {
        display: flex;
        flex-direction: column;
        height: 100%;
        padding: 50px 40px;
        position: relative;
        z-index: 10;
      }
      .glow-bg {
        position: absolute;
        width: 600px;
        height: 600px;
        background: radial-gradient(circle, rgba(99, 102, 241, 0.15) 0%, rgba(247, 181, 0, 0.05) 50%, transparent 70%);
        top: 40%;
        left: 10%;
        pointer-events: none;
        z-index: -1;
      }
      .tech-header {
        margin-bottom: 40px;
      }
      .sec-label {
        font-size: 14px;
        font-weight: 800;
        color: #6366f1;
        letter-spacing: 4px;
        display: block;
        margin-bottom: 8px;
      }
      .section-title {
        font-size: 40px;
        font-weight: 900;
        margin: 0;
        letter-spacing: -1px;
        background: linear-gradient(135deg, #fff 0%, #6366f1 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
      }
      .preview-deck {
        display: flex;
        flex-direction: column;
        gap: 25px;
        flex: 1;
        justify-content: center;
      }
      .card {
        background: rgba(255, 255, 255, 0.03);
        border: 1px solid rgba(255, 255, 255, 0.06);
        border-radius: 20px;
        padding: 30px;
        position: relative;
        overflow: hidden;
        backdrop-filter: blur(10px);
        transition: border 0.3s;
      }
      .card-glow {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 4px;
        background: transparent;
      }
      .card-icon {
        font-size: 32px;
        margin-bottom: 15px;
      }
      .card h3 {
        font-size: 24px;
        font-weight: 700;
        margin: 0 0 10px 0;
        color: #fff;
      }
      .card p {
        font-size: 16px;
        color: rgba(255, 255, 255, 0.6);
        margin: 0;
        line-height: 1.5;
      }
      .active-card {
        background: rgba(99, 102, 241, 0.08);
        border: 1px solid rgba(99, 102, 241, 0.3);
        box-shadow: 0 15px 40px rgba(99, 102, 241, 0.15);
      }
      .active-card .card-glow {
        background: linear-gradient(90deg, #6366f1, #a5b4fc);
      }
      .render-badge {
        position: absolute;
        top: 20px;
        right: 20px;
        font-size: 12px;
        font-weight: 800;
        background: #6366f1;
        color: #fff;
        padding: 4px 10px;
        border-radius: 4px;
        letter-spacing: 1px;
      }
    `;

    animationsJs = `
      // Entrance
      tl.from('.tech-header', { y: -30, opacity: 0, duration: 1.0 }, 0.2);
      tl.from('.card-1', { x: -60, opacity: 0, duration: 1.0, ease: 'power2.out' }, 0.4);
      tl.from('.card-2', { x: 60, opacity: 0, duration: 1.0, ease: 'power2.out' }, 0.6);
      tl.from('.card-3', { x: -60, opacity: 0, duration: 1.0, ease: 'power2.out' }, 0.8);
      
      // Glow pulse on active card
      tl.to('.active-card', { borderColor: 'rgba(99,102,241,0.6)', repeat: 4, yoyo: true, duration: 1.5 }, 1.0);
      tl.from('.render-badge', { opacity: 0, scale: 0.8, repeat: 4, yoyo: true, duration: 0.5 }, 1.0);
      
      // Camera drift
      tl.to('.preview-deck', { y: -15, duration: DUR, ease: 'none' }, 0);
      
      // Exit
      tl.to('.render-container', { opacity: 0, y: 50, duration: 0.5 }, DUR - 0.5);
    `;

  } else {
    // --- CTA / OUTRO SCENE ---
    contentHtml = `
      <div class="outro-container">
        <div class="glow-bg"></div>
        <div class="brand-badge">${escapeHtml(dynamic.label)}</div>
        
        <h1 class="cta-title">${escapeHtml(dynamic.title)}</h1>
        <p class="cta-desc">${escapeHtml(dynamic.subtitle)}</p>
        
        <div class="gh-container">
          <div class="gh-button">
            <span class="gh-icon">
              <svg height="32" aria-hidden="true" viewBox="0 0 16 16" width="32" fill="white">
                <path d="M8 0c4.42 0 8 3.58 8 8a8.013 8.013 0 0 1-5.45 7.59c-.4.08-.55-.17-.55-.38 0-.27.01-1.13.01-2.2 0-.75-.25-1.23-.54-1.48 1.78-.2 3.65-.88 3.65-3.95 0-.88-.31-1.59-.82-2.15.08-.2.36-1.02-.08-2.12 0 0-.67-.22-2.2.82-.64-.18-1.32-.27-2-.27-.68 0-1.36.09-2 .27-1.53-1.03-2.2-.82-2.2-.82-.44 1.1-.16 1.92-.08 2.12-.51.56-.82 1.28-.82 2.15 0 3.06 1.86 3.75 3.64 3.95-.23.2-.44.55-.51 1.07-.46.21-1.61.55-2.33-.66-.15-.24-.6-.83-1.23-.82-.67.01-.27.38.01.53.34.19.73.9.82 1.13.16.45.68 1.35 3.12.88.01.47.01 1.05.01 1.2 0 .21-.15.47-.55.38A7.995 7.995 0 0 1 0 8c0-4.42 3.58-8 8-8Z"></path>
              </svg>
            </span>
            <span class="gh-text">${escapeHtml(scene.repo_url || scene.source_url || dynamic.subject)}</span>
          </div>
        </div>
      </div>
    `;

    customStyle = `
      .outro-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100%;
        text-align: center;
        position: relative;
        padding: 60px;
        z-index: 10;
      }
      .glow-bg {
        position: absolute;
        width: 600px;
        height: 600px;
        background: radial-gradient(circle, rgba(247, 181, 0, 0.2) 0%, rgba(99, 102, 241, 0.05) 50%, transparent 70%);
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        pointer-events: none;
        z-index: -1;
      }
      .brand-badge {
        font-size: 16px;
        font-weight: 800;
        letter-spacing: 5px;
        color: #F7B500;
        background: rgba(247, 181, 0, 0.08);
        padding: 8px 24px;
        border-radius: 40px;
        border: 1px solid rgba(247, 181, 0, 0.2);
        margin-bottom: 40px;
      }
      .cta-title {
        font-size: 56px;
        font-weight: 900;
        letter-spacing: -2px;
        margin: 0 0 20px 0;
        background: linear-gradient(135deg, #ffffff 0%, #ffedd5 50%, #f97316 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
      }
      .cta-desc {
        font-size: 22px;
        color: rgba(255, 255, 255, 0.6);
        max-width: 600px;
        line-height: 1.6;
        margin: 0 0 50px 0;
      }
      .gh-container {
        display: flex;
        justify-content: center;
        width: 100%;
      }
      .gh-button {
        display: flex;
        align-items: center;
        gap: 15px;
        background: rgba(255, 255, 255, 0.04);
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 50px;
        padding: 12px 32px;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
        transition: transform 0.3s;
        backdrop-filter: blur(10px);
      }
      .gh-text {
        font-family: monospace;
        font-size: 18px;
        color: #fff;
        font-weight: 600;
      }
    `;

    animationsJs = `
      // Entrance
      tl.from('.brand-badge', { y: -30, opacity: 0, duration: 1.0, ease: 'power3.out' }, 0.2);
      tl.from('.cta-title', { scale: 0.9, opacity: 0, duration: 1.2, ease: 'power3.out' }, 0.4);
      tl.from('.cta-desc', { opacity: 0, y: 20, duration: 1.2 }, 0.8);
      tl.from('.gh-button', { scale: 0.8, opacity: 0, duration: 1.0, ease: 'back.out(1.7)' }, 1.1);
      
      // Floating arrow animation or bounce
      tl.to('.gh-button', { y: -8, repeat: Math.ceil(DUR/2)-1, yoyo: true, duration: 1.0, ease: 'power1.inOut' }, 1.5);
      
      // Camera drift
      tl.to('#content', { scale: 1.03, duration: DUR, ease: 'none' }, 0);
      
      // Fade out
      tl.to('.outro-container', { opacity: 0, filter: 'blur(10px)', duration: 0.5 }, DUR - 0.5);
    `;
  }

  // Complete HTML content
  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <link href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;600;700;800;900&display=swap" rel="stylesheet">
  <script src="https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/gsap.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/TextPlugin.min.js"></script>
  <style>
    * { box-sizing: border-box; }
    html, body {
      width: 1080px;
      height: 1920px;
      margin: 0;
      padding: 0;
      overflow: hidden;
      background: #05050a;
      font-family: 'Be Vietnam Pro', Arial, Helvetica, sans-serif;
      -webkit-font-smoothing: antialiased;
      text-rendering: optimizeLegibility;
    }
    #stage {
      position: absolute;
      inset: 0;
      width: 1080px;
      height: 1920px;
      overflow: hidden;
      background: radial-gradient(ellipse at 50% 30%, #0d0d1b 0%, #05050a 80%, #020205 100%);
      color: #fff;
    }
    
    /* Background grid */
    .grid-bg {
      position: absolute;
      inset: 0;
      background-image: 
        linear-gradient(rgba(255, 255, 255, 0.02) 1px, transparent 1px),
        linear-gradient(90deg, rgba(255, 255, 255, 0.02) 1px, transparent 1px);
      background-size: 80px 80px;
      background-position: center center;
      pointer-events: none;
      z-index: 2;
      opacity: 0.8;
    }
    
    /* Vignette and scanlines */
    .vignette {
      position: absolute;
      inset: 0;
      background: radial-gradient(circle at center, transparent 40%, rgba(0, 0, 0, 0.85) 100%);
      pointer-events: none;
      z-index: 90;
    }
    .scan {
      position: absolute;
      inset: 0;
      background: repeating-linear-gradient(180deg, rgba(255, 255, 255, 0.015) 0px, rgba(255, 255, 255, 0.015) 2px, transparent 2px, transparent 4px);
      pointer-events: none;
      z-index: 91;
    }
    .noise {
      position: absolute;
      inset: 0;
      opacity: .05;
      pointer-events: none;
      z-index: 92;
      background-image: url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZmlsdGVyIGlkPSJuIj48ZmVUdXJidWxlbmNlIHR5cGU9ImZyYWN0YWxOb2lzZSIgYmFzZUZyZXF1ZW5jeT0iMC45IiBudW1PY3RhdmVzPSIzIi8+PC9maWx0ZXI+PHJlY3Qgd2lkdGg9IjIwMCIgaGVpZ2h0PSIyMDAiIGZpbHRlcj0idXJsKCNuKSIgb3BhY2l0eT0iMC42Ii8+PC9zdmc+');
    }
    .progress {
      position: absolute;
      bottom: 0;
      left: 0;
      height: 6px;
      background: linear-gradient(90deg, #F7B500, #FFD93D);
      width: 0;
      z-index: 99;
      box-shadow: 0 0 20px #F7B500;
    }
    
    #content {
      position: absolute;
      inset: 0;
      overflow: visible;
      z-index: 10;
    }
    
    /* Caption Bar at the bottom */
    .caption-container {
      position: absolute;
      bottom: 120px;
      left: 50%;
      transform: translateX(-50%);
      width: 900px;
      min-height: 160px;
      background: rgba(5, 5, 10, 0.75);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 24px;
      padding: 30px 40px;
      display: flex;
      align-items: center;
      justify-content: center;
      backdrop-filter: blur(20px);
      z-index: 80;
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.6);
    }
    .caption-text {
      font-size: 28px;
      line-height: 1.5;
      color: rgba(255, 255, 255, 0.85);
      text-align: center;
      margin: 0;
      font-weight: 500;
      letter-spacing: 0.5px;
    }
    .word {
      display: inline-block;
      white-space: pre-wrap;
      transition: all 0.15s ease;
      color: rgba(255, 255, 255, 0.6);
    }
    
    /* Floating tech particles */
    .particle {
      position: absolute;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.3);
      pointer-events: none;
      z-index: 3;
    }

    ${customStyle}
  </style>
</head>
<body>
  <div id="stage">
    <div class="grid-bg"></div>
    <div class="vignette"></div>
    <div class="scan"></div>
    <div class="noise"></div>
    
    <!-- Particles -->
    <div class="particle" style="width: 8px; height: 8px; background: rgba(99, 102, 241, 0.4); top: 15%; left: 10%;"></div>
    <div class="particle" style="width: 4px; height: 4px; background: rgba(247, 181, 0, 0.4); top: 25%; left: 80%;"></div>
    <div class="particle" style="width: 12px; height: 12px; background: rgba(16, 185, 129, 0.3); top: 60%; left: 15%;"></div>
    <div class="particle" style="width: 6px; height: 6px; background: rgba(247, 181, 0, 0.3); top: 75%; left: 75%;"></div>
    <div class="particle" style="width: 5px; height: 5px; background: rgba(99, 102, 241, 0.5); top: 85%; left: 30%;"></div>
    
    <div id="content">
      ${contentHtml}
    </div>
    
    <!-- Subtitles Bar -->
    <div class="caption-container">
      <p class="caption-text" id="caption-box">
        ${wordsHtml}
      </p>
    </div>
    
    <div class="progress" id="progress"></div>
  </div>
  
  <script>
    window.__timelines = window.__timelines || {};
    var tl = gsap.timeline({ paused: true });
    var DUR = ${duration.toFixed(3)};
    
    // Progress bar animation
    tl.to('#progress', { width: '1080px', duration: DUR, ease: 'none' }, 0);
    
    // Background Grid continuous parallax shift
    tl.to('.grid-bg', { backgroundPosition: '0px 100px', duration: DUR, ease: 'none' }, 0);
    
    // Particles slow drift
    tl.to('.particle', { 
      y: '-=150', 
      x: '+=50', 
      rotate: 360, 
      opacity: 0.1, 
      duration: DUR, 
      ease: 'none' 
    }, 0);
    
    // Subtitle caption box entrance/exit
    tl.from('.caption-container', { y: 100, opacity: 0, duration: 0.8, ease: 'power3.out' }, 0.1);
    tl.to('.caption-container', { y: 50, opacity: 0, duration: 0.4, ease: 'power2.in' }, DUR - 0.4);

    // Karaoke word level timings
    ${wordsTimelineJs}
    
    // Scene-specific layout animations
    ${animationsJs}
    
    window.__timelines["main"] = tl;
  </script>
</body>
</html>
`;
}

export function generateLocalFallbackThumbnailHTML({ title, prompt }) {
  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <link href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;600;700;800;900&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; }
    html, body {
      width: 1080px;
      height: 1920px;
      margin: 0;
      padding: 0;
      overflow: hidden;
      background: #05050a;
      font-family: 'Be Vietnam Pro', Arial, Helvetica, sans-serif;
    }
    #stage {
      position: absolute;
      inset: 0;
      width: 1080px;
      height: 1920px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: radial-gradient(ellipse at 50% 30%, #1a1a2e 0%, #0a0a14 60%, #05050a 100%);
      color: #fff;
      text-align: center;
      padding: 60px;
    }
    .grid-bg {
      position: absolute;
      inset: 0;
      background-image: 
        linear-gradient(rgba(247, 181, 0, 0.04) 1px, transparent 1px),
        linear-gradient(90deg, rgba(247, 181, 0, 0.04) 1px, transparent 1px);
      background-size: 60px 60px;
      pointer-events: none;
      z-index: 1;
    }
    .content {
      position: relative;
      z-index: 10;
    }
    .badge {
      font-size: 18px;
      font-weight: 800;
      letter-spacing: 6px;
      color: #F7B500;
      background: rgba(247, 181, 0, 0.1);
      padding: 8px 20px;
      border-radius: 40px;
      border: 1px solid rgba(247, 181, 0, 0.25);
      margin-bottom: 40px;
      text-transform: uppercase;
      display: inline-block;
    }
    h1 {
      font-size: 80px;
      font-weight: 900;
      letter-spacing: -2px;
      margin: 0 0 20px 0;
      background: linear-gradient(135deg, #ffffff 0%, #a5b4fc 50%, #6366f1 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    p {
      font-size: 26px;
      color: rgba(255, 255, 255, 0.7);
      max-width: 800px;
      line-height: 1.6;
    }
  </style>
</head>
<body>
  <div id="stage">
    <div class="grid-bg"></div>
    <div class="content">
      <div class="badge">HYPERFRAMES</div>
      <h1>${title.replace(/</g, '&lt;')}</h1>
      <p>${prompt.replace(/</g, '&lt;')}</p>
    </div>
  </div>
</body>
</html>`;
}
