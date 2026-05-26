function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
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

  return rawCards.slice(0, limit).map((card, idx) => ({
    title: escapeHtml(card.title || `Điểm ${idx + 1}`),
    body: escapeHtml(card.body || card.desc || card.description || ""),
  }));
}

export function getHyperframesReviewScene(i, scene, sceneId, start) {
  let html = "";
  let gsap = "";

  switch (i) {
    case 0: {
      // Cảnh 1: Giới thiệu HyperFrames
      const repoUrl = scene.repo_url || "example.com";
      const headlineLine1 = scene.headline_line1 || "NGUON WEB";
      const headlineLine2 = scene.headline_line2 || "CAN KIEM TRA GI?";
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
      const title1 = scene.headline_line1 || "NỘI DUNG CHÍNH";
      const title2 = scene.headline_line2 || "CẦN GIẢI THÍCH";
      const cards = getSceneCards(scene, 5);
      const bento1Title = cards[0]?.title || scene.bento1_title || "Tóm tắt";
      const bento1Desc = cards[0]?.body || scene.bento1_desc || "Thông tin cơ bản";
      const bento2Title = cards[1]?.title || scene.bento2_title || "Đối tượng";
      const bento2Desc = cards[1]?.body || scene.bento2_desc || "Phân tích chuyên sâu";
      const bento3Title = cards[2]?.title || scene.bento3_title || "Ngữ cảnh";
      const bento3Desc = cards[2]?.body || scene.bento3_desc || "Dữ liệu liên quan";
      const bento4Title = cards[3]?.title || scene.bento4_title || "Lưu ý";
      const bento4Desc = cards[3]?.body || scene.bento4_desc || "Kiểm tra trước khi dùng";
      const bento5Title = cards[4]?.title || scene.bento5_title || "Tiếp theo";
      const bento5Desc = cards[4]?.body || scene.bento5_desc || "Mở nguồn và kiểm chứng";
      html = `
        <div class="grid-layout-title">${title1}<br/><span style="color: #fdf01c">${title2}</span></div>
        <div class="feature-grid">
          <div class="feature-item" id="fi-${sceneId}-1">
            <div class="feature-icon-wrapper neon-green"><svg viewBox="0 0 24 24"><path d="M4 6h16M4 12h16M4 18h7"/></svg></div>
            <div class="feature-item-title">${bento1Title}</div>
            <div class="feature-item-subtitle">${bento1Desc}</div>
          </div>
          <div class="feature-item" id="fi-${sceneId}-2">
            <div class="feature-icon-wrapper neon-yellow"><svg viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg></div>
            <div class="feature-item-title">${bento2Title}</div>
            <div class="feature-item-subtitle">${bento2Desc}</div>
          </div>
          <div class="feature-item" id="fi-${sceneId}-3">
            <div class="feature-icon-wrapper neon-purple"><svg viewBox="0 0 24 24"><path d="M12 14v8H4a8 8 0 0 1 8-8zm0-1c-3.315 0-6-2.685-6-6s2.685-6 6-6 6 2.685 6 6-2.685 6-6 6zm9 4h1v5h-8v-5h7z"/></svg></div>
            <div class="feature-item-title">${bento3Title}</div>
            <div class="feature-item-subtitle">${bento3Desc}</div>
          </div>
          <div class="feature-item" id="fi-${sceneId}-4">
            <div class="feature-icon-wrapper neon-blue"><svg viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/></svg></div>
            <div class="feature-item-title">${bento4Title}</div>
            <div class="feature-item-subtitle">${bento4Desc}</div>
          </div>
          <div class="feature-item full-width" id="fi-${sceneId}-5">
            <div class="feature-icon-wrapper neon-green"><svg viewBox="0 0 24 24"><path d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z"/></svg></div>
            <div class="feature-item-title">${bento5Title}</div>
            <div class="feature-item-subtitle">${bento5Desc}</div>
          </div>
        </div>
      `;
      gsap = `
        tl.from(".grid-layout-title", { y: -20, opacity: 0, duration: 0.3, ease: "power3.out" }, ${start});
        tl.from("#fi-${sceneId}-1", { y: 20, opacity: 0, duration: 0.3, ease: "power3.out" }, ${start + 0.1});
        tl.from("#fi-${sceneId}-2", { y: 20, opacity: 0, duration: 0.3, ease: "power3.out" }, ${start + 0.15});
        tl.from("#fi-${sceneId}-3", { y: 20, opacity: 0, duration: 0.3, ease: "power3.out" }, ${start + 0.2});
        tl.from("#fi-${sceneId}-4", { y: 20, opacity: 0, duration: 0.3, ease: "power3.out" }, ${start + 0.25});
        tl.from("#fi-${sceneId}-5", { y: 20, opacity: 0, duration: 0.3, ease: "power3.out" }, ${start + 0.3});
      `;
      break;
    }

    case 2: {
      const title1 = scene.headline_line1 || "BA CÂU HỎI";
      const title2 = scene.headline_line2 || "PHẢI TRẢ LỜI";
      const cards = getSceneCards(scene, 3);
      const item1Title = cards[0]?.title || scene.bento1_title || "What";
      const item1Body = cards[0]?.body || scene.bento1_desc || "Định nghĩa vấn đề cơ bản";
      const item2Title = cards[1]?.title || scene.bento2_title || "Why";
      const item2Body = cards[1]?.body || scene.bento2_desc || "Lý do cốt lõi đáng quan tâm";
      const item3Title = cards[2]?.title || scene.bento3_title || "Check";
      const item3Body = cards[2]?.body || scene.bento3_desc || "Kiểm chứng trước khi áp dụng";
      html = `
        <div class="headline-container" style="top: 150px;">
          <div class="headline-line1" id="hl1-${sceneId}">${title1}</div>
          <div class="headline-line2" id="hl2-${sceneId}">${title2}</div>
        </div>
        <div class="timeline-container">
          <div class="timeline-item" id="ti-${sceneId}-1">
            <div class="timeline-left">
              <div class="timeline-icon"><svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg></div>
              <div class="timeline-line"></div>
            </div>
            <div class="timeline-right">
              <div class="timeline-title">${item1Title}</div>
              <div class="timeline-subtitle">${item1Body}</div>
            </div>
          </div>
          <div class="timeline-item" id="ti-${sceneId}-2">
            <div class="timeline-left">
              <div class="timeline-icon"><svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg></div>
              <div class="timeline-line"></div>
            </div>
            <div class="timeline-right">
              <div class="timeline-title">${item2Title}</div>
              <div class="timeline-subtitle">${item2Body}</div>
            </div>
          </div>
          <div class="timeline-item" id="ti-${sceneId}-3">
            <div class="timeline-left">
              <div class="timeline-icon active"><svg viewBox="0 0 24 24"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/></svg></div>
              <div class="timeline-line"></div>
            </div>
            <div class="timeline-right">
              <div class="timeline-title">${item3Title}</div>
              <div class="timeline-subtitle">${item3Body}</div>
            </div>
          </div>
        </div>
      `;
      gsap = `
        tl.from("#hl1-${sceneId}", { y: -20, opacity: 0, duration: 0.2, ease: "power3.out" }, ${start});
        tl.from("#hl2-${sceneId}", { y: 20, opacity: 0, duration: 0.2, ease: "power3.out" }, ${start});
        tl.from("#ti-${sceneId}-1", { x: -20, opacity: 0, duration: 0.3, ease: "power3.out" }, ${start + 0.1});
        tl.from("#ti-${sceneId}-2", { x: -20, opacity: 0, duration: 0.3, ease: "power3.out" }, ${start + 0.3});
        tl.from("#ti-${sceneId}-3", { x: -20, opacity: 0, duration: 0.3, ease: "power3.out" }, ${start + 0.5});
      `;
      break;
    }

    case 3: {
      const title1 = scene.headline_line1 || "ĐIỂM ĐÁNG CHÚ Ý";
      const title2 = scene.headline_line2 || "RÚT TỪ NGUỒN WEB";
      const cards = getSceneCards(scene, 3);
      const evidenceCards = cards.length > 0 ? cards : [
        { title: "Key point", body: "Tom tat diem dang chu y nhat tu nguon." },
        { title: "Evidence", body: "Can doi chieu voi trang goc truoc khi dung." },
        { title: "Limit", body: "Gia, API, quota co the thay doi theo thoi gian." },
      ];
      html = `
        <div class="metric-layout-title">${title1}<br/><span style="color: #fdf01c">${title2}</span></div>
        <div class="web-evidence-panel" style="position:absolute; top:455px; left:50%; transform:translateX(-50%); width:920px; z-index:30;">
          ${evidenceCards.slice(0, 3).map((card, idx) => `
          <div class="step-card" id="ev-${sceneId}-${idx + 1}" style="margin-bottom:24px;">
            <div class="step-number">${idx + 1}</div>
            <div>
              <div class="step-title">${card.title}</div>
              <div class="step-desc">${card.body}</div>
            </div>
          </div>`).join("")}
        </div>
      `;
      gsap = `
        tl.from(".metric-layout-title", { y: -20, opacity: 0, duration: 0.3, ease: "power3.out" }, ${start});
        ${evidenceCards.slice(0, 3).map((_, idx) =>
          `tl.from("#ev-${sceneId}-${idx + 1}", { y: 22, opacity: 0, duration: 0.2, ease: "power3.out" }, ${start + 0.1 + idx * 0.1});`
        ).join("\n        ")}
      `;
      break;
    }    case 4: {
      // Scene 5: Concrete next action
      const title1 = scene.headline_line1 || "HANH DONG TIEP";
      const title2 = scene.headline_line2 || "KIEM TRA NGUON";
      const btnText = escapeHtml(scene.btn_text || "Mo nguon va kiem chung");
      const cards = getSceneCards(scene, 3);
      const actionCards = cards.length > 0 ? cards : [
        { title: "Open", body: "Mo link goc de doi chieu noi dung." },
        { title: "Check", body: "Kiem tra ngay thang, gia va gioi han." },
        { title: "Test", body: "Thu mot vi du nho truoc khi ap dung." },
      ];
      html = `
        <div class="headline-container" style="top: 165px;">
          <div class="headline-line1" id="hl1-${sceneId}">${title1}</div>
          <div class="headline-line2" id="hl2-${sceneId}">${title2}</div>
        </div>
        <div class="web-action-panel" style="position:absolute; top:455px; left:50%; transform:translateX(-50%); width:920px; z-index:30;">
          ${actionCards.slice(0, 3).map((card, idx) => `
          <div class="step-card" id="act-${sceneId}-${idx + 1}" style="margin-bottom:24px;">
            <div class="step-number">${idx + 1}</div>
            <div>
              <div class="step-title">${card.title}</div>
              <div class="step-desc">${card.body}</div>
            </div>
          </div>`).join("")}
        </div>
        <div class="action-btn" id="btn-${sceneId}" style="top: 1235px; font-size: 28px; background: rgba(0,0,0,0.4); border: 2px solid #ff4757; box-shadow: 0 0 20px rgba(255, 71, 87, 0.3);">
          ${btnText}
        </div>
      `;
      gsap = `
        tl.from("#hl1-${sceneId}", { y: -20, opacity: 0, duration: 0.2, ease: "power3.out" }, ${start});
        tl.from("#hl2-${sceneId}", { y: 20, opacity: 0, duration: 0.2, ease: "power3.out" }, ${start});
        ${actionCards.slice(0, 3).map((_, idx) =>
          `tl.from("#act-${sceneId}-${idx + 1}", { y: 22, opacity: 0, duration: 0.2, ease: "power3.out" }, ${start + 0.1 + idx * 0.1});`
        ).join("\n        ")}
        tl.from("#btn-${sceneId}", { y: 20, opacity: 0, duration: 0.2, ease: "back.out(1.2)" }, ${start + 0.45});
      `;
      break;
    }
    case 5: {
      // Cảnh 6: Outro Web page summary
      const title1 = scene.headline_line1 || "LƯU LINK";
      const title2 = scene.headline_line2 || "KIỂM CHỨNG TRƯỚC KHI DÙNG";
      const cards = getSceneCards(scene, 4);
      const outroCards = cards.length > 0 ? cards : [
        { title: scene.bento1_title || "Nguon chinh", body: scene.bento1_desc || "Luu link goc de doi chieu." },
        { title: scene.bento2_title || "Tom tat", body: scene.bento2_desc || "Dung nhu diem bat dau." },
        { title: scene.bento3_title || "Kiem chung", body: scene.bento3_desc || "Doc lai pricing, ngay thang va gioi han." },
        { title: scene.bento4_title || "Ap dung", body: scene.bento4_desc || "Thu nho truoc khi rollout." },
      ];
      html = `
        <div class="headline-container" style="top: 185px;">
          <div class="headline-line1" id="hl1-${sceneId}">${title1}</div>
          <div class="headline-line2" id="hl2-${sceneId}">${title2}</div>
        </div>
        <div class="bento-container" style="top: 460px;" id="bento-${sceneId}">
          <div class="bento-grid-2">
            <div class="bento-card half" id="bc-${sceneId}-1" style="border: 2px solid rgba(255, 71, 87, 0.4); background: rgba(255, 71, 87, 0.02);">
              <div class="card-icon-svg" style="margin: 0 auto 15px auto; background: rgba(255,71,87,0.06); border: 2px solid rgba(255,71,87,0.25);">
                <svg viewBox="0 0 24 24" style="stroke: #ff4757; filter: drop-shadow(0 0 8px rgba(255,71,87,0.8));"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
              </div>
              <div class="card-title" style="font-size: 32px; text-align: center; color: #ff4757; font-weight: 800;">${outroCards[0].title}</div>
              <div class="card-desc" style="font-size: 20px; text-align: center; color: rgba(255,255,255,0.7); margin-top: 10px; max-width: 100%; word-break: break-word;">${outroCards[0].body}</div>
            </div>
            <div class="bento-card half" id="bc-${sceneId}-2" style="border: 2px solid rgba(255, 71, 87, 0.4); background: rgba(255, 71, 87, 0.02);">
              <div class="card-icon-svg" style="margin: 0 auto 15px auto; background: rgba(255,71,87,0.06); border: 2px solid rgba(255,71,87,0.25);">
                <svg viewBox="0 0 24 24" style="stroke: #ff4757; filter: drop-shadow(0 0 8px rgba(255,71,87,0.8));"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
              </div>
              <div class="card-title" style="font-size: 32px; text-align: center; color: #ff4757; font-weight: 800;">${outroCards[1].title}</div>
              <div class="card-desc" style="font-size: 20px; text-align: center; color: rgba(255,255,255,0.7); margin-top: 10px;">${outroCards[1].body}</div>
            </div>
          </div>
          <div class="bento-grid-2">
            <div class="bento-card half" id="bc-${sceneId}-3" style="border: 2px solid rgba(255, 71, 87, 0.4); background: rgba(255, 71, 87, 0.02);">
              <div class="card-icon-svg" style="margin: 0 auto 15px auto; background: rgba(255,71,87,0.06); border: 2px solid rgba(255,71,87,0.25);">
                <svg viewBox="0 0 24 24" style="stroke: #ff4757; filter: drop-shadow(0 0 8px rgba(255,71,87,0.8));"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
              </div>
              <div class="card-title" style="font-size: 32px; text-align: center; color: #ff4757; font-weight: 800;">${outroCards[2].title}</div>
              <div class="card-desc" style="font-size: 20px; text-align: center; color: rgba(255,255,255,0.7); margin-top: 10px;">${outroCards[2].body}</div>
            </div>
            <div class="bento-card half" id="bc-${sceneId}-4" style="border: 2px solid rgba(255, 71, 87, 0.4); background: rgba(255, 71, 87, 0.02);">
              <div class="card-icon-svg" style="margin: 0 auto 15px auto; background: rgba(255,71,87,0.06); border: 2px solid rgba(255,71,87,0.25);">
                <svg viewBox="0 0 24 24" style="stroke: #ff4757; filter: drop-shadow(0 0 8px rgba(255,71,87,0.8));"><path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.89 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/></svg>
              </div>
              <div class="card-title" style="font-size: 32px; text-align: center; color: #ff4757; font-weight: 800;">${outroCards[3].title}</div>
              <div class="card-desc" style="font-size: 20px; text-align: center; color: rgba(255,255,255,0.7); margin-top: 10px;">${outroCards[3].body}</div>
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

    case 6: {
      // Cảnh 7: Quick Start
      const title1 = scene.headline_line1 || "DOC NGUON";
      const title2 = scene.headline_line2 || "KIEM CHUNG TIEP";
      const btnText = scene.btn_text || "Mo link goc va doc chi tiet";
      html = `
        <div class="main-glow-icon" id="glow-${sceneId}">
          <div class="glow-svg-container">
            <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H7c0-2.76 2.24-5 5-5s5 2.24 5 5c0 1.04-.42 1.99-1.07 2.75z"/></svg>
          </div>
        </div>
        <div class="headline-container">
          <div class="headline-line1" id="hl1-${sceneId}">${title1}</div>
          <div class="headline-line2" id="hl2-${sceneId}">${title2}</div>
        </div>
        <div class="action-btn" id="btn-${sceneId}" style="font-family: monospace; font-size: 28px; background: rgba(0,0,0,0.4); border: 2px solid #00ff88;">
          ${btnText}
        </div>
      `;
      gsap = `
        tl.from("#glow-${sceneId}", { y: 30, duration: 0.3, ease: "back.out(1.2)" }, ${start});
        tl.from("#hl1-${sceneId}", { y: -20, duration: 0.2, ease: "power3.out" }, ${start});
        tl.from("#hl2-${sceneId}", { y: 20, duration: 0.2, ease: "power3.out" }, ${start});
        tl.from("#btn-${sceneId}", { y: 20, duration: 0.2, ease: "back.out(1.2)" }, ${start});
      `;
      break;
    }

    case 7: {
      // Cảnh 8: Outro Github Star
      const title1 = scene.headline_line1 || "ỦNG HỘ REPO";
      const title2 = scene.headline_line2 || "THẢ 1 SAO GITHUB NHÉ!";
      const bento1Title = scene.bento1_title || "Thả 1 Star";
      const bento2Title = scene.bento2_title || "Yêu thích";
      const bento3Title = scene.bento3_title || "Bình luận ngay";
      const bento4Title = scene.bento4_title || "Đăng ký kênh";
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
            </div>
            <div class="bento-card half" id="bc-${sceneId}-2" style="border: 2px solid rgba(255, 71, 87, 0.4); background: rgba(255, 71, 87, 0.02);">
              <div class="card-icon-svg" style="margin: 0 auto 15px auto; background: rgba(255,71,87,0.06); border: 2px solid rgba(255,71,87,0.25);">
                <svg viewBox="0 0 24 24" style="stroke: #ff4757; filter: drop-shadow(0 0 8px rgba(255,71,87,0.8));"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
              </div>
              <div class="card-title" style="font-size: 32px; text-align: center; color: #ff4757; font-weight: 800;">${bento2Title}</div>
            </div>
          </div>
          <div class="bento-grid-2">
            <div class="bento-card half" id="bc-${sceneId}-3" style="border: 2px solid rgba(0, 210, 255, 0.4); background: rgba(0, 210, 255, 0.02);">
              <div class="card-icon-svg" style="margin: 0 auto 15px auto; background: rgba(0,210,255,0.06); border: 2px solid rgba(0,210,255,0.25);">
                <svg viewBox="0 0 24 24" style="stroke: #00d2ff; filter: drop-shadow(0 0 8px rgba(0,210,255,0.8));"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
              </div>
              <div class="card-title" style="font-size: 32px; text-align: center; color: #00d2ff; font-weight: 800;">${bento3Title}</div>
            </div>
            <div class="bento-card half" id="bc-${sceneId}-4" style="border: 2px solid rgba(224, 86, 253, 0.4); background: rgba(224, 86, 253, 0.02);">
              <div class="card-icon-svg" style="margin: 0 auto 15px auto; background: rgba(224,86,253,0.06); border: 2px solid rgba(224,86,253,0.25);">
                <svg viewBox="0 0 24 24" style="stroke: #e056fd; filter: drop-shadow(0 0 8px rgba(224,86,253,0.8));"><path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.89 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/></svg>
              </div>
              <div class="card-title" style="font-size: 32px; text-align: center; color: #e056fd; font-weight: 800;">${bento4Title}</div>
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
