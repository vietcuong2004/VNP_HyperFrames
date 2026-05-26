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
  const fallbackNames = ["Điểm chính", "Cách dùng", "Lưu ý", "Bước tiếp"];
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

function renderStepCards(scene, sceneId, limit = 4, options = {}) {
  const cards = getSceneCards(scene, limit);
  const command = options.command ? escapeHtml(options.command) : "";
  const commandCard = command
    ? `
          <div class="step-command" id="cmd-${sceneId}">${command}</div>`
    : "";
  return `
        <div class="step-container" id="steps-${sceneId}" style="top: ${options.top || 525}px;">
          ${cards.map((card, idx) => `
          <div class="step-card" id="st-${sceneId}-${idx + 1}">
            <div class="step-number">${idx + 1}</div>
            <div>
              <div class="step-title">${card.title}</div>
              <div class="step-desc">${card.body}</div>
              ${idx === 0 ? commandCard : ""}
            </div>
          </div>`).join("")}
        </div>`;
}

function stepCardAnimation(sceneId, start, count = 4) {
  return Array.from({ length: count }, (_, idx) =>
    `tl.from("#st-${sceneId}-${idx + 1}", { y: 22, opacity: 0, duration: 0.24, ease: "power3.out" }, ${start + 0.35 + idx * 0.36});`
  ).join("\n        ");
}

