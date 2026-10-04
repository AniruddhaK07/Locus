/**
 * Locus Engine — Live Smoke Test Script
 *
 * Verifies live geocoding and locality discovery against real external services
 * (Photon, Nominatim, Overpass) with polite spacing, rate limiting, and zero hardcoded data.
 *
 * Usage:
 *   npm run smoke
 *   npm run smoke -- --city "Bengaluru"
 *   npm run smoke -- --city "Pune"
 */

import { HttpClient } from "../src/engine/infra/httpClient";
import { ResponseCache } from "../src/engine/infra/cache";
import { MemoryStorageAdapter, type StorageAdapter } from "../src/engine/infra/storage";
import { NominatimGeocodingProvider } from "../src/engine/providers/geocoding/nominatim";
import { PhotonGeocodingProvider } from "../src/engine/providers/geocoding/photon";
import { OverpassLocalityProvider } from "../src/engine/providers/localities/overpass";
import { OverpassAmenityProvider } from "../src/engine/providers/amenities/overpass";
import { OsrmRoutingProvider } from "../src/engine/providers/routing/osrm";
import { LiveEngine } from "../src/engine/live/liveEngine";
import type { Preferences, SearchState } from "../src/engine/domain/types";

// Parse CLI flags
function getArg(flag: string): string | undefined {
  const idx = process.argv.indexOf(flag);
  if (idx !== -1 && idx + 1 < process.argv.length) {
    return process.argv[idx + 1];
  }
  return undefined;
}

