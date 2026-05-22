export const AR_CONFIGS = {
  '9:16': {
    w: 1080,
    h: 1920,
    label: 'dọc, TikTok/Reels',
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
    layoutRules: `RULE RIÊNG CHO 9:16 (dọc cao, ưu tiên mobile-first):
• Focal area: cột giữa màn hình, bố cục xếp dọc; tránh layout quá ngang.
• Hero text/number: width tối đa {{HERO_MAX_W}}px; căn giữa hoặc lệch rất nhẹ.
• Card/phone/mockup: width {{CARD_MIN_W}}px đến {{CARD_MAX_W}}px; không full ngang trừ background.
• Nếu có 2 cột: chỉ dùng khi mỗi cột hẹp, tổng width cả cụm tối đa 84%; ưu tiên stack dọc hơn split ngang.
• Tránh đặt subject quan trọng sát mép trên/dưới; headroom tối thiểu {{TOP_PADDING}}px, side padding tối thiểu {{SIDE_PADDING}}px trong #content.
• Không đặt text hoặc vật thể chính trong lower third vì phụ đề burn-in sẽ che.
• Background image/video: object-fit:cover; focal point ở center 45%/40%, tránh crop mất chủ thể.
• Với mascot/người/vật thể cao: chiều cao tối đa {{SUBJECT_MAX_H}}px, đáy vật thể dừng trên vùng subtitle an toàn.`,
  },
  '16:9': {
    w: 1920,
    h: 1080,
    label: 'ngang, YouTube',
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
    layoutRules: `RULE RIÊNG CHO 16:9 (ngang rộng, cinematic):
• Focal area: vùng trung tâm hơi lệch trái/phải; tận dụng chiều ngang cho split layout, timeline, dashboard.
• Hero text/number: width tối đa {{HERO_MAX_W}}px; tránh kéo quá dài thành 1 dòng khó đọc.
• Cho phép 2 cột rõ ràng hoặc bố cục 60/40, nhưng mỗi khối phải có khoảng thở tối thiểu {{SPLIT_GAP}}px.
• Subject chính không vượt quá {{TEXT_BLOCK_MAX_H}}px nếu là text block; không dùng stack dọc quá dài.
• Với video/ảnh ngang: ưu tiên object-fit:cover hoặc contain tùy asset, nhưng luôn đặt trong frame rõ ràng, không crop mặt/chữ.
• Các element phụ nên trải ngang, không dồn hết vào trung tâm như 9:16.
• Tránh để vùng rìa trái/phải trống hoàn toàn hoặc ngược lại nhồi kín sát mép; giữ outer padding tối thiểu {{SIDE_PADDING}}px.`,
  },
  '1:1':  {
    w: 1080,
    h: 1080,
    label: 'vuông, Instagram',
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
    layoutRules: `RULE RIÊNG CHO 1:1 (vuông, cân bằng tuyệt đối):
• Focal area: trung tâm khung hình; ưu tiên bố cục đối xứng, radial, orbit, 1 hero + 1 label.
• Hero text/number: width tối đa {{HERO_MAX_W}}px; chiều cao text block không quá {{TEXT_BLOCK_MAX_H}}px.
• Tránh layout quá cao hoặc quá ngang; split layout chỉ dùng khi nội dung rất đơn giản.
• Asset chính nên nằm trong khối an toàn {{SAFE_CENTER_W}}px × {{SAFE_CENTER_H}}px ở giữa frame.
• Nếu dùng card/list: tối đa 3 item, mỗi item to và thoáng; không dùng dashboard dày đặc.
• Background decoration nên chạy quanh subject, không che 4 góc bằng object lớn.
• Giữ khoảng thở {{SIDE_PADDING}}px mỗi cạnh trong #content để tránh cảm giác chật.`,
  },
  '4:5':  {
    w: 1080,
    h: 1350,
    label: 'dọc, Instagram Portrait',
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
    layoutRules: `RULE RIÊNG CHO 4:5 (portrait cân bằng giữa feed và mobile):
• Focal area: trung tâm hơi cao hơn giữa màn hình; bố cục dọc nhưng đỡ cực đoan hơn 9:16.
• Hero text/number: width tối đa {{HERO_MAX_W}}px; có thể dùng 2 tầng text ngắn.
• Card, chart, product shot: width {{CARD_MIN_W}}px đến {{CARD_MAX_W}}px; tránh asset quá cao chiếm hết frame.
• Split layout dùng được nếu mỗi khối đủ lớn; tốt nhất là 1 hero + 1 support block phía dưới hoặc cạnh bên.
• Đáy subject chính phải dừng trên lower third an toàn; không để CTA/text nằm sát đáy.
• Nếu dùng ảnh chân dung/người: giữ headroom {{TOP_PADDING}}px đến 90px, tránh crop đầu hoặc cắt tay khỏi khung.
• Padding trái/phải tối thiểu {{SIDE_PADDING}}px, padding trên tối thiểu {{TOP_PADDING}}px để feed view thoáng.`,
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

  return `TỈ LỆ KHUNG HÌNH HIỆN TẠI: ${ar.label} (${ar.w}×${ar.h})
Các ngưỡng bố cục số cứng — PHẢI ưu tiên dùng trực tiếp trong code:
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

QUY TẮC CHUNG THEO TỈ LỆ:
• Mọi asset/text phải được đặt trong container rõ ràng với top/left/width/height hoặc flex/grid nội bộ, không dùng giá trị mơ hồ khiến tràn khung.
• Với ảnh/video/logo: nếu có nguy cơ crop mất nội dung, ưu tiên bọc trong frame contain + nền phụ thay vì cover toàn màn.
• Không cho text block, icon chính, character hoặc card nào chạm mép #content; luôn chừa vùng đệm đúng theo rule tỉ lệ.
• Nếu layout đề xuất trong Visual concept mâu thuẫn với rule tỉ lệ, PHẢI ưu tiên rule tỉ lệ để giữ content trong khung.
• Khi viết CSS/JS, ưu tiên dùng chính các ngưỡng số này cho width/max-width/height/max-height/top/left/right/bottom thay vì tự ước lượng.`;
}

// EOF: agents/scene/aspect-ratios.js
