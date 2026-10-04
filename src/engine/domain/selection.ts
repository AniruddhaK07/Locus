import type { AreaSummary, Confidence } from "./types";

export type SortOption = "match" | "commute" | "amenities" | "rent";

export interface AreaFilterOptions {
  maxCommuteMin?: number;
  minMatchScore?: number;
  hideLowConfidence?: boolean;
}

export interface SelectAreasOptions {
  sort?: SortOption;
  filters?: AreaFilterOptions;
  limit?: number;
  offset?: number;
}

/**
 * Pure function to filter, sort, and paginate area summaries.
 * Keeps UI purely presentational with zero reimplementation of sorting/filtering logic.
 */
export function selectAreas(
  areas: AreaSummary[],
  options: SelectAreasOptions = {}
): AreaSummary[] {
  const { sort = "match", filters = {}, limit, offset = 0 } = options;

  let result = [...areas];

  // Apply filters
  if (filters.maxCommuteMin !== undefined) {
    result = result.filter(
      (a) => (a.effectiveCommuteMin.value ?? 999) <= (filters.maxCommuteMin as number)
    );
  }

  if (filters.minMatchScore !== undefined && filters.minMatchScore > 0) {
    result = result.filter((a) => a.matchScore >= (filters.minMatchScore as number));
  }

  if (filters.hideLowConfidence) {
    result = result.filter((a) => (a.confidence as Confidence) !== "low");
  }

  // Apply sorting
  result.sort((a, b) => {
    switch (sort) {
      case "match":
        return b.matchScore - a.matchScore;
      case "commute":
        return (a.effectiveCommuteMin.value ?? 999) - (b.effectiveCommuteMin.value ?? 999);
      case "amenities":
        return (b.amenitiesScore.value ?? 0) - (a.amenitiesScore.value ?? 0);
      case "rent":
        return (a.rentBand.value?.low ?? 999999) - (b.rentBand.value?.low ?? 999999);
      default:
        return 0;
    }
  });

  // Apply pagination if limit is specified
  if (limit !== undefined && limit > 0) {
    result = result.slice(offset, offset + limit);
  } else if (offset > 0) {
    result = result.slice(offset);
  }

  return result;
}
