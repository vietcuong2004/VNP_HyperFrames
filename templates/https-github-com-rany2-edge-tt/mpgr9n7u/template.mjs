export default function (data, css) {
  const duration = data.duration || 47.520;
  const scenes = Array.isArray(data.scenes) && data.scenes.length
    ? data.scenes
    : [1,2,3,4].map((stt) => ({ stt }));
  const musicPlan = data.music_plan || {};
  const bgmFile = musicPlan.background_music || "crypto news ambient background.mp3";
  const bgmVolume = typeof musicPlan.background_volume === "number" ? musicPlan.background_volume : 0.12;

  let audioTagsHtml = "";
  scenes.forEach((scene) => {
    if (scene.audio_path) {
      audioTagsHtml += `    <audio id="tts-scene\${scene.stt}" src="./\${scene.audio_path}" data-track-index="1" data-start="\${Number(scene.audio_start || 0).toFixed(3)}" data-duration="\${Number(scene.audio_duration || 0).toFixed(3)}" data-volume="1.0"></audio>
`;
    }
  });

  if (Array.isArray(musicPlan.sound_effects)) {
    musicPlan.sound_effects.forEach((sfx, idx) => {
      audioTagsHtml += `    <audio id="sfx-\${idx}" src="./assets/sound-effect/\${sfx.file}" data-track-index="2" data-start="\${Number(sfx.time || 0).toFixed(3)}" data-duration="1.5" data-volume="\${Number(sfx.volume || 0.8).toFixed(2)}"></audio>
`;
    });
  }

  let iframeTagsHtml = "";
  scenes.forEach((scene) => {
    iframeTagsHtml += `    <iframe id="iframe-scene\${scene.stt}" src="./templates/https-github-com-rany2-edge-tt/mpgr9n7u/compositions/scene_\${scene.stt}.html"></iframe>\n`;
  });

  let parentTimelineJs = "";
  scenes.forEach((scene, idx) => {
    const start = Number(scene.audio_start || 0);
    const dur = Number(scene.duration || 0);
    const end = start + dur;

    parentTimelineJs += `
    // Canh \${scene.stt}
    tl.set("#iframe-scene\${scene.stt}", { visibility: "visible", opacity: 1 }, \${start.toFixed(3)});
    tl.to({ progress: 0 }, {
      progress: 1,
      duration: \${dur.toFixed(3)},
      ease: "none",
      onUpdate: function() {
        const iframe = document.getElementById("iframe-scene\${scene.stt}");
        if (iframe && iframe.contentWindow && iframe.contentWindow.__timelines && iframe.contentWindow.__timelines["main"]) {
          iframe.contentWindow.__timelines["main"].progress(this.targets()[0].progress);
        }
      }
    }, \${start.toFixed(3)});
`;

    if (idx < scenes.length - 1) {
      parentTimelineJs += `    tl.to("#iframe-scene\${scene.stt}", { opacity: 0, duration: 0.15 }, \${(end - 0.15).toFixed(3)});
`;
      parentTimelineJs += `    tl.set("#iframe-scene\${scene.stt}", { visibility: "hidden" }, \${end.toFixed(3)});
`;
    }
  });

  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <style>\${css}</style>
  <script src="./vendor/gsap.min.js"></script>
</head>
<body>
  <div id="root" data-composition-id="agent-composition" data-duration="\${duration.toFixed(3)}" data-width="1080" data-height="1920" data-start="0">
    <audio id="bg-audio" src="./assets/background-music/\${bgmFile}" data-track-index="0" data-start="0" data-duration="\${duration.toFixed(3)}" data-volume="\${bgmVolume.toFixed(2)}" loop></audio>

    <!-- TTS Audio Tracks & SFX -->
    \${audioTagsHtml}
    <!-- Compositions Iframes -->
    \${iframeTagsHtml}
    <div class="progress-bar" id="progress"></div>
  </div>

  <script>
    window.__timelines = window.__timelines || {};
    var tl = gsap.timeline({ paused: true });
    var DUR = \${duration.toFixed(3)};

    tl.to('#progress', { width: '1080px', duration: DUR, ease: 'none' }, 0);

    \${parentTimelineJs}
    window.__timelines["agent-composition"] = tl;
  </script>
</body>
</html>`;
}