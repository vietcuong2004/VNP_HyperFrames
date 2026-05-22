// Style guide mặc định (Tài chính / Crypto) — được dùng khi không có styleGuide nào được truyền vào
export const DEFAULT_STYLE_GUIDE = `MÀU (chỉ dùng trong list này):
• Primary: #F7B500 (vàng chủ đạo), #FFD93D (vàng sáng), #FF9500 (cam nhấn)
• Gain/bull: #22c55e, #10b981, glow #22c55e80
• Loss/bear: #ef4444, #dc2626, glow #ef444480
• Neutral: #fff, #e5e7eb, #9ca3af, #4b5563
• BG accent: #1e293b, #0f172a, #1a1a2e
• Gradient vàng: linear-gradient(135deg,#F7B500,#FF9500,#FFD93D)
• Gradient bull: linear-gradient(135deg,#10b981,#22c55e)
• Gradient bear: linear-gradient(135deg,#dc2626,#ef4444)

FONT SIZE (px cố định, viewport {{W}}):
• Hero number: 200-280px, font-weight:900, IBM Plex Mono
• Big number: 140-180px, font-weight:800
• Title: 72-96px, Be Vietnam Pro 800
• Subtitle: 48-56px, 600
• Label: 32-40px, 500, letter-spacing:2px, uppercase
• Caption: 24-28px, 400

TIẾNG VIỆT — BẮT BUỘC:
• Mọi text element PHẢI dùng class="txt" (đã định nghĩa trong CSS template).
• KHÔNG dùng overflow:hidden trên container chứa text — dấu tiếng Việt phía trên (ắ, ế, ổ...) sẽ bị cắt.
• Nếu dùng inline style: thêm line-height:1.5;overflow:visible;padding-top:0.15em.
• Tránh đặt text sát phần tử khác phía trên — để margin-top tối thiểu 20px để dấu không bị che.

TEXT EFFECT PRESETS:
• Glow vàng: text-shadow:0 0 30px #F7B500,0 0 60px #F7B50060
• Gradient fill: background:linear-gradient(135deg,#F7B500,#FFD93D);-webkit-background-clip:text;-webkit-text-fill-color:transparent
• Outline: -webkit-text-stroke:3px #F7B500;color:transparent
• 3D depth: text-shadow:0 4px 0 #8b6a00,0 8px 20px rgba(0,0,0,0.5)

DOMAIN ICONS/EMOJIS (SVG inline, kích thước 80-200px, stroke-width 2.5-3):
• Bitcoin: <svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="30" fill="#F7931A"/><text x="32" y="44" text-anchor="middle" font-family="Arial Black" font-size="40" fill="#fff">₿</text></svg>
• ETH: <svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="30" fill="#627EEA"/><path d="M32 10L17 33l15-7V10zM32 10v16l15 7L32 10zM32 45v13l15-21-15 8zM32 58V45L17 37l15 21z" fill="#fff" opacity="0.8"/></svg>
• Dollar: circle + "$" text; Trend up/down: arrow path + trail
• Emojis: 🚀📈📉💰🔥⚡🎯💎🏆⚠️✅❌🔔📊💸🪙

AMBIENT GỢI Ý: tsParticles gold dust (#F7B500) HOẶC matrix rain với chars ['0','1','$','₿']

MAPPING CONCEPT → VISUAL (domain: Tài chính / Crypto):
• Giá tăng/bull → xanh #22c55e, arrow up, chart line lên, confetti, rocket icon
• Giá giảm/bear → đỏ #ef4444, arrow down, chart line xuống, shake, warning icon
• Tiền/phí/cost → dollar icon, coin SVG, number count, wallet
• Thời gian/chờ → clock icon, timer count, hourglass
• Tốc độ/nhanh → speed lines, tunnel bg, zap icon ⚡
• An toàn/bảo mật → shield, lock, green glow
• So sánh → SPLIT/VERSUS layout, 2 cột
• Danh sách/nhiều item → STACK/DASHBOARD, stagger
• App/platform → PHONE MOCKUP
• Cộng đồng/người → multiple avatar circles, orbit
• Cảnh báo/rủi ro → warning triangle, đỏ pulse, shake`;

// EOF: agents/scene/style-guide.js
