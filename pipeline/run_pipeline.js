import fs from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';
import os from 'os';
import { runCommand } from '../desktop_app/command_runner.mjs';
import { createNodePackageBinCommand } from '../desktop_app/runtime_binaries.mjs';
import { createWorkspacePaths, prepareWorkspaceRuntime } from '../desktop_app/workspace.mjs';
import { resolveTemplatePaths } from './templateResolver.mjs';

// Import Agents & Builders
import { generateTTS } from '../agents/ttsAgent.js';
import { transcribeToSRT } from '../agents/whisperAgent.js';
import { fixSRTWithAI } from '../agents/srtFixAgent.js';
import { parseTargetUrl, buildGithubData, buildDockerData, buildWebData, selectTemplateVariant } from './main_generateContent.js';
import { updateJobProgress, saveVideoScriptAndStructure, updateSceneAudioAndSrt } from '../services/dbService.js';

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

export function buildFinalVideoName({ safeTopicName, date = new Date(), runId } = {}) {
  const pad = (n) => String(n).padStart(2, '0');
  const dateStr = [
    pad(date.getDate()),
    pad(date.getMonth() + 1),
    date.getFullYear(),
    pad(date.getHours()),
    pad(date.getMinutes()),
    pad(date.getSeconds()),
  ].join('-');
  const safeRunId = String(runId || process.pid || 'run')
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48) || 'run';
  return `agent-video-${safeTopicName || 'video'}_${dateStr}-${safeRunId}.mp4`;
}

