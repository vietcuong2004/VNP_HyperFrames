export default function(data, css) {
  const duration = data.duration || 10;
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <style>
    body { margin: 0; width: 1080px; height: 1920px; overflow: hidden; background: #000; color: #fff; font-family: "Space Mono", monospace; }
    .bg { position: absolute; inset: 0; background: #0a0a0a; border: 20px solid #27ae60; box-sizing: border-box; }
    .title { position: absolute; top: 200px; left: 100px; font-size: 70px; color: #2ecc71; }
    .metric { position: absolute; top: 400px; left: 100px; font-size: 150px; font-weight: bold; }
    .trend { position: absolute; top: 600px; left: 100px; font-size: 80px; color: #f1c40f; }
    ${css}
  </style>
  <script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
</head>
<body>
  <div id="root" data-composition-id="finance-comp" data-duration="${duration}" data-width="1080" data-height="1920">
    <div id="scene1" class="clip" data-start="0" data-duration="${duration}" data-track-index="1">
      <div class="bg"></div>
      <div class="title" id="title">${data.title}</div>
      <div class="metric" id="metric">${data.metric}</div>
      <div class="trend" id="trend">${data.trend}</div>
    </div>
  </div>
  <script>
    window.__timelines = window.__timelines || {};
    const tl = gsap.timeline({ paused: true });
    tl.from("#title", { opacity: 0, duration: 1 }, 0.5);
    tl.from("#metric", { x: -100, opacity: 0, duration: 1, ease: "back.out(1.5)" }, 1.0);
    tl.from("#trend", { y: 50, opacity: 0, duration: 1, ease: "power2.out" }, 1.5);
    window.__timelines["finance-comp"] = tl;
  </script>
</body>
</html>`;
}