// src/agents/scene/edit.js — editSceneHTML + editThumbnailHTML
import { callAI } from '../../services/aiRouter.js';
import { EDIT_HTML_PROMPT, EDIT_THUMBNAIL_HTML_PROMPT, fmtMs } from './prompts.js';

export async function editSceneHTML({ currentHtml, editPrompt, keys, onLog }) {
  const prompt = EDIT_HTML_PROMPT
    .replace('{{EDIT_PROMPT}}', editPrompt)
    .replace('{{CURRENT_HTML}}', currentHtml);

  const t0 = Date.now();
  const { result } = await callAI({ prompt, isJson: false, keys, onLog });
  let html = result.trim();
  if (!html.toLowerCase().includes('<!doctype')) {
    html = html.replace(/^```html\s*/i, '').replace(/```\s*$/, '').trim();
  }
  const lines = html.split('\n').length;
  const kb = (Buffer.byteLength(html, 'utf8') / 1024).toFixed(1);
  onLog?.(`✓ HTML đã sửa: ${lines} dòng (${kb} KB) | ${fmtMs(Date.now() - t0)}`);
  return html;
}

export async function editThumbnailHTML({ currentHtml, editPrompt, keys, onLog }) {
  const prompt = EDIT_THUMBNAIL_HTML_PROMPT
    .replace('{{EDIT_PROMPT}}', editPrompt)
    .replace('{{CURRENT_HTML}}', currentHtml);

  const t0 = Date.now();
  const { result } = await callAI({ prompt, isJson: false, keys, onLog });
  let html = result.trim();
  if (!html.toLowerCase().includes('<!doctype')) {
    html = html.replace(/^```html\s*/i, '').replace(/```\s*$/, '').trim();
  }
  const lines = html.split('\n').length;
  const kb = (Buffer.byteLength(html, 'utf8') / 1024).toFixed(1);
  onLog?.(`✓ Thumbnail HTML đã sửa: ${lines} dòng (${kb} KB) | ${fmtMs(Date.now() - t0)}`);
  return html;
}

// EOF: agents/scene/edit.js
