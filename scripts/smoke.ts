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
import { MemoryStorageAdapter } from "../src/engine/infra/storage";
import { NominatimGeocodingProvider } from "../src/engine/providers/geocoding/nominatim";
import { PhotonGeocodingProvider } from "../src/engine/providers/geocoding/photon";
import { OverpassLocalityProvider } from "../src/engine/providers/localities/overpass";
import { OverpassAmenityProvider } from "../src/engine/providers/amenities/overpass";

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
  amenityProvider: OverpassAmenityProvider
) {
  console.log(`\n======================================================`);
  console.log(`  Live Smoke Test: ${cityInput}`);
  console.log(`======================================================`);

  // Step 1: Typeahead Suggestions via Photon
  console.log(`\n[1/4] Testing Photon typeahead suggestions for "${cityInput}"...`);
  const t0 = performance.now();
  const suggestions = await photon.suggest(cityInput);
  const tPhoton = Math.round(performance.now() - t0);
  console.log(`  Photon returned ${suggestions.length} suggestions in ${tPhoton}ms`);
  if (suggestions.length === 0) {
    throw new Error(`Photon returned 0 suggestions for "${cityInput}"`);
  }
  console.log(`  Top suggestion: "${suggestions[0].name}" (${suggestions[0].id}) at [${suggestions[0].lat.toFixed(4)}, ${suggestions[0].lon.toFixed(4)}]`);

  // Step 2: City Resolution via Nominatim
  console.log(`\n[2/4] Resolving city boundary via Nominatim...`);
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
  console.log(`\n[3/4] Discovering candidate localities via Overpass...`);
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
  console.log(`\n[4/4] Profiling real amenities for top locality "${topLocality.name}"...`);
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

  return {
    city: resolution.name,
    candidates: localityResult.totalCandidates,
    selected: localityResult.localities.length,
    topLocalityAmenities: profile.totalMappedObjects,
    timings: { photonMs: tPhoton, nominatimMs: tNom, overpassMs: tOverpass, amenityMs: tProfile }
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

  console.log(`Starting Locus Live Smoke Verification (zero hardcoded data)`);
  console.log(`Test targets: ${testCities.join(", ")}`);

  const results = [];
  for (const city of testCities) {
    try {
      const res = await runSmokeForCity(city, nominatim, photon, overpass, amenityProvider);
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
