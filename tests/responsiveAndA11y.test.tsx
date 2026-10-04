import { describe, it, expect } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import fs from "node:fs";
import path from "node:path";
import { ModeBanner } from "../src/ui/primitives/ModeBanner";
import { isDevMode } from "../src/ui/utils/dev";

// WCAG 2.2 Relative Luminance & Contrast Formula
function relativeLuminance(hex: string): number {
  const cleanHex = hex.replace("#", "");
  const r = parseInt(cleanHex.substring(0, 2), 16) / 255;
  const g = parseInt(cleanHex.substring(2, 4), 16) / 255;
  const b = parseInt(cleanHex.substring(4, 6), 16) / 255;

  const sRGB = [r, g, b].map((val) => {
    return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
  });

  return 0.2126 * sRGB[0] + 0.7152 * sRGB[1] + 0.0722 * sRGB[2];
}

function contrastRatio(hex1: string, hex2: string): number {
  const lum1 = relativeLuminance(hex1);
  const lum2 = relativeLuminance(hex2);
  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);
  return (lighter + 0.05) / (darker + 0.05);
}

describe("Phase U5: Polish, Accessibility, Reduced Motion & Production Resilience", () => {
  it("verifies ModeBanner behavior across mock, snapshot, and live modes", () => {
    // 1. Mock Mode
    const htmlMock = renderToString(React.createElement(ModeBanner, { mode: "mock" }));
    expect(htmlMock).toContain('data-feature="mode-banner"');
    expect(htmlMock).toContain('data-engine-mode="mock"');
    expect(htmlMock).toContain("Sample data");

    // 2. Snapshot Mode with captured date
    const testDate = "2026-10-04T12:00:00Z";
    const htmlSnapshot = renderToString(React.createElement(ModeBanner, { mode: "snapshot", capturedDate: testDate }));
    expect(htmlSnapshot).toContain('data-feature="mode-banner"');
    expect(htmlSnapshot).toContain('data-engine-mode="snapshot"');
    expect(htmlSnapshot).toContain("Recorded demo data");

    // 3. Live Mode (quiet, returns null per §5)
    const htmlLive = renderToString(React.createElement(ModeBanner, { mode: "live" }));
    expect(htmlLive).toBe("");
  });

  it("verifies developer tools gating mechanism (isDevMode)", () => {
    // In node/SSR test environment without window, isDevMode defaults safely
    expect(typeof isDevMode()).toBe("boolean");
  });

  it("verifies reduced-motion rules in reset.css zero out animations and transforms", () => {
    const resetCssPath = path.resolve(process.cwd(), "src/ui/styles/reset.css");
    const content = fs.readFileSync(resetCssPath, "utf-8");

    expect(content).toContain("@media (prefers-reduced-motion: reduce)");
    expect(content).toContain("animation-duration: 0.01ms !important");
    expect(content).toContain("transition-duration: 0.01ms !important");
    expect(content).toContain("transform: none !important");
  });

  it("verifies visible focus ring indicators in reset.css", () => {
    const resetCssPath = path.resolve(process.cwd(), "src/ui/styles/reset.css");
    const content = fs.readFileSync(resetCssPath, "utf-8");

    expect(content).toContain(":focus-visible");
    expect(content).toContain("outline: var(--focus-ring-width) solid var(--focus-ring-color)");
    expect(content).toContain("outline-offset: var(--focus-ring-offset)");
  });

  it("verifies dark mode token WCAG 2.2 AA contrast ratios", () => {
    const darkBg = "#1F1D20";
    const darkInk = "#FFF3EB";
    const darkInkMuted = "#B5ACA8";
    const darkDanger = "#E0735E";
    const darkOk = "#79A37F";
    const darkAccent = "#F7A8A1";
    const darkLineStrong = "#6E676B";

    const crInk = contrastRatio(darkInk, darkBg);
    const crInkMuted = contrastRatio(darkInkMuted, darkBg);
    const crDanger = contrastRatio(darkDanger, darkBg);
    const crOk = contrastRatio(darkOk, darkBg);
    const crAccent = contrastRatio(darkAccent, darkBg);
    const crLineStrong = contrastRatio(darkLineStrong, darkBg);

    // Primary text: AAA >= 7.0
    expect(crInk).toBeGreaterThanOrEqual(7.0);

    // Muted text & badges: AA >= 4.5
    expect(crInkMuted).toBeGreaterThanOrEqual(4.5);
    expect(crDanger).toBeGreaterThanOrEqual(4.5);
    expect(crOk).toBeGreaterThanOrEqual(4.5);
    expect(crAccent).toBeGreaterThanOrEqual(4.5);

    // Strong lines / UI components: >= 3.0
    expect(crLineStrong).toBeGreaterThanOrEqual(3.0);
  });

  it("verifies complete elimination of skeleton.css from codebase", () => {
    const skeletonPath = path.resolve(process.cwd(), "src/ui/skeleton.css");
    expect(fs.existsSync(skeletonPath)).toBe(false);

    const appTsxPath = path.resolve(process.cwd(), "src/ui/App.tsx");
    const appTsx = fs.readFileSync(appTsxPath, "utf-8");
    expect(appTsx).not.toContain("skeleton.css");
  });

  it("verifies zero hex literals outside tokens.css across all CSS files", () => {
    const stylesDir = path.resolve(process.cwd(), "src/ui/styles");
    const files = fs.readdirSync(stylesDir).filter((f) => f.endsWith(".css") && f !== "tokens.css");

    const hexRegex = /#[0-9a-fA-F]{3,8}\b/g;
    const violations: { file: string; matches: string[] }[] = [];

    for (const file of files) {
      const content = fs.readFileSync(path.join(stylesDir, file), "utf-8");
      const matches = content.match(hexRegex);
      if (matches && matches.length > 0) {
        violations.push({ file, matches });
      }
    }

    expect(violations).toEqual([]);
  });
});
