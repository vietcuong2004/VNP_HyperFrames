export function getHyperframesReviewScene(i, scene, sceneId, start) {
  let html = "";
  let gsap = "";

  switch (i) {
    case 0: {
      // Cảnh 1: Giới thiệu HyperFrames
      const repoUrl = scene.repo_url || "github.com/heygen-com/hyperframes";
      const headlineLine1 = scene.headline_line1 || "HYPERFRAMES";
      const headlineLine2 = scene.headline_line2 || "ĐỘT PHÁ RENDER VIDEO BẰNG HTML";
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
      const title1 = scene.headline_line1 || "NGUYÊN LÝ";
      const title2 = scene.headline_line2 || "VIẾT HTML RENDER MP4";
      const bento1Title = scene.bento1_title || "Mã nguồn HTML sạch";
      const bento1Desc =
        scene.bento1_desc || `&lt;div class="clip" data-start="0" data-duration="5"&gt;`;
      const bento2Title = scene.bento2_title || "Xem trước lập tức";
      const bento3Title = scene.bento3_title || "Xuất MP4 cực nét";
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
            </div>
            <div class="bento-card half" id="bc-${sceneId}-3">
              <div class="card-icon-svg" style="margin: 0 auto 15px auto;">
                <svg viewBox="0 0 24 24"><path d="M19 12v7H5v-7H3v7c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2v-7h-2zm-6 .67l2.59-2.58L17 11.5l-5 5-5-5 1.41-1.41L11 12.67V3h2v9.67z"/></svg>
              </div>
              <div class="card-title" style="font-size: 32px; text-align: center;">${bento3Title}</div>
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
      const bento1Title = scene.bento1_title || "Phân tích Real-time";
      const bento2Title = scene.bento2_title || "Tranh biện chốt lệnh";
      const bento3Title = scene.bento3_title || "API độ trễ cực thấp";
      const bento4Title = scene.bento4_title || "Quản trị rủi ro AI";
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
            </div>
            <div class="bento-card half" id="bc-${sceneId}-2" style="flex-direction: column; align-items: center; justify-content: center; padding: 30px;">
              <div class="card-icon-svg" style="margin: 0 0 20px 0;">
                <svg viewBox="0 0 24 24"><path d="M5.2 18.2l-2.4-2.4c-.6-.6-.6-1.6 0-2.2l3.4-3.4c.6-.6 1.6-.6 2.2 0l2.4 2.4c.6.6.6 1.6 0 2.2l-3.4 3.4c-.6.6-1.6.6-2.2 0zM19.6 3.8c-.8-.8-2-.8-2.8 0l-7.1 7.1c-.8.8-.8 2 0 2.8l1.4 1.4c.8.8 2 .8 2.8 0l7.1-7.1c.8-.8.8-2 0-2.8l-1.4-1.4zM7.5 13.5l3 3M17 11.5l-4.5-4.5"/></svg>
              </div>
              <div class="card-title" style="font-size: 30px; font-weight: 700; text-align: center;">${bento2Title}</div>
            </div>
          </div>
          <div class="bento-grid-2">
            <div class="bento-card half" id="bc-${sceneId}-3" style="flex-direction: column; align-items: center; justify-content: center; padding: 30px;">
              <div class="card-icon-svg" style="margin: 0 0 20px 0;">
                <svg viewBox="0 0 24 24"><path d="M11 21h-1l1-7H7.5c-.88 0-1.4-.8-1.05-1.57L11.5 3h1l-1 7h3.5c.88 0 1.4.8 1.05 1.57L11 21z"/></svg>
              </div>
              <div class="card-title" style="font-size: 30px; font-weight: 700; text-align: center;">${bento3Title}</div>
            </div>
            <div class="bento-card half" id="bc-${sceneId}-4" style="flex-direction: column; align-items: center; justify-content: center; padding: 30px;">
              <div class="card-icon-svg" style="margin: 0 0 20px 0;">
                <svg viewBox="0 0 24 24"><path d="M12 2L4 5v6.09c0 5.05 3.41 9.76 8 10.91 4.59-1.15 8-5.86 8-10.91V5l-8-3zm0 2.18c3.55 1 6 4.3 6 7.91 0 3.86-2.61 7.42-6 8.71V4.18z"/></svg>
              </div>
              <div class="card-title" style="font-size: 30px; font-weight: 700; text-align: center;">${bento4Title}</div>
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
      const title1 = scene.headline_line1 || "DETERMINISTIC";
      const title2 = scene.headline_line2 || "RENDER SIÊU ỔN ĐỊNH";
      const btnText = scene.btn_text || "Khớp hình & Tiếng 100%";
      html = `
        <div class="main-glow-icon" id="glow-${sceneId}">
          <div class="glow-svg-container">
            <svg viewBox="0 0 24 24"><path d="M6 2v6h.01L6 8.01 10 12l-4 4 .01.01H6V22h12v-5.99h-.01L18 16l-4-4 4-3.99-.01-.01H18V2H6zm10 14.5V20H8v-3.5l4-4 4 4zm-4-5l-4-4V4h8v3.5l-4 4z"/></svg>
          </div>
        </div>
        <div class="headline-container">
          <div class="headline-line1" id="hl1-${sceneId}">${title1}</div>
          <div class="headline-line2" id="hl2-${sceneId}">${title2}</div>
        </div>
        <div class="action-btn" id="btn-${sceneId}">
          <span class="action-icon">✓</span> ${btnText}
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

    case 4: {
      // Cảnh 5: Frame Adapter Pattern
      const title1 = scene.headline_line1 || "ADAPTER PATTERN";
      const title2 = scene.headline_line2 || "ĐA DẠNG ANIMATION";
      const bento1Title = scene.bento1_title || "GSAP Timeline";
      const bento1Desc = scene.bento1_desc || "Cơ chế đồng bộ timeline paused cực mạnh mẽ";
      const bento2Title = scene.bento2_title || "ThreeJS 3D";
      const bento3Title = scene.bento3_title || "Lottie & Anime";
      html = `
        <div class="headline-container" style="top: 185px;">
          <div class="headline-line1" id="hl1-${sceneId}">${title1}</div>
          <div class="headline-line2" id="hl2-${sceneId}">${title2}</div>
        </div>
        <div class="bento-container" style="top: 525px;" id="bento-${sceneId}">
          <div class="bento-card full" id="bc-${sceneId}-1">
            <div class="card-icon-svg">
              <svg viewBox="0 0 24 24"><path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z"/></svg>
            </div>
            <div class="card-text-group">
              <div class="card-title">${bento1Title}</div>
              <div class="card-desc">${bento1Desc}</div>
            </div>
          </div>
          <div class="bento-grid-2">
            <div class="bento-card half" id="bc-${sceneId}-2">
              <div class="card-icon-svg" style="margin: 0 auto 15px auto;">🪐</div>
              <div class="card-title" style="font-size: 32px; text-align: center;">${bento2Title}</div>
            </div>
            <div class="bento-card half" id="bc-${sceneId}-3">
              <div class="card-icon-svg" style="margin: 0 auto 15px auto;">🎬</div>
              <div class="card-title" style="font-size: 32px; text-align: center;">${bento3Title}</div>
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

    case 5: {
      // Cảnh 6: Hyperframes vs Remotion
      const title1 = scene.headline_line1 || "HYPERFRAMES VS REMOTION";
      const title2 = scene.headline_line2 || "MÃ NGUỒN MỞ HOÀN TOÀN";
      const repoName = scene.repo_name || "heygen-com / hyperframes";
      const repoLang = scene.repo_lang || "TypeScript";
      const repoStars = scene.repo_stars || "★ 12,890";
      const repoTrend = scene.repo_trend || "▲ 1,500";
      const repoTrendLabel = scene.repo_trend_label || "today";
      html = `
        <div class="headline-container" style="top: 160px; gap: 5px;">
          <div class="headline-line1" style="font-size: 50px;">${title1}</div>
          <div class="headline-line2" style="font-size: 50px;">${title2}</div>
        </div>
        <div class="bento-container" style="top: 375px; width: 960px;" id="bento-${sceneId}">
          <div class="repo-badge" id="rb-${sceneId}">
            <div class="crown-container">
              <svg class="crown-svg" viewBox="0 0 24 24"><path d="M5 16L3 5l5 5 4-7 4 7 5-5-2 11H5zm14 3c0 .55-.45 1-1 1H6c-.55 0-1-.45-1-1v-1h14v1z"/></svg>
              <div class="rank-text">#1</div>
            </div>
            <div class="repo-info">
              <div class="repo-name">${repoName}</div>
              <div class="repo-meta">
                <span class="meta-dot"></span>
                <span>${repoLang}</span>
                <span>${repoStars}</span>
              </div>
            </div>
            <div class="repo-trend">
              <span>${repoTrend}</span>
              <span class="trend-label">${repoTrendLabel}</span>
            </div>
          </div>

          <div class="financial-chart" id="fc-${sceneId}">
            <div class="chart-trendline"></div>
            
            <div class="robot-badge" style="bottom: 180px; left: 160px;">
              <svg viewBox="0 0 24 24"><path d="M19 8h-1V7c0-1.1-.9-2-2-2h-3V3c0-.55-.45-1-1-1s-1 .45-1 .45v2.55H8c-1.1 0-2 .9-2 2v1H5c-1.1 0-2 .9-2 2v3c0 1.1.9 2 2 2h1v2c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2v-2h1c1.1 0 2-.9 2-2v-3c0-1.1-.9-2-2-2zM9 13c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm6 0c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1z"/></svg>
            </div>

            <div class="candlestick bullish">
              <div class="candlestick-wick" style="height: 180px;"></div>
              <div class="candlestick-body" style="height: 110px;"></div>
            </div>
            
            <div class="candlestick bearish">
              <div class="candlestick-wick" style="height: 140px;"></div>
              <div class="candlestick-body" style="height: 60px;"></div>
            </div>

            <div class="robot-badge" style="bottom: 230px; right: 220px;">
              <svg viewBox="0 0 24 24"><path d="M19 8h-1V7c0-1.1-.9-2-2-2h-3V3c0-.55-.45-1-1-1s-1 .45-1 .45v2.55H8c-1.1 0-2 .9-2 2v1H5c-1.1 0-2 .9-2 2v3c0 1.1.9 2 2 2h1v2c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2v-2h1c1.1 0 2-.9 2-2v-3c0-1.1-.9-2-2-2zM9 13c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm6 0c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1z"/></svg>
            </div>

            <div class="candlestick bullish">
              <div class="candlestick-wick" style="height: 240px;"></div>
              <div class="candlestick-body" style="height: 160px; background: #00ff88; box-shadow: 0 0 35px rgba(0,255,136,0.6);"></div>
            </div>
          </div>
        </div>
      `;
      gsap = `
        tl.from("#rb-${sceneId}", { y: -20, duration: 0.2, ease: "power3.out" }, ${start});
        tl.from("#fc-${sceneId}", { y: 20, duration: 0.2, ease: "power3.out" }, ${start});
        tl.from(".candlestick", { y: 20, stagger: 0.02, duration: 0.2, ease: "power3.out" }, ${start});
        tl.from(".robot-badge", { y: 15, stagger: 0.02, duration: 0.2, ease: "power3.out" }, ${start});
      `;
      break;
    }

    case 6: {
      // Cảnh 7: Quick Start
      const title1 = scene.headline_line1 || "KÍCH HOẠT NHANH";
      const title2 = scene.headline_line2 || "NPX HYPERFRAMES INIT";
      const btnText = scene.btn_text || "$ npx hyperframes init my-video";
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
