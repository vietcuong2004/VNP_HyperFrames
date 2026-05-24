// src/agents/scene/generate.js — generateSceneHTML + generateThumbnailHTML
import { callAI } from '../../services/aiRouter.js';
import { buildDirection, directionToPromptBlock }             from '../directorAgent.js';
import { buildDirection as buildDirectionEN, directionToPromptBlock as directionToPromptBlockEN } from '../directorAgent_en.js';
import { mapVisualToAnimation, specToPromptBlock }            from '../../renderer/motionMapper.js';
import { mapVisualToAnimation as mapVisualToAnimationEN, specToPromptBlock as specToPromptBlockEN } from '../../renderer/motionMapper_en.js';
import { timelineToPromptBlock }                              from '../../renderer/timelineBuilder.js';
import { timelineToPromptBlock as timelineToPromptBlockEN }   from '../../renderer/timelineBuilder_en.js';
import { AR_CONFIGS, getAspectRatioRules }                                          from './aspect-ratios.js';
import { AR_CONFIGS_EN, getAspectRatioRules as getAspectRatioRulesEN }             from './aspect-ratios_en.js';
import { parseSRT, srtToMs, groupSRTIntoBeats, buildVoiceTimeline }    from './srt-parser.js';
import { parseSRT as parseSRT_EN, srtToMs as srtToMs_EN, groupSRTIntoBeats as groupSRTIntoBeatsEN, buildVoiceTimeline as buildVoiceTimelineEN } from './srt-parser_en.js';
import { SCENE_PROMPT, THUMBNAIL_PROMPT, fmtMs } from './prompts.js';
import { SCENE_PROMPT_EN } from './prompts-en.js';
import { SCENE_PROMPT_LITE } from './prompts-lite.js';
import { SCENE_PROMPT_LITE_EN } from './prompts-lite-en.js';
import { DEFAULT_STYLE_GUIDE }    from './style-guide.js';
import { DEFAULT_STYLE_GUIDE_EN } from './style-guide_en.js';
import { buildVisualStyleBlock }  from './visualStyleSelector.js';
import { validateSceneHTML, formatValidationReport, autoFixSceneHTML } from './htmlValidator.js';
import { buildVisualCopyBlock, createVisualBrief } from './visualPlanner.js';

// ── Palette Lock: instruction inject khi "Scene nhất quán" được bật ──
const PALETTE_LOCK_VI = `
⚠⚠⚠ CHẾ ĐỘ "SCENE NHẤT QUÁN" ĐANG BẬT ⚠⚠⚠
BẮT BUỘC TUÂN THỦ 100% — KHÔNG ĐƯỢC VI PHẠM:

1. Body background: PHẢI dùng CHÍNH XÁC màu ĐẦU TIÊN trong danh sách "BG accent" / "Background" / "Nền" của Style Guide ở trên.
   KHÔNG ĐƯỢC tự nghĩ ra màu nền mới. KHÔNG ĐƯỢC dùng màu thứ 2, thứ 3.
2. Text chính (title, hero): PHẢI dùng CHÍNH XÁC màu ĐẦU TIÊN trong "Primary" / "Màu chủ đạo".
3. Text phụ (subtitle, label): PHẢI dùng #ffffff hoặc rgba(255,255,255,0.8-1.0).
4. KHÔNG ĐƯỢC tự sáng tạo màu mới ngoài Style Guide.
5. Tất cả scenes trong video này PHẢI có CÙNG background color và CÙNG primary text color.

Lý do: Video cần nhất quán thị giác giữa các cảnh. Nếu bạn đổi màu → video bị rời rạc, không chuyên nghiệp.
`;

const PALETTE_LOCK_EN = `
⚠⚠⚠ "CONSISTENT SCENES" MODE IS ACTIVE ⚠⚠⚠
MANDATORY — DO NOT VIOLATE:

1. Body background: MUST use EXACTLY the FIRST color listed in "BG accent" / "Background" section of the Style Guide above.
   DO NOT invent new background colors. DO NOT use the 2nd or 3rd option.
2. Primary text (title, hero): MUST use EXACTLY the FIRST color in "Primary" / "Main color".
3. Secondary text (subtitle, label): MUST use #ffffff or rgba(255,255,255,0.8-1.0).
4. DO NOT create any new colors outside the Style Guide.
5. ALL scenes in this video MUST have the SAME background color and SAME primary text color.

Reason: Video needs visual consistency across scenes. Changing colors = unprofessional, disjointed video.
`;

