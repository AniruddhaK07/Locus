import { chromium } from "playwright";
import { createServer } from "vite";
import fs from "node:fs";
import path from "node:path";

async function main() {
  const outDir = path.resolve(process.cwd(), "docs/screens");
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  // Spin up Vite dev server programmatically on port 5173
  const server = await createServer({
    server: { port: 5173 },
  });
  await server.listen();
  const address = server.httpServer?.address();
  const port = typeof address === "object" && address ? address.port : 5173;
  const baseUrl = `http://localhost:${port}`;
  console.log(`Vite server running at ${baseUrl}`);

  const browser = await chromium.launch();

  try {
    const viewports = [
      { name: "desktop", width: 1280, height: 800 },
      { name: "mobile", width: 360, height: 740 },
    ];

    const themes: Array<"light" | "dark"> = ["light", "dark"];

    for (const vp of viewports) {
      for (const theme of themes) {
        const page = await browser.newPage();
        await page.setViewportSize({ width: vp.width, height: vp.height });

        // Go to home page
        await page.goto(`${baseUrl}/`, { waitUntil: "networkidle" });

        // Set theme explicitly
        await page.evaluate((t) => {
          document.documentElement.setAttribute("data-theme", t);
          window.localStorage.setItem("locus_theme", t);
        }, theme);
        await page.waitForTimeout(200);

        // Header element screenshot
        const header = page.locator(".locus-header");
        const headerPath = path.join(outDir, `header-${vp.name}-${theme}.png`);
        await header.screenshot({ path: headerPath });
        console.log(`✓ Saved ${headerPath}`);

        // Footer element screenshot
        const footer = page.locator(".locus-footer");
        const footerPath = path.join(outDir, `footer-${vp.name}-${theme}.png`);
        await footer.screenshot({ path: footerPath });
        console.log(`✓ Saved ${footerPath}`);

        await page.close();
      }
    }
  } finally {
    await browser.close();
    await server.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
