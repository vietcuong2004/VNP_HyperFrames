// G2_docker — Docker Terminal Scene Layouts
const OFFICIAL_IMAGE_NAMES = new Set(["nginx", "postgres", "redis", "node", "python", "ubuntu", "mysql", "mongo", "alpine"]);

function cleanCommand(value) {
  return String(value || "").trim().replace(/^\$\s*/, "");
}

function imageFromPullCommand(value) {
  const command = cleanCommand(value);
  const match = command.match(/^docker\s+pull\s+(\S+)/i);
  return match ? match[1] : "";
}

function imageFromRunCommand(value) {
  const command = cleanCommand(value);
  const parts = command.split(/\s+/).filter(Boolean);
  if (parts[0] !== "docker" || parts[1] !== "run") return "";

  for (let i = 2; i < parts.length; i += 1) {
    const token = parts[i];
    if (!token.startsWith("-")) return token;
    if (["-p", "--publish", "-e", "--env", "-v", "--volume", "--name", "--env-file"].includes(token)) {
      i += 1;
    }
  }
  return "";
}

function imageFromRepoUrl(value) {
  const text = String(value || "").trim();
  const match = text.match(/hub\.docker\.com\/r\/([^/\s]+)\/([^/\s?#]+)/i);
  if (match) return `${match[1]}/${match[2]}`;
  const officialMatch = text.match(/hub\.docker\.com\/_\/([^/\s?#]+)/i);
  return officialMatch ? `library/${officialMatch[1]}` : "";
}

function getSceneImage(scene, fallback = "hello-world") {
  return (
    imageFromPullCommand(scene.btn_text) ||
    imageFromRunCommand(scene.btn_text) ||
    imageFromRepoUrl(scene.repo_url) ||
    scene.repo_name ||
    fallback
  );
}

function stripTag(imageRef) {
  return String(imageRef || "").replace(/@sha256:[a-f0-9]+$/i, "").replace(/:[^/:]+$/, "");
}

function imageTag(imageRef) {
  const text = String(imageRef || "");
  const tagMatch = text.match(/:([^/:]+)$/);
  return tagMatch ? tagMatch[1] : "latest";
}

function pullSource(imageRef) {
  const base = stripTag(imageRef);
  if (base.includes("/")) return base;
  if (OFFICIAL_IMAGE_NAMES.has(base.toLowerCase())) return `library/${base}`;
  return base;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function stripVietnameseMarks(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D");
}

function isGenericCardTitle(value) {
  const text = stripVietnameseMarks(value).trim().toLowerCase();
  return /^(buoc|step|diem|muc|y chinh)\s*\d+$/.test(text);
}

function isMeaningfulCardText(value) {
  const text = String(value || "").trim();
  if (text.length < 6) return false;
  const normalized = stripVietnameseMarks(text).toLowerCase();
  return !/^(noi dung|noidung|mo ta|placeholder|viec can lam|cach kiem tra|lenh hoac thao tac)(\s|$)/.test(normalized);
}

export function getSceneCards(scene, limit = 4) {
  const rawCards = Array.isArray(scene.steps) && scene.steps.length > 0
    ? scene.steps
    : Array.isArray(scene.cards) && scene.cards.length > 0
      ? scene.cards
      : [1, 2, 3, 4]
          .map((idx) => ({
            title: scene[`bento${idx}_title`],
            body: scene[`bento${idx}_desc`],
          }))
          .filter((card) => card.title || card.body);

  const fallbackTitle = scene.headline_line2 || scene.headline_line1 || scene.title || "Nội dung chính";
  const fallbackBody = scene.central_text || scene.summary || scene.description || scene.text || "Tóm tắt ý chính để người xem vẫn nắm được nội dung scene.";
  const fallbackNames = ["Image", "Cấu hình", "Kiểm tra", "Vận hành"];
  const fallbackCards = Array.from({ length: Math.max(3, limit) }, (_, idx) => ({
    title: fallbackNames[idx] || "Bước tiếp",
    body: idx === 0 ? fallbackTitle : fallbackBody,
  }));
  const meaningfulCards = rawCards.filter((card) => {
    const body = card.body || card.desc || card.description;
    return isMeaningfulCardText(body) && !isGenericCardTitle(card.title);
  });
  const safeCards = [...meaningfulCards, ...fallbackCards].slice(0, Math.max(3, limit));

  return safeCards.slice(0, limit).map((card, idx) => {
    const body = card.body || card.desc || card.description;
    const title = card.title && !isGenericCardTitle(card.title) ? card.title : (fallbackNames[idx] || "Bước tiếp");
    return {
      title: escapeHtml(title),
      body: escapeHtml(isMeaningfulCardText(body) ? body : (idx === 0 ? fallbackTitle : fallbackBody)),
    };
  });
}

export function getHyperframesReviewScene(i, scene, sceneId, start) {
  let html = "";
  let gsap = "";
  const sceneDuration = Number(scene.audio_duration || scene.duration || 6);

  const layout = scene.layout || i;

  switch (layout) {
    case "intro_docker":
    case 0: {
      // Scene 1: Docker Hub page intro — terminal window with scrolling screenshot
      const repoUrl = scene.repo_url || "hub.docker.com/_/hello-world";
      const hl1 = scene.headline_line1 || "DOCKER IMAGE";
      const hl2 = scene.headline_line2 || "CONTAINER QUICK START";
      html = `
        <div class="terminal-frame" id="term-${sceneId}">
          <div class="terminal-header">
            <div class="terminal-dots">
              <span class="dot red"></span>
              <span class="dot yellow"></span>
              <span class="dot green"></span>
            </div>
            <div class="terminal-title">hub.docker.com — ${repoUrl}</div>
          </div>
          <div class="terminal-body">
            <img class="docker-scroll-image" id="scroll-img-${sceneId}" src="./assets/images/github_repo.png" />
          </div>
        </div>
        <div class="headline-container" style="top: 1075px; gap: 8px;">
          <div class="headline-line1" id="hl1-${sceneId}" style="font-size: 62px;">${hl1}</div>
          <div class="headline-line2" id="hl2-${sceneId}" style="font-size: 44px;">${hl2}</div>
        </div>
        <div class="action-btn" id="btn-${sceneId}" style="top: 1262px; font-size: 28px; padding: 14px 36px;">
          <span class="action-icon">🐳</span> ${repoUrl}
        </div>
      `;
      gsap = `
        tl.from("#term-${sceneId}", { scale: 0.88, y: 30, duration: 0.4, ease: "back.out(1.2)" }, ${start});
        tl.from("#hl1-${sceneId}", { y: -20, opacity: 0, duration: 0.25, ease: "power3.out" }, ${start + 0.3});
        tl.from("#hl2-${sceneId}", { y: 20, opacity: 0, duration: 0.25, ease: "power3.out" }, ${start + 0.3});
        tl.from("#btn-${sceneId}", { y: 20, opacity: 0, duration: 0.2, ease: "back.out(1.2)" }, ${start + 0.5});
        tl.fromTo("#scroll-img-${sceneId}", { y: 0 }, { y: -2000, duration: 9, ease: "power1.inOut" }, ${start + 1.2});
      `;
      break;
    }

    case 1: {
      // Scene 2: Stack layer / bento cards
      const hl1 = scene.headline_line1 || "NẰM Ở LỚP NÀO";
      const hl2 = scene.headline_line2 || "TRONG TECH STACK?";
      const cards = getSceneCards(scene, 3);
      const b1t = cards[0]?.title || "Image";
      const b1d = cards[0]?.body || "Base layer, runtime, deps";
      const b2t = cards[1]?.title || "Container";
      const b3t = cards[2]?.title || "Compose";
      html = `
        <div class="headline-container" style="top: 185px;">
          <div class="headline-line1" id="hl1-${sceneId}">${hl1}</div>
          <div class="headline-line2" id="hl2-${sceneId}">${hl2}</div>
        </div>
        <div class="bento-container" style="top: 540px;" id="bento-${sceneId}">
          <div class="bento-card full" id="bc-${sceneId}-1">
            <div class="card-icon-svg">
              <svg viewBox="0 0 24 24"><rect x="2" y="7" width="4" height="4" rx="1"/><rect x="7" y="7" width="4" height="4" rx="1"/><rect x="12" y="7" width="4" height="4" rx="1"/><rect x="7" y="2" width="4" height="4" rx="1"/><rect x="12" y="2" width="4" height="4" rx="1"/><rect x="2" y="12" width="4" height="4" rx="1"/><rect x="7" y="12" width="4" height="4" rx="1"/><path d="M22 13c0 2-2 4-5 6-3-2-5-4-5-6a5 5 0 0 1 10 0z"/></svg>
            </div>
            <div class="card-text-group">
              <div class="card-title">${b1t}</div>
              <div class="card-desc">${b1d}</div>
            </div>
          </div>
          <div class="bento-grid-2">
            <div class="bento-card half card-accent-green" id="bc-${sceneId}-2">
              <div class="card-icon-svg">
                <svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M9 12l2 2 4-4"/></svg>
              </div>
              <div class="card-title" style="font-size: 30px;">${b2t}</div>
            </div>
            <div class="bento-card half card-accent-yellow" id="bc-${sceneId}-3">
              <div class="card-icon-svg">
                <svg viewBox="0 0 24 24"><path d="M4 6h16M4 12h16M4 18h16"/><circle cx="2" cy="6" r="1" fill="currentColor" stroke="none"/><circle cx="2" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="2" cy="18" r="1" fill="currentColor" stroke="none"/></svg>
              </div>
              <div class="card-title" style="font-size: 30px;">${b3t}</div>
            </div>
          </div>
        </div>
      `;
      gsap = `
        tl.from("#hl1-${sceneId}", { y: -20, opacity: 0, duration: 0.2, ease: "power3.out" }, ${start});
        tl.from("#hl2-${sceneId}", { y: 20, opacity: 0, duration: 0.2, ease: "power3.out" }, ${start});
        tl.from("#bc-${sceneId}-1", { y: 25, opacity: 0, duration: 0.25, ease: "power3.out" }, ${start + 0.1});
        tl.from("#bc-${sceneId}-2", { x: -20, opacity: 0, duration: 0.2, ease: "power3.out" }, ${start + 0.2});
        tl.from("#bc-${sceneId}-3", { x: 20, opacity: 0, duration: 0.2, ease: "power3.out" }, ${start + 0.2});
      `;
      break;
    }

    case "docker_tag":
    case 2: {
      // Scene 3: Pull & Run — terminal commands
      const hl1 = scene.headline_line1 || "PULL IMAGE";
      const hl2 = scene.headline_line2 || "RỒI CHẠY THỬ";
      const imageRef = getSceneImage(scene, "hello-world");
      const btnText = scene.btn_text || `$ docker pull ${imageRef}`;
      const pullImage = imageFromPullCommand(btnText) || imageRef;
      const runImage = stripTag(pullImage);
      const tag = imageTag(pullImage);
      const source = pullSource(pullImage);
      const followupCommand =
        layout === "docker_tag"
          ? `
                <span class="t-cmd">docker</span>
                <span class="t-flag">image</span>
                <span class="t-flag">inspect</span>
                <span class="t-image">${pullImage}</span>`
          : `
                <span class="t-cmd">docker</span>
                <span class="t-flag">run</span>
                <span class="t-flag">-d</span>
                <span class="t-flag">-p</span>
                <span class="t-cmd">80:80</span>
                <span class="t-image">${runImage}</span>`;
      const followupStatus = layout === "docker_tag" ? "✔ Tag metadata ready" : "✔ Container started";
      html = `
        <div class="headline-container" style="top: 185px;">
          <div class="headline-line1" id="hl1-${sceneId}">${hl1}</div>
          <div class="headline-line2" id="hl2-${sceneId}">${hl2}</div>
        </div>
        <div class="terminal-frame" id="term-${sceneId}" style="top: 490px; height: 660px; width: 920px;">
          <div class="terminal-header">
            <div class="terminal-dots">
              <span class="dot red"></span><span class="dot yellow"></span><span class="dot green"></span>
            </div>
            <div class="terminal-title">bash — docker</div>
          </div>
          <div class="terminal-body">
            <div class="terminal-content">
              <div class="terminal-line" id="tl1-${sceneId}">
                <span class="t-prompt">user@host:~$</span>
                <span class="t-cmd">docker</span>
                <span class="t-flag">pull</span>
                <span class="t-image">${pullImage}</span>
              </div>
              <div class="terminal-line" id="tl2-${sceneId}" style="opacity:0;">
                <span class="t-info">Using tag: ${tag}</span>
              </div>
              <div class="terminal-line" id="tl3-${sceneId}" style="opacity:0;">
                <span class="t-output">${tag}: Pulling from ${source}</span>
              </div>
              <div class="terminal-line" id="tl4-${sceneId}" style="opacity:0;">
                <span class="t-output">Digest: sha256:a3...</span>
              </div>
              <div class="terminal-line" id="tl5-${sceneId}" style="opacity:0;">
                <span class="t-success">✔ Status: Downloaded newer image</span>
              </div>
              <div class="terminal-line" id="tl6-${sceneId}" style="opacity:0; margin-top: 16px;">
                <span class="t-prompt">user@host:~$</span>
                ${followupCommand}
              </div>
              <div class="terminal-line" id="tl7-${sceneId}" style="opacity:0;">
                <span class="t-success">${followupStatus}</span>
                <span class="t-cursor" id="cursor-${sceneId}"></span>
              </div>
            </div>
          </div>
        </div>
      `;
      gsap = `
        tl.from("#hl1-${sceneId}", { y: -20, opacity: 0, duration: 0.2, ease: "power3.out" }, ${start});
        tl.from("#hl2-${sceneId}", { y: 20, opacity: 0, duration: 0.2, ease: "power3.out" }, ${start});
        tl.from("#term-${sceneId}", { y: 30, opacity: 0, duration: 0.3, ease: "back.out(1.2)" }, ${start + 0.1});
        tl.to("#tl2-${sceneId}", { opacity: 1, duration: 0.15 }, ${start + 0.8});
        tl.to("#tl3-${sceneId}", { opacity: 1, duration: 0.15 }, ${start + 1.2});
        tl.to("#tl4-${sceneId}", { opacity: 1, duration: 0.15 }, ${start + 1.6});
        tl.to("#tl5-${sceneId}", { opacity: 1, duration: 0.15 }, ${start + 2.1});
        tl.to("#tl6-${sceneId}", { opacity: 1, duration: 0.15 }, ${start + 2.8});
        tl.to("#tl7-${sceneId}", { opacity: 1, duration: 0.15 }, ${start + 3.4});
        tl.to("#cursor-${sceneId}", { opacity: 0, repeat: ${Math.max(0, Math.ceil((sceneDuration - 3.6) / 1) - 1)}, yoyo: true, duration: 0.5 }, ${start + 3.6});
      `;
      break;
    }

    case "docker_config":
    case 3: {
      // Scene 4: Port / Volume / Env — glow icon + action button
      const hl1 = scene.headline_line1 || "PORT";
      const hl2 = scene.headline_line2 || "VOLUME VÀ ENV";
      const btnText = scene.btn_text || "Đọc docs trước khi deploy production";
      const cards = getSceneCards(scene, 3);
      const card1Title = cards[0]?.title || "Port";
      const card1Body = cards[0]?.body || "-p host:container";
      const card2Title = cards[1]?.title || "Volume";
      const card2Body = cards[1]?.body || "-v path:/data";
      const card3Title = cards[2]?.title || "Env Variables";
      const card3Body = cards[2]?.body || "-e KEY=VALUE  |  --env-file .env";
      html = `
        <div class="main-glow-icon" id="glow-${sceneId}">
          <div class="glow-svg-container">
            <svg viewBox="0 0 24 24"><path d="M17 11h1a3 3 0 0 1 0 6h-1"/><path d="M11 12H3"/><path d="M16 6H3"/><path d="M16 18H3"/><rect x="1" y="3" width="15" height="18" rx="2"/></svg>
          </div>
        </div>
        <div class="headline-container" id="head-${sceneId}">
          <div class="headline-line1" id="hl1-${sceneId}">${hl1}</div>
          <div class="headline-line2" id="hl2-${sceneId}">${hl2}</div>
        </div>
        <div class="bento-container" style="top: 790px;" id="bento-${sceneId}">
          <div class="bento-grid-2">
            <div class="bento-card half" id="bc-${sceneId}-1">
              <div class="card-icon-svg">
                <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg>
              </div>
              <div class="card-title" style="font-size: 28px;">${card1Title}</div>
              <div class="card-desc" style="font-size: 20px;">${card1Body}</div>
            </div>
            <div class="bento-card half card-accent-green" id="bc-${sceneId}-2">
              <div class="card-icon-svg">
                <svg viewBox="0 0 24 24"><path d="M5 3a2 2 0 0 0-2 2"/><path d="M19 3a2 2 0 0 1 2 2"/><path d="M21 19a2 2 0 0 1-2 2"/><path d="M5 21a2 2 0 0 1-2-2"/><path d="M9 3h1"/><path d="M9 21h1"/><path d="M14 3h1"/><path d="M14 21h1"/><path d="M3 9v1"/><path d="M21 9v1"/><path d="M3 14v1"/><path d="M21 14v1"/></svg>
              </div>
              <div class="card-title" style="font-size: 28px;">${card2Title}</div>
              <div class="card-desc" style="font-size: 20px;">${card2Body}</div>
            </div>
          </div>
          <div class="bento-card full card-accent-yellow" id="bc-${sceneId}-3">
            <div class="card-icon-svg">
              <svg viewBox="0 0 24 24"><path d="M4 7h16"/><path d="M4 12h10"/><path d="M4 17h6"/><circle cx="18" cy="16" r="3"/><path d="M18 13v3l1.5 1.5"/></svg>
            </div>
            <div class="card-text-group">
              <div class="card-title">${card3Title}</div>
              <div class="card-desc">${card3Body}</div>
            </div>
          </div>
        </div>
        <div class="action-btn" id="btn-${sceneId}" style="top: 1430px; font-size: 26px;">
          <span class="action-icon">⚠</span> ${btnText}
        </div>
      `;
      gsap = `
        tl.from("#glow-${sceneId}", { scale: 0.7, y: 30, opacity: 0, duration: 0.35, ease: "back.out(1.4)" }, ${start});
        tl.from("#hl1-${sceneId}", { y: -20, opacity: 0, duration: 0.2, ease: "power3.out" }, ${start + 0.2});
        tl.from("#hl2-${sceneId}", { y: 20, opacity: 0, duration: 0.2, ease: "power3.out" }, ${start + 0.2});
        tl.from("#bc-${sceneId}-1", { x: -20, opacity: 0, duration: 0.2, ease: "power3.out" }, ${start + 0.35});
        tl.from("#bc-${sceneId}-2", { x: 20, opacity: 0, duration: 0.2, ease: "power3.out" }, ${start + 0.35});
        tl.from("#bc-${sceneId}-3", { y: 20, opacity: 0, duration: 0.2, ease: "power3.out" }, ${start + 0.45});
        tl.from("#btn-${sceneId}", { y: 20, opacity: 0, duration: 0.2, ease: "back.out(1.2)" }, ${start + 0.55});
      `;
      break;
    }

    case "outro_docker":
    case 4: {
      // Scene 5: Checklist before production — 4 bento cards
      const hl1 = scene.headline_line1 || "CHECKLIST";
      const hl2 = scene.headline_line2 || "TRƯỚC KHI TÍCH HỢP";
      const cards = getSceneCards(scene, 4);
      const defaultTitles = ["Pin tag", "Backup", "Healthcheck", "Update"];
      const b1t = cards[0]?.title === "Image" ? defaultTitles[0] : (cards[0]?.title || defaultTitles[0]);
      const b2t = cards[1]?.title === "Cấu hình" ? defaultTitles[1] : (cards[1]?.title || defaultTitles[1]);
      const b3t = cards[2]?.title === "Kiểm tra" ? defaultTitles[2] : (cards[2]?.title || defaultTitles[2]);
      const b4t = cards[3]?.title === "Vận hành" ? defaultTitles[3] : (cards[3]?.title || defaultTitles[3]);
      const b1d = cards[0]?.body;
      const b2d = cards[1]?.body;
      const b3d = cards[2]?.body;
      const b4d = cards[3]?.body;
      const imageRef = getSceneImage(scene, "hello-world");
      const pinnedImage = imageRef.includes(":") || imageRef.includes("@") ? imageRef : `${stripTag(imageRef)}:stable`;
      const btnText = scene.btn_text || "$ docker compose config";
      html = `
        <div class="headline-container" style="top: 185px;">
          <div class="headline-line1" id="hl1-${sceneId}">${hl1}</div>
          <div class="headline-line2" id="hl2-${sceneId}">${hl2}</div>
        </div>
        <div class="workflow-gate-list" style="position:absolute; top:520px; left:50%; transform:translateX(-50%); width:920px; z-index:30;" id="gates-${sceneId}">
          ${[
            [b1t, b1d || pinnedImage, "PIN"],
            [b2t, b2d || "Volumes & data", "DATA"],
            [b3t, b3d || "HEALTHCHECK CMD", "HEALTH"],
            [b4t, b4d || `docker pull ${stripTag(imageRef)}`, "UPDATE"],
          ].map(([title, body, tag], idx) => `
          <div class="workflow-gate" id="gate-${sceneId}-${idx + 1}">
            <div class="workflow-gate-index">${idx + 1}</div>
            <div class="workflow-gate-copy">
              <div class="workflow-gate-label">${tag}</div>
              <div class="workflow-gate-title">${title}</div>
              <div class="workflow-gate-desc">${body}</div>
            </div>
            <div class="workflow-gate-pill">PASS</div>
          </div>`).join("")}
        </div>
        <div class="action-btn" id="btn-${sceneId}" style="top: 1418px; font-size: 26px; max-width: 900px;">
          <span class="action-icon">✓</span> ${btnText}
        </div>
      `;
      gsap = `
        tl.from("#hl1-${sceneId}", { y: -20, opacity: 0, duration: 0.2, ease: "power3.out" }, ${start});
        tl.from("#hl2-${sceneId}", { y: 20, opacity: 0, duration: 0.2, ease: "power3.out" }, ${start});
        ${[1, 2, 3, 4].map((n, idx) =>
          `tl.from("#gate-${sceneId}-${n}", { y: 24, opacity: 0, duration: 0.24, ease: "power3.out" }, ${start + 0.35 + idx * 0.36});`
        ).join("\n        ")}
        tl.from("#btn-${sceneId}", { y: 18, opacity: 0, duration: 0.2, ease: "back.out(1.2)" }, ${start + 1.84});
      `;
      break;
    }

    case 5: {
      // Scene 6: Docker stats (stars/pulls)
      const hl1 = scene.headline_line1 || "DOCKER STATS";
      const hl2 = scene.headline_line2 || "ĐỘ TIN CẬY BAN ĐẦU";
      const repoName = scene.repo_name || stripTag(getSceneImage(scene, scene.headline_line1 || "hello-world"));
      const repoPulls = scene.repo_stars || "1B+ pulls";
      const repoTrend = scene.repo_trend || "▲ Official";
      const repoTrendLabel = scene.repo_trend_label || "Docker Hub";
      const containerBase = stripTag(repoName).split("/").pop().replace(/[^a-z0-9_-]+/gi, "_") || "container";
      html = `
        <div class="headline-container" style="top: 175px; gap: 5px;">
          <div class="headline-line1" style="font-size: 66px;" id="hl1-${sceneId}">${hl1}</div>
          <div class="headline-line2" style="font-size: 58px;" id="hl2-${sceneId}">${hl2}</div>
        </div>
        <div class="bento-container" style="top: 440px; width: 960px;" id="bento-${sceneId}">
          <div class="docker-stats-card" id="dsc-${sceneId}">
            <div class="docker-logo-container">
              <svg viewBox="0 0 24 24"><path d="M13.983 11.078h2.119a.186.186 0 0 0 .186-.185V9.006a.186.186 0 0 0-.186-.186h-2.119a.185.185 0 0 0-.185.185v1.888c0 .102.083.185.185.185m-2.954-5.43h2.118a.186.186 0 0 0 .186-.186V3.574a.186.186 0 0 0-.186-.185h-2.118a.185.185 0 0 0-.185.185v1.888c0 .102.082.185.185.186m0 2.716h2.118a.187.187 0 0 0 .186-.186V6.29a.186.186 0 0 0-.186-.185h-2.118a.185.185 0 0 0-.185.185v1.887c0 .102.082.185.185.186m-2.93 0h2.12a.186.186 0 0 0 .184-.186V6.29a.185.185 0 0 0-.185-.185H8.1a.185.185 0 0 0-.185.185v1.887c0 .102.083.185.185.186m-2.964 0h2.119a.186.186 0 0 0 .185-.186V6.29a.185.185 0 0 0-.185-.185H5.136a.186.186 0 0 0-.186.185v1.887c0 .102.084.185.186.186m5.893 2.715h2.118a.186.186 0 0 0 .186-.185V9.006a.186.186 0 0 0-.186-.186h-2.118a.185.185 0 0 0-.185.185v1.888c0 .102.082.185.185.185m-2.93 0h2.12a.185.185 0 0 0 .184-.185V9.006a.185.185 0 0 0-.184-.186h-2.12a.185.185 0 0 0-.184.185v1.888c0 .102.083.185.185.185m-2.964 0h2.119a.185.185 0 0 0 .185-.185V9.006a.185.185 0 0 0-.184-.186h-2.12a.186.186 0 0 0-.186.185v1.888c0 .102.084.185.186.185m-2.92 0h2.12a.186.186 0 0 0 .184-.185V9.006a.185.185 0 0 0-.184-.186h-2.12a.185.185 0 0 0-.185.186v1.887c0 .102.083.185.185.185M23.763 9.89c-.065-.051-.672-.51-1.954-.51-.338.001-.676.03-1.01.087-.248-1.7-1.653-2.53-1.716-2.566l-.344-.199-.226.327c-.284.438-.49.922-.612 1.43-.23.97-.09 1.882.403 2.661-.595.332-1.55.413-1.744.42H.751a.751.751 0 0 0-.75.748 11.376 11.376 0 0 0 .692 4.062c.545 1.428 1.355 2.48 2.41 3.124 1.18.723 3.1 1.137 5.275 1.137.983.003 1.963-.086 2.93-.266a12.248 12.248 0 0 0 3.823-1.389c.98-.567 1.86-1.288 2.61-2.136 1.252-1.418 1.998-2.997 2.553-4.4h.221c1.372 0 2.215-.549 2.68-1.009.309-.293.55-.65.707-1.046l.098-.288Z"/></svg>
            </div>
            <div class="docker-info">
              <div class="docker-image-name">${repoName}</div>
              <div class="docker-meta">
                <span>Official Image</span>
                <span>•</span>
                <span style="color: #0db7ed;">${repoPulls}</span>
              </div>
            </div>
            <div class="docker-pulls">
              <span>${repoTrend}</span>
              <span class="docker-pulls-label">${repoTrendLabel}</span>
            </div>
          </div>
          <div class="terminal-frame" id="term-${sceneId}" style="position: relative; top: auto; left: auto; transform: none; width: 100%; height: 380px; box-sizing: border-box;">
            <div class="terminal-header">
              <div class="terminal-dots">
                <span class="dot red"></span><span class="dot yellow"></span><span class="dot green"></span>
              </div>
              <div class="terminal-title">docker — stats</div>
            </div>
            <div class="terminal-body">
              <div class="terminal-content">
                <div class="terminal-line">
                  <span class="t-output" style="width:220px; font-weight:700; color:#0db7ed;">CONTAINER</span>
                  <span class="t-output" style="width:140px; font-weight:700; color:#0db7ed;">CPU%</span>
                  <span class="t-output" style="width:180px; font-weight:700; color:#0db7ed;">MEM USAGE</span>
                  <span class="t-output" style="font-weight:700; color:#0db7ed;">NET I/O</span>
                </div>
                <div class="terminal-line" id="tr1-${sceneId}" style="opacity:0;">
                  <span class="t-success" style="width:220px;">${containerBase}_main</span>
                  <span class="t-cmd" style="width:140px;">0.1%</span>
                  <span class="t-cmd" style="width:180px;">4.2MB</span>
                  <span class="t-info">1.5kB / 872B</span>
                </div>
                <div class="terminal-line" id="tr2-${sceneId}" style="opacity:0;">
                  <span class="t-success" style="width:220px;">${containerBase}_sidecar</span>
                  <span class="t-cmd" style="width:140px;">0.3%</span>
                  <span class="t-cmd" style="width:180px;">6.1MB</span>
                  <span class="t-info">2.1kB / 1.1kB</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      `;
      gsap = `
        tl.from("#hl1-${sceneId}", { y: -20, opacity: 0, duration: 0.2, ease: "power3.out" }, ${start});
        tl.from("#hl2-${sceneId}", { y: 20, opacity: 0, duration: 0.2, ease: "power3.out" }, ${start});
        tl.from("#dsc-${sceneId}", { y: 20, opacity: 0, duration: 0.25, ease: "power3.out" }, ${start + 0.15});
        tl.from("#term-${sceneId}", { y: 20, opacity: 0, duration: 0.25, ease: "power3.out" }, ${start + 0.25});
        tl.to("#tr1-${sceneId}", { opacity: 1, duration: 0.2 }, ${start + 0.6});
        tl.to("#tr2-${sceneId}", { opacity: 1, duration: 0.2 }, ${start + 0.9});
      `;
      break;
    }

    case "terminal_docker":
    case 6: {
      // Scene 4: Run safely in a terminal
      const hl1 = scene.headline_line1 || "RUN IMAGE";
      const hl2 = scene.headline_line2 || "THỬ TRÊN MÁY PHỤ";
      const imageRef = stripTag(getSceneImage(scene, "hello-world"));
      const btnText = scene.btn_text || `$ docker run --rm ${imageRef}`;
      const command = cleanCommand(btnText) || `docker run --rm ${imageRef}`;
      const cards = getSceneCards(scene, 3);
      const runCards = cards.length > 0 ? cards : [
        { title: "Dry run", body: "Chạy với --rm trước khi đưa vào compose." },
        { title: "Logs", body: "Đọc log khởi động để bắt lỗi config." },
        { title: "Stop", body: "Dừng container sau khi test xong." },
      ];
      html = `
        <div class="headline-container" style="top: 165px;">
          <div class="headline-line1" id="hl1-${sceneId}">${hl1}</div>
          <div class="headline-line2" id="hl2-${sceneId}">${hl2}</div>
        </div>
        <div class="terminal-frame" id="runterm-${sceneId}" style="top: 455px; height: 520px; width: 920px;">
          <div class="terminal-header">
            <div class="terminal-dots">
              <span class="dot red"></span><span class="dot yellow"></span><span class="dot green"></span>
            </div>
            <div class="terminal-title">bash — docker run</div>
          </div>
          <div class="terminal-body">
            <div class="terminal-content">
              <div class="terminal-line" id="rt-${sceneId}-1">
                <span class="t-prompt">user@host:~$</span>
                <span class="t-cmd">${escapeHtml(command)}</span>
              </div>
              <div class="terminal-line" id="rt-${sceneId}-2" style="opacity:0;">
                <span class="t-success">✔ Container created for local verification</span>
              </div>
              <div class="terminal-line" id="rt-${sceneId}-3" style="opacity:0;">
                <span class="t-info">Reading startup logs before deployment...</span>
              </div>
              <div class="terminal-line" id="rt-${sceneId}-4" style="opacity:0;">
                <span class="t-success">✔ Remove or stop test container after checking</span>
                <span class="t-cursor" id="cursor-${sceneId}"></span>
              </div>
            </div>
          </div>
        </div>
        <div class="bento-container" style="top: 1010px; width: 920px;" id="runcheck-${sceneId}">
          ${runCards.slice(0, 3).map((card, idx) => `
          <div class="step-card" id="runstep-${sceneId}-${idx + 1}" style="margin-bottom: 16px;">
            <div class="step-number">${idx + 1}</div>
            <div>
              <div class="step-title">${card.title}</div>
              <div class="step-desc">${card.body}</div>
            </div>
          </div>`).join("")}
        </div>
      `;
      gsap = `
        tl.from("#hl1-${sceneId}", { y: -20, opacity: 0, duration: 0.2, ease: "power3.out" }, ${start});
        tl.from("#hl2-${sceneId}", { y: 20, opacity: 0, duration: 0.2, ease: "power3.out" }, ${start});
        tl.from("#runterm-${sceneId}", { y: 30, opacity: 0, duration: 0.3, ease: "back.out(1.2)" }, ${start + 0.1});
        tl.to("#rt-${sceneId}-2", { opacity: 1, duration: 0.15 }, ${start + 0.8});
        tl.to("#rt-${sceneId}-3", { opacity: 1, duration: 0.15 }, ${start + 1.3});
        tl.to("#rt-${sceneId}-4", { opacity: 1, duration: 0.15 }, ${start + 1.8});
        ${runCards.slice(0, 3).map((_, idx) =>
          `tl.from("#runstep-${sceneId}-${idx + 1}", { y: 18, opacity: 0, duration: 0.24, ease: "power3.out" }, ${start + 0.55 + idx * 0.36});`
        ).join("\n        ")}
        tl.to("#cursor-${sceneId}", { opacity: 0, repeat: ${Math.max(0, Math.ceil((sceneDuration - 2) / 1) - 1)}, yoyo: true, duration: 0.5 }, ${start + 2});
      `;
      break;
    }
    case 7: {
      // Scene 8: Outro — star/docs/test CTA
      const hl1 = scene.headline_line1 || "STAR VÀ ĐỌC DOCS";
      const hl2 = scene.headline_line2 || "TRƯỚC KHI DÙNG THẬT";
      const cards = getSceneCards(scene, 4);
      const b1t = cards[0]?.title || "Pull";
      const b2t = cards[1]?.title || "Run";
      const b3t = cards[2]?.title || "Docs";
      const b4t = cards[3]?.title || "Test";
      html = `
        <div class="headline-container" style="top: 185px;">
          <div class="headline-line1" id="hl1-${sceneId}">${hl1}</div>
          <div class="headline-line2" id="hl2-${sceneId}">${hl2}</div>
        </div>
        <div class="bento-container" style="top: 490px;" id="bento-${sceneId}">
          <div class="bento-grid-2">
            <div class="bento-card half" id="bc-${sceneId}-1" style="border: 2px solid rgba(13,183,237,0.4) !important; background: rgba(13,183,237,0.04) !important;">
              <div class="card-icon-svg" style="background: rgba(13,183,237,0.1) !important; border-color: rgba(13,183,237,0.4) !important;">
                <svg viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              </div>
              <div class="card-title" style="font-size: 32px; color: #0db7ed; font-weight: 800;">${b1t}</div>
            </div>
            <div class="bento-card half card-accent-green" id="bc-${sceneId}-2">
              <div class="card-icon-svg">
                <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/></svg>
              </div>
              <div class="card-title" style="font-size: 32px; color: #27c93f; font-weight: 800;">${b2t}</div>
            </div>
          </div>
          <div class="bento-grid-2">
            <div class="bento-card half card-accent-yellow" id="bc-${sceneId}-3">
              <div class="card-icon-svg">
                <svg viewBox="0 0 24 24"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
              </div>
              <div class="card-title" style="font-size: 32px; color: #f3ca56; font-weight: 800;">${b3t}</div>
            </div>
            <div class="bento-card half card-accent-red" id="bc-${sceneId}-4">
              <div class="card-icon-svg">
                <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
              </div>
              <div class="card-title" style="font-size: 32px; color: #ff4757; font-weight: 800;">${b4t}</div>
            </div>
          </div>
        </div>
      `;
      gsap = `
        tl.from("#hl1-${sceneId}", { y: -20, opacity: 0, duration: 0.2, ease: "power3.out" }, ${start});
        tl.from("#hl2-${sceneId}", { y: 20, opacity: 0, duration: 0.2, ease: "power3.out" }, ${start});
        tl.from("#bc-${sceneId}-1", { scale: 0.85, opacity: 0, duration: 0.2, ease: "back.out(1.2)" }, ${start + 0.1});
        tl.from("#bc-${sceneId}-2", { scale: 0.85, opacity: 0, duration: 0.2, ease: "back.out(1.2)" }, ${start + 0.15});
        tl.from("#bc-${sceneId}-3", { scale: 0.85, opacity: 0, duration: 0.2, ease: "back.out(1.2)" }, ${start + 0.2});
        tl.from("#bc-${sceneId}-4", { scale: 0.85, opacity: 0, duration: 0.2, ease: "back.out(1.2)" }, ${start + 0.25});
      `;
      break;
    }

    default: {
      // Fallback generic scene
      const hl1 = scene.headline_line1 || "DOCKER";
      const hl2 = scene.headline_line2 || "CONTAINER";
      const btnText = scene.btn_text || "$ docker run --rm hello-world";
      html = `
        <div class="main-glow-icon" id="glow-${sceneId}">
          <div class="glow-svg-container">
            <svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M9 12l2 2 4-4"/></svg>
          </div>
        </div>
        <div class="headline-container" id="head-${sceneId}">
          <div class="headline-line1" id="hl1-${sceneId}">${hl1}</div>
          <div class="headline-line2" id="hl2-${sceneId}">${hl2}</div>
        </div>
        <div class="action-btn" id="btn-${sceneId}">
          <span class="action-icon">🐳</span> ${btnText}
        </div>
      `;
      gsap = `
        tl.from("#glow-${sceneId}", { scale: 0.7, y: 30, opacity: 0, duration: 0.35, ease: "back.out(1.4)" }, ${start});
        tl.from("#hl1-${sceneId}", { y: -20, opacity: 0, duration: 0.2, ease: "power3.out" }, ${start + 0.2});
        tl.from("#hl2-${sceneId}", { y: 20, opacity: 0, duration: 0.2, ease: "power3.out" }, ${start + 0.2});
        tl.from("#btn-${sceneId}", { y: 20, opacity: 0, duration: 0.2, ease: "back.out(1.2)" }, ${start + 0.35});
      `;
    }
  }

  html = `<div class="dev-workflow-template workflow-card">${html}</div>`;
  if (/class="(?:bento-card|step-card|web-card|terminal-frame)/.test(html)) {
    gsap += `\n        tl.from("#${sceneId} .workflow-card .bento-card, #${sceneId} .workflow-card .step-card, #${sceneId} .workflow-card .web-card, #${sceneId} .workflow-card .terminal-frame", { x: 32, duration: 0.22, stagger: 0.05, ease: "power3.out" }, ${start + 0.14});`;
  }
  return { html, gsap };
}