function stripVisualDirectives(value) {
  return String(value || '')
    .split(/B[aá]t bu[oộ]c/i)[0]
    .replace(/\[[^\]]+\]/g, ' ')
    .replace(/['"`]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractQuotedVisualText(value) {
  return [...String(value || '').matchAll(/['"]([^'"]{3,48})['"]/g)]
    .map((match) => match[1].trim())
    .filter(Boolean);
}

function visualWords(value) {
  const stop = new Set([
    'main', 'focus', 'motion', 'style', 'scene', 'visual', 'text', 'center',
    'diagram', 'drops', 'packets', 'compress', 'into', 'cache', 'with', 'from',
    'the', 'and', 'for', 'image', 'logo', 'card', 'cards', 'background',
  ]);
  const picked = [];
  const words = String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9+#./-]+/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 1);

  for (const word of words) {
    const key = word.toLowerCase();
    if (stop.has(key)) continue;
    if (picked.some((item) => item.toLowerCase() === key)) continue;
    picked.push(word);
    if (picked.length >= 6) break;
  }
  return picked;
}

export function deriveSceneDisplayCopy(scene = {}) {
  return buildVisualCopyBlock(createVisualBrief(scene));
}

export async function generateSceneHTML({ scene, keys, onLog, brandAssets = [], projectAssets = [], outputAspectRatio = '9:16', styleGuide = null, consistentScenes = false, litePrompt = false, outputLanguage = 'vi', audioDurationMs = null }) {
  const isEN = outputLanguage === 'en';

  // ── Chọn đúng bộ tools theo ngôn ngữ ──
  const _parseSRT          = isEN ? parseSRT_EN           : parseSRT;
  const _srtToMs           = isEN ? srtToMs_EN            : srtToMs;
  const _buildVoice        = isEN ? buildVoiceTimelineEN  : buildVoiceTimeline;
  const _groupBeats        = isEN ? groupSRTIntoBeatsEN   : groupSRTIntoBeats;
  const _timelineBlock     = isEN ? timelineToPromptBlockEN : timelineToPromptBlock;
  const _buildDirection    = isEN ? buildDirectionEN      : buildDirection;
  const _directionBlock    = isEN ? directionToPromptBlockEN : directionToPromptBlock;
  const _mapVisual         = isEN ? mapVisualToAnimationEN : mapVisualToAnimation;
  const _specBlock         = isEN ? specToPromptBlockEN   : specToPromptBlock;
  const _defaultStyle      = isEN ? DEFAULT_STYLE_GUIDE_EN  : DEFAULT_STYLE_GUIDE;
  // styleGuide truyền vào được ưu tiên; fallback theo ngôn ngữ
  const _styleGuide        = styleGuide || _defaultStyle;

  const _AR_CONFIGS        = isEN ? AR_CONFIGS_EN       : AR_CONFIGS;
  const _getARRules        = isEN ? getAspectRatioRulesEN : getAspectRatioRules;
  const ar = _AR_CONFIGS[outputAspectRatio] || _AR_CONFIGS['9:16'];
  const aspectRatioRules = _getARRules(ar);
  const contentW      = ar.w - 20;
  const contentH      = ar.h - 20;
  const lowerThirdY   = Math.round(ar.h * 0.807);
  const contentMaxY   = Math.round(ar.h * 0.792);

  const subsArr = _parseSRT(scene.srt || '').map(s => ({
    from: _srtToMs(s.from),
    to:   _srtToMs(s.to),
    text: s.text
  }));
  const srtDuration = subsArr.length ? Math.max(...subsArr.map(s => s.to)) : 5000;
  // DUR = audio duration thực tế (nếu có), fallback SRT max timestamp.
  // Audio duration luôn >= SRT duration vì audio được pad silence ở B4.
  // Dùng audio duration đảm bảo animation fill đúng toàn bộ video.
  const duration = audioDurationMs && audioDurationMs > srtDuration ? audioDurationMs : srtDuration;

  // Build VOICE TIMELINE — clear table: beat + timing + text + keyword
  const voiceTimeline = _buildVoice(subsArr);
  scene.visual_brief = createVisualBrief(scene);

  // Format brand assets: NAME | TYPE | URL [| duration]
  const brandAssetsText = brandAssets.length
    ? brandAssets.map(a => {
        const dur = a.duration != null ? ` | ${a.duration}s` : '';
        return `${a.name} | ${a.type} | ${a.url}${dur}`;
      }).join('\n')
    : '(none)';

  // Format project assets: mỗi dòng ghi rõ SRC_URL chính xác để AI copy/paste vào src=""
  const projectAssetsText = projectAssets.length
    ? projectAssets.map(a => `[SRC="${a.fileUrl}"] ${a.name} | ${a.type} | ${a.aspectRatio}`).join('\n')
    : '(none)';

  // Group SRT → beats (dùng parser đúng ngôn ngữ)
  const beats = _groupBeats(subsArr, 400);
  const beatCount = beats.length;
  onLog?.(`Scene ${scene.stt}: ${subsArr.length} SRT chunks → ${beatCount} beats | ${fmtMs(duration)} | lang=${outputLanguage}`);

  // ── Cinematic pipeline: Director → MotionMapper → TimelineBuilder ──
  const direction      = _buildDirection(scene, { totalScenes: scene._totalScenes || 1 });
  const animSpec       = _mapVisual(direction, duration);
  const directionBlock = _directionBlock(direction);
  const specBlock      = _specBlock(animSpec);
  const timelineBlock  = _timelineBlock(animSpec, beats);
  onLog?.(`Scene ${scene.stt}: direction=${direction.energy}/${direction.camera} | mood=${direction.mood} | climax=${direction.isClimax}`);

  // Chọn prompt: lite (compact, ít token) hoặc full (chi tiết)
  const scenePrompt = litePrompt
    ? (isEN ? SCENE_PROMPT_LITE_EN : SCENE_PROMPT_LITE)
    : (isEN ? SCENE_PROMPT_EN : SCENE_PROMPT);

  const prompt = scenePrompt
    .replace(/\{\{W\}\}/g, ar.w)
    .replace(/\{\{H\}\}/g, ar.h)
    .replace(/\{\{RATIO_LABEL\}\}/g, ar.label)
    .replace(/\{\{CONTENT_W\}\}/g, contentW)
    .replace(/\{\{CONTENT_H\}\}/g, contentH)
    .replace(/\{\{LOWER_THIRD_Y\}\}/g, lowerThirdY)
    .replace(/\{\{CONTENT_MAX_Y\}\}/g, contentMaxY)
    .replace(/\{\{SIDE_PADDING\}\}/g, ar.sidePadding)
    .replace(/\{\{TOP_PADDING\}\}/g, ar.topPadding)
    .replace(/\{\{BOTTOM_PADDING\}\}/g, ar.bottomPadding)
    .replace(/\{\{TEXT_MAX_W\}\}/g, ar.textMaxW)
    .replace(/\{\{HERO_MAX_W\}\}/g, ar.heroMaxW)
    .replace(/\{\{CARD_MIN_W\}\}/g, ar.cardMinW)
    .replace(/\{\{CARD_MAX_W\}\}/g, ar.cardMaxW)
    .replace(/\{\{SUBJECT_MAX_H\}\}/g, ar.subjectMaxH)
    .replace(/\{\{TEXT_BLOCK_MAX_H\}\}/g, ar.textBlockMaxH)
    .replace(/\{\{SAFE_CENTER_W\}\}/g, ar.safeCenterW)
    .replace(/\{\{SAFE_CENTER_H\}\}/g, ar.safeCenterH)
    .replace(/\{\{SPLIT_GAP\}\}/g, ar.splitGap)
    .replace('{{ASPECT_RATIO_RULES}}', aspectRatioRules)
    .replace('{{VOICE}}', scene.voice.replace(/"/g, "'"))
    .replace('{{VISUAL}}', scene.visual.replace(/"/g, "'"))
    .replace('{{VISUAL_COPY}}', buildVisualCopyBlock(scene.visual_brief).replace(/"/g, "'"))
    .replace(/\{\{DURATION\}\}/g, duration)
    .replace('{{SUBS}}', voiceTimeline)
    .replace('{{CINEMATIC_DIRECTION}}', directionBlock)
    .replace('{{ANIMATION_SPEC}}', specBlock)
    .replace('{{TIMELINE_SKELETON}}', timelineBlock)
    .replace('{{VISUAL_STYLE_BLOCK}}', buildVisualStyleBlock(direction))
    .replace('{{BRAND_ASSETS}}', brandAssetsText)
    .replace('{{PROJECT_ASSETS}}', projectAssetsText)
    .replace('{{STYLE_GUIDE}}', _styleGuide)
    .replace('{{PALETTE_LOCK}}', consistentScenes ? (isEN ? PALETTE_LOCK_EN : PALETTE_LOCK_VI) : '');

  // Note: langDirective removed — EN uses SCENE_PROMPT_EN which is already full English

  const t0 = Date.now();
  const { result } = await callAI({ prompt, isJson: false, keys, onLog });
  let html = result.trim();
  if (!html.toLowerCase().includes('<!doctype')) {
    html = html.replace(/^```html\s*/i, '').replace(/```\s*$/, '').trim();
  }
  const lines = html.split('\n').length;
  const kb = (Buffer.byteLength(html, 'utf8') / 1024).toFixed(1);
  onLog?.(`✓ Cảnh ${scene.stt}: HTML ${lines} dòng (${kb} KB) | ${fmtMs(Date.now() - t0)}`);

  // ── Bước 4a: Auto-fix common AI mistakes ──
  const { html: fixedHtml, fixes } = autoFixSceneHTML(html, { duration });
  if (fixes.length) {
    fixes.forEach(f => onLog?.(`  🔧 AutoFix: ${f}`));
    html = fixedHtml;
  }

  // ── Bước 4b: Quality Validation ──
  const validation = validateSceneHTML(html, { duration, lang: outputLanguage });
  const report = formatValidationReport(validation);
  onLog?.(`  └ Validation: ${report.split('\n')[0]}`);
  if (validation.warnings.length) {
    validation.warnings.forEach(w => onLog?.(`    ⚙ ${w}`));
  }
  if (!validation.valid) {
    validation.errors.forEach(e => onLog?.(`    ✗ ${e}`));
  }

  return html;
}

export async function generateThumbnailHTML({ title, prompt: thumbnailPrompt, keys, onLog, projectAssets = [], outputAspectRatio = '9:16', styleGuide = null, outputLanguage = 'vi' }) {
  const isEN = outputLanguage === 'en';
  // fallback style theo ngôn ngữ
  const _styleGuide = styleGuide || (isEN ? DEFAULT_STYLE_GUIDE_EN : DEFAULT_STYLE_GUIDE);

  const _AR_CONFIGS = isEN ? AR_CONFIGS_EN       : AR_CONFIGS;
  const _getARRules = isEN ? getAspectRatioRulesEN : getAspectRatioRules;
  const ar = _AR_CONFIGS[outputAspectRatio] || _AR_CONFIGS['9:16'];
  const aspectRatioRules = _getARRules(ar);
  const projectAssetsText = projectAssets.length
    ? projectAssets.map(a => `[SRC="${a.fileUrl}"] ${a.name} | ${a.type} | ${a.aspectRatio}`).join('\n')
    : '(none)';

  const prompt = THUMBNAIL_PROMPT
    .replace(/\{\{W\}\}/g, ar.w)
    .replace(/\{\{H\}\}/g, ar.h)
    .replace(/\{\{RATIO_LABEL\}\}/g, ar.label)
    .replace('{{ASPECT_RATIO_RULES}}', aspectRatioRules)
    .replace('{{TITLE}}', String(title || '').replace(/"/g, "'"))
    .replace('{{PROMPT}}', String(thumbnailPrompt || '').replace(/"/g, "'"))
    .replace('{{PROJECT_ASSETS}}', projectAssetsText)
    .replace('{{STYLE_GUIDE}}', _styleGuide);

  const langDirective = isEN
    ? `\n\nLANGUAGE: This is an ENGLISH video. ALL text on the thumbnail MUST be in English. Do NOT use Vietnamese.`
    : '';

  const t0 = Date.now();
  const { result } = await callAI({ prompt: prompt + langDirective, isJson: false, keys, onLog });
  let html = result.trim();
  if (!html.toLowerCase().includes('<!doctype')) {
    html = html.replace(/^```html\s*/i, '').replace(/```\s*$/, '').trim();
  }
  const lines = html.split('\n').length;
  const kb = (Buffer.byteLength(html, 'utf8') / 1024).toFixed(1);
  onLog?.(`✓ Thumbnail: HTML ${lines} lines (${kb} KB) | ${fmtMs(Date.now() - t0)}`);
  return html;
}

// EOF: agents/scene/generate.js