async function main() {
  const urlOrTopic = process.argv[2];
  if (!urlOrTopic) {
    console.error('Loi: Vui long cung cap chu de hoac URL can tao video.');
    console.error('Vi du topic: node pipeline/run_pipeline.js "Huong dan lap trinh Node.js"');
    console.error('Vi du URL: node pipeline/run_pipeline.js https://github.com/heygen-com/hyperframes');
    process.exit(1);
  }

  await prepareWorkspaceRuntime(paths);

  const jobId = process.env.JOB_ID;
  async function dbProgress(progress, stage, updates = {}) {
    if (!jobId) return;
    try {
      await updateJobProgress(jobId, { progress, current_stage: stage, ...updates });
    } catch (err) {
      console.warn(`[DB Progress] Lỗi cập nhật CSDL: ${err.message}`);
    }
  }

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

  let safeTopicName = urlOrTopic.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase().replace(/-+/g, '-').substring(0, 30);
  const timestamp = Date.now().toString(36);
  const runId = process.env.JOB_ID || `${timestamp}-${process.pid}`;
  const jsonPath = path.join(paths.dataDir, `agent-script-${safeTopicName}-${timestamp}.json`);

  // Step 1: Sinh kich ban JSON qua cac content generator hoac cache
  console.log('Step 1: Sinh kich ban JSON qua các content generator...');
  await dbProgress(10, 'generating_script');
  let scriptData = null;

  if (!scriptData) {
    let target;
    let isUrl = false;
    if (urlOrTopic.startsWith('http://') || urlOrTopic.startsWith('https://')) {
      isUrl = true;
      target = parseTargetUrl(urlOrTopic);
    }

    if (isUrl) {
      if (target.platform === 'github') {
        scriptData = await buildGithubData(target);
      } else if (target.platform === 'docker') {
        scriptData = await buildDockerData(target);
      } else {
        scriptData = await buildWebData(target);
      }
    } else {
      const lower = urlOrTopic.toLowerCase();
      if (lower.includes('github') || lower.includes('repo')) {
        const mockTarget = {
          platform: 'github',
          url: 'https://github.com/developer/project',
          owner: 'developer',
          repo: 'project'
        };
        const mockRepoData = {
          name: 'project',
          description: urlOrTopic,
          stargazers_count: 100,
          language: 'JavaScript',
          license: { name: 'MIT' }
        };
        const readme = `# ${urlOrTopic}\n\nThis is a generated presentation for: ${urlOrTopic}`;
        const { generateScenes } = await import('./generators/github_generator.mjs');
        const scenes = await generateScenes({ target: mockTarget, repoData: mockRepoData, readme }, 'repo_overview_with_use_cases');
        scriptData = {
          template: 'G1_github',
          subtemplate: selectTemplateVariant('github', 'repo_overview_with_use_cases'),
          source_url: mockTarget.url,
          platform: 'github',
          content_type: 'repo_overview',
          video_format: 'repo_overview_with_use_cases',
          scenes
        };
      } else if (lower.includes('docker') || lower.includes('container') || lower.includes('image')) {
        const mockTarget = {
          platform: 'docker',
          url: 'https://hub.docker.com/r/library/container',
          namespace: 'library',
          image: 'container'
        };
        const mockInfo = {
          name: 'container',
          namespace: 'library',
          description: urlOrTopic,
          star_count: 50,
          pull_count: 1000
        };
        const { generateScenes } = await import('./generators/docker_generator.mjs');
        const scenes = await generateScenes({ target: mockTarget, info: mockInfo }, 'container_overview');
        scriptData = {
          template: 'G2_docker',
          subtemplate: selectTemplateVariant('docker', 'container_overview'),
          source_url: mockTarget.url,
          platform: 'docker',
          content_type: 'docker_image',
          video_format: 'container_overview',
          scenes
        };
      } else {
        const mockTarget = {
          platform: 'web',
          url: 'https://techblog.com/article',
          host: 'techblog.com',
          pathname: '/article'
        };
        const mockWebInfo = {
          title: urlOrTopic,
          description: `Tổng quan và phân tích về chủ đề: ${urlOrTopic}`,
          answer: urlOrTopic,
          results: []
        };
        const { generateScenes } = await import('./generators/web_generator.mjs');
        const scenes = await generateScenes({ target: mockTarget, webInfo: mockWebInfo }, 'web_context_digest');
        scriptData = {
          template: 'G3_web',
          subtemplate: selectTemplateVariant('web', 'web_context_digest'),
          source_url: mockTarget.url,
          platform: 'web',
          content_type: 'web_unknown',
          video_format: 'web_context_digest',
          scenes
        };
      }
    }

    fs.writeFileSync(jsonPath, JSON.stringify(scriptData, null, 2), 'utf-8');
    console.log(`[Pipeline] Da luu file kich ban JSON tai: ${jsonPath}`);
  }

  if (jobId && scriptData) {
    try {
      console.log(`[Pipeline] Đang lưu cấu trúc kịch bản và phân cảnh lên Supabase cho job ${jobId}...`);
      await saveVideoScriptAndStructure(jobId, scriptData);
    } catch (dbErr) {
      console.error(`[DB Error] Lưu kịch bản lên Supabase thất bại: ${dbErr.message}`);
    }
  }

  // Chụp ảnh màn hình cho tất cả các loại URL (GitHub, Docker, Web)
  if (urlOrTopic.startsWith('http://') || urlOrTopic.startsWith('https://')) {
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
      console.log(`[Pipeline] Chup anh man hinh thanh cong.`);
    } catch (err) {
      console.warn(`[Pipeline] Chup anh man hinh loi: ${err.message}. Bo qua.`);
    }
  }

  const ttsProviderLabel = keys.useLarVoice ? 'LarVoice' : 'Edge TTS';
  console.log(`\nStep 2: Sinh giong doc (${ttsProviderLabel}) va phu de (Whisper/LarVoice Subtitle)...`);
  await dbProgress(40, 'generating_audio', {
    template_group: scriptData.template,
    template_name: scriptData.subtemplate
  });
  const scenes = scriptData.scenes;
  let accumulatedTimeMs = 0;

  // Xử lý song song TTS, Whisper và AI SRT Fix cho tất cả các cảnh để tiết kiệm thời gian
  console.log(`[Pipeline] Bắt đầu xử lý song song ${scenes.length} phân cảnh...`);
  await Promise.all(scenes.map(async (scene, index) => {
    scene.stt = scene.stt || scene.scene;
    const audioPath = path.join(paths.audioDir, `scene_${scene.stt}.mp3`);
    const srtPath = path.join(paths.audioDir, `scene_${scene.stt}.srt`);

    // 2a. TTS
    const ttsResult = await generateTTS(scene.voice, audioPath, onLog, keys);
    const duration = ttsResult.duration; // thoi luong (s) cua file am thanh
    const roundedDuration = Math.round(duration * 1000) / 1000;
    
    scene.audio_duration = Math.max(0.1, roundedDuration - 0.005);
    scene.audio_path = `assets/audio/scene_${scene.stt}.mp3`;
    scene.duration = roundedDuration;

    // 2b. Karaoke Timestamps
    let rawSrt = '';
    if (ttsResult.subtitleUrl) {
      const dlSrt = await getUrlContent(ttsResult.subtitleUrl);
      if (dlSrt && dlSrt.includes('-->')) {
        rawSrt = dlSrt;
      }
    }

    if (!rawSrt) {
      try {
        await transcribeToSRT(audioPath, srtPath, onLog, 'vi', 'main');
        if (fs.existsSync(srtPath)) {
          rawSrt = fs.readFileSync(srtPath, 'utf8');
        }
      } catch (err) {
        rawSrt = `1\n00:00:00,000 --> 00:00:${Math.min(9, Math.floor(duration)).toString().padStart(2, '0')},000\n${scene.voice}`;
      }
    }

    // 2c. Rà soát sửa lỗi phụ đề bằng SRTFixAgent
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
      console.warn(`[Pipeline] [Warning] Ra soat loi chinh ta phu de that bai cho Canh ${scene.stt}: ${err.message}. Su dung phu de raw.`);
    }

    scene.srt = fixedSrt;
    fs.writeFileSync(srtPath, fixedSrt, 'utf8');

    if (scene.id) {
      try {
        await updateSceneAudioAndSrt(scene.id, scene.audio_path, `assets/audio/scene_${scene.stt}.srt`, fixedSrt);
      } catch (dbErr) {
        console.error(`[DB Error] Lỗi cập nhật phân cảnh ${scene.stt} lên CSDL: ${dbErr.message}`);
      }
    }
    
    console.log(`[Pipeline] Hoàn tất xử lý audio & phụ đề cho Canh ${scene.stt}`);
  }));

  // Tính toán audio_start và word timing transcript tuần tự
  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i];
    scene.audio_start = Math.round(accumulatedTimeMs) / 1000;
    
    scene.transcript = [];
    const blocks = scene.srt.trim().split(/\r?\n\r?\n/);
    const srtTextLines = [];
    for (const block of blocks) {
      const lines = block.split(/\r?\n/);
      if (lines.length >= 3) {
        srtTextLines.push(lines.slice(2).join(' ').trim());
      }
    }
    const cleanText = srtTextLines.join(' ').trim() || scene.voice;
    const words = cleanText.split(/\s+/).filter(Boolean);
    const effectiveTextDuration = scene.duration * 0.90;
    const timePerWord = effectiveTextDuration / words.length;
    let wordStart = scene.audio_start;

    scene.transcript = words.map((w) => {
      const item = {
        text: w,
        start: Math.round(wordStart * 100) / 100,
        end: Math.round((wordStart + timePerWord) * 100) / 100
      };
      wordStart += timePerWord;
      return item;
    });

    accumulatedTimeMs += Math.round(scene.duration * 1000);
  }

  const totalDurationSec = accumulatedTimeMs / 1000;
  scriptData.duration = totalDurationSec;
  fs.writeFileSync(jsonPath, JSON.stringify(scriptData, null, 2), 'utf-8');

  console.log('\nStep 3: Bien dich index.html composition chinh tu template...');
  await dbProgress(75, 'compiling_template');
  const templateName = scriptData.template || 'G3_web';
  const templatePaths = resolveTemplatePaths({
    appRoot,
    templateName,
    subtemplateName: scriptData.subtemplate,
    templateVariant: scriptData.template_variant,
  });

  let templateModule;
  try {
    templateModule = await import(templatePaths.templateImportPath);
  } catch (e) {
    console.error(`Error loading template module for ${templateName}/${templatePaths.variantName}:`, e);
    process.exit(1);
  }

  let styleContent = '';
  if (fs.existsSync(templatePaths.stylePath)) {
    styleContent = fs.readFileSync(templatePaths.stylePath, 'utf-8');
    styleContent = styleContent.replace(/@import\s+url\(['"]https:\/\/fonts\.googleapis\.com\/[^'"]+['"]\);\s*/g, '');
  }

  const indexHtmlContent = templateModule.default(scriptData, styleContent);
  fs.writeFileSync(paths.compositionPath, indexHtmlContent, 'utf-8');
  console.log(`[Pipeline] Da ghi de index.html composition tai: ${paths.compositionPath}`);



  console.log('\nStep 4: Kiem tra composition bang HyperFrames...');
  await dbProgress(80, 'validating_composition');
  const hyperframesValidate = createNodePackageBinCommand({
    appRoot,
    packageName: 'hyperframes',
    binRelativePath: path.join('dist', 'cli.js'),
    args: ['validate'],
    nodePath: nodeBin,
  });
  run(hyperframesValidate.command, hyperframesValidate.args, { cwd: workspaceRoot });

  console.log('\nStep 5: Ket xuat video MP4...');
  await dbProgress(85, 'rendering_video');
  const cpuCores = os.cpus().length;
  const workers = Math.min(8, Math.max(2, cpuCores - 2));
  console.log(`[Pipeline] Su dung ${workers} luong render song song (phat hien ${cpuCores} cores CPU)`);
  const hyperframesRender = createNodePackageBinCommand({
    appRoot,
    packageName: 'hyperframes',
    binRelativePath: path.join('dist', 'cli.js'),
    args: ['render', `--workers=${workers}`],
    nodePath: nodeBin,
  });
  run(hyperframesRender.command, hyperframesRender.args, { cwd: workspaceRoot });

  console.log('\nStep 6: Doi ten video theo dung dinh dang...');
  const latestMp4 = findLatestMp4(paths.rendersDir);
  let finalVideoName = '';
  if (latestMp4) {
    const newMp4Name = buildFinalVideoName({ safeTopicName, runId });
    finalVideoName = newMp4Name;
    const oldPath = path.join(paths.rendersDir, latestMp4);
    const newPath = path.join(paths.rendersDir, newMp4Name);
    if (latestMp4 !== newMp4Name) {
      fs.renameSync(oldPath, newPath);
      console.log(`-> ${newMp4Name}`); // In dung format để UI server bắt regex rename
    } else {
      console.log(`→ ${newMp4Name}`);
    }

    if (jobId) {
      try {
        const stats = fs.statSync(newPath);
        const { registerRender } = await import('../services/dbService.js');
        await registerRender(jobId, newMp4Name, `/renders/${newMp4Name}`, stats.size, scriptData.duration || 0);
      } catch (dbErr) {
        console.error(`[DB Error] Đăng ký tệp render lên Supabase thất bại: ${dbErr.message}`);
      }
    }
  }
  await dbProgress(100, 'completed', { status: 'completed' });

  console.log('\nStep 7: Don dep file am thanh tam...');
  if (fs.existsSync(paths.audioDir)) {
    const files = fs.readdirSync(paths.audioDir);
    let deletedCount = 0;
    for (const file of files) {
      try {
        fs.unlinkSync(path.join(paths.audioDir, file));
        deletedCount++;
      } catch {}
    }
    console.log(`Da xoa ${deletedCount} file tam trong thu muc assets/audio.`);
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
  main().catch(async (error) => {
    console.error('\nGap loi trong qua trinh chay Agent pipeline:', error);
    const jobId = process.env.JOB_ID;
    if (jobId) {
      try {
        const { updateJobProgress } = await import('../services/dbService.js');
        await updateJobProgress(jobId, {
          status: 'failed',
          current_stage: 'failed',
          error_message: error.message || String(error)
        });
      } catch (dbErr) {
        console.error(`[DB Error] Lỗi cập nhật trạng thái thất bại cho job: ${dbErr.message}`);
      }
    }
    process.exit(1);
  });
}

// Re-export helper functions expected by unit tests
import { containsForbiddenFallbackCopy } from './localFallbackGenerator.js';
import { containsVoiceLeak } from '../agents/scene/htmlValidator.js';

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

export function findJsonPath(output) {
  const lines = output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  for (const line of lines) {
    const markerIndex = line.lastIndexOf(": ");
    if (markerIndex !== -1 && line.toLowerCase().includes(".json")) {
      const candidate = line.slice(markerIndex + 2).trim();
      if (candidate.endsWith(".json")) return candidate;
    }
  }

  const matches = output.match(/[A-Za-z]:[^\r\n]+?\.json|\/[^\r\n]+?\.json/g) || [];
  if (matches.length === 0) {
    throw new Error("Khong tim thay duong dan file JSON da tao trong output.");
  }
  return matches[matches.length - 1].trim();
}
