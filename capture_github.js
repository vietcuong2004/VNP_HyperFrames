import puppeteer from "puppeteer";
import fs from "fs";
import path from "path";

async function capture() {
  console.log("Launching headless browser with Puppeteer...");
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();

  // Emulate dark mode
  await page.emulateMediaFeatures([{ name: "prefers-color-scheme", value: "dark" }]);

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
  console.log(`Navigating to ${targetUrl}...`);

  await page.goto(targetUrl, {
    waitUntil: "networkidle2",
    timeout: 60000,
  });

  console.log("Injecting clean layout overrides (hiding banners, footers and headers)...");
  // Clean up standard GitHub mobile header/footers for a premium native look
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
      body {
        background-color: #0d1117 !important;
      }
    `,
  });

  // Extra wait to let fonts and UI components render completely
  await page.evaluate(() => new Promise((resolve) => setTimeout(resolve, 3000)));

  // Ensure output directory exists
  const dir = path.join(process.cwd(), "assets", "images");
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const outputPath = path.join(dir, "github_repo.png");
  console.log(`Capturing crisp full-page screenshot to ${outputPath}...`);

  await page.screenshot({
    path: outputPath,
    fullPage: false, // Capturing the 640x3800 defined canvas which is already extremely long!
  });

  console.log("Successfully captured and saved!");
  await browser.close();
}

capture().catch((err) => {
  console.error("Capture failed:", err);
  process.exit(1);
});
