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
  overpass: OverpassLocalityProvider
) {
  console.log(`\n======================================================`);
  console.log(`  Live Smoke Test: ${cityInput}`);
  console.log(`======================================================`);

  // Step 1: Typeahead Suggestions via Photon
  console.log(`\n[1/3] Testing Photon typeahead suggestions for "${cityInput}"...`);
  const t0 = performance.now();
  const suggestions = await photon.suggest(cityInput);
  const tPhoton = Math.round(performance.now() - t0);
  console.log(`  Photon returned ${suggestions.length} suggestions in ${tPhoton}ms`);
  if (suggestions.length === 0) {
    throw new Error(`Photon returned 0 suggestions for "${cityInput}"`);
  }
  console.log(`  Top suggestion: "${suggestions[0].name}" (${suggestions[0].id}) at [${suggestions[0].lat.toFixed(4)}, ${suggestions[0].lon.toFixed(4)}]`);

  // Step 2: City Resolution via Nominatim
  console.log(`\n[2/3] Resolving city boundary via Nominatim...`);
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
  console.log(`\n[3/3] Discovering candidate localities via Overpass...`);
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

  return {
    city: resolution.name,
    candidates: localityResult.totalCandidates,
    selected: localityResult.localities.length,
    timings: { photonMs: tPhoton, nominatimMs: tNom, overpassMs: tOverpass }
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

  console.log(`Starting Locus Live Smoke Verification (zero hardcoded data)`);
  console.log(`Test targets: ${testCities.join(", ")}`);

  const results = [];
  for (const city of testCities) {
    try {
      const res = await runSmokeForCity(city, nominatim, photon, overpass);
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
