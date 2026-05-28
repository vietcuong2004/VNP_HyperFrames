export const AR_CONFIGS_EN = {
  '9:16': {
    w: 1080,
    h: 1920,
    label: 'vertical, TikTok/Reels',
    sidePadding: 70,
    topPadding: 90,
    bottomPadding: 130,
    textMaxW: 830,
    heroMaxW: 810,
    cardMinW: 620,
    cardMaxW: 780,
    subjectMaxH: 990,
    textBlockMaxH: 360,
    safeCenterW: 760,
    safeCenterH: 980,
    splitGap: 36,
    layoutRules: `RULES FOR 9:16 (tall vertical, mobile-first priority):
• Focal area: center column of the screen, vertical stacking layout; avoid overly wide horizontal layouts.
• Hero text/number: max width {{HERO_MAX_W}}px; center-aligned or very slightly off-center.
• Card/phone/mockup: width {{CARD_MIN_W}}px to {{CARD_MAX_W}}px; no full-width elements except backgrounds.
• If using 2 columns: only when each column is narrow, total group width max 84%; prefer vertical stacking over horizontal split.
• Avoid placing important subjects near the top/bottom edges; minimum headroom {{TOP_PADDING}}px, minimum side padding {{SIDE_PADDING}}px inside #content.
• Do NOT place text or main objects in the lower third — burned-in subtitles will cover them.
• Background image/video: object-fit:cover; focal point at center 45%/40%, avoid cropping the main subject.
• For mascots/people/tall objects: max height {{SUBJECT_MAX_H}}px, bottom of object must stop above the safe subtitle zone.`,
  },
  '16:9': {
    w: 1920,
    h: 1080,
    label: 'horizontal, YouTube',
    sidePadding: 90,
    topPadding: 70,
    bottomPadding: 90,
    textMaxW: 980,
    heroMaxW: 920,
    cardMinW: 520,
    cardMaxW: 760,
    subjectMaxH: 450,
    textBlockMaxH: 300,
    safeCenterW: 1320,
    safeCenterH: 620,
    splitGap: 80,
    layoutRules: `RULES FOR 16:9 (wide horizontal, cinematic):
• Focal area: slightly left/right of center; take advantage of the width for split layouts, timelines, dashboards.
• Hero text/number: max width {{HERO_MAX_W}}px; avoid stretching into one very long hard-to-read line.
• 2 clear columns or 60/40 layout are allowed, but each block must have at least {{SPLIT_GAP}}px breathing room.
• Main subject must not exceed {{TEXT_BLOCK_MAX_H}}px if it is a text block; avoid overly long vertical stacks.
• For horizontal video/image: prefer object-fit:cover or contain depending on the asset, but always place within a clear frame — do not crop faces or text.
• Secondary elements should spread horizontally, not all clustered in the center as in 9:16.
• Avoid leaving the left/right edges completely empty or conversely overcrowding them; keep outer padding at least {{SIDE_PADDING}}px.`,
  },
  '1:1':  {
    w: 1080,
    h: 1080,
    label: 'square, Instagram',
    sidePadding: 70,
    topPadding: 70,
    bottomPadding: 90,
    textMaxW: 760,
    heroMaxW: 730,
    cardMinW: 520,
    cardMaxW: 700,
    subjectMaxH: 700,
    textBlockMaxH: 280,
    safeCenterW: 740,
    safeCenterH: 740,
    splitGap: 32,
    layoutRules: `RULES FOR 1:1 (square, perfect balance):
• Focal area: center of the frame; prioritize symmetrical, radial, orbit layouts, or 1 hero + 1 label.
• Hero text/number: max width {{HERO_MAX_W}}px; text block height must not exceed {{TEXT_BLOCK_MAX_H}}px.
• Avoid layouts that are too tall or too wide; split layout only when content is very simple.
• Main asset should stay within the safe block {{SAFE_CENTER_W}}px × {{SAFE_CENTER_H}}px at the center of the frame.
• If using cards/lists: max 3 items, each large and airy; no dense dashboards.
• Background decorations should wrap around the subject — do not cover all 4 corners with large objects.
• Keep {{SIDE_PADDING}}px breathing room on each side inside #content to avoid a cramped feel.`,
  },
  '4:5':  {
    w: 1080,
    h: 1350,
    label: 'vertical, Instagram Portrait',
    sidePadding: 65,
    topPadding: 60,
    bottomPadding: 105,
    textMaxW: 790,
    heroMaxW: 760,
    cardMinW: 600,
    cardMaxW: 820,
    subjectMaxH: 760,
    textBlockMaxH: 300,
    safeCenterW: 780,
    safeCenterH: 760,
    splitGap: 34,
    layoutRules: `RULES FOR 4:5 (portrait balanced between feed and mobile):
• Focal area: slightly above center of the screen; vertical layout but less extreme than 9:16.
• Hero text/number: max width {{HERO_MAX_W}}px; can use 2 tiers of short text.
• Card, chart, product shot: width {{CARD_MIN_W}}px to {{CARD_MAX_W}}px; avoid assets too tall dominating the entire frame.
• Split layout works if each block is large enough; best is 1 hero + 1 support block below or to the side.
• Bottom of the main subject must stop above the safe lower third; do NOT let CTA/text sit at the very bottom.
• For portrait/person images: keep headroom {{TOP_PADDING}}px to 90px, avoid cropping the head or cutting hands out of frame.
• Left/right padding minimum {{SIDE_PADDING}}px, top padding minimum {{TOP_PADDING}}px to keep the feed view airy.`,
  },
};

