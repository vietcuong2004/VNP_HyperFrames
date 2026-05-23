import fs from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';
import { runCommand } from '../desktop_app/command_runner.mjs';
import { createNodePackageBinCommand } from '../desktop_app/runtime_binaries.mjs';
import { createWorkspacePaths, prepareWorkspaceRuntime } from '../desktop_app/workspace.mjs';

// Import các Agents
import { generateScript } from '../agents/scriptAgent.js';
import { generateTTS } from '../agents/ttsAgent.js';
import { transcribeToSRT } from '../agents/whisperAgent.js';
import { fixSRTWithAI } from '../agents/srtFixAgent.js';
import { generateSceneHTML, generateThumbnailHTML } from '../agents/scene/generate.js';
import { editSceneHTML } from '../agents/scene/edit.js';
import { autoFixSceneHTML, containsVoiceLeak, formatValidationReport, validateSceneHTML } from '../agents/scene/htmlValidator.js';
import { decideMusicPlan } from '../agents/musicAgent.js';
import { containsForbiddenFallbackCopy, generateLocalFallbackHTML, generateLocalFallbackThumbnailHTML } from './localFallbackGenerator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const appRoot = path.resolve(process.env.APP_ROOT || path.join(__dirname, '..'));
const workspaceRoot = path.resolve(process.env.WORKSPACE_DIR || appRoot);
const paths = createWorkspacePaths({ appRoot, workspaceRoot });
const nodeBin = process.execPath;

function run(command, args, options = {}) {
  return runCommand(command, args, {
    cwd: options.cwd || appRoot,
    env: { ...process.env, ...(options.env || {}) },
    stdio: options.stdio || 'inherit',
    encoding: options.encoding,
  });
}

function getUrlContent(url) {
  return new Promise((resolve) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', (e) => {
      console.warn(`[Pipeline] Lỗi fetch URL: ${e.message}`);
      resolve('');
    });
  });
}

