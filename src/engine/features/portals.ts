/**
 * Locus Engine — Portal Link Builder
 *
 * Implements §4.7 portal links:
 * - Scopes rental searches to major portals via Google Search (site:magicbricks.com, site:housing.com, site:99acres.com).
 * - Avoids unverified direct URL patterns that trigger anti-bot blocks or 404s.
 * - Always includes a generic search-engine fallback link ("flats for rent in {area} {city}").
 * - Handles missing city, unicode characters, and proper URI encoding.
 */

import type { PortalLink } from "../domain/types";

export function buildPortalLinks(areaName: string, cityName?: string): PortalLink[] {
  const cleanArea = areaName.trim();
  const cleanCity = cityName?.trim();
  const location = cleanCity ? `${cleanArea} ${cleanCity}` : cleanArea;

  return [
    {
      portal: "Search MagicBricks listings",
      url: `https://www.google.com/search?q=${encodeURIComponent(`rent flats ${location} site:magicbricks.com`)}`,
      isFallback: false,
      note: "Opens a Google search limited to this site"
    },
    {
      portal: "Search Housing.com listings",
      url: `https://www.google.com/search?q=${encodeURIComponent(`rent flats ${location} site:housing.com`)}`,
      isFallback: false,
      note: "Opens a Google search limited to this site"
    },
    {
      portal: "Search 99acres listings",
      url: `https://www.google.com/search?q=${encodeURIComponent(`rent flats ${location} site:99acres.com`)}`,
      isFallback: false,
      note: "Opens a Google search limited to this site"
    },
    {
      portal: "Web Search",
      url: `https://www.google.com/search?q=${encodeURIComponent(`flats for rent in ${location}`)}`,
      isFallback: true,
      note: "Universal fallback search query"
    }
  ];
}