export function getAspectRatioRules(ar) {
  const layoutRules = ar.layoutRules
    .replaceAll('{{SIDE_PADDING}}', String(ar.sidePadding))
    .replaceAll('{{TOP_PADDING}}', String(ar.topPadding))
    .replaceAll('{{BOTTOM_PADDING}}', String(ar.bottomPadding))
    .replaceAll('{{TEXT_MAX_W}}', String(ar.textMaxW))
    .replaceAll('{{HERO_MAX_W}}', String(ar.heroMaxW))
    .replaceAll('{{CARD_MIN_W}}', String(ar.cardMinW))
    .replaceAll('{{CARD_MAX_W}}', String(ar.cardMaxW))
    .replaceAll('{{SUBJECT_MAX_H}}', String(ar.subjectMaxH))
    .replaceAll('{{TEXT_BLOCK_MAX_H}}', String(ar.textBlockMaxH))
    .replaceAll('{{SAFE_CENTER_W}}', String(ar.safeCenterW))
    .replaceAll('{{SAFE_CENTER_H}}', String(ar.safeCenterH))
    .replaceAll('{{SPLIT_GAP}}', String(ar.splitGap));

  return `CURRENT ASPECT RATIO: ${ar.label} (${ar.w}×${ar.h})
Hard layout thresholds — MUST use these values directly in code:
• {{SIDE_PADDING}} = ${ar.sidePadding}px
• {{TOP_PADDING}} = ${ar.topPadding}px
• {{BOTTOM_PADDING}} = ${ar.bottomPadding}px
• {{TEXT_MAX_W}} = ${ar.textMaxW}px
• {{HERO_MAX_W}} = ${ar.heroMaxW}px
• {{CARD_MIN_W}} = ${ar.cardMinW}px
• {{CARD_MAX_W}} = ${ar.cardMaxW}px
• {{SUBJECT_MAX_H}} = ${ar.subjectMaxH}px
• {{TEXT_BLOCK_MAX_H}} = ${ar.textBlockMaxH}px
• {{SAFE_CENTER_W}} = ${ar.safeCenterW}px
• {{SAFE_CENTER_H}} = ${ar.safeCenterH}px
• {{SPLIT_GAP}} = ${ar.splitGap}px

${layoutRules}

GENERAL RULES BY RATIO:
• Every asset/text must be placed in a clearly defined container with top/left/width/height or internal flex/grid — no vague values that cause overflow.
• For images/video/logos: if there is a risk of cropping content, prefer wrapping in a contain frame with a secondary background instead of full-screen cover.
• No text block, main icon, character, or card should touch the edge of #content; always reserve the correct padding per the ratio rules.
• If the layout proposed in the Visual concept conflicts with the ratio rules, the ratio rules MUST take priority to keep content within the frame.
• When writing CSS/JS, use these threshold values directly for width/max-width/height/max-height/top/left/right/bottom rather than estimating.`;
}

// EOF: agents/scene/aspect-ratios_en.js