export function getHyperframesReviewScene(i, scene, sceneId, start) {
  let html = "";
  let gsap = "";

  switch (i) {
    case 0: {
      // Cảnh 1: Giới thiệu HyperFrames
      const repoUrl = scene.repo_url || "github.com/owner/repo";
      const headlineLine1 = scene.headline_line1 || "REPO GITHUB";
      const headlineLine2 = scene.headline_line2 || "CÓ GÌ ĐÁNG CHÚ Ý?";
      html = `
        <div class="browser-frame" id="browser-${sceneId}">
          <div class="browser-header">
            <div class="browser-dots">
              <span class="dot red"></span>
              <span class="dot yellow"></span>
              <span class="dot green"></span>
            </div>
            <div class="browser-address">${repoUrl}</div>
          </div>
          <div class="browser-inner" data-layout-allow-overflow>
            <img class="github-scroll-image" id="scroll-img-${sceneId}" src="./assets/images/github_repo.png" />
          </div>
          <div class="browser-glass-shine"></div>
        </div>
        <div class="headline-container" style="top: 1085px; gap: 8px;">
          <div class="headline-line1" id="hl1-${sceneId}" style="font-size: 64px; letter-spacing: 1px;">${headlineLine1}</div>
          <div class="headline-line2" id="hl2-${sceneId}" style="font-size: 44px; font-weight: 800;">${headlineLine2}</div>
        </div>
        <div class="action-btn" id="btn-${sceneId}" style="top: 1265px; padding: 12px 30px; font-size: 25px; border-radius: 20px;">
          <span class="action-icon" style="font-size: 30px; margin-right: 5px;">🔗</span> ${repoUrl}
        </div>
      `;
      gsap = `
        tl.from("#browser-${sceneId}", { scale: 0.85, y: 30, duration: 0.4, ease: "back.out(1.2)" }, ${start});
        tl.from("#hl1-${sceneId}", { y: -20, duration: 0.2, ease: "power3.out" }, ${start + 0.2});
        tl.from("#hl2-${sceneId}", { y: 20, duration: 0.2, ease: "power3.out" }, ${start + 0.2});
        tl.from("#btn-${sceneId}", { y: 20, duration: 0.2, ease: "back.out(1.2)" }, ${start + 0.4});
        tl.fromTo("#scroll-img-${sceneId}",
          { y: 0 },
          { y: -2100, duration: 8.5, ease: "power1.inOut" },
          ${start + 1.5}
        );
      `;
      break;
    }

    case 1: {
      // Cảnh 2: Nguyên lý hoạt động (Write HTML Render Video)
      const title1 = scene.headline_line1 || "USE CASE";
      const title2 = scene.headline_line2 || "GIẢI QUYẾT VIỆC GÌ?";
      const cards = getSceneCards(scene, 3);
      const bento1Title = cards[0]?.title || "Use case";
      const bento1Desc = cards[0]?.body || "Nói rõ repo này giúp ai và trong tình huống nào.";
      const bento2Title = cards[1]?.title || "Lợi ích";
      const bento2Desc = cards[1]?.body || "Chọn điểm đáng thử thay vì chỉ nhìn số sao.";
      const bento3Title = cards[2]?.title || "Nên thử";
      const bento3Desc = cards[2]?.body || "Chạy ví dụ nhỏ trước khi đưa vào dự án thật.";
      html = `
        <div class="headline-container" style="top: 185px;">
          <div class="headline-line1" id="hl1-${sceneId}">${title1}</div>
          <div class="headline-line2" id="hl2-${sceneId}">${title2}</div>
        </div>
        <div class="bento-container" style="top: 525px;" id="bento-${sceneId}">
          <div class="bento-card full" id="bc-${sceneId}-1">
            <div class="card-icon-svg">
              <svg viewBox="0 0 24 24"><path d="M9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4zm5.2 0l4.6-4.6-4.6-4.6L16 6l6 6-6 6-1.4-1.4z"/></svg>
            </div>
            <div class="card-text-group">
              <div class="card-title">${bento1Title}</div>
              <div class="card-desc">${bento1Desc}</div>
            </div>
          </div>
          <div class="bento-grid-2">
            <div class="bento-card half" id="bc-${sceneId}-2">
              <div class="card-icon-svg" style="margin: 0 auto 15px auto;">
                <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/></svg>
              </div>
              <div class="card-title" style="font-size: 32px; text-align: center;">${bento2Title}</div>
              <div class="card-desc" style="font-size: 19px; text-align: center; margin-top: 10px;">${bento2Desc}</div>
            </div>
            <div class="bento-card half" id="bc-${sceneId}-3">
              <div class="card-icon-svg" style="margin: 0 auto 15px auto;">
                <svg viewBox="0 0 24 24"><path d="M19 12v7H5v-7H3v7c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2v-7h-2zm-6 .67l2.59-2.58L17 11.5l-5 5-5-5 1.41-1.41L11 12.67V3h2v9.67z"/></svg>
              </div>
              <div class="card-title" style="font-size: 32px; text-align: center;">${bento3Title}</div>
              <div class="card-desc" style="font-size: 19px; text-align: center; margin-top: 10px;">${bento3Desc}</div>
            </div>
          </div>
        </div>
      `;
      gsap = `
        tl.from("#hl1-${sceneId}", { y: -20, duration: 0.2, ease: "power3.out" }, ${start});
        tl.from("#hl2-${sceneId}", { y: 20, duration: 0.2, ease: "power3.out" }, ${start});
        tl.from("#bc-${sceneId}-1", { y: 20, duration: 0.2, ease: "power3.out" }, ${start});
        tl.from("#bc-${sceneId}-2", { y: 20, duration: 0.2, ease: "power3.out" }, ${start});
        tl.from("#bc-${sceneId}-3", { y: 20, duration: 0.2, ease: "power3.out" }, ${start});
      `;
      break;
    }

    case 2: {
      // Cảnh 3: BỐN TÍNH NĂNG LÕI
      const title1 = scene.headline_line1 || "Bốn Tính Năng";
      const title2 = scene.headline_line2 || "Lõi";
      const cards = getSceneCards(scene, 4);
      if (scene.content_mode === "steps" || Array.isArray(scene.steps)) {
        html = `
        <div class="headline-container" style="top: 185px;">
          <div class="headline-line1" id="hl1-${sceneId}">${title1}</div>
          <div class="headline-line2" id="hl2-${sceneId}">${title2}</div>
        </div>
        ${renderStepCards(scene, sceneId, 4)}
      `;
        gsap = `
        tl.from("#hl1-${sceneId}", { y: -20, duration: 0.2, ease: "power3.out" }, ${start});
        tl.from("#hl2-${sceneId}", { y: 20, duration: 0.2, ease: "power3.out" }, ${start});
        ${stepCardAnimation(sceneId, start, cards.length)}
      `;
        break;
      }
      const bento1Title = cards[0]?.title || scene.bento1_title || "Phân tích Real-time";
      const bento1Desc = cards[0]?.body || scene.bento1_desc || "";
      const bento2Title = cards[1]?.title || scene.bento2_title || "Tranh biện chốt lệnh";
      const bento2Desc = cards[1]?.body || scene.bento2_desc || "";
      const bento3Title = cards[2]?.title || scene.bento3_title || "API độ trễ cực thấp";
      const bento3Desc = cards[2]?.body || scene.bento3_desc || "";
      const bento4Title = cards[3]?.title || scene.bento4_title || "Quản trị rủi ro AI";
      const bento4Desc = cards[3]?.body || scene.bento4_desc || "";
      html = `
        <div class="headline-container" style="top: 185px;">
          <div class="headline-line1" id="hl1-${sceneId}">${title1}</div>
          <div class="headline-line2" id="hl2-${sceneId}">${title2}</div>
        </div>
        <div class="bento-container" style="top: 525px;" id="bento-${sceneId}">
          <div class="bento-grid-2">
            <div class="bento-card half" id="bc-${sceneId}-1" style="flex-direction: column; align-items: center; justify-content: center; padding: 30px;">
              <div class="card-icon-svg" style="margin: 0 0 20px 0;">
                <svg viewBox="0 0 24 24"><path d="M12 3c-4.97 0-9 4.03-9 9 0 2.12.74 4.07 1.97 5.61L4.35 19.4c-.39.39-.39 1.02 0 1.41.39.39 1.02.39 1.41 0l1.9-1.9C9.09 19.58 10.5 20 12 20c4.97 0 9-4.03 9-9s-4.03-9-9-9zm0 15c-3.31 0-6-2.69-6-6s2.69-6 6-6 6 2.69 6 6-2.69 6-6 6zm0-10c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4z"/></svg>
              </div>
              <div class="card-title" style="font-size: 30px; font-weight: 700; text-align: center;">${bento1Title}</div>
              <div class="card-desc" style="font-size: 19px; text-align: center; margin-top: 10px;">${bento1Desc}</div>
            </div>
            <div class="bento-card half" id="bc-${sceneId}-2" style="flex-direction: column; align-items: center; justify-content: center; padding: 30px;">
              <div class="card-icon-svg" style="margin: 0 0 20px 0;">
                <svg viewBox="0 0 24 24"><path d="M5.2 18.2l-2.4-2.4c-.6-.6-.6-1.6 0-2.2l3.4-3.4c.6-.6 1.6-.6 2.2 0l2.4 2.4c.6.6.6 1.6 0 2.2l-3.4 3.4c-.6.6-1.6.6-2.2 0zM19.6 3.8c-.8-.8-2-.8-2.8 0l-7.1 7.1c-.8.8-.8 2 0 2.8l1.4 1.4c.8.8 2 .8 2.8 0l7.1-7.1c.8-.8.8-2 0-2.8l-1.4-1.4zM7.5 13.5l3 3M17 11.5l-4.5-4.5"/></svg>
              </div>
              <div class="card-title" style="font-size: 30px; font-weight: 700; text-align: center;">${bento2Title}</div>
              <div class="card-desc" style="font-size: 19px; text-align: center; margin-top: 10px;">${bento2Desc}</div>
            </div>
          </div>
          <div class="bento-grid-2">
            <div class="bento-card half" id="bc-${sceneId}-3" style="flex-direction: column; align-items: center; justify-content: center; padding: 30px;">
              <div class="card-icon-svg" style="margin: 0 0 20px 0;">
                <svg viewBox="0 0 24 24"><path d="M11 21h-1l1-7H7.5c-.88 0-1.4-.8-1.05-1.57L11.5 3h1l-1 7h3.5c.88 0 1.4.8 1.05 1.57L11 21z"/></svg>
              </div>
              <div class="card-title" style="font-size: 30px; font-weight: 700; text-align: center;">${bento3Title}</div>
              <div class="card-desc" style="font-size: 19px; text-align: center; margin-top: 10px;">${bento3Desc}</div>
            </div>
            <div class="bento-card half" id="bc-${sceneId}-4" style="flex-direction: column; align-items: center; justify-content: center; padding: 30px;">
              <div class="card-icon-svg" style="margin: 0 0 20px 0;">
                <svg viewBox="0 0 24 24"><path d="M12 2L4 5v6.09c0 5.05 3.41 9.76 8 10.91 4.59-1.15 8-5.86 8-10.91V5l-8-3zm0 2.18c3.55 1 6 4.3 6 7.91 0 3.86-2.61 7.42-6 8.71V4.18z"/></svg>
              </div>
              <div class="card-title" style="font-size: 30px; font-weight: 700; text-align: center;">${bento4Title}</div>
              <div class="card-desc" style="font-size: 19px; text-align: center; margin-top: 10px;">${bento4Desc}</div>
            </div>
          </div>
        </div>
      `;
      gsap = `
        tl.from("#hl1-${sceneId}", { y: -20, duration: 0.2, ease: "power3.out" }, ${start});
        tl.from("#hl2-${sceneId}", { y: 20, duration: 0.2, ease: "power3.out" }, ${start});
        tl.from("#bc-${sceneId}-1", { y: 20, duration: 0.2, ease: "power3.out" }, ${start});
        tl.from("#bc-${sceneId}-2", { y: 20, duration: 0.2, ease: "power3.out" }, ${start});
        tl.from("#bc-${sceneId}-3", { y: 20, duration: 0.2, ease: "power3.out" }, ${start});
        tl.from("#bc-${sceneId}-4", { y: 20, duration: 0.2, ease: "power3.out" }, ${start});
      `;
      break;
    }

    case 3: {
      // Cảnh 4: Deterministic Rendering (Siêu ổn định)
      const title1 = scene.headline_line1 || "ĐIỂM MẠNH";
      const title2 = scene.headline_line2 || "CÓ ĐÁNG DÙNG?";
      const btnText = escapeHtml(scene.btn_text || "Đọc README và chạy ví dụ nhỏ");
      const hasProvidedCards = (Array.isArray(scene.steps) && scene.steps.length > 0)
        || (Array.isArray(scene.cards) && scene.cards.length > 0)
        || [1, 2, 3, 4].some((idx) => scene[`bento${idx}_title`] || scene[`bento${idx}_desc`]);
      const proofCards = hasProvidedCards ? getSceneCards(scene, 3) : [
        { title: "Use case", body: "Nói rõ repo giải quyết việc gì." },
        { title: "Evidence", body: "Tìm ví dụ, docs và release gần đây." },
        { title: "Fit", body: "Thử trong project phụ trước khi tích hợp." },
      ];
      html = `
        <div class="headline-container" style="top: 165px;">
          <div class="headline-line1" id="hl1-${sceneId}">${title1}</div>
          <div class="headline-line2" id="hl2-${sceneId}">${title2}</div>
        </div>
        <div class="repo-proof-panel" id="proof-${sceneId}" style="position:absolute; top:500px; left:50%; transform:translateX(-50%); width:920px; z-index:30;">
          ${proofCards.slice(0, 3).map((card, idx) => `
          <div class="step-card" id="proof-${sceneId}-${idx + 1}" style="margin-bottom:22px;">
            <div class="step-number">${idx + 1}</div>
            <div>
              <div class="step-title">${card.title}</div>
              <div class="step-desc">${card.body}</div>
            </div>
          </div>`).join("")}
        </div>
        <div class="action-btn" id="btn-${sceneId}" style="top: 1245px; max-width: 880px; font-size: 28px;">
          <span class="action-icon">✓</span> ${btnText}
        </div>
      `;
      gsap = `
        tl.from("#hl1-${sceneId}", { y: -20, duration: 0.2, ease: "power3.out" }, ${start});
        tl.from("#hl2-${sceneId}", { y: 20, duration: 0.2, ease: "power3.out" }, ${start});
        ${proofCards.slice(0, 3).map((_, idx) =>
          `tl.from("#proof-${sceneId}-${idx + 1}", { y: 22, opacity: 0, duration: 0.24, ease: "power3.out" }, ${start + 0.35 + idx * 0.36});`
        ).join("\n        ")}
        tl.from("#btn-${sceneId}", { y: 20, opacity: 0, duration: 0.2, ease: "back.out(1.2)" }, ${start + 1.48});
      `;
      break;
    }

    case 4: {
      // Cảnh 5: Frame Adapter Pattern
      const title1 = scene.headline_line1 || "CHECKLIST";
      const title2 = scene.headline_line2 || "TRƯỚC KHI DÙNG";
      const cards = getSceneCards(scene, 4);
      const checkCards = cards.length > 0 ? cards : [
        { title: "License", body: "Kiểm tra điều kiện sử dụng." },
        { title: "Release", body: "Xem release và commit gần đây." },
        { title: "Issues", body: "Đọc lỗi đang mở trước khi adopt." },
        { title: "Docs", body: "Chạy ví dụ nhỏ trong README." },
      ];
      html = `
        <div class="headline-container" style="top: 185px;">
          <div class="headline-line1" id="hl1-${sceneId}">${title1}</div>
          <div class="headline-line2" id="hl2-${sceneId}">${title2}</div>
        </div>
        <div class="repo-check-panel bento-container" style="top: 515px;" id="check-${sceneId}">
          <div class="bento-grid-2">
            ${checkCards.slice(0, 2).map((card, idx) => `
            <div class="bento-card half" id="check-${sceneId}-${idx + 1}">
              <div class="card-icon-svg" style="margin: 0 auto 15px auto;">
                <svg viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5"/></svg>
              </div>
              <div class="card-title" style="font-size: 30px; text-align:center;">${card.title}</div>
              <div class="card-desc" style="font-size: 20px; text-align:center; margin-top:10px;">${card.body}</div>
            </div>`).join("")}
          </div>
          <div class="bento-grid-2">
            ${checkCards.slice(2, 4).map((card, idx) => `
            <div class="bento-card half" id="check-${sceneId}-${idx + 3}">
              <div class="card-icon-svg" style="margin: 0 auto 15px auto;">
                <svg viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5"/></svg>
              </div>
              <div class="card-title" style="font-size: 30px; text-align:center;">${card.title}</div>
              <div class="card-desc" style="font-size: 20px; text-align:center; margin-top:10px;">${card.body}</div>
            </div>`).join("")}
          </div>
        </div>
      `;
      gsap = `
        tl.from("#hl1-${sceneId}", { y: -20, duration: 0.2, ease: "power3.out" }, ${start});
        tl.from("#hl2-${sceneId}", { y: 20, duration: 0.2, ease: "power3.out" }, ${start});
        ${checkCards.slice(0, 4).map((_, idx) =>
          `tl.from("#check-${sceneId}-${idx + 1}", { y: 20, opacity: 0, duration: 0.24, ease: "power3.out" }, ${start + 0.35 + idx * 0.36});`
        ).join("\n        ")}
      `;
      break;
    }

    case 5: {
      // Scene 6: Repo signal check
      const title1 = scene.headline_line1 || "TÍN HIỆU REPO";
      const title2 = scene.headline_line2 || "ĐỌC TRƯỚC KHI DÙNG";
      const repoName = scene.repo_name || scene.repo_url || "owner/repo";
      const repoLang = scene.repo_lang || "N/A";
      const repoStars = scene.repo_stars || "★ 0";
      const repoTrend = scene.repo_trend || "Repo";
      const repoTrendLabel = scene.repo_trend_label || "GitHub";
      const signalCards = [
        { title: "Stars", body: repoStars },
        { title: "Language", body: repoLang },
        { title: "Source", body: repoTrendLabel },
        { title: "Status", body: repoTrend },
      ];
      html = `
        <div class="headline-container" style="top: 165px; gap: 5px;">
          <div class="headline-line1" id="hl1-${sceneId}" style="font-size: 54px;">${title1}</div>
          <div class="headline-line2" id="hl2-${sceneId}" style="font-size: 48px;">${title2}</div>
        </div>
        <div class="repo-signal-panel bento-container" style="top: 430px; width: 960px;" id="signals-${sceneId}">
          <div class="repo-badge" id="rb-${sceneId}">
            <div class="crown-container">
              <svg class="crown-svg" viewBox="0 0 24 24"><path d="M12 2 4 5v6.09c0 5.05 3.41 9.76 8 10.91 4.59-1.15 8-5.86 8-10.91V5l-8-3z"/></svg>
              <div class="rank-text">GH</div>
            </div>
            <div class="repo-info">
              <div class="repo-name">${escapeHtml(repoName)}</div>
              <div class="repo-meta">
                <span class="meta-dot"></span>
                <span>${escapeHtml(repoLang)}</span>
                <span>${escapeHtml(repoStars)}</span>
              </div>
            </div>
            <div class="repo-trend">
              <span>${escapeHtml(repoTrend)}</span>
              <span class="trend-label">${escapeHtml(repoTrendLabel)}</span>
            </div>
          </div>
          <div class="github-star-wrap" id="star-wrap-${sceneId}">
            <img class="github-star-crop" id="star-${sceneId}" src="./assets/images/github_star.png" onload="this.parentElement.classList.add('has-star-image')" onerror="this.style.display='none'" />
            <div class="github-star-fallback">
              <span>GitHub Stars</span>
              <strong>${escapeHtml(repoStars)}</strong>
            </div>
          </div>
          <div class="bento-grid-2" style="margin-top: 24px;">
            ${signalCards.slice(0, 2).map((card, idx) => `
            <div class="bento-card half" id="sig-${sceneId}-${idx + 1}">
              <div class="card-title" style="font-size: 28px; text-align:center;">${escapeHtml(card.title)}</div>
              <div class="card-desc" style="font-size: 24px; text-align:center; margin-top:10px; word-break: break-word;">${escapeHtml(card.body)}</div>
            </div>`).join("")}
          </div>
          <div class="bento-grid-2">
            ${signalCards.slice(2, 4).map((card, idx) => `
            <div class="bento-card half" id="sig-${sceneId}-${idx + 3}">
              <div class="card-title" style="font-size: 28px; text-align:center;">${escapeHtml(card.title)}</div>
              <div class="card-desc" style="font-size: 24px; text-align:center; margin-top:10px; word-break: break-word;">${escapeHtml(card.body)}</div>
            </div>`).join("")}
          </div>
        </div>
      `;
      gsap = `
        tl.from("#hl1-${sceneId}", { y: -20, duration: 0.2, ease: "power3.out" }, ${start});
        tl.from("#hl2-${sceneId}", { y: 20, duration: 0.2, ease: "power3.out" }, ${start});
        tl.from("#rb-${sceneId}", { y: -20, opacity: 0, duration: 0.2, ease: "power3.out" }, ${start + 0.1});
        tl.from("#star-wrap-${sceneId}", { y: 16, opacity: 0, duration: 0.2, ease: "power3.out" }, ${start + 0.16});
        ${signalCards.map((_, idx) =>
          `tl.from("#sig-${sceneId}-${idx + 1}", { y: 20, opacity: 0, duration: 0.2, ease: "power3.out" }, ${start + 0.2 + idx * 0.06});`
        ).join("\n        ")}
      `;
      break;
    }
    case 6: {
      // Scene 7: Clone and test safely
      const title1 = scene.headline_line1 || "CLONE REPO";
      const title2 = scene.headline_line2 || "CHẠY THỬ RIÊNG";
      const btnText = scene.btn_text || "$ git clone github.com/owner/repo";
      const hasProvidedCards = (Array.isArray(scene.steps) && scene.steps.length > 0)
        || (Array.isArray(scene.cards) && scene.cards.length > 0)
        || [1, 2, 3, 4].some((idx) => scene[`bento${idx}_title`] || scene[`bento${idx}_desc`]);
      const cloneCards = hasProvidedCards ? getSceneCards(scene, 3) : [
        { title: "Clone", body: "Lấy source về một thư mục riêng." },
        { title: "Read README", body: "Đọc cách cài đặt và yêu cầu môi trường." },
        { title: "Run test", body: "Chạy ví dụ nhỏ, rồi check license trước khi dùng." },
      ];
      html = `
        <div class="headline-container" style="top: 185px;">
          <div class="headline-line1" id="hl1-${sceneId}">${title1}</div>
          <div class="headline-line2" id="hl2-${sceneId}">${title2}</div>
        </div>
        ${renderStepCards({ ...scene, steps: cloneCards }, sceneId, 3, { top: 560, command: btnText })}
      `;
      gsap = `
        tl.from("#hl1-${sceneId}", { y: -20, duration: 0.2, ease: "power3.out" }, ${start});
        tl.from("#hl2-${sceneId}", { y: 20, duration: 0.2, ease: "power3.out" }, ${start});
        ${stepCardAnimation(sceneId, start, cloneCards.length)}
        tl.from("#cmd-${sceneId}", { y: 10, opacity: 0, duration: 0.2, ease: "power3.out" }, ${start + 1.48});
      `;
      break;
    }
    case 7: {
      // Cảnh 8: Outro Github Star
      const title1 = scene.headline_line1 || "ỦNG HỘ REPO";
      const title2 = scene.headline_line2 || "THẢ 1 SAO GITHUB NHÉ!";
      const cards = getSceneCards(scene, 4);
      const bento1Title = cards[0]?.title || scene.bento1_title || "Thả 1 Star";
      const bento1Desc = cards[0]?.body || scene.bento1_desc || "";
      const bento2Title = cards[1]?.title || scene.bento2_title || "Yêu thích";
      const bento2Desc = cards[1]?.body || scene.bento2_desc || "";
      const bento3Title = cards[2]?.title || scene.bento3_title || "Bình luận ngay";
      const bento3Desc = cards[2]?.body || scene.bento3_desc || "";
      const bento4Title = cards[3]?.title || scene.bento4_title || "Đăng ký kênh";
      const bento4Desc = cards[3]?.body || scene.bento4_desc || "";
      html = `
        <div class="headline-container" style="top: 185px;">
          <div class="headline-line1" id="hl1-${sceneId}">${title1}</div>
          <div class="headline-line2" id="hl2-${sceneId}">${title2}</div>
        </div>
        <div class="bento-container" style="top: 460px;" id="bento-${sceneId}">
          <div class="bento-grid-2">
            <div class="bento-card half" id="bc-${sceneId}-1" style="border: 2px solid rgba(243, 202, 86, 0.4); background: rgba(243, 202, 86, 0.02);">
              <div class="card-icon-svg" style="margin: 0 auto 15px auto; background: rgba(243,202,86,0.06); border: 2px solid rgba(243,202,86,0.25);">
                <svg viewBox="0 0 24 24" style="stroke: #f3ca56; filter: drop-shadow(0 0 8px rgba(243,202,86,0.8));"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>
              </div>
              <div class="card-title" style="font-size: 32px; text-align: center; color: #f3ca56; font-weight: 800;">${bento1Title}</div>
              <div class="card-desc" style="font-size: 19px; text-align: center; margin-top: 10px;">${bento1Desc}</div>
            </div>
            <div class="bento-card half" id="bc-${sceneId}-2" style="border: 2px solid rgba(255, 71, 87, 0.4); background: rgba(255, 71, 87, 0.02);">
              <div class="card-icon-svg" style="margin: 0 auto 15px auto; background: rgba(255,71,87,0.06); border: 2px solid rgba(255,71,87,0.25);">
                <svg viewBox="0 0 24 24" style="stroke: #ff4757; filter: drop-shadow(0 0 8px rgba(255,71,87,0.8));"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
              </div>
              <div class="card-title" style="font-size: 32px; text-align: center; color: #ff4757; font-weight: 800;">${bento2Title}</div>
              <div class="card-desc" style="font-size: 19px; text-align: center; margin-top: 10px;">${bento2Desc}</div>
            </div>
          </div>
          <div class="bento-grid-2">
            <div class="bento-card half" id="bc-${sceneId}-3" style="border: 2px solid rgba(0, 210, 255, 0.4); background: rgba(0, 210, 255, 0.02);">
              <div class="card-icon-svg" style="margin: 0 auto 15px auto; background: rgba(0,210,255,0.06); border: 2px solid rgba(0,210,255,0.25);">
                <svg viewBox="0 0 24 24" style="stroke: #00d2ff; filter: drop-shadow(0 0 8px rgba(0,210,255,0.8));"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
              </div>
              <div class="card-title" style="font-size: 32px; text-align: center; color: #00d2ff; font-weight: 800;">${bento3Title}</div>
              <div class="card-desc" style="font-size: 19px; text-align: center; margin-top: 10px;">${bento3Desc}</div>
            </div>
            <div class="bento-card half" id="bc-${sceneId}-4" style="border: 2px solid rgba(224, 86, 253, 0.4); background: rgba(224, 86, 253, 0.02);">
              <div class="card-icon-svg" style="margin: 0 auto 15px auto; background: rgba(224,86,253,0.06); border: 2px solid rgba(224,86,253,0.25);">
                <svg viewBox="0 0 24 24" style="stroke: #e056fd; filter: drop-shadow(0 0 8px rgba(224,86,253,0.8));"><path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.89 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/></svg>
              </div>
              <div class="card-title" style="font-size: 32px; text-align: center; color: #e056fd; font-weight: 800;">${bento4Title}</div>
              <div class="card-desc" style="font-size: 19px; text-align: center; margin-top: 10px;">${bento4Desc}</div>
            </div>
          </div>
        </div>
      `;
      gsap = `
        tl.from("#hl1-${sceneId}", { y: -20, duration: 0.2, ease: "power3.out" }, ${start});
        tl.from("#hl2-${sceneId}", { y: 20, duration: 0.2, ease: "power3.out" }, ${start});
        tl.from("#bc-${sceneId}-1", { y: 20, duration: 0.2, ease: "power3.out" }, ${start});
        tl.from("#bc-${sceneId}-2", { y: 20, duration: 0.2, ease: "power3.out" }, ${start});
        tl.from("#bc-${sceneId}-3", { y: 20, duration: 0.2, ease: "power3.out" }, ${start});
        tl.from("#bc-${sceneId}-4", { y: 20, duration: 0.2, ease: "power3.out" }, ${start});
      `;
      break;
    }
  }

  return { html, gsap };
}
