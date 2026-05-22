// src/agents/scene/visualStyleSelector.js — Bước 2: Visual Style System
// Maps mood/energy/content → visual style + structured prompt block
// Based on 8 named styles from skills/hyperframes/visual-styles.md

const VISUAL_STYLES = {
  swiss_pulse: {
    name: 'Swiss Pulse',
    mood: 'clinical, precise',
    palette: { bg: '#1a1a1a', fg: '#ffffff', accent: '#0066FF' },
    gsapSignature: "expo.out, power4.out — fast snap, nothing floats",
    typography: 'Helvetica or Inter Bold headlines, Regular labels. Numbers 80-120px.',
    transition: 'Cinematic Zoom or SDF Iris',
    avoids: 'Decorative elements, soft gradients, rounded corners'
  },
  velvet_standard: {
    name: 'Velvet Standard',
    mood: 'premium, timeless',
    palette: { bg: '#0a0a0a', fg: '#ffffff', accent: '#c9a84c' },
    gsapSignature: "sine.inOut, power1 — nothing snaps, everything glides",
    typography: 'Thin sans-serif, ALL CAPS, wide letter-spacing 0.15em+.',
    transition: 'Cross-Warp Morph',
    avoids: 'Fast motion, crowded layouts, bright saturated colors'
  },
  deconstructed: {
    name: 'Deconstructed',
    mood: 'industrial, raw',
    palette: { bg: '#1a1a1a', fg: '#f0f0f0', accent: '#D4501E' },
    gsapSignature: "back.out(2.5), steps(8), elastic.out(1.2,0.4) — intentional irregularity",
    typography: 'Bold industrial weight at angles, escaping frames.',
    transition: 'Glitch or Whip Pan',
    avoids: 'Clean symmetry, soft eases, polished finishes'
  },
  maximalist_type: {
    name: 'Maximalist Type',
    mood: 'loud, kinetic',
    palette: { bg: '#000000', fg: '#ffffff', accent: '#E63946' },
    gsapSignature: "expo.out, back.out(1.8) — fast arrivals, hard stops",
    typography: 'Text IS the visual. Overlapping at different scales, 50-80% of frame.',
    transition: 'Ridged Burn',
    avoids: 'Empty backgrounds, slow reveals, minimal layouts'
  },
  data_drift: {
    name: 'Data Drift',
    mood: 'futuristic, immersive',
    palette: { bg: '#0a0a0a', fg: '#e0e0e0', accent: '#7c3aed' },
    gsapSignature: "sine.inOut, power2.out — smooth, continuous, organic",
    typography: 'Thin futuristic sans-serif, floating, weightless, minimal.',
    transition: 'Gravitational Lens or Domain Warp',
    avoids: 'Sharp edges, heavy text, boxy layouts'
  },
  soft_signal: {
    name: 'Soft Signal',
    mood: 'intimate, warm',
    palette: { bg: '#FFF8EC', fg: '#2a2a2a', accent: '#F5A623' },
    gsapSignature: "sine.inOut, power1.inOut — everything breathes",
    typography: 'Humanist serif or handwritten-style, personal, lowercase.',
    transition: 'Thermal Distortion',
    avoids: 'Corporate layouts, sharp transitions, dark backgrounds'
  },
  folk_frequency: {
    name: 'Folk Frequency',
    mood: 'cultural, vivid',
    palette: { bg: '#0a0a0a', fg: '#ffffff', accent: '#FF1493' },
    gsapSignature: "back.out(1.6), elastic.out(1,0.5) — overshoots feel intentional",
    typography: 'Bold rounded type, pattern and repetition, handcrafted feeling.',
    transition: 'Swirl Vortex or Ripple Waves',
    avoids: 'Minimalism, monochrome, corporate restraint'
  },
  shadow_cut: {
    name: 'Shadow Cut',
    mood: 'dark, cinematic',
    palette: { bg: '#0a0a0a', fg: '#ffffff', accent: '#C1121F' },
    gsapSignature: "power4.in for exits, power3.out for reveals — the pause matters",
    typography: 'Sharp angular text, film noir title cards, heavy contrast.',
    transition: 'Domain Warp',
    avoids: 'Bright colors, fast motion, playful elements'
  }
};

// Mood → style mapping
const MOOD_STYLE_MAP = {
  epic: 'maximalist_type',
  tension: 'shadow_cut',
  clean: 'swiss_pulse',
  cinematic: 'velvet_standard',
  dramatic: 'deconstructed',
};

// Energy → style fallback
const ENERGY_STYLE_MAP = {
  high: 'maximalist_type',
  dramatic: 'shadow_cut',
  low: 'soft_signal',
  steady: 'velvet_standard',
  build: 'data_drift',
};

/**
 * Select visual style based on direction + optional user hint.
 * @param {{ mood: string, energy: string }} direction
 * @param {string} [userStyleHint] — e.g. "Swiss Pulse", "dark and techy"
 * @returns {object} selected style object
 */
export function selectVisualStyle(direction, userStyleHint) {
  // If user named a specific style
  if (userStyleHint) {
    const key = userStyleHint.toLowerCase().replace(/\s+/g, '_');
    if (VISUAL_STYLES[key]) return VISUAL_STYLES[key];
    // Fuzzy match
    for (const [k, v] of Object.entries(VISUAL_STYLES)) {
      if (v.name.toLowerCase().includes(userStyleHint.toLowerCase())) return v;
    }
  }

  // Auto-select from mood, then energy
  const moodKey = MOOD_STYLE_MAP[direction.mood];
  if (moodKey && VISUAL_STYLES[moodKey]) return VISUAL_STYLES[moodKey];

  const energyKey = ENERGY_STYLE_MAP[direction.energy];
  if (energyKey && VISUAL_STYLES[energyKey]) return VISUAL_STYLES[energyKey];

  return VISUAL_STYLES.velvet_standard; // fallback
}

/**
 * Build a structured text block to inject into the prompt.
 * @param {{ mood: string, energy: string }} direction
 * @param {string} [userStyleHint]
 * @returns {string}
 */
export function buildVisualStyleBlock(direction, userStyleHint) {
  const style = selectVisualStyle(direction, userStyleHint);
  const p = style.palette;
  return [
    `════════════════════════════════════════`,
    `VISUAL STYLE: ${style.name} — ${style.mood}`,
    `════════════════════════════════════════`,
    `PALETTE: bg=${p.bg} | fg=${p.fg} | accent=${p.accent}`,
    `GSAP EASING: ${style.gsapSignature}`,
    `TYPOGRAPHY: ${style.typography}`,
    `TRANSITION STYLE: ${style.transition}`,
    `AVOID: ${style.avoids}`,
    ``,
    `Use these values to guide your color choices, easing selection, and motion feel.`,
    `The palette is a starting point — tint neutrals toward the accent hue.`,
  ].join('\n');
}

// EOF: agents/scene/visualStyleSelector.js
