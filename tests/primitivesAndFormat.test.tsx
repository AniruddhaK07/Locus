import fs from "node:fs";
import path from "node:path";
import { describe, it, expect } from "vitest";
import { renderToString } from "react-dom/server";
import {
  formatCurrency,
  formatCommute,
  formatDistance,
  formatScore,
  formatCompleteness,
  formatRentBand,
  formatIndianNumber,
} from "../src/ui/utils/format";
import { ConfidenceMark } from "../src/ui/primitives/ConfidenceMark";
import { ProvenanceBadge } from "../src/ui/primitives/ProvenanceBadge";
import type { Measured } from "@engine";

describe("Formatting Utilities (§4.2)", () => {
  it("formats Indian currency with correct grouping (₹1,20,000)", () => {
    expect(formatCurrency(120000)).toBe("₹1,20,000");
    expect(formatCurrency(25000)).toBe("₹25,000");
    expect(formatCurrency(500)).toBe("₹500");
    expect(formatCurrency(null)).toBe("Not available");
    expect(formatCurrency(undefined)).toBe("Not available");
  });

  it("formats commute duration with unit and preserves null as Not available", () => {
    expect(formatCommute(28)).toBe("28 min");
    expect(formatCommute(45.4)).toBe("45 min");
    expect(formatCommute(0)).toBe("0 min"); // Real 0 is not null per §2.3
    expect(formatCommute(null)).toBe("Not available");
  });

  it("formats distance with 1 decimal place and km unit", () => {
    expect(formatDistance(9.4)).toBe("9.4 km");
    expect(formatDistance(12.0)).toBe("12 km");
    expect(formatDistance(0)).toBe("0 km");
    expect(formatDistance(null)).toBe("Not available");
  });

  it("formats scores as whole numbers without decimals", () => {
    expect(formatScore(88.6)).toBe("89");
    expect(formatScore(72)).toBe("72");
    expect(formatScore(null)).toBe("—");
  });

  it("formats dataCompleteness (0–1) as whole-number percentage", () => {
    expect(formatCompleteness(0.85)).toBe("85%");
    expect(formatCompleteness(1.0)).toBe("100%");
    expect(formatCompleteness(0.0)).toBe("0%");
    expect(formatCompleteness(null)).toBe("0%");
  });

  it("formats rent bands with Indian grouping", () => {
    expect(formatRentBand({ low: 22000, high: 32000 })).toBe("₹22,000 – ₹32,000");
    expect(formatRentBand(null)).toBe("Not available");
  });

  it("formats Indian numbers standalone", () => {
    expect(formatIndianNumber(10000000)).toBe("1,00,00,000");
  });
});

describe("ConfidenceMark Component (§5)", () => {
  it("renders correct symbols and textual labels without color dependency", () => {
    const high = renderToString(<ConfidenceMark confidence="high" />);
    expect(high).toContain("●");
    expect(high).toContain("High confidence");

    const med = renderToString(<ConfidenceMark confidence="medium" />);
    expect(med).toContain("◐");
    expect(med).toContain("Medium confidence");

    const low = renderToString(<ConfidenceMark confidence="low" />);
    expect(low).toContain("○");
    expect(low).toContain("Low confidence");

    const none = renderToString(<ConfidenceMark confidence="none" />);
    expect(none).toContain("⊘");
    expect(none).toContain("No confidence");
  });
});

describe("ProvenanceBadge & Null-Handling (§5, §2.3)", () => {
  it("renders source and confidence badge for valid measured data", () => {
    const metric: Measured<number> = {
      value: 42,
      source: "osm",
      confidence: "high",
      note: "Count within 800m",
      fetchedAt: "2026-10-04T10:00:00Z",
    };
    const html = renderToString(<ProvenanceBadge metric={metric} />);
    expect(html).toContain("osm");
    expect(html).toContain('data-source="osm"');
    expect(html).toContain('data-confidence="high"');
    expect(html).toContain("Count within 800m");
  });

  it("renders 'Not available' when value is strictly null", () => {
    const metric: Measured<number> = {
      value: null,
      source: "unavailable",
      confidence: "none",
      note: "Service timed out",
    };
    const html = renderToString(<ProvenanceBadge metric={metric} />);
    expect(html).toContain("Not available");
    expect(html).toContain("unavailable");
    expect(html).toContain("Service timed out");
  });

  it("does NOT render Not available when value is a valid 0", () => {
    const metric: Measured<number> = {
      value: 0,
      source: "osm",
      confidence: "high",
    };
    const html = renderToString(<ProvenanceBadge metric={metric} />);
    expect(html).not.toContain("Not available");
  });
});

describe("Reduced-Motion Stylesheet Test (§4.4, §7)", () => {
  it("contains prefers-reduced-motion media query that disables transforms", () => {
    const resetPath = path.resolve(__dirname, "../src/ui/styles/reset.css");
    const content = fs.readFileSync(resetPath, "utf-8");
    expect(content).toContain("@media (prefers-reduced-motion: reduce)");
    expect(content).toContain("transform: none !important");
    expect(content).toContain("animation-duration: 0.01ms !important");
  });
});