async function runSmokeForCity(
  cityInput: string,
  nominatim: NominatimGeocodingProvider,
  photon: PhotonGeocodingProvider,
  overpass: OverpassLocalityProvider,
  amenityProvider: OverpassAmenityProvider,
  routingProvider: OsrmRoutingProvider,
  storage: StorageAdapter
) {
  console.log(`\n======================================================`);
  console.log(`  Live Smoke Test: ${cityInput}`);
  console.log(`======================================================`);

  // Step 1: Typeahead Suggestions via Photon
  console.log(`\n[1/5] Testing Photon typeahead suggestions for "${cityInput}"...`);
  const t0 = performance.now();
  const suggestions = await photon.suggest(cityInput);
  const tPhoton = Math.round(performance.now() - t0);
  console.log(`  Photon returned ${suggestions.length} suggestions in ${tPhoton}ms`);
  if (suggestions.length === 0) {
    throw new Error(`Photon returned 0 suggestions for "${cityInput}"`);
  }
  console.log(`  Top suggestion: "${suggestions[0].name}" (${suggestions[0].id}) at [${suggestions[0].lat.toFixed(4)}, ${suggestions[0].lon.toFixed(4)}]`);

  // Step 2: City Resolution via Nominatim
  console.log(`\n[2/5] Resolving city boundary via Nominatim...`);
  const t1 = performance.now();
  const resolution = await nominatim.resolveCity(cityInput);
  const tNom = Math.round(performance.now() - t1);
  console.log(`  Resolved "${resolution.name}" in ${tNom}ms:`);
  console.log(`    OSM Entity: ${resolution.osmType}/${resolution.osmId}`);
  console.log(`    Relation ID: ${resolution.relationId ?? "none"}`);
  console.log(`    Coordinates: [${resolution.lat.toFixed(4)}, ${resolution.lon.toFixed(4)}]`);
  console.log(`    Bounding Box: ${resolution.boundingBox ? `[${resolution.boundingBox.map((v) => v.toFixed(4)).join(", ")}]` : "none"}`);
  console.log(`    Source Note: ${resolution.sourceNote}`);

  // Step 3: Locality Discovery via Overpass
  console.log(`\n[3/5] Discovering candidate localities via Overpass...`);
  const t2 = performance.now();
  const anchor = { lat: resolution.lat, lon: resolution.lon };
  const localityResult = await overpass.discoverLocalities(resolution, anchor, { limit: 12 });
  const tOverpass = Math.round(performance.now() - t2);

  console.log(`  Discovered ${localityResult.totalCandidates} total candidate localities in ${tOverpass}ms.`);
  console.log(`  Selected top ${localityResult.localities.length} localities nearest to anchor:\n`);

  if (localityResult.localities.length < 12) {
    throw new Error(`Expected at least 12 localities for ${cityInput}, but got ${localityResult.localities.length}`);
  }

  localityResult.localities.forEach((loc, i) => {
    const dist = loc.distanceToAnchorKm !== undefined ? `${loc.distanceToAnchorKm.toFixed(2)} km` : "N/A";
    console.log(
      `    ${(i + 1).toString().padStart(2, " ")}. ${loc.name.padEnd(25, " ")} | ID: ${loc.id.padEnd(16, " ")} | [${loc.lat.toFixed(4)}, ${loc.lon.toFixed(4)}] | dist: ${dist}`
    );
  });

  // Step 4: Amenity Profiling for Top Locality
  const topLocality = localityResult.localities[0];
  console.log(`\n[4/5] Profiling real amenities for top locality "${topLocality.name}"...`);
  const t3 = performance.now();
  const profile = await amenityProvider.getProfile({ lat: topLocality.lat, lon: topLocality.lon });
  const tProfile = Math.round(performance.now() - t3);

  console.log(`  Profile fetched in ${tProfile}ms (total mapped objects: ${profile.totalMappedObjects}):`);
  console.log(`    Healthcare:    ${profile.amenities.healthcare.value} [${profile.amenities.healthcare.source} · ${profile.amenities.healthcare.confidence}]`);
  console.log(`    Education:     ${profile.amenities.education.value} [${profile.amenities.education.source} · ${profile.amenities.education.confidence}]`);
  console.log(`    Grocery:       ${profile.amenities.grocery.value} [${profile.amenities.grocery.source} · ${profile.amenities.grocery.confidence}]`);
  console.log(`    Food & Dining: ${profile.amenities.food.value} [${profile.amenities.food.source} · ${profile.amenities.food.confidence}]`);
  console.log(`    Leisure:       ${profile.amenities.leisure.value} [${profile.amenities.leisure.source} · ${profile.amenities.leisure.confidence}]`);
  console.log(`    Bus Stops:     ${profile.amenities.busStops.value} [${profile.amenities.busStops.source} · ${profile.amenities.busStops.confidence}]`);
  console.log(`    Rail Stations: ${profile.amenities.railStations.value} [${profile.amenities.railStations.source} · ${profile.amenities.railStations.confidence}]`);
  console.log(`    Police:        ${profile.safety.policeCount.value} [${profile.safety.policeCount.source}]`);
  console.log(`    Lit Roads:     ${profile.safety.litRoadsCount.value} [${profile.safety.litRoadsCount.source}]`);

  // Step 5: Real Commute Calculations for Top 5 Localities (OSRM & Peak Heuristic)
  const top5 = localityResult.localities.slice(0, 5);
  console.log(`\n[5/5] Calculating real commutes for top 5 localities to city anchor [${anchor.lat.toFixed(4)}, ${anchor.lon.toFixed(4)}]...`);
  const t4 = performance.now();
  const destinations = [{ id: "workplace", label: "Workplace", name: `${resolution.name} Center`, lat: anchor.lat, lon: anchor.lon }];
  const commuteResults = await routingProvider.calculateCommutes({
    origins: top5.map((l) => ({ lat: l.lat, lon: l.lon })),
    destinations,
    mode: "car",
    cityName: resolution.name,
    maxCommuteMin: 45
  });
  const tCommute = Math.round(performance.now() - t4);

  console.log(`  Multi-modal OSRM routing completed in ${tCommute}ms:\n`);
  commuteResults.forEach((res, i) => {
    const loc = top5[i];
    const c = res.commutes[0];
    const freeFlow = c.freeFlowMin.value !== null ? `${c.freeFlowMin.value}m` : "N/A";
    const peak = c.peakEstimateMin.value !== null ? `${c.peakEstimateMin.value}m` : "N/A";
    const dist = c.distanceKm.value !== null ? `${c.distanceKm.value} km` : "N/A";
    const note = c.peakEstimateMin.note || "";
    const exceeds = c.exceedsMax ? " [EXCEEDS MAX 45m]" : "";
    console.log(
      `    ${(i + 1).toString().padStart(2, " ")}. ${loc.name.padEnd(25, " ")} | Free-flow: ${freeFlow.padStart(4, " ")} [${c.freeFlowMin.source}] | Distance: ${dist.padStart(7, " ")} | Peak Range: ${peak.padStart(4, " ")} (${note})${exceeds}`
    );
  });

  // Verify disabled/unverified transit mode handling
  const transitCheck = await routingProvider.calculateCommutes({
    origins: [{ lat: topLocality.lat, lon: topLocality.lon }],
    destinations,
    mode: "transit"
  });
  console.log(`\n  Unverified Mode Check (transit):`);
  console.log(`    Status: ${transitCheck[0].commutes[0].freeFlowMin.value === null ? "DISABLED/UNVERIFIED (null)" : "UNEXPECTED"}`);
  console.log(`    Note:   ${transitCheck[0].commutes[0].freeFlowMin.note}`);

  // Step 6: End-to-End LiveEngine Search & Ranking Verification
  console.log(`\n[6/6] Executing End-to-End LiveEngine search pipeline for "${cityInput}"...`);
  const liveEngine = new LiveEngine({
    mode: "live",
    storage
  });

  const prefs: Preferences = {
    city: cityInput,
    workplace: { id: "wp", label: "Workplace", name: `${resolution.name} Center`, lat: anchor.lat, lon: anchor.lon },
    destinations: [],
    transportMode: "car",
    maxCommuteMin: 45,
    budgetMin: 20000,
    budgetMax: 50000,
    householdType: "family",
    priorityFocus: "commute"
  };

  const t5 = performance.now();
  const searchHandle = liveEngine.startSearch(prefs);

  const finalState = await new Promise<SearchState>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("LiveEngine search timed out after 180s")), 180000);
    searchHandle.subscribe((state) => {
      if (state.stage === "profiling-amenities" || state.stage === "scoring") {
        process.stdout.write(`\r  Progress: ${state.progress}% | ${state.statusMessage.padEnd(60, " ")}`);
      }
      if (state.isComplete) {
        clearTimeout(timeout);
        process.stdout.write("\n");
        resolve(state);
      }
    });
  });

  const tSearch = Math.round(performance.now() - t5);
  console.log(`  LiveEngine search completed in ${tSearch}ms:`);
  console.log(`    Stage:       ${finalState.stage}`);
  console.log(`    Total Areas: ${finalState.areas.length}`);

  if (finalState.areas.length > 0) {
    console.log(`\n  Top 3 Ranked Results:`);
    finalState.areas.slice(0, 3).forEach((a) => {
      console.log(`    #${a.rank} ${a.name.padEnd(20, " ")} | Match: ${a.matchScore}% | Completeness: ${Math.round(a.dataCompleteness * 100)}% | Commute: ${a.effectiveCommuteMin.value ?? "N/A"}m`);
      console.log(`       Facts: ${a.keyFacts.join(" · ")}`);
    });
  }

  return {
    city: resolution.name,
    candidates: localityResult.totalCandidates,
    selected: localityResult.localities.length,
    topLocalityAmenities: profile.totalMappedObjects,
    liveEngineAreas: finalState.areas.length,
    timings: { photonMs: tPhoton, nominatimMs: tNom, overpassMs: tOverpass, amenityMs: tProfile, commuteMs: tCommute, fullSearchMs: tSearch }
  };
}

