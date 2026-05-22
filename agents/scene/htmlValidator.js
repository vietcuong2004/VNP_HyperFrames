// src/agents/scene/htmlValidator.js — Bước 4: Quality Validation Loop
// Validates generated HTML against HyperFrames rules before returning to the pipeline.
// Catches common AI mistakes: missing window.__timelines, repeat:-1, anime.js, etc.

/**
 * Validate generated HTML against HyperFrames standards.
 * Returns { valid: boolean, errors: string[], warnings: string[] }
 * @param {string} html — generated HTML string
 * @param {object} [opts]
 * @param {number} [opts.duration] — expected duration in ms
 * @param {string} [opts.lang] — 'vi' or 'en'
 * @returns {{ valid: boolean, errors: string[], warnings: string[] }}
 */
export function validateSceneHTML(html, opts = {}) {
  const errors = [];
  const warnings = [];
  const lower = html.toLowerCase();

  // ═══ CRITICAL ERRORS (block output) ═══

  // Must have window.__timelines registration
  if (!html.includes('window.__timelines')) {
    errors.push('MISSING: window.__timelines registration. Timeline will not be captured.');
  }

  // Must have paused timeline
  if (!html.includes('paused: true') && !html.includes('paused:true')) {
    errors.push('MISSING: gsap.timeline({ paused: true }). Timeline must start paused.');
  }

  // Must end correctly
  if (!lower.includes('</script>') || !lower.includes('</body>') || !lower.includes('</html>')) {
    errors.push('INCOMPLETE: File does not end with </script></body></html>.');
  }

  // Must have GSAP CDN
  if (!html.includes('gsap') && !html.includes('GSAP')) {
    errors.push('MISSING: GSAP library not found in HTML.');
  }

  // ═══ STRUCTURAL WARNINGS ═══

  // Should NOT have anime.js
  if (lower.includes('anime.min.js') || lower.includes('animejs')) {
    warnings.push('BANNED: anime.js detected. Use ONLY GSAP for ALL animations.');
  }

  // Should NOT have repeat: -1
  const repeatInfinite = html.match(/repeat\s*:\s*-1/g);
  if (repeatInfinite) {
    warnings.push(`BANNED: repeat: -1 found ${repeatInfinite.length} time(s). Use finite repeats: Math.ceil(dur/cycle) - 1`);
  }

  // Should NOT have Google Fonts <link>
  if (lower.includes('fonts.googleapis.com')) {
    warnings.push('DEPRECATED: Google Fonts <link> tag found. Fonts are auto-embedded — just use font-family in CSS.');
  }

  // Should NOT have disconnected setTimeout for timing
  const setTimeoutCount = (html.match(/setTimeout/g) || []).length;
  if (setTimeoutCount > 2) {
    warnings.push(`RISKY: ${setTimeoutCount} setTimeout calls found. Use tl.to/from/call with position parameter instead.`);
  }

  // Check for banned fonts (not in asset cache → renders as system fallback)
  const bannedFonts = [
    'Inter', 'Roboto', 'Open Sans', 'Noto Sans', 'Lato', 'Poppins',
    'Outfit', 'Sora', 'Playfair Display', 'Cormorant Garamond',
    'Bodoni Moda', 'EB Garamond', 'Cinzel', 'Prata', 'Syne',
    'Arimo', 'PT Sans', 'Nunito', 'Bebas Neue', 'Montserrat',
    'Raleway', 'Ubuntu', 'Fira Sans', 'Source Sans', 'Barlow', 'DM Sans'
  ];
  for (const font of bannedFonts) {
    if (html.includes(`'${font}'`) || html.includes(`"${font}"`)) {
      warnings.push(`BANNED FONT: "${font}" detected. Use a distinctive font instead.`);
      break; // Report only first banned font
    }
  }

  // Check depth layers
  const hasZindex = html.match(/z-index\s*:\s*(\d+)/g) || [];
  const zValues = hasZindex.map(z => parseInt(z.replace(/\D/g, '')));
  const hasLowZ = zValues.some(z => z <= 2);
  const hasMidZ = zValues.some(z => z >= 3 && z <= 20);
  const hasHighZ = zValues.some(z => z >= 30);
  if (!(hasLowZ && hasMidZ && hasHighZ)) {
    warnings.push('MISSING DEPTH: Need 3 depth layers (z:0-2 far + z:3-20 mid + z:30+ near).');
  }

  // Check vignette/scan/noise overlays
  if (!lower.includes('vignette')) warnings.push('MISSING: .vignette overlay.');
  if (!lower.includes('noise')) warnings.push('MISSING: .noise overlay.');

  // Line count check
  const lineCount = html.split('\n').length;
  if (lineCount > 750) warnings.push(`CODE LENGTH: ${lineCount} lines exceeds 750-line limit. Consider simplifying.`);
  if (lineCount < 100) warnings.push(`CODE LENGTH: ${lineCount} lines seems too short for a cinematic scene.`);

  // Vietnamese diacritics check
  if (opts.lang === 'vi') {
    if (!html.includes('class="txt"') && !html.includes("class='txt'")) {
      warnings.push('VIETNAMESE: No class="txt" found. Vietnamese diacritics may be clipped.');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Format validation result as a readable log string.
 * @param {{ valid: boolean, errors: string[], warnings: string[] }} result
 * @returns {string}
 */
export function formatValidationReport(result) {
  const lines = [];
  if (result.valid) {
    lines.push('✅ HTML validation passed');
  } else {
    lines.push('❌ HTML validation FAILED');
    result.errors.forEach(e => lines.push(`  ✗ ${e}`));
  }
  if (result.warnings.length) {
    lines.push(`⚠️ ${result.warnings.length} warning(s):`);
    result.warnings.forEach(w => lines.push(`  ⚙ ${w}`));
  }
  return lines.join('\n');
}

/**
 * Auto-fix common AI mistakes in generated HTML.
 * Fixes are surgical — only patch what's broken, keep everything else intact.
 *
 * Problems fixed:
 * 1. gsap.timeline() without paused:true → add paused:true
 * 2. Missing window.__timelines registration → inject before </script>
 * 3. Standalone gsap.to/from/fromTo outside timeline (animation runs in real-time)
 *    → wrap into a new tl if no timeline exists, or warn (can't safely rewire arbitrary code)
 *
 * @param {string} html
 * @param {object} [opts]
 * @param {number} [opts.duration] — scene duration in ms
 * @returns {{ html: string, fixes: string[] }}
 */
export function autoFixSceneHTML(html, opts = {}) {
  const fixes = [];

  // Fix 1: gsap.timeline() or gsap.timeline({...}) without paused:true
  // Pattern: gsap.timeline() or gsap.timeline({ ... }) where paused is absent or false
  if (!html.includes('paused: true') && !html.includes('paused:true')) {
    // Try to patch gsap.timeline({ to add paused:true
    const tlWithOpts = /gsap\.timeline\(\s*\{([^}]*)\}\s*\)/;
    const tlNoOpts   = /gsap\.timeline\(\s*\)/;
    if (tlWithOpts.test(html)) {
      html = html.replace(tlWithOpts, (match, inner) => {
        if (inner.includes('paused')) return match; // already has paused
        return `gsap.timeline({ paused: true, ${inner.trim()} })`;
      });
      fixes.push('Fixed: added paused:true to gsap.timeline({...})');
    } else if (tlNoOpts.test(html)) {
      html = html.replace(tlNoOpts, 'gsap.timeline({ paused: true })');
      fixes.push('Fixed: added paused:true to gsap.timeline()');
    }
  }

  // Fix 2: Missing window.__timelines["main"] = tl
  if (!html.includes('window.__timelines')) {
    // Inject just before the last </script>
    const lastScript = html.lastIndexOf('</script>');
    if (lastScript !== -1) {
      const inject = '\nwindow.__timelines = window.__timelines || {};\nwindow.__timelines["main"] = tl;\n';
      html = html.slice(0, lastScript) + inject + html.slice(lastScript);
      fixes.push('Fixed: injected window.__timelines["main"] = tl before </script>');
    }
  }

  // Fix 3: repeat: -1 → replace with finite repeat (Math.ceil(DUR/X)-1 pattern)
  // We can't know the cycle duration statically, so replace with a safe large number
  // based on scene duration if available
  if (/repeat\s*:\s*-1/.test(html)) {
    const durSec = opts.duration ? (opts.duration / 1000).toFixed(1) : 'DUR';
    // Replace repeat:-1 with Math.ceil(DUR/2)-1 as a safe default (2s cycle)
    html = html.replace(/repeat\s*:\s*-1/g, `repeat: Math.ceil(${durSec}/2)-1`);
    fixes.push('Fixed: replaced repeat:-1 with finite repeat');
  }

  // Fix 4: Vietnamese diacritics — dấu bị cắt bởi overflow:hidden trên #content
  // Thêm CSS rule ở cuối <style> để override overflow cho text containers
  if (html.includes('#content') && html.includes('overflow:hidden')) {
    const vietFixCSS = `
/* Vietnamese diacritics fix — prevent clipping */
#content{overflow:visible!important}
.hero-wrap,.hero-label,.hero-num,.hero-sub,
[class*="title"],[class*="label"],[class*="text"],[class*="heading"],
[class*="hero"],[class*="stat"],[class*="num"],[class*="keyword"]{
  overflow:visible!important;line-height:1.5!important;padding-top:0.15em!important;
}`;
    // Inject trước </style> đầu tiên
    const styleEnd = html.indexOf('</style>');
    if (styleEnd !== -1) {
      html = html.slice(0, styleEnd) + vietFixCSS + '\n' + html.slice(styleEnd);
      fixes.push('Fixed: injected Vietnamese diacritics overflow fix');
    }
  }

  return { html, fixes };
}

// EOF: agents/scene/htmlValidator.js
