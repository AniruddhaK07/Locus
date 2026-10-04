/**
 * Locus UI Formatting Utilities
 *
 * Strict adherence to §4.2:
 * - Indian digit grouping: Intl.NumberFormat("en-IN")
 * - Commute: "{n} min"
 * - Distance: "{n} km"
 * - Scores: whole numbers
 * - dataCompleteness (0–1): whole-number percent "{n}%"
 * - Null / missing: "Not available" (never guessed defaults per §2.3)
 */

const inFormatter = new Intl.NumberFormat("en-IN");

export function formatIndianNumber(value: number): string {
  if (!Number.isFinite(value)) return "—";
  return inFormatter.format(Math.round(value));
}

export function formatCurrency(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || !Number.isFinite(amount)) {
    return "Not available";
  }
  return `₹${inFormatter.format(Math.round(amount))}`;
}

export function formatCommute(minutes: number | null | undefined): string {
  if (minutes === null || minutes === undefined || !Number.isFinite(minutes)) {
    return "Not available";
  }
  return `${Math.round(minutes)} min`;
}

export function formatDistance(km: number | null | undefined): string {
  if (km === null || km === undefined || !Number.isFinite(km)) {
    return "Not available";
  }
  return `${Number(km.toFixed(1))} km`;
}

export function formatScore(score: number | null | undefined): string {
  if (score === null || score === undefined || !Number.isFinite(score)) {
    return "—";
  }
  return String(Math.round(score));
}

export function formatCompleteness(completeness: number | null | undefined): string {
  if (completeness === null || completeness === undefined || !Number.isFinite(completeness)) {
    return "0%";
  }
  // types.ts: dataCompleteness is 0–1 share of weights backed by real data
  const pct = Math.min(100, Math.max(0, Math.round(completeness * 100)));
  return `${pct}%`;
}

export function formatRentBand(
  band: { low: number; high: number } | null | undefined
): string {
  if (!band || !Number.isFinite(band.low) || !Number.isFinite(band.high)) {
    return "Not available";
  }
  return `₹${inFormatter.format(Math.round(band.low))} – ₹${inFormatter.format(Math.round(band.high))}`;
}
