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

  // 7. Area Detail desktop & mobile (/area/node%2F429918282)
  const areaUrl = `${baseUrl}/area/node%2F429918282`;
  await pageDesktop.goto(areaUrl, { waitUntil: "domcontentloaded" });
  await pageDesktop.waitForTimeout(700);
  await pageDesktop.screenshot({ path: path.join(outDir, "area-desktop.png"), fullPage: true });
  console.log("✓ Captured area-desktop.png");

  await pageMobile.goto(areaUrl, { waitUntil: "domcontentloaded" });
  await pageMobile.waitForTimeout(700);
  await pageMobile.screenshot({ path: path.join(outDir, "area-360.png"), fullPage: true });
  console.log("✓ Captured area-360.png");

  // 8. Method screen desktop & mobile (/method)
  const methodUrl = `${baseUrl}/method`;
  await pageDesktop.goto(methodUrl, { waitUntil: "domcontentloaded" });
  await pageDesktop.waitForTimeout(700);
  await pageDesktop.screenshot({ path: path.join(outDir, "method-desktop.png"), fullPage: true });
  console.log("✓ Captured method-desktop.png");

  await pageMobile.goto(methodUrl, { waitUntil: "domcontentloaded" });
  await pageMobile.waitForTimeout(700);
  await pageMobile.screenshot({ path: path.join(outDir, "method-360.png"), fullPage: true });
  console.log("✓ Captured method-360.png");

  // 9. Compare screen desktop & mobile (/compare?ids=node%2F429918282,relation%2F19883335,way%2F88219472)
  const compareUrl = `${baseUrl}/compare?ids=node%2F429918282,relation%2F19883335,way%2F88219472`;
  await pageDesktop.goto(compareUrl, { waitUntil: "domcontentloaded" });
  await pageDesktop.waitForTimeout(700);
  await pageDesktop.screenshot({ path: path.join(outDir, "compare-desktop.png"), fullPage: true });
  console.log("✓ Captured compare-desktop.png");

  await pageMobile.goto(compareUrl, { waitUntil: "domcontentloaded" });
  await pageMobile.waitForTimeout(700);
  await pageMobile.screenshot({ path: path.join(outDir, "compare-360.png"), fullPage: true });
  console.log("✓ Captured compare-360.png");

  // 10. Saved screen desktop & mobile (/saved)
  // Pre-seed localStorage with saved areas
  await pageDesktop.evaluate(() => {
    window.localStorage.setItem("locus_saved_areas", JSON.stringify(["node/429918282", "relation/19883335", "way/88219472"]));
  });
  await pageMobile.evaluate(() => {
    window.localStorage.setItem("locus_saved_areas", JSON.stringify(["node/429918282", "relation/19883335", "way/88219472"]));
  });

  const savedUrl = `${baseUrl}/saved`;
  await pageDesktop.goto(savedUrl, { waitUntil: "domcontentloaded" });
  await pageDesktop.waitForTimeout(700);
  await pageDesktop.screenshot({ path: path.join(outDir, "saved-desktop.png"), fullPage: true });
  console.log("✓ Captured saved-desktop.png");

  await pageMobile.goto(savedUrl, { waitUntil: "domcontentloaded" });
  await pageMobile.waitForTimeout(700);
  await pageMobile.screenshot({ path: path.join(outDir, "saved-360.png"), fullPage: true });
  console.log("✓ Captured saved-360.png");

  // 11. Tablet Viewport Pass (768x1024)
  const pageTablet = await context.newPage();
  await pageTablet.setViewportSize({ width: 768, height: 1024 });

  await pageTablet.goto(`${baseUrl}/`, { waitUntil: "networkidle" });
  await pageTablet.screenshot({ path: path.join(outDir, "home-768.png"), fullPage: true });
  console.log("✓ Captured home-768.png");

  await pageTablet.goto(`${baseUrl}/plan`, { waitUntil: "networkidle" });
  await pageTablet.screenshot({ path: path.join(outDir, "plan-768.png"), fullPage: true });
  console.log("✓ Captured plan-768.png");

  await pageTablet.goto(`${baseUrl}/results`, { waitUntil: "domcontentloaded" });
  await pageTablet.waitForTimeout(900);
  await pageTablet.screenshot({ path: path.join(outDir, "results-768.png"), fullPage: false });
  console.log("✓ Captured results-768.png");

  await pageTablet.goto(areaUrl, { waitUntil: "domcontentloaded" });
  await pageTablet.waitForTimeout(700);
  await pageTablet.screenshot({ path: path.join(outDir, "area-768.png"), fullPage: true });
  console.log("✓ Captured area-768.png");

  await pageTablet.goto(compareUrl, { waitUntil: "domcontentloaded" });
  await pageTablet.waitForTimeout(700);
  await pageTablet.screenshot({ path: path.join(outDir, "compare-768.png"), fullPage: true });
  console.log("✓ Captured compare-768.png");

  await pageTablet.evaluate(() => {
    window.localStorage.setItem("locus_saved_areas", JSON.stringify(["node/429918282", "relation/19883335", "way/88219472"]));
  });
  await pageTablet.goto(savedUrl, { waitUntil: "domcontentloaded" });
  await pageTablet.waitForTimeout(700);
  await pageTablet.screenshot({ path: path.join(outDir, "saved-768.png"), fullPage: true });
  console.log("✓ Captured saved-768.png");

  // 12. Dark Mode Screen Captures (Token Swap Verification)
  await pageDesktop.evaluate(() => {
    window.localStorage.setItem("locus_theme", "dark");
    document.documentElement.setAttribute("data-theme", "dark");
  });
  await pageDesktop.waitForTimeout(400);
  await pageDesktop.screenshot({ path: path.join(outDir, "results-dark-desktop.png"), fullPage: false });
  console.log("✓ Captured results-dark-desktop.png");

  await pageMobile.evaluate(() => {
    window.localStorage.setItem("locus_theme", "dark");
    document.documentElement.setAttribute("data-theme", "dark");
  });
  await pageMobile.waitForTimeout(400);
  await pageMobile.screenshot({ path: path.join(outDir, "results-dark-360.png"), fullPage: false });
  console.log("✓ Captured results-dark-360.png");

  await browser.close();
  console.log("All screenshots captured successfully.");
}

main().catch((err) => {
  console.error("Screenshot capture failed:", err);
  process.exit(1);
});
