import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

async function main() {
  const outDir = path.resolve(process.cwd(), "docs/screens");
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const browser = await chromium.launch();
  const context = await browser.newContext();
  const baseUrl = "http://localhost:5173";

  console.log("Navigating to app on " + baseUrl);

  // 1. Home desktop (1280x800)
  const pageDesktop = await context.newPage();
  await pageDesktop.setViewportSize({ width: 1280, height: 800 });
  await pageDesktop.goto(`${baseUrl}/`, { waitUntil: "networkidle" });
  await pageDesktop.screenshot({ path: path.join(outDir, "home-desktop.png"), fullPage: true });
  console.log("✓ Captured home-desktop.png");

  // 2. Home mobile (360x740)
  const pageMobile = await context.newPage();
  await pageMobile.setViewportSize({ width: 360, height: 740 });
  await pageMobile.goto(`${baseUrl}/`, { waitUntil: "networkidle" });
  await pageMobile.screenshot({ path: path.join(outDir, "home-360.png"), fullPage: true });
  console.log("✓ Captured home-360.png");

  // 3. Plan desktop
  await pageDesktop.goto(`${baseUrl}/plan`, { waitUntil: "networkidle" });
  await pageDesktop.screenshot({ path: path.join(outDir, "plan-desktop.png"), fullPage: true });
  console.log("✓ Captured plan-desktop.png");

  // 4. Plan mobile
  await pageMobile.goto(`${baseUrl}/plan`, { waitUntil: "networkidle" });
  await pageMobile.screenshot({ path: path.join(outDir, "plan-360.png"), fullPage: true });
  console.log("✓ Captured plan-360.png");

  // 5. Results scenarios: normal, slow, partial, sparse-data
  const scenarios = ["normal", "slow", "partial", "sparse-data"];
  for (const sc of scenarios) {
    const targetUrl =
      sc === "sparse-data"
        ? `${baseUrl}/results?city=Bengaluru&wpName=Manyata+Tech+Park&wpLat=13.0489&wpLon=77.62&mode=car&maxCommute=90&budgetMax=60000&budgetMin=20000&household=balanced&priority=commute`
        : `${baseUrl}/results`;

    // Desktop
    await pageDesktop.goto(`${baseUrl}/`, { waitUntil: "domcontentloaded" });
    await pageDesktop.evaluate((s) => {
      window.localStorage.setItem("locus_mock_scenario", s);
    }, sc);
    await pageDesktop.goto(targetUrl, { waitUntil: "domcontentloaded" });
    await pageDesktop.waitForTimeout(sc === "slow" ? 1500 : 900);
    await pageDesktop.screenshot({ path: path.join(outDir, `results-${sc}-desktop.png`), fullPage: false });
    console.log(`✓ Captured results-${sc}-desktop.png`);

    // Mobile
    await pageMobile.goto(`${baseUrl}/`, { waitUntil: "domcontentloaded" });
    await pageMobile.evaluate((s) => {
      window.localStorage.setItem("locus_mock_scenario", s);
    }, sc);
    await pageMobile.goto(targetUrl, { waitUntil: "domcontentloaded" });
    await pageMobile.waitForTimeout(sc === "slow" ? 1500 : 900);
    await pageMobile.screenshot({ path: path.join(outDir, `results-${sc}-360.png`), fullPage: false });
    console.log(`✓ Captured results-${sc}-360.png`);
  }

  // 6. Results with Map toggle on desktop
  await pageDesktop.goto(`${baseUrl}/`, { waitUntil: "domcontentloaded" });
  await pageDesktop.evaluate(() => {
    window.localStorage.setItem("locus_mock_scenario", "normal");
  });
  await pageDesktop.goto(`${baseUrl}/results`, { waitUntil: "domcontentloaded" });
  await pageDesktop.waitForTimeout(900);
  const mapBtn = pageDesktop.locator('[data-feature="view-toggle"] button:has-text("Map")');
  if (await mapBtn.isVisible()) {
    await mapBtn.click();
    await pageDesktop.waitForTimeout(500);
    await pageDesktop.screenshot({ path: path.join(outDir, "results-map-view-desktop.png"), fullPage: false });
    console.log("✓ Captured results-map-view-desktop.png");
  }

  await browser.close();
  console.log("All screenshots captured successfully.");
}

main().catch((err) => {
  console.error("Screenshot capture failed:", err);
  process.exit(1);
});
