import puppeteer from "puppeteer";
import fs from "fs";
import path from "path";

function writeTransparentPng(filePath) {
  const transparentPng = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAFgwJ/lK3QGQAAAABJRU5ErkJggg==",
    "base64",
  );
  fs.writeFileSync(filePath, transparentPng);
}

async function cleanChrome(page) {
  await page.addStyleTag({
    content: `
      header,
      footer,
      .js-signup-banner,
      .js-cookie-consent-banner,
      .CookieConsent,
      .Banner-banner,
      .unsupported-browser,
      #bottom-sticky-banner {
        display: none !important;
      }
    `,
  });
}

async function captureStarScreenshot(page, targetUrl, starOutputPath) {
  await page.setViewport({
    width: 1365,
    height: 1600,
    deviceScaleFactor: 2,
  });
  await page.setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
  );
  await page.goto(targetUrl, {
    waitUntil: "networkidle2",
    timeout: 60000,
  });
  await cleanChrome(page);
  await page.evaluate(() => new Promise((resolve) => setTimeout(resolve, 1200)));

  const clip = await page.evaluate(() => {
    const counter = document.querySelector("#repo-stars-counter-star");
    const starLink = counter?.closest('li, .d-inline-flex, .pagehead-actions')
      || document.querySelector('a[href$="/stargazers"]')?.closest('li, .d-inline-flex, .pagehead-actions')
      || document.querySelector('a[href$="/stargazers"]');
    const rect = starLink?.getBoundingClientRect();
    if (!rect || rect.width < 24 || rect.height < 18) return null;
    return {
      x: Math.max(0, rect.x - 18),
      y: Math.max(0, rect.y - 14),
      width: Math.min(window.innerWidth - Math.max(0, rect.x - 18), rect.width + 36),
      height: Math.min(window.innerHeight - Math.max(0, rect.y - 14), rect.height + 28),
    };
  });

  if (!clip) return false;
  await page.screenshot({
    path: starOutputPath,
    clip,
  });
  console.log(`Da chup vung GitHub star vao ${starOutputPath}.`);
  return true;
}

async function capture() {
  console.log("Đang mở trình duyệt headless bằng Puppeteer...");
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();

  // Emulate light mode
  await page.emulateMediaFeatures([{ name: "prefers-color-scheme", value: "light" }]);

  // Emulate beautiful mobile viewport (vertical aspect ratio matching mobile screen)
  await page.setViewport({
    width: 640,
    height: 3800,
    deviceScaleFactor: 2, // Double scale factor for ultra-crisp retina vector fonts!
  });

  // Emulate mobile Safari User-Agent
  await page.setUserAgent(
    "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1",
  );

  const targetUrl = process.argv[2] || "https://github.com/heygen-com/hyperframes";
  console.log(`Đang mở trang ${targetUrl}...`);

  await page.goto(targetUrl, {
    waitUntil: "networkidle2",
    timeout: 60000,
  });

  console.log("Đang ẩn header/footer/banner để ảnh chụp sạch hơn...");
  // Clean up standard GitHub/Docker Hub header/footers for a premium native look
  await cleanChrome(page);

  // Extra wait to let fonts and UI components render completely
  await page.evaluate(() => new Promise((resolve) => setTimeout(resolve, 3000)));

  // Ensure output directory exists
  const outputPath = process.env.SCREENSHOT_PATH || path.join(process.cwd(), "assets", "images", "github_repo.png");
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  console.log(`Đang chụp ảnh màn hình vào ${outputPath}...`);

  await page.screenshot({
    path: outputPath,
    fullPage: false, // Capturing the 640x3800 defined canvas which is already extremely long!
  });

  const starOutputPath = process.env.STAR_SCREENSHOT_PATH || path.join(process.cwd(), "assets", "images", "github_star.png");
  const starDir = path.dirname(starOutputPath);
  if (!fs.existsSync(starDir)) {
    fs.mkdirSync(starDir, { recursive: true });
  }

  if (targetUrl.includes("github.com")) {
    await captureStarScreenshot(page, targetUrl, starOutputPath);
  }

  if (!fs.existsSync(starOutputPath)) {
    writeTransparentPng(starOutputPath);
    console.log(`Khong tim thay vung GitHub star rieng, da tao placeholder trong suot tai ${starOutputPath}.`);
  }

  console.log("Đã chụp và lưu ảnh thành công.");
  await browser.close();
}

capture().catch((err) => {
  console.error("Chụp ảnh thất bại:", err);
  process.exit(1);
});
