const GENERIC_TEXT = new Set([
  'html',
  'scene',
  'scene 1',
  'scene 01',
  'focus',
  'module',
  'overview',
  'dynamic',
  'visual',
  'content',
  'main',
]);

const STOP_WORDS = new Set([
  'main', 'focus', 'motion', 'style', 'scene', 'visual', 'text', 'center',
  'diagram', 'with', 'from', 'the', 'and', 'for', 'image', 'logo', 'card',
  'cards', 'background', 'mot', 'một', 'la', 'là', 'viet', 'viết', 'bang',
  'bằng', 'dung', 'dùng', 'giua', 'giữa', 'assistant', 'terminal',
  'environment', 'gradient', 'xanh', 'den', 'đen', 'toi', 'tối', 'lop', 'lớp',
  'depth', 'motion', 'camera', 'lighting', 'mood', 'glow', 'entry', 'exit',
  'idle', 'near', 'far', 'mid',
]);

const ALLOWED_LAYOUTS = new Set([
  'browser_scroll',
  'terminal_steps',
  'architecture_map',
  'metric_cards',
  'feature_cards',
  'checklist',
]);

function normalize(value) {
  return String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9+#./%-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function titleToken(value) {
  const text = String(value || '').trim();
  if (!text) return '';
  if (/^[A-Z0-9+#./%-]{2,}$/.test(text)) return text;
  return text.slice(0, 1).toUpperCase() + text.slice(1);
}

function unique(values) {
  const seen = new Set();
  const out = [];
  for (const value of values) {
    const clean = String(value || '').trim();
    if (!clean) continue;
    const key = normalize(clean);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(clean);
  }
  return out;
}

function extractQuotedText(value) {
  return [...String(value || '').matchAll(/['"]([^'"]{2,48})['"]/g)]
    .map((match) => match[1].trim())
    .filter(Boolean);
}

function extractMetrics(value) {
  return [...String(value || '').matchAll(/\b\d+(?:[.,]\d+)?(?:\s*[-–]\s*\d+(?:[.,]\d+)?)?\s*%|\b\d+(?:[.,]\d+)?x\b/gi)]
    .map((match) => match[0].replace(/\s+/g, ''));
}

function extractSourceSubject(scene = {}) {
  const url = String(scene.source_url || scene.repo_url || scene.url || '');
  const github = url.match(/github\.com\/([^/\s]+)\/([^/?#\s]+)/i);
  if (github) {
    return github[2].replace(/\.git$/i, '');
  }
  const host = url.match(/^https?:\/\/([^/?#]+)/i)?.[1] || '';
  if (host) {
    const parts = host.replace(/^www\./i, '').split('.');
    return parts[0] || host;
  }
  return '';
}

function extractKeywords(value) {
  const words = String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9+#./%-]+/g, ' ')
    .split(/\s+/)
    .map((word) => word.trim())
    .filter((word) => word.length > 1);
  const picked = [];
  for (const word of words) {
    const key = normalize(word);
    if (STOP_WORDS.has(key)) continue;
    if (/^\d+$/.test(key)) continue;
    picked.push(titleToken(word));
    if (picked.length >= 8) break;
  }
  return unique(picked);
}

function isGenericText(value) {
  const key = normalize(value);
  if (!key) return true;
  if (GENERIC_TEXT.has(key)) return true;
  if (/^scene\s*\d+$/i.test(key)) return true;
  return false;
}

function inferLayout(scene = {}, labels = []) {
  const text = normalize(`${scene.visual || ''} ${scene.voice || ''} ${labels.join(' ')}`);
  if (/screenshot|screen|browser|webpage|website|github|docker hub|scroll|chup|cuon/.test(text)) {
    return 'browser_scroll';
  }
  if (/install|clone|run|command|terminal|cli|npm|docker|pull|setup/.test(text)) {
    return 'terminal_steps';
  }
  if (/proxy|flow|architecture|pipeline|cache|node|map|diagram|api/.test(text)) {
    return 'architecture_map';
  }
  if (extractMetrics(text).length) return 'metric_cards';
  if (/checklist|warning|risk|security|backup|outro|cta/.test(text)) return 'checklist';
  return 'feature_cards';
}

export function createVisualBrief(scene = {}) {
  if (scene.visual_brief && typeof scene.visual_brief === 'object') {
    return normalizeVisualBrief(scene.visual_brief, scene);
  }

  const sourceSubject = extractSourceSubject(scene);
  const quoted = extractQuotedText(scene.visual);
  const metrics = extractMetrics(`${scene.visual || ''} ${scene.voice || ''}`);
  const keywords = extractKeywords(`${scene.visual || ''} ${scene.voice || ''}`);
  const subject = titleToken(sourceSubject || keywords[0] || 'Source');
  const subjectUpper = subject.toUpperCase();

  const labels = unique([
    ...quoted.slice(1),
    ...metrics,
    ...keywords.filter((word) => normalize(word) !== normalize(subject)),
  ]).filter((label) => !isGenericText(label)).slice(0, 5);

  let primary = quoted.find((text) => !isGenericText(text));
  if (!primary && metrics[0]) primary = `${subjectUpper} ${metrics[0]}`;
  if (!primary && labels[0]) primary = `${subjectUpper} ${labels[0]}`.slice(0, 34);
  if (!primary) primary = `${subjectUpper} OVERVIEW`;

  const secondary = labels.length ? labels : [subjectUpper];
  return normalizeVisualBrief({
    scene_goal: inferSceneGoal(scene),
    layout_intent: inferLayout(scene, secondary),
    main_subject: subjectUpper,
    primary_text: primary.toUpperCase(),
    secondary_labels: secondary.map((label) => String(label).toUpperCase()).slice(0, 5),
    facts: unique([...visualFactCandidates(scene.visual), quoted[0]]).filter(Boolean).slice(0, 3),
    visual_objects: inferVisualObjects(scene, secondary),
    asset_requirements: inferAssetRequirements(scene),
    avoid_text: ['HTML', 'Scene 1', 'Focus', 'Module', 'Infinite possibilities'],
  }, scene);
}

function normalizeVisualBrief(brief = {}, scene = {}) {
  const subject = titleToken(brief.main_subject || extractSourceSubject(scene) || 'Source').toUpperCase();
  const labels = unique(Array.isArray(brief.secondary_labels) ? brief.secondary_labels : [])
    .filter((label) => !isGenericText(label))
    .slice(0, 5);
  const primary = isGenericText(brief.primary_text)
    ? `${subject} ${labels[0] || 'OVERVIEW'}`
    : String(brief.primary_text || `${subject} OVERVIEW`).trim();
  const layout = ALLOWED_LAYOUTS.has(brief.layout_intent) ? brief.layout_intent : inferLayout(scene, labels);
  return {
    scene_goal: brief.scene_goal || inferSceneGoal(scene),
    layout_intent: layout,
    main_subject: subject,
    primary_text: primary.toUpperCase(),
    secondary_labels: (labels.length ? labels : [subject]).map((label) => String(label).toUpperCase()),
    facts: unique(Array.isArray(brief.facts) ? brief.facts : []).slice(0, 4),
    visual_objects: unique(Array.isArray(brief.visual_objects) ? brief.visual_objects : inferVisualObjects(scene, labels)).slice(0, 6),
    asset_requirements: unique(Array.isArray(brief.asset_requirements) ? brief.asset_requirements : inferAssetRequirements(scene)).slice(0, 4),
    avoid_text: unique([...(Array.isArray(brief.avoid_text) ? brief.avoid_text : []), 'HTML', 'Scene 1', 'Focus']),
  };
}

function stripVisualDirectives(value) {
  return String(value || '')
    .replace(/\[[^\]]+\]/g, ' ')
    .replace(/['"`]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function visualFactCandidates(value) {
  return [...String(value || '').matchAll(/\[([^\]]+)\]\s*([^\[]+)/g)]
    .filter((match) => /text|main focus|focus|subject/i.test(match[1]))
    .map((match) => stripVisualDirectives(match[2]))
    .filter((item) => item && !/gradient|depth|environment|motion|camera|lighting|mood|glow|background/i.test(item));
}

function inferSceneGoal(scene = {}) {
  const text = normalize(`${scene.voice || ''} ${scene.visual || ''}`);
  if (/canh bao|warning|risk|luu y|security/.test(text)) return 'warning';
  if (/install|clone|run|setup|command|quickstart/.test(text)) return 'demo';
  if (/compare|versus|vs|khac nhau/.test(text)) return 'compare';
  if (/outro|cta|follow|star|save/.test(text)) return 'outro';
  return Number(scene.stt) === 1 ? 'hook' : 'explain';
}

function inferVisualObjects(scene = {}, labels = []) {
  const text = normalize(`${scene.visual || ''} ${scene.voice || ''} ${labels.join(' ')}`);
  if (/browser|screenshot|github|webpage|website/.test(text)) return ['browser', 'screenshot', 'callout'];
  if (/terminal|cli|command|install|run|clone/.test(text)) return ['terminal', 'command', 'steps'];
  if (/proxy|cache|flow|api|pipeline/.test(text)) return ['nodes', 'arrows', 'data flow'];
  if (extractMetrics(text).length) return ['metric cards', 'counter', 'badges'];
  return ['cards', 'badges', 'icon'];
}

function inferAssetRequirements(scene = {}) {
  const text = normalize(`${scene.visual || ''} ${scene.voice || ''}`);
  const assets = ['logo'];
  if (/screenshot|browser|webpage|website|github|docker hub|scroll/.test(text)) assets.unshift('screenshot');
  return unique(assets);
}

export function validateVisualBrief(brief = {}, scene = {}) {
  const errors = [];
  if (isGenericText(brief.primary_text)) errors.push('generic primary_text');
  const labels = Array.isArray(brief.secondary_labels) ? brief.secondary_labels : [];
  if (!labels.length || labels.every(isGenericText)) errors.push('generic secondary_labels');
  if (!ALLOWED_LAYOUTS.has(brief.layout_intent)) errors.push('unsupported layout_intent');
  const sourceSubject = normalize(brief.main_subject || extractSourceSubject(scene));
  const primary = normalize(brief.primary_text);
  const labelText = normalize(labels.join(' '));
  if (sourceSubject && !primary.includes(sourceSubject) && !labelText.includes(sourceSubject)) {
    errors.push('missing source keyword');
  }
  return { ok: errors.length === 0, errors };
}

export function buildVisualCopyBlock(brief = {}) {
  const labels = Array.isArray(brief.secondary_labels) ? brief.secondary_labels : [];
  const facts = Array.isArray(brief.facts) ? brief.facts : [];
  const objects = Array.isArray(brief.visual_objects) ? brief.visual_objects : [];
  return [
    `LAYOUT_INTENT: ${brief.layout_intent || 'feature_cards'}`,
    `MAIN_SUBJECT: ${brief.main_subject || ''}`,
    `PRIMARY_TEXT: ${brief.primary_text || ''}`,
    `SECONDARY_LABELS: ${labels.join(' | ')}`,
    `FACTS: ${facts.join(' | ')}`,
    `VISUAL_OBJECTS: ${objects.join(' | ')}`,
    'RULE: Use these fields for main #content text. Never render generic labels like HTML, numbered scene labels, Focus, Module.',
  ].join('\n');
}
