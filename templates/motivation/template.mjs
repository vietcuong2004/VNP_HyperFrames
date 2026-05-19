export default function(data, css) {
  const duration = data.duration || 10;
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <style>
    body { margin: 0; width: 1080px; height: 1920px; overflow: hidden; background: #000; color: #fff; font-family: "Space Grotesk", sans-serif; }
    .bg { position: absolute; inset: 0; background: radial-gradient(circle, #2c3e50 0%, #000 100%); }
    .quote { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 880px; text-align: center; font-size: 90px; font-weight: 800; line-height: 1.3; font-style: italic; }
    .author { position: absolute; bottom: 400px; left: 0; width: 100%; text-align: center; font-size: 50px; color: #f1c40f; }
    ${css}
  </style>
  <script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
</head>
<body>
  <div id="root" data-composition-id="motivation-comp" data-duration="${duration}" data-width="1080" data-height="1920">
    <div id="scene1" class="clip" data-start="0" data-duration="${duration}" data-track-index="1">
      <div class="bg"></div>
      <div class="quote" id="quote">"${data.quote}"</div>
      <div class="author" id="author">— ${data.author}</div>
    </div>
  </div>
  <script>
    window.__timelines = window.__timelines || {};
    const tl = gsap.timeline({ paused: true });
    tl.from("#quote", { scale: 0.8, opacity: 0, duration: 1.5, ease: "power2.out" }, 0.5);
    tl.from("#author", { y: 50, opacity: 0, duration: 1, ease: "power2.out" }, 1.5);
    window.__timelines["motivation-comp"] = tl;
  </script>
</body>
</html>`;
}