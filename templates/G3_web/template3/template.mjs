import { getHyperframesReviewScene } from "./scenes.mjs";

export default function (data, css) {
  const duration = data.duration || 10;
  const classSafe = (value) => String(value || "default").toLowerCase().replace(/[^a-z0-9_-]+/g, "-");
  const rootClasses = [
    `source-${classSafe(data.platform)}`,
    `format-${classSafe(data.video_format)}`,
    `theme-${classSafe(data.visual_theme || data.platform)}`,
  ].join(" ");

  // Deterministic fake random based on index
  const seed = (x) => Math.sin(x * 999) * 10000;
  const rand = (min, max, idx) => {
    let s = seed(idx);
    return min + (s - Math.floor(s)) * (max - min);
  };

  let audioTags = "";
  let scenesHTML = "";
  let jsTimelines = "";
  let allTranscripts = [];
  let captionBlocks = [];

  // Background Audio
  audioTags += `<audio id="bg-audio" src="./assets/background-music/crypto news ambient background.mp3" data-track-index="0" data-start="0" data-duration="${duration}" data-volume="0.3" loop></audio>
`;

  if (data.scenes && data.scenes.length > 0) {
    data.scenes.forEach((scene, i) => {
      // Normalize character asset names to prevent any 404 errors in avatars or scenes
      if (scene.assets && scene.assets.length > 0) {
        let assetName = scene.assets[0];
        const nameLower = assetName.toLowerCase();
        if (nameLower.includes("expressing unbelievable") || nameLower.includes("showing surprise")) {
          assetName = "character shiba showing surprise.png";
        } else if (nameLower.includes("meditating in zen") || nameLower.includes("cassock") || nameLower.includes("enlightened")) {
          assetName = "character shiba wearing a cassock like it has become enlightened.png";
        } else if (nameLower.includes("feeling extremely cold") || nameLower.includes("feeling sad") || nameLower.includes("looking at phone") || nameLower.includes("tiger hiding")) {
          assetName = "character shiba thinking.png";
        } else if (nameLower.includes("developer") || nameLower.includes("analyzing")) {
          assetName = "character shiba using a magnifying glass to look closely.png";
        } else if (nameLower.includes("presenting") || nameLower.includes("confident")) {
          assetName = "character shiba cheerfully talking.png";
        } else if (nameLower.includes("celebrating") || nameLower.includes("showing heart")) {
          assetName = "character shiba smiling brightly.png";
        } else if (nameLower.includes("explaining")) {
          assetName = "character shiba explaining something.png";
        } else {
          const existingShibas = [
            "character shiba explaining something.png",
            "character shiba cheerfully talking.png",
            "character shiba crying.png",
            "character shiba panicking while watching the market crash.png",
            "character shiba showing anger.png",
            "character shiba showing surprise.png",
            "character shiba smiling brightly.png",
            "character shiba thinking.png",
            "character shiba throwing money happily.png",
            "character shiba using a magnifying glass to look closely.png",
            "character shiba using an oxygen tank.png",
            "character shiba wearing a cassock like it has become enlightened.png",
            "character shiba wearing stylish glasses.png",
          ];
          if (!existingShibas.includes(assetName)) {
            assetName = "character shiba explaining something.png";
          }
        }
        scene.assets[0] = assetName;
      }

      const sceneId = `scene${i + 1}`;
      const start = scene.audio_start;

      // Audio for TTS
      if (scene.audio_path) {
        audioTags += `<audio id="tts-${sceneId}" src="./${scene.audio_path}" data-track-index="1" data-start="${start}" data-duration="${scene.audio_duration}" data-volume="1.0"></audio>
`;
      }

      // Audio for SFX (Reduced to occasional play: scenes 1, 3, 6, 8)
      if (scene.sfx && [1, 3, 6, 8].includes(i + 1)) {
        let sfxFile = scene.sfx;
        // Map to exact existing filenames to resolve case/Unicode normalization issues
        const sfxLower = scene.sfx.toLowerCase();
        if (sfxLower.includes("yeah") || sfxLower.includes("tre")) {
          sfxFile = "yeah_tre_con.mp3";
        } else if (sfxLower.includes("ding")) {
          sfxFile = "Ding 2.mp3";
        } else if (sfxLower.includes("beep") || sfxLower.includes("error")) {
          sfxFile = "error.mp3";
        } else if (sfxLower.includes("suy nhi") || sfxLower.includes("con trung")) {
          sfxFile = "suy_nghi_con_trung.mp3";
        } else if (sfxLower.includes("pop")) {
          sfxFile = "transition 1.mp3";
        }
        audioTags += `<audio id="sfx-${sceneId}" src="./assets/sound-effect/${sfxFile}" data-track-index="2" data-start="${start}" data-duration="1" data-volume="0.8"></audio>
`;
      }

      // Collect transcripts and build compact caption chunks.
      if (scene.transcript && scene.transcript.length > 0) {
        allTranscripts.push(...scene.transcript);
        for (let wordIndex = 0; wordIndex < scene.transcript.length; wordIndex += 6) {
          const words = scene.transcript.slice(wordIndex, wordIndex + 6);
          captionBlocks.push({
            words,
            start: words[0].start,
            end: words[words.length - 1].end,
          });
        }
      }

      // Visual Scene HTML
      let charHtml = "";
      if (scene.assets && scene.assets.length > 0) {
        charHtml = `<img class="character" id="char-${sceneId}" src="./assets/character/shiba/${scene.assets[0]}" />`;
      }

      // Build premium dynamic visuals by delegating layout rendering to dedicated layout modules
      const result = getHyperframesReviewScene(i, scene, sceneId, start);
      const sceneVisualHtml = result.html;
      const sceneGsap = result.gsap;

      scenesHTML += `
      <div id="${sceneId}" class="scene" style="position:absolute; inset:0; opacity:0; visibility:hidden; z-index: 10;">
        ${sceneVisualHtml}
        ${charHtml}
      </div>`;

      // GSAP JS
      jsTimelines += `
      // Scene ${i + 1}
      tl.set("#${sceneId}", { visibility: "visible" }, ${Math.max(0, start - 0.12)});
      tl.to("#${sceneId}", { opacity: 1, duration: 0.1 }, ${start - 0.1});
      ${sceneGsap}
      `;
      if (charHtml) {
        const sceneDuration =
          i === data.scenes.length - 1 ? duration - start : data.scenes[i + 1].audio_start - start;
        const charRepeat = Math.max(1, Math.floor(sceneDuration / 2.0) - 1);
        jsTimelines += `
        tl.from("#char-${sceneId}", { y: 20, duration: 0.2, ease: "power2.out" }, ${start});
        tl.to("#char-${sceneId}", { y: -30, duration: 2, repeat: ${charRepeat}, yoyo: true, ease: "sine.inOut" }, ${start + 0.2});
        `;
      }
      // Fade out scene
      if (i < data.scenes.length - 1) {
        const nextStart = data.scenes[i + 1].audio_start;
        jsTimelines += `tl.to("#${sceneId}", { opacity: 0, duration: 0.3 }, ${nextStart - 0.3});\n`;
        jsTimelines += `tl.set("#${sceneId}", { visibility: "hidden" }, ${nextStart});\n`;
      }
    });
  }

  // Common animated star particles
  let particlesHTML = '<div class="particles-container">';
  const colors = ["green", "purple", "white"];
  for (let i = 0; i < 60; i++) {
    const size = rand(2, 6, i) + "px";
    const top = rand(50, 1800, i + 100) + "px";
    const left = rand(20, 1060, i + 200) + "px";
    const colorClass = "particle-" + colors[Math.floor(rand(0, 2.99, i + 300))];
    particlesHTML += `<div class="particle-star ${colorClass} p-anim" style="width:${size}; height:${size}; top:${top}; left:${left};"></div>`;
  }
  particlesHTML += "</div>";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <style>${css}</style>
  <script src="./vendor/gsap.min.js"></script>
</head>
<body>
  <div id="root" class="${rootClasses}" data-composition-id="news-multi" data-duration="${duration}" data-width="1080" data-height="1920" data-start="0">
    ${audioTags}

    <div id="main-clip" class="clip" data-start="0" data-duration="${duration}" data-track-index="3">
      <div class="bg"></div>
      ${particlesHTML}
      
      <div class="top-header">
        <img class="top-avatar" src="./assets/logo/shiba.png" />
        <div class="top-username">SHIBA NEWS 24H</div>
      </div>
      
      ${scenesHTML}
      
      <!-- Subtitles Area -->
      <div id="captions" class="captions"></div>
    </div>
  </div>
  <script>
    window.__timelines = window.__timelines || {};
    const tl = gsap.timeline({ paused: true });
    
    // Animate Particles Floating
    gsap.utils.toArray('.p-anim').forEach((p, i) => {
      const pDur = 3 + (i % 4);
      const pRepeat = Math.max(1, Math.floor(${duration} / pDur) - 1);
      tl.to(p, { 
        y: "-=100", 
        x: (i%2===0 ? "+=30" : "-=30"),
        opacity: 0.1 + (i % 5) * 0.2, 
        duration: pDur, 
        repeat: pRepeat, 
        yoyo: true, 
        ease: "sine.inOut" 
      }, 0);
    });
    
    ${jsTimelines}

    // Karaoke Subtitles Grouping by Scene (Complete Sentences)
    const subtitleBlocks = ${JSON.stringify(captionBlocks)};
    if (subtitleBlocks.length > 0) {
      const capContainer = document.getElementById("captions");
      const escapeHtml = (value) => String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");

      tl.eventCallback("onUpdate", () => {
        let time = tl.time();
        // Find the active block
        let activeBlock = subtitleBlocks.find(b => time >= b.start - 0.08 && time <= b.end + 0.12);
        if (activeBlock) {
          let html = activeBlock.words.map(w => {
            let isActive = (time >= w.start && time <= w.end);
            return '<span style="font-family: Space Grotesk, sans-serif; font-size: 34px; font-weight: 800; text-transform: uppercase; margin: 0 7px; display: inline-block; transition: all 0.08s; ' + 
                   (isActive ? 'color: #ff4757; text-shadow: 0 0 20px #ff4757, 0 0 5px #ff4757; transform: scale(1.1); font-weight: 900;' 
                            : 'color: rgba(255,255,255,0.7); transform: scale(1.0);') + 
                   '">' + escapeHtml(w.text.toUpperCase()) + '</span>';
          }).join(" ");
          capContainer.innerHTML = html;
        } else {
          capContainer.innerHTML = "";
        }
      });
    }

    window.__timelines["news-multi"] = tl;
  </script>
</body>
</html>`;
}