function extractMeta(html) {
  const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
  const descMatch = html.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i) 
    || html.match(/<meta\s+property=["']og:description["']\s+content=["']([^"']+)["']/i);
  
  return {
    title: titleMatch ? titleMatch[1].trim() : '',
    description: descMatch ? descMatch[1].trim() : ''
  };
}

function findLatestMp4(rendersDir) {
  if (!fs.existsSync(rendersDir)) return null;
  const mp4Files = fs
    .readdirSync(rendersDir)
    .filter((file) => file.endsWith('.mp4'))
    .map((file) => ({ name: file, mtime: fs.statSync(path.join(rendersDir, file)).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime);

  return mp4Files[0]?.name || null;
}

function toWebPath(...parts) {
  return parts.join('/').replace(/\\/g, '/');
}

function isSourceScreenshotAsset(asset) {
  const name = String(asset?.name || '').toLowerCase();
  const fileUrl = String(asset?.fileUrl || '').replace(/\\/g, '/').toLowerCase();
  return name === 'github_repo.png' || fileUrl.endsWith('/assets/images/github_repo.png');
}

function isLogoAsset(asset) {
  const name = String(asset?.name || '').toLowerCase();
  const fileUrl = String(asset?.fileUrl || '').replace(/\\/g, '/').toLowerCase();
  return name === 'shiba.png' || fileUrl.endsWith('/assets/logo/shiba.png');
}

export function isSourceScreenshotScene(scene) {
  const visual = String(scene?.visual || '').toLowerCase();
  const voice = String(scene?.voice || '').toLowerCase();
  const text = `${visual}\n${voice}`;
  return /screenshot|screen|browser|webpage|website|trang web|màn hình|man hinh|chụp|chup|scroll|cuộn|cuon|github|docker hub/.test(text);
}

export function selectProjectAssetsForScene(scene, projectAssets = []) {
  const screenshot = projectAssets.find(isSourceScreenshotAsset);
  if (!screenshot || !isSourceScreenshotScene(scene)) return projectAssets;

  const logo = projectAssets.find(isLogoAsset);
  return [screenshot, logo].filter(Boolean);
}

export function evaluateSceneHtmlRequirements(scene, sceneProjectAssets = [], html = '') {
  const hasLogo = /assets\/logo\/shiba\.png/i.test(html);
  const needsScreenshot = isSourceScreenshotScene(scene) && sceneProjectAssets.some(isSourceScreenshotAsset);
  const hasScreenshot = /assets\/images\/github_repo\.png/i.test(html);
  const hasForbiddenFallbackCopy = containsForbiddenFallbackCopy(html);
  const hasVoiceLeak = containsVoiceLeak(scene?.voice, html);
  const missing = [];
  if (!hasLogo) missing.push('logo');
  if (needsScreenshot && !hasScreenshot) missing.push('source screenshot');
  if (hasForbiddenFallbackCopy) missing.push('stale fallback copy');
  if (hasVoiceLeak) missing.push('voice leak');
  return { ok: missing.length === 0, missing };
}

function buildTemplateCss() {
  return `* { box-sizing: border-box; }
html, body {
  width: 1080px;
  height: 1920px;
  margin: 0;
  padding: 0;
  overflow: hidden;
  background: #05050a;
}
#root {
  position: relative;
  width: 1080px;
  height: 1920px;
  overflow: hidden;
}
iframe {
  position: absolute;
  inset: 0;
  width: 1080px;
  height: 1920px;
  border: none;
  visibility: hidden;
  opacity: 0;
  z-index: 10;
}
.progress-bar {
  position: absolute;
  bottom: 0;
  left: 0;
  height: 8px;
  background: linear-gradient(90deg, #F7B500, #FFD93D);
  width: 0%;
  z-index: 999;
  box-shadow: 0 0 20px #F7B500;
}
`;
}

function buildTemplateModule({ templateRel, sceneIds, totalDurationSec }) {
  const safeTemplateRel = templateRel.replace(/"/g, '\\"');
  const fallbackScenes = JSON.stringify(sceneIds || []);
  const fallbackDuration = Number(totalDurationSec || 0).toFixed(3);
  const lines = [
    'export default function (data, css) {',
    `  const duration = data.duration || ${fallbackDuration};`,
    '  const scenes = Array.isArray(data.scenes) && data.scenes.length',
    `    ? data.scenes`,
    `    : ${fallbackScenes}.map((stt) => ({ stt }));`,
    '  const musicPlan = data.music_plan || {};',
    '  const bgmFile = musicPlan.background_music || \"crypto news ambient background.mp3\";',
    '  const bgmVolume = typeof musicPlan.background_volume === \"number\" ? musicPlan.background_volume : 0.12;',
    '',
    '  let audioTagsHtml = \"\";',
    '  scenes.forEach((scene) => {',
    '    if (scene.audio_path) {',
    '      audioTagsHtml += `    <audio id="tts-scene\\${scene.stt}" src="./\\${scene.audio_path}" data-track-index="1" data-start="\\${Number(scene.audio_start || 0).toFixed(3)}" data-duration="\\${Number(scene.audio_duration || 0).toFixed(3)}" data-volume="1.0"></audio>\n`;',
    '    }',
    '  });',
    '',
    '  if (Array.isArray(musicPlan.sound_effects)) {',
    '    musicPlan.sound_effects.forEach((sfx, idx) => {',
    '      audioTagsHtml += `    <audio id="sfx-\\${idx}" src="./assets/sound-effect/\\${sfx.file}" data-track-index="2" data-start="\\${Number(sfx.time || 0).toFixed(3)}" data-duration="1.5" data-volume="\\${Number(sfx.volume || 0.8).toFixed(2)}"></audio>\n`;',
    '    });',
    '  }',
    '',
    '  let iframeTagsHtml = \"\";',
    '  scenes.forEach((scene) => {',
    `    iframeTagsHtml += \`    <iframe id="iframe-scene\\${'${'}scene.stt}\" src=\"./${safeTemplateRel}/compositions/scene_\\${'${'}scene.stt}.html\"></iframe>\\n\`;`,
    '  });',
    '',
    '  let parentTimelineJs = \"\";',
    '  scenes.forEach((scene, idx) => {',
    '    const start = Number(scene.audio_start || 0);',
    '    const dur = Number(scene.duration || 0);',
    '    const end = start + dur;',
    '',
    '    parentTimelineJs += `\n    // Canh \\${scene.stt}\n    tl.set("#iframe-scene\\${scene.stt}", { visibility: "visible", opacity: 1 }, \\${start.toFixed(3)});\n    tl.to({ progress: 0 }, {\n      progress: 1,\n      duration: \\${dur.toFixed(3)},\n      ease: "none",\n      onUpdate: function() {\n        const iframe = document.getElementById("iframe-scene\\${scene.stt}");\n        if (iframe && iframe.contentWindow && iframe.contentWindow.__timelines && iframe.contentWindow.__timelines["main"]) {\n          iframe.contentWindow.__timelines["main"].progress(this.targets()[0].progress);\n        }\n      }\n    }, \\${start.toFixed(3)});\n`;',
    '',
    '    if (idx < scenes.length - 1) {',
    '      parentTimelineJs += `    tl.to("#iframe-scene\\${scene.stt}", { opacity: 0, duration: 0.15 }, \\${(end - 0.15).toFixed(3)});\n`;',
    '      parentTimelineJs += `    tl.set("#iframe-scene\\${scene.stt}", { visibility: "hidden" }, \\${end.toFixed(3)});\n`;',
    '    }',
    '  });',
    '',
    '  return `<!DOCTYPE html>',
    '<html lang="vi">',
    '<head>',
    '  <meta charset="UTF-8">',
    '  <style>\\${css}</style>',
    '  <script src="./vendor/gsap.min.js"></script>',
    '</head>',
    '<body>',
    '  <div id="root" data-composition-id="agent-composition" data-duration="\\${duration.toFixed(3)}" data-width="1080" data-height="1920" data-start="0">',
    '    <audio id="bg-audio" src="./assets/background-music/\\${bgmFile}" data-track-index="0" data-start="0" data-duration="\\${duration.toFixed(3)}" data-volume="\\${bgmVolume.toFixed(2)}" loop></audio>',
    '',
    '    <!-- TTS Audio Tracks & SFX -->',
    '    \\${audioTagsHtml}',
    '    <!-- Compositions Iframes -->',
    '    \\${iframeTagsHtml}',
    '    <div class="progress-bar" id="progress"></div>',
    '  </div>',
    '',
    '  <script>',
    '    window.__timelines = window.__timelines || {};',
    '    var tl = gsap.timeline({ paused: true });',
    '    var DUR = \\${duration.toFixed(3)};',
    '',
    '    tl.to(\'#progress\', { width: \'1080px\', duration: DUR, ease: \'none\' }, 0);',
    '',
    '    \\${parentTimelineJs}',
    '    window.__timelines["agent-composition"] = tl;',
    '  </script>',
    '</body>',
    '</html>`;',
    '}',
  ];
  return lines.join('\n');
}

async function main() {
  const urlOrTopic = process.argv[2];
  if (!urlOrTopic) {
    console.error('Loi: Vui long cung cap chu de hoac URL can tao video.');
    console.error('Vi du topic: node pipeline/run_agent_pipeline.js "Huong dan lap trinh Node.js"');
    console.error('Vi du URL: node pipeline/run_agent_pipeline.js https://github.com/heygen-com/hyperframes');
    process.exit(1);
  }

  await prepareWorkspaceRuntime(paths);

  // Load .env from workspace if running in CLI mode
  const dotenvPath = path.join(workspaceRoot, '.env');
  if (fs.existsSync(dotenvPath)) {
    const dotenvContent = fs.readFileSync(dotenvPath, 'utf8');
    const dotenvLines = dotenvContent.split(/\r?\n/);
    for (const line of dotenvLines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const idx = trimmed.indexOf('=');
      if (idx !== -1) {
        const key = trimmed.slice(0, idx).trim();
        let val = trimmed.slice(idx + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  }

  // Setup keys tu .env
  const keys = {
    openRouterKey: process.env.OPENROUTER_API_KEY,
    openAiKey: process.env.OPENAI_API_KEY,
    larvoiceKey: process.env.LARVOICE_API_KEY,
    larvoiceKeys: process.env.LARVOICE_API_KEY ? process.env.LARVOICE_API_KEY.split(',') : [],
    larvoiceVoiceId: process.env.LARVOICE_VOICE_ID || '1',
    useLarVoice: Boolean(process.env.LARVOICE_API_KEY && process.env.USE_LARVOICE !== 'false'),
    outputLanguage: 'vi',
    sessionId: `session_${Date.now().toString(36)}`
  };

  const onLog = (msg) => console.log(`[Agent Log] ${msg}`);

  console.log('\n==================================================');
  console.log('KHOI CHAY PIPELINE TAO VIDEO TECH DONG - AI AGENTS');
  console.log(`Dau vao: ${urlOrTopic}`);
  console.log(`App root: ${appRoot}`);
  console.log(`Workspace: ${workspaceRoot}`);
  console.log('==================================================\n');

  let topic = urlOrTopic;
  const projectAssets = [];
  const shibaDir = path.join(paths.workspaceAssetsDir, 'character', 'shiba');
  if (fs.existsSync(shibaDir)) {
    const shibaFiles = fs
      .readdirSync(shibaDir)
      .filter((file) => file.toLowerCase().endsWith('.png'));
    for (const file of shibaFiles) {
      projectAssets.push({
        name: file,
        type: 'image',
        aspectRatio: 'auto',
        fileUrl: `../assets/character/shiba/${file}`
      });
    }
  }
  projectAssets.push({
    name: 'shiba.png',
    type: 'image',
    aspectRatio: '1:1',
    fileUrl: '../assets/logo/shiba.png'
  });
  
  if (urlOrTopic.startsWith('http://') || urlOrTopic.startsWith('https://')) {
    console.log('[Pipeline] Phat hien URL. Dang lay thong tin tu trang web...');
    const html = await getUrlContent(urlOrTopic);
    const meta = extractMeta(html);
    topic = `Gioi thieu du an/website tai dia chi ${urlOrTopic}. Tiêu đề: ${meta.title}. Mô tả: ${meta.description}.`;
    console.log(`[Pipeline] Context trich xuat tu URL: "${meta.title}" | "${meta.description.slice(0, 100)}..."`);
    
    try {
      console.log('\n[Pipeline] Tien hanh chup anh man hinh trang nguon...');
      const screenshotPath = path.join(paths.imageDir, 'github_repo.png');
      run(nodeBin, [path.join(__dirname, 'capture_github.js'), urlOrTopic], {
        cwd: appRoot,
        env: {
          APP_ROOT: appRoot,
          SCREENSHOT_PATH: screenshotPath,
        },
      });
      if (fs.existsSync(screenshotPath)) {
        projectAssets.push({
          name: 'github_repo.png',
          type: 'image',
          aspectRatio: '640x3800',
          fileUrl: '../assets/images/github_repo.png'
        });
        console.log(`[Pipeline] Chup anh man hinh thanh cong. Da them vao project assets: github_repo.png`);
      }
    } catch (err) {
      console.warn(`[Pipeline] Chup anh man hinh loi: ${err.message}. Bo qua.`);
    }
  }

  console.log('Step 1: Sinh kich ban JSON qua ScriptAgent...');
  const videoDurationSec = Number(process.env.VIDEO_DURATION) || 30;
  const sceneDurationSec = Number(process.env.SCENE_DURATION) || 8;
  
  let safeTopicName = urlOrTopic.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase().replace(/-+/g, '-').substring(0, 30);
  let scriptData = null;

  // Check data/ directory for any cached script matching this safeTopicName
  const cachedFiles = fs.existsSync(paths.dataDir)
    ? fs.readdirSync(paths.dataDir)
        .filter(f => f.startsWith(`agent-script-${safeTopicName}-`) && f.endsWith('.json'))
        .map(f => ({ name: f, mtime: fs.statSync(path.join(paths.dataDir, f)).mtimeMs }))
        .sort((a, b) => b.mtime - a.mtime)
    : [];

  if (cachedFiles.length > 0) {
    const cachedFile = cachedFiles[0].name;
    const cachedPath = path.join(paths.dataDir, cachedFile);
    console.log(`[Pipeline] [Caching] Tim thay kich ban JSON tu truoc tai: ${cachedPath}`);
    try {
      scriptData = JSON.parse(fs.readFileSync(cachedPath, 'utf8'));
    } catch (err) {
      console.warn(`[Pipeline] [Caching] Doc file cache loi, se goi AI de sinh moi: ${err.message}`);
    }
  }

  if (!scriptData) {
    scriptData = await generateScript({
      topic,
      keys,
      onLog,
      projectAssets,
      videoDurationSec,
      sceneDurationSec
    });
  }

  const timestamp = Date.now().toString(36);
  const jsonPath = path.join(paths.dataDir, `agent-script-${safeTopicName}-${timestamp}.json`);
  fs.writeFileSync(jsonPath, JSON.stringify(scriptData, null, 2), 'utf-8');
  console.log(`[Pipeline] Da luu file kich ban JSON tai: ${jsonPath}`);

  const templateDir = path.join(appRoot, 'templates', safeTopicName, timestamp);
  const templateRel = toWebPath('templates', safeTopicName, timestamp);
  const templateCompositionsDir = path.join(templateDir, 'compositions');
  fs.mkdirSync(templateCompositionsDir, { recursive: true });

  const ttsProviderLabel = keys.useLarVoice ? 'LarVoice' : 'Edge TTS';
  console.log(`\nStep 2: Sinh giong doc (${ttsProviderLabel}) va phu de (Whisper/LarVoice Subtitle)...`);
  const scenes = scriptData.scenes;
  let accumulatedTimeMs = 0;
  const visualBoost = [
    'Bắt buộc có ít nhất 1 hình minh họa vector (SVG/CSS) phù hợp nội dung.',
    'Bắt buộc có bố cục bento cards (2-4 card) cho mỗi cảnh.',
    'Dùng nhân vật từ ./assets/character/shiba khi phù hợp.',
    'Giữ logo góc trên trái (../assets/logo/shiba.png) và khu vực phụ đề như hiện tại. Khong dung drawSVG; neu can ve SVG path thi dung strokeDasharray/strokeDashoffset.'
  ].join(' ');

  for (const scene of scenes) {
    console.log(`\n--- Xy ly Canh ${scene.stt}/${scenes.length} ---`);
    const audioPath = path.join(paths.audioDir, `scene_${scene.stt}.mp3`);
    const srtPath = path.join(paths.audioDir, `scene_${scene.stt}.srt`);

    // 2a. TTS
    console.log(`[Pipeline] Sinh giong doc Canh ${scene.stt}...`);
    const ttsResult = await generateTTS(scene.voice, audioPath, onLog, keys);
    const duration = ttsResult.duration; // thoi luong (s) cua file am thanh

    scene.audio_start = accumulatedTimeMs / 1000;
    scene.audio_duration = duration;
    scene.audio_path = `assets/audio/scene_${scene.stt}.mp3`;
    scene.duration = duration;

    // 2b. Karaoke Timestamps
    let rawSrt = '';
    if (ttsResult.subtitleUrl) {
      console.log(`[Pipeline] Lay phu de co san tu LarVoice cho Canh ${scene.stt}...`);
      const dlSrt = await getUrlContent(ttsResult.subtitleUrl);
      if (dlSrt && dlSrt.includes('-->')) {
        rawSrt = dlSrt;
      }
    }

    if (!rawSrt) {
      console.log(`[Pipeline] Khong co sub tu LarVoice, tien hanh chay Whisper cho Canh ${scene.stt}...`);
      try {
        await transcribeToSRT(audioPath, srtPath, onLog, 'vi', 'main');
        if (fs.existsSync(srtPath)) {
          rawSrt = fs.readFileSync(srtPath, 'utf8');
        }
      } catch (err) {
        console.warn(`[Pipeline] Whisper loi: ${err.message}. Lay sub tu am thanh fail, dung fallback.`);
        // Fallback tao SRT gia dinh
        rawSrt = `1\n00:00:00,000 --> 00:00:${Math.min(9, Math.floor(duration)).toString().padStart(2, '0')},000\n${scene.voice}`;
      }
    }

    // 2c. Rà soát sửa lỗi phụ đề bằng SRTFixAgent
    console.log(`[Pipeline] Ra soat loi chinh ta phu de Canh ${scene.stt}...`);
    let fixedSrt = rawSrt;
    try {
      fixedSrt = await fixSRTWithAI({
        stt: scene.stt,
        voice: scene.voice,
        srtContent: rawSrt,
        language: 'vi',
        keys,
        onLog
      });
    } catch (err) {
      console.warn(`[Pipeline] [Warning] Ra soat loi chinh ta phu de that bai: ${err.message}. Su dung phu de raw.`);
    }

    scene.srt = fixedSrt;
    fs.writeFileSync(srtPath, fixedSrt, 'utf8');

    // Tích hợp srt parser để tạo transcript cho dashboard UI tương thích ngược
    // (Thực tế HyperFrames UI server mong đợi trường scene.transcript)
    scene.transcript = [];
    const blocks = fixedSrt.trim().split(/\r?\n\r?\n/);
    for (const block of blocks) {
      const lines = block.split(/\r?\n/);
      if (lines.length >= 3) {
        const timeMatch = lines[1].match(/(\d{2}:\d{2}:\d{2},\d{3}) --> (\d{2}:\d{2}:\d{2},\d{3})/);
        if (timeMatch) {
          const fromMs = srtToMs(timeMatch[1]);
          const toMs = srtToMs(timeMatch[2]);
          const text = lines.slice(2).join(' ').trim();
          // Chia nhỏ words
          const words = text.split(/\s+/).map((w, wIdx, arr) => {
            const wordDur = (toMs - fromMs) / arr.length;
            return {
              text: w,
              start: (fromMs + wIdx * wordDur) / 1000,
              end: (fromMs + (wIdx + 1) * wordDur) / 1000
            };
          });
          scene.transcript.push(...words);
        }
      }
    }

    // Tang thoi gian luy ke
    accumulatedTimeMs += Math.round(duration * 1000);
  }

  // Luu lai file JSON da co audio/timing metadata
  const totalDurationSec = accumulatedTimeMs / 1000;
  scriptData.duration = totalDurationSec;
  scriptData.template = 'G3_web'; // mockup tuong thich nguoc
  scriptData.video_format = '9:16';
  scriptData.visual_theme = 'web';
  scriptData.platform = 'web';
  scriptData.metadata = {
    title: topic.slice(0, 100),
    host: 'agent-pipeline'
  };
  fs.writeFileSync(jsonPath, JSON.stringify(scriptData, null, 2), 'utf-8');

  console.log('\nStep 3: Art Direction & Sinh mã HTML/CSS hoạt cảnh động qua SceneGenerator...');
  const compositionDir = path.join(appRoot, 'compositions');
  fs.mkdirSync(compositionDir, { recursive: true });

  for (const scene of scenes) {
    console.log(`[Pipeline] Generating HTML for Scene ${scene.stt}...`);
    const sceneProjectAssets = selectProjectAssetsForScene(scene, projectAssets);
    scene.visual = `${scene.visual || ''}\n${visualBoost}`.trim();
    let sceneHtml;
    try {
      sceneHtml = await generateSceneHTML({
        scene,
        keys,
        onLog,
        projectAssets: sceneProjectAssets,
        outputAspectRatio: '9:16',
        consistentScenes: true,
        litePrompt: false,
        outputLanguage: 'vi',
        audioDurationMs: Math.round(scene.duration * 1000)
      });
    } catch (err) {
      console.warn(`[Pipeline] [Warning] Sinh HTML Scene ${scene.stt} qua AI that bai: ${err.message}. Su dung template local fallback.`);
      sceneHtml = generateLocalFallbackHTML({
        scene,
        projectAssets: sceneProjectAssets,
        outputAspectRatio: '9:16',
        audioDurationMs: Math.round(scene.duration * 1000)
      });
    }

    const durationMs = Math.round(scene.duration * 1000);

    let fixed = autoFixSceneHTML(sceneHtml, { duration: durationMs });
    if (fixed.fixes.length) {
      fixed.fixes.forEach((f) => onLog?.(`  🔧 AutoFix: ${f}`));
      sceneHtml = fixed.html;
    }

    let validation = validateSceneHTML(sceneHtml, { duration: durationMs, lang: 'vi' });
    const strict = evaluateSceneHtmlRequirements(scene, sceneProjectAssets, sceneHtml);
    onLog?.(`  └ Validation: ${formatValidationReport(validation).split('\n')[0]}`);

    if (!validation.valid || !strict.ok) {
      const editPrompt = [
        'Neu hero/card/title dang copy nguyen cau voice/SRT: thay bang keyword ngan, so lieu, label 1-4 tu tu visual brief. Chi subtitle lower-third moi duoc chua cau voice.',
        'Neu canh yeu cau chup man hinh, scroll, browser, website hoac link nguon: bat buoc dung <img src="../assets/images/github_repo.png"> cho khung trang web. Khong thay bang anh nhan vat, logo hay asset minh hoa.',
        'Bat buoc them logo goc tren trai bang <img src="../assets/logo/shiba.png"> va style co dinh. Scene HTML nam trong /compositions nen KHONG dung ./assets/logo/shiba.png.',
        'Khong dung drawSVG/DrawSVGPlugin. Neu can ve SVG path thi dung strokeDasharray/strokeDashoffset voi GSAP core.',
        'Bắt buộc có vùng subtitle với id="captions" hoặc class="captions" ở lower-third.',
        'Bắt buộc phần hiển thị chính là một element class="clip" có data-start/data-duration/data-track-index.',
        'Giữ bố cục 1080x1920, không đổi tỉ lệ, không để tràn khung.',
        'Giữ GSAP timeline paused và window.__timelines["main"].',
        'Giữ bento cards + minh họa phù hợp nội dung.'
      ].join('\n');

      onLog?.(`  ⚠ Strict check failed: ${strict.missing.join(', ') || 'validator errors'}`);
      sceneHtml = await editSceneHTML({ currentHtml: sceneHtml, editPrompt, keys, onLog });
      fixed = autoFixSceneHTML(sceneHtml, { duration: durationMs });
      if (fixed.fixes.length) {
        fixed.fixes.forEach((f) => onLog?.(`  🔧 AutoFix: ${f}`));
        sceneHtml = fixed.html;
      }
      validation = validateSceneHTML(sceneHtml, { duration: durationMs, lang: 'vi' });
      const strictAfter = evaluateSceneHtmlRequirements(scene, sceneProjectAssets, sceneHtml);

      if (!validation.valid || !strictAfter.ok) {
        console.warn(`[Pipeline] [Warning] Scene ${scene.stt} fail validation after edit. Using local fallback.`);
        sceneHtml = generateLocalFallbackHTML({
          scene,
          projectAssets: sceneProjectAssets,
          outputAspectRatio: '9:16',
          audioDurationMs: durationMs
        });
        fixed = autoFixSceneHTML(sceneHtml, { duration: durationMs });
        sceneHtml = fixed.html;
      }
    }

    const sceneHtmlPath = path.join(compositionDir, `scene_${scene.stt}.html`);
    fs.writeFileSync(sceneHtmlPath, sceneHtml, 'utf8');
    console.log(`[Pipeline] Da luu scene HTML tai: ${sceneHtmlPath}`);
    const templateScenePath = path.join(templateCompositionsDir, `scene_${scene.stt}.html`);
    fs.writeFileSync(templateScenePath, sceneHtml, 'utf8');
  }

  // 3b. Sinh Thumbnail
  if (scriptData.thumbnail) {
    console.log('[Pipeline] Generating Thumbnail HTML...');
    let thumbHtml;
    try {
      thumbHtml = await generateThumbnailHTML({
        title: scriptData.thumbnail.title,
        prompt: scriptData.thumbnail.prompt,
        keys,
        onLog,
        projectAssets,
        outputAspectRatio: '9:16',
        outputLanguage: 'vi'
      });
    } catch (err) {
      console.warn(`[Pipeline] [Warning] Sinh HTML Thumbnail that bai do gioi han AI: ${err.message}. Su dung template local fallback.`);
      thumbHtml = generateLocalFallbackThumbnailHTML({
        title: scriptData.thumbnail.title,
        prompt: scriptData.thumbnail.prompt
      });
    }
    const thumbPath = path.join(compositionDir, 'thumbnail.html');
    fs.writeFileSync(thumbPath, thumbHtml, 'utf8');
    console.log(`[Pipeline] Da luu thumbnail HTML tai: ${thumbPath}`);
    const templateThumbPath = path.join(templateDir, 'thumbnail.html');
    fs.writeFileSync(templateThumbPath, thumbHtml, 'utf8');
  }

  console.log('\nStep 4: Lên kế hoạch chọn nhạc nền (BGM) & SFX...');
  // Lay nhac bgm va sfx co san
  const bgmList = fs.readdirSync(path.join(paths.workspaceAssetsDir, 'background-music'))
    .filter(f => f.endsWith('.mp3') || f.endsWith('.wav'))
    .map(f => ({ name: f, duration: null }));
  const sfxList = fs.readdirSync(path.join(paths.workspaceAssetsDir, 'sound-effect'))
    .filter(f => f.endsWith('.mp3') || f.endsWith('.wav'))
    .map(f => ({ name: f, duration: null }));

  let musicPlan;
  try {
    musicPlan = await decideMusicPlan({
      scenes,
      bgmFiles: bgmList,
      sfxFiles: sfxList,
      topic,
      keys,
      onLog,
      sfxCount: 8
    });
  } catch (err) {
    console.warn(`[Pipeline] [Warning] Lên kế hoạch nhạc nền thất bại do giới hạn AI: ${err.message}. Sử dụng cấu hình mặc định.`);
    const bgmFile = bgmList.length > 0 ? bgmList[0].name : 'crypto news ambient background.mp3';
    musicPlan = {
      background_music: bgmFile,
      background_volume: 0.12,
      sound_effects: []
    };
  }

  scriptData.music_plan = musicPlan;
  scriptData.template_snapshot = templateRel;
  fs.writeFileSync(jsonPath, JSON.stringify(scriptData, null, 2), 'utf-8');

  console.log('\nStep 5: Lắp ráp các iframe thành index.html composition chính...');
  
  let audioTagsHtml = '';
  // TTS tracks
  scenes.forEach((scene) => {
    audioTagsHtml += `    <audio id="tts-scene${scene.stt}" src="./${scene.audio_path}" data-track-index="1" data-start="${scene.audio_start.toFixed(3)}" data-duration="${scene.audio_duration.toFixed(3)}" data-volume="1.0"></audio>\n`;
  });
  // SFX tracks
  musicPlan.sound_effects.forEach((sfx, idx) => {
    audioTagsHtml += `    <audio id="sfx-${idx}" src="./assets/sound-effect/${sfx.file}" data-track-index="2" data-start="${sfx.time.toFixed(3)}" data-duration="1.5" data-volume="${sfx.volume.toFixed(2)}"></audio>\n`;
  });

  // Iframes
  let iframeTagsHtml = '';
  scenes.forEach((scene) => {
    iframeTagsHtml += `    <iframe id="iframe-scene${scene.stt}" src="./compositions/scene_${scene.stt}.html"></iframe>\n`;
  });

  // Parent GSAP Timelines
  let parentTimelineJs = '';
  scenes.forEach((scene, idx) => {
    const start = scene.audio_start;
    const dur = scene.duration;
    const end = start + dur;

    parentTimelineJs += `
    // Canh ${scene.stt}
    tl.set("#iframe-scene${scene.stt}", { visibility: "visible", opacity: 1 }, ${start.toFixed(3)});
    tl.to({ progress: 0 }, {
      progress: 1,
      duration: ${dur.toFixed(3)},
      ease: "none",
      onUpdate: function() {
        const iframe = document.getElementById("iframe-scene${scene.stt}");
        if (iframe && iframe.contentWindow && iframe.contentWindow.__timelines && iframe.contentWindow.__timelines["main"]) {
          iframe.contentWindow.__timelines["main"].progress(this.targets()[0].progress);
        }
      }
    }, ${start.toFixed(3)});
    `;

    if (idx < scenes.length - 1) {
      parentTimelineJs += `    tl.to("#iframe-scene${scene.stt}", { opacity: 0, duration: 0.15 }, ${(end - 0.15).toFixed(3)});\n`;
      parentTimelineJs += `    tl.set("#iframe-scene${scene.stt}", { visibility: "hidden" }, ${end.toFixed(3)});\n`;
    }
  });

  const bgmFile = musicPlan.background_music || 'crypto news ambient background.mp3';

  const indexHtmlContent = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <style>
    * { box-sizing: border-box; }
    html, body {
      width: 1080px;
      height: 1920px;
      margin: 0;
      padding: 0;
      overflow: hidden;
      background: #05050a;
    }
    #root {
      position: relative;
      width: 1080px;
      height: 1920px;
      overflow: hidden;
    }
    iframe {
      position: absolute;
      inset: 0;
      width: 1080px;
      height: 1920px;
      border: none;
      visibility: hidden;
      opacity: 0;
      z-index: 10;
    }
    .progress-bar {
      position: absolute;
      bottom: 0;
      left: 0;
      height: 8px;
      background: linear-gradient(90deg, #F7B500, #FFD93D);
      width: 0%;
      z-index: 999;
      box-shadow: 0 0 20px #F7B500;
    }
  </style>
  <script src="./vendor/gsap.min.js"></script>
</head>
<body>
  <div id="root" data-composition-id="agent-composition" data-duration="${totalDurationSec.toFixed(3)}" data-width="1080" data-height="1920" data-start="0">
    <!-- Background Music -->
    <audio id="bg-audio" src="./assets/background-music/${bgmFile}" data-track-index="0" data-start="0" data-duration="${totalDurationSec.toFixed(3)}" data-volume="${musicPlan.background_volume.toFixed(2)}" loop></audio>

    <!-- TTS Audio Tracks & SFX -->
${audioTagsHtml}
    <!-- Compositions Iframes -->
${iframeTagsHtml}
    <!-- Progress Bar -->
    <div class="progress-bar" id="progress"></div>
  </div>

  <script>
    window.__timelines = window.__timelines || {};
    var tl = gsap.timeline({ paused: true });
    var DUR = ${totalDurationSec.toFixed(3)};
    
    // Animate progress bar
    tl.to('#progress', { width: '1080px', duration: DUR, ease: 'none' }, 0);

    // Sync iframes with parent timeline
${parentTimelineJs}
    window.__timelines["agent-composition"] = tl;
  </script>
</body>
</html>`;

  fs.writeFileSync(paths.compositionPath, indexHtmlContent, 'utf8');
  console.log(`[Pipeline] Da ghi de index.html composition tai: ${paths.compositionPath}`);

  console.log('\nStep 5b: Luu template snapshot...');
  const templateCss = buildTemplateCss();
  fs.writeFileSync(path.join(templateDir, 'style.css'), templateCss, 'utf8');
  const sceneIds = scenes.map((scene) => scene.stt);
  const templateModule = buildTemplateModule({ templateRel, sceneIds, totalDurationSec });
  fs.writeFileSync(path.join(templateDir, 'template.mjs'), templateModule, 'utf8');
  const sceneList = sceneIds.map((id) => `compositions/scene_${id}.html`);
  const scenesModule = `export const SCENE_FILES = ${JSON.stringify(sceneList, null, 2)};\n\nexport function getSceneSrc(index) {\n  return SCENE_FILES[index];\n}\n`;
  fs.writeFileSync(path.join(templateDir, 'scenes.mjs'), scenesModule, 'utf8');
  console.log(`[Pipeline] Da tao template tai: ${templateDir}`);

  console.log('\nStep 6: Kiem tra composition bang HyperFrames...');
  const hyperframesValidate = createNodePackageBinCommand({
    appRoot,
    packageName: 'hyperframes',
    binRelativePath: path.join('dist', 'cli.js'),
    args: ['validate'],
    nodePath: nodeBin,
  });
  run(hyperframesValidate.command, hyperframesValidate.args, { cwd: workspaceRoot });

  console.log('\nStep 7: Ket xuat video MP4...');
  const hyperframesRender = createNodePackageBinCommand({
    appRoot,
    packageName: 'hyperframes',
    binRelativePath: path.join('dist', 'cli.js'),
    args: ['render', '--workers=2'],
    nodePath: nodeBin,
  });
  run(hyperframesRender.command, hyperframesRender.args, { cwd: workspaceRoot });

  console.log('\nStep 8: Doi ten video theo dung dinh dang...');
  const latestMp4 = findLatestMp4(paths.rendersDir);
  if (latestMp4) {
    const newMp4Name = `agent-video-${safeTopicName}-${timestamp}.mp4`;
    const oldPath = path.join(paths.rendersDir, latestMp4);
    const newPath = path.join(paths.rendersDir, newMp4Name);
    if (latestMp4 !== newMp4Name) {
      fs.renameSync(oldPath, newPath);
      console.log(`-> ${newMp4Name}`); // In dung format để UI server bắt regex rename
    } else {
      console.log(`→ ${newMp4Name}`);
    }
  }

  console.log('\nStep 9: Don dep file am thanh tam...');
  // Don dep file .wav sinh ra do whisper (neu co)
  if (fs.existsSync(paths.audioDir)) {
    const files = fs.readdirSync(paths.audioDir);
    let deletedCount = 0;
    for (const file of files) {
      if (file.endsWith('.wav')) {
        try {
          fs.unlinkSync(path.join(paths.audioDir, file));
          deletedCount++;
        } catch {}
      }
    }
    console.log(`Da xoa ${deletedCount} file .wav trong thu muc assets/audio.`);
  }

  console.log('\n==================================================');
  console.log('AGENT PIPELINE DA HOAN THANH CONG!');
  console.log('==================================================\n');
}

function srtToMs(t) {
  const [h, m, rest] = t.split(':');
  const [s, ms] = rest.split(',');
  return (+h) * 3600000 + (+m) * 60000 + (+s) * 1000 + (+ms);
}

const isCli = process.argv[1] && path.resolve(process.argv[1]) === __filename;

if (isCli) {
  main().catch((error) => {
    console.error('\nGap loi trong qua trinh chay Agent pipeline:', error);
    process.exit(1);
  });
}

