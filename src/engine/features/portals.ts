/**
 * Locus Engine — Portal Link Builder
 *
 * Implements §4.7 portal links:
 * - Uses verified search query patterns (keyword/query parameters).
 * - Never fabricates portal-specific slugs or internal IDs.
 * - Always includes a generic search-engine fallback link ("flats for rent in {area} {city}").
 */

import type { PortalLink } from "../domain/types";

export function buildPortalLinks(areaName: string, cityName?: string): PortalLink[] {
  const query = cityName ? `${areaName} ${cityName}` : areaName;
  const encodedQuery = encodeURIComponent(query);

  return [
    {
      portal: "MagicBricks",
      url: `https://www.magicbricks.com/property-for-rent/residential-real-estate?keyword=${encodedQuery}`,
      isFallback: false,
      note: "Search results filtered by locality keyword"
    },
    {
      portal: "Housing.com",
      url: `https://housing.com/rent/search?q=${encodedQuery}`,
      isFallback: false,
      note: "Rental search results by locality keyword"
    },
    {
      portal: "99acres",
      url: `https://www.99acres.com/search/property/rent?keyword=${encodedQuery}`,
      isFallback: false,
      note: "Locality rental search"
    },
    {
      portal: "Web Search",
      url: `https://www.google.com/search?q=${encodeURIComponent(`flats for rent in ${query}`)}`,
      isFallback: true,
      note: "Universal fallback search query"
    }
  ];
}
