import { chromium } from "playwright";
import { preview } from "vite";
import fs from "node:fs";
import path from "node:path";

async function main() {
  const outDir = path.resolve(process.cwd(), "docs/screens");
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  // Spin up Vite preview server to serve production build (clean UI without dev switcher)
  const server = await preview({
    preview: { port: 4173 },
  });
  const address = server.httpServer?.address();
  const port = typeof address === "object" && address ? address.port : 4173;
  const baseUrl = `http://localhost:${port}`;
  console.log(`Vite preview server running at ${baseUrl}`);

  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  });

  try {
    const page = await context.newPage();

    // 1. Home Desktop (snapshot demo mode)
    await page.goto(`${baseUrl}/?engine=snapshot`, { waitUntil: "networkidle" });
    await page.waitForTimeout(300);
    const homePath = path.join(outDir, "home-desktop.png");
    await page.screenshot({ path: homePath, fullPage: false });
    console.log(`✓ Saved ${homePath}`);

    // 2. Results Desktop with Map Split View (snapshot demo mode)
    await page.goto(`${baseUrl}/results?engine=snapshot`, { waitUntil: "networkidle" });
    await page.waitForTimeout(800);
    // Click "Map" toggle if available
    const mapToggle = page.locator('[data-feature="view-toggle"] button:has-text("Map")');
    if (await mapToggle.isVisible()) {
      await mapToggle.click();
      await page.waitForTimeout(500);
    }
    const heroPath = path.join(outDir, "hero-results-desktop.png");
    await page.screenshot({ path: heroPath, fullPage: false });
    console.log(`✓ Saved ${heroPath}`);

    // 3. Area Detail Desktop (node/1234001)
    await page.goto(`${baseUrl}/area/node%2F1234001?engine=snapshot`, { waitUntil: "networkidle" });
    await page.waitForTimeout(600);
    const areaPath = path.join(outDir, "area-desktop.png");
    await page.screenshot({ path: areaPath, fullPage: false });
    console.log(`✓ Saved ${areaPath}`);

    // 4. Method / Transparency Desktop
    await page.goto(`${baseUrl}/method?engine=snapshot`, { waitUntil: "networkidle" });
    await page.waitForTimeout(600);
    const methodPath = path.join(outDir, "method-desktop.png");
    await page.screenshot({ path: methodPath, fullPage: false });
    console.log(`✓ Saved ${methodPath}`);

    await page.close();
  } finally {
    await browser.close();
    await server.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
