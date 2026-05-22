// Default style guide (Finance / Crypto) — English version
// Used when outputLanguage === 'en' and no custom styleGuide is provided
export const DEFAULT_STYLE_GUIDE_EN = `COLORS (use only from this list):
• Primary: #F7B500 (gold main), #FFD93D (bright gold), #FF9500 (orange accent)
• Gain/bull: #22c55e, #10b981, glow #22c55e80
• Loss/bear: #ef4444, #dc2626, glow #ef444480
• Neutral: #fff, #e5e7eb, #9ca3af, #4b5563
• BG accent: #1e293b, #0f172a, #1a1a2e
• Gold gradient: linear-gradient(135deg,#F7B500,#FF9500,#FFD93D)
• Bull gradient: linear-gradient(135deg,#10b981,#22c55e)
• Bear gradient: linear-gradient(135deg,#dc2626,#ef4444)

CACHED FONTS (only these 3 are embedded — do NOT use any other font):
• "Oswald" — condensed display headlines (weight 400/500/600/700) → hero titles, impact numbers
• "Be Vietnam Pro" — clean sans-serif body (weight 400/600/700/800/900) → labels, captions, sub-text
• "IBM Plex Mono" — monospace data (weight 400/500/600/700) → numbers, percentages, counters, code

FONT SIZE (fixed px, viewport {{W}}):
• Hero number: 200-280px, font-weight:900, font-family:"IBM Plex Mono"
• Big number: 140-180px, font-weight:800, font-family:"IBM Plex Mono"
• Title/headline: 72-120px, font-weight:700, font-family:"Oswald", letter-spacing:-0.02em
• Subtitle: 48-64px, font-weight:600, font-family:"Oswald"
• Label: 32-40px, font-weight:600, font-family:"Be Vietnam Pro", letter-spacing:2px, text-transform:uppercase
• Caption: 22-28px, font-weight:400, font-family:"Be Vietnam Pro"

ENGLISH TEXT — MANDATORY:
• All text elements MUST use class="txt" (defined in the CSS template).
• Do NOT use overflow:hidden on containers holding text — ascenders/descenders will be clipped.
• If using inline style: add line-height:1.5;overflow:visible;padding-top:0.15em.
• Avoid placing text immediately below another element — use margin-top at least 20px.
• Oswald is condensed — great for ALL CAPS display. Pair with Be Vietnam Pro for body.
• IBM Plex Mono: use font-variant-numeric:tabular-nums on stacked numbers.

TEXT EFFECT PRESETS:
• Gold glow: text-shadow:0 0 30px #F7B500,0 0 60px #F7B50060
• Gradient fill: background:linear-gradient(135deg,#F7B500,#FFD93D);-webkit-background-clip:text;-webkit-text-fill-color:transparent
• Outline: -webkit-text-stroke:3px #F7B500;color:transparent
• 3D depth: text-shadow:0 4px 0 #8b6a00,0 8px 20px rgba(0,0,0,0.5)

DOMAIN ICONS/EMOJIS (inline SVG, size 80-200px, stroke-width 2.5-3):
• Bitcoin: <svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="30" fill="#F7931A"/><text x="32" y="44" text-anchor="middle" font-family="Arial Black" font-size="40" fill="#fff">₿</text></svg>
• ETH: <svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="30" fill="#627EEA"/><path d="M32 10L17 33l15-7V10zM32 10v16l15 7L32 10zM32 45v13l15-21-15 8zM32 58V45L17 37l15 21z" fill="#fff" opacity="0.8"/></svg>
• Dollar: circle + "$" text; Trend up/down: arrow path + trail
• Emojis: 🚀📈📉💰🔥⚡🎯💎🏆⚠️✅❌🔔📊💸🪙

AMBIENT SUGGESTION: tsParticles gold dust (#F7B500) OR matrix rain with chars ['0','1','$','₿']

CONCEPT → VISUAL MAPPING (domain: Finance / Crypto):
• Price up/bull → green #22c55e, arrow up, chart line rising, confetti, rocket icon
• Price down/bear → red #ef4444, arrow down, chart line falling, shake, warning icon
• Money/fee/cost → dollar icon, coin SVG, number count, wallet
• Time/waiting → clock icon, timer count, hourglass
• Speed/fast → speed lines, tunnel bg, zap icon ⚡
• Safety/security → shield, lock, green glow
• Comparison → SPLIT/VERSUS layout, 2 columns
• List/multiple items → STACK/DASHBOARD, stagger
• App/platform → PHONE MOCKUP
• Community/people → multiple avatar circles, orbit
• Warning/risk → warning triangle, red pulse, shake`;

// EOF: agents/scene/style-guide_en.js