async function main() {
  const cityArg = getArg("--city");
  const testCities = cityArg ? [cityArg] : ["Bengaluru", "Pune"];

  const storage = new MemoryStorageAdapter();
  const cache = new ResponseCache({ storage });
  const http = new HttpClient({ cache });

  const nominatim = new NominatimGeocodingProvider(http);
  const photon = new PhotonGeocodingProvider(http);
  const overpass = new OverpassLocalityProvider(http);
  const amenityProvider = new OverpassAmenityProvider(http);
  const routingProvider = new OsrmRoutingProvider(http);

  console.log(`Starting Locus Live Smoke Verification (zero hardcoded data)`);
  console.log(`Test targets: ${testCities.join(", ")}`);

  const results = [];
  for (const city of testCities) {
    try {
      const res = await runSmokeForCity(city, nominatim, photon, overpass, amenityProvider, routingProvider, storage);
      results.push({ status: "PASSED", ...res });
    } catch (err: unknown) {
      console.error(`  ERROR on ${city}:`, (err as Error).message);
      results.push({ city, status: "FAILED", error: (err as Error).message });
    }
  }

  console.log(`\n======================================================`);
  console.log(`  Summary of Smoke Results:`);
  console.log(`======================================================`);
  let allPassed = true;
  for (const r of results) {
    console.log(`  ${r.city}: ${r.status}`);
    if (r.status === "FAILED") allPassed = false;
  }

  if (!allPassed) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Fatal smoke test error:", err);
  process.exit(1);
});
