import fs from "node:fs";
import path from "node:path";

const COORDS = {
  workplace: { lon: 77.6200, lat: 13.0489 }, // Manyata Tech Park
  loc1: { lon: 77.6245, lat: 12.9352 },      // Koramangala
  loc2: { lon: 77.6444, lat: 12.9811 },      // Indiranagar
  loc3: { lon: 77.7499, lat: 12.9698 },      // Whitefield
};

interface OsrmProbeResult {
  host: string;
  endpoint?: string;
  profile?: string;
  mode?: string;
  status?: number;
  durationMs?: number;
  cors?: string | null;
  code?: string;
  routeDuration?: number;
  routeDistance?: number;
  durations?: number[][];
  error?: string;
}

interface OsrmRouteResponse {
  code: string;
  message?: string;
  routes?: Array<{ duration: number; distance: number }>;
}

interface OsrmTableResponse {
  code: string;
  message?: string;
  durations?: number[][];
}

async function probeOsrm() {
  console.log("=== Probing OSRM Routing & Table Endpoints ===");
  const results: OsrmProbeResult[] = [];

  // Pair: workplace -> loc1
  const pairCoords = `${COORDS.workplace.lon},${COORDS.workplace.lat};${COORDS.loc1.lon},${COORDS.loc1.lat}`;
  // Table coords: source 0 (workplace) -> dest 1, 2, 3
  const tableCoords = `${COORDS.workplace.lon},${COORDS.workplace.lat};${COORDS.loc1.lon},${COORDS.loc1.lat};${COORDS.loc2.lon},${COORDS.loc2.lat};${COORDS.loc3.lon},${COORDS.loc3.lat}`;

  // 1. Probe router.project-osrm.org profiles
  console.log("\n--- Testing router.project-osrm.org ---");
  for (const profile of ["driving", "car", "bike", "bicycle", "foot", "walking"]) {
    const url = `https://router.project-osrm.org/route/v1/${profile}/${pairCoords}?overview=false`;
    try {
      const start = performance.now();
      const res = await fetch(url, {
        headers: {
          "User-Agent": "Locus-Probe/0.1 (https://github.com/locus-app)",
          "Origin": "http://localhost:5173"
        },
        signal: AbortSignal.timeout(8000)
      });
      const durationMs = Math.round(performance.now() - start);
      const cors = res.headers.get("access-control-allow-origin");
      const status = res.status;
      const text = await res.text();
      let json: OsrmRouteResponse | null = null;
      try {
        json = JSON.parse(text) as OsrmRouteResponse;
      } catch {
        // Ignored: non-JSON response handled below
      }

      console.log(`router.project-osrm.org / route / ${profile}: HTTP ${status} in ${durationMs}ms | CORS: ${cors ?? "none"} | Code: ${json?.code ?? text.slice(0, 40)}`);
      results.push({
        host: "router.project-osrm.org",
        endpoint: "route",
        profile,
        status,
        durationMs,
        cors,
        code: json?.code,
        routeDuration: json?.routes?.[0]?.duration,
        routeDistance: json?.routes?.[0]?.distance,
        error: json?.message
      });

      if (profile === "driving" && status === 200) {
        fs.writeFileSync(
          path.resolve("fixtures/recorded/osrm-route-driving.json"),
          JSON.stringify({ fetchedAt: new Date().toISOString(), url, status, headers: Object.fromEntries(res.headers.entries()), json }, null, 2)
        );
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.log(`router.project-osrm.org / route / ${profile}: Failed: ${errorMsg}`);
      results.push({ host: "router.project-osrm.org", profile, error: errorMsg });
    }
  }

  // 2. Probe Table Endpoint on router.project-osrm.org
  console.log("\n--- Testing router.project-osrm.org Table endpoint ---");
  for (const profile of ["driving", "car"]) {
    const url = `https://router.project-osrm.org/table/v1/${profile}/${tableCoords}?sources=0`;
    try {
      const start = performance.now();
      const res = await fetch(url, {
        headers: {
          "User-Agent": "Locus-Probe/0.1 (https://github.com/locus-app)",
          "Origin": "http://localhost:5173"
        },
        signal: AbortSignal.timeout(8000)
      });
      const durationMs = Math.round(performance.now() - start);
      const cors = res.headers.get("access-control-allow-origin");
      const status = res.status;
      const json = (await res.json()) as OsrmTableResponse;

      console.log(`router.project-osrm.org / table / ${profile}: HTTP ${status} in ${durationMs}ms | CORS: ${cors ?? "none"} | Code: ${json.code}`);
      if (json.durations) {
        console.log("  Durations from workplace to 3 localities (seconds):", json.durations[0]?.slice(1));
      }
      results.push({
        host: "router.project-osrm.org",
        endpoint: "table",
        profile,
        status,
        durationMs,
        cors,
        code: json.code,
        durations: json.durations
      });

      if (status === 200 && json.code === "Ok") {
        fs.writeFileSync(
          path.resolve("fixtures/recorded/osrm-table.json"),
          JSON.stringify({ fetchedAt: new Date().toISOString(), url, status, headers: Object.fromEntries(res.headers.entries()), json }, null, 2)
        );
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.log(`router.project-osrm.org / table / ${profile}: Failed: ${errorMsg}`);
    }
  }

  // 3. Probe routing.openstreetmap.de (car, bike, foot)
  console.log("\n--- Testing routing.openstreetmap.de (routed-car, routed-bike, routed-foot) ---");
  for (const mode of ["car", "bike", "foot"]) {
    const url = `https://routing.openstreetmap.de/routed-${mode}/route/v1/driving/${pairCoords}?overview=false`;
    try {
      const start = performance.now();
      const res = await fetch(url, {
        headers: {
          "User-Agent": "Locus-Probe/0.1 (https://github.com/locus-app)",
          "Origin": "http://localhost:5173"
        },
        signal: AbortSignal.timeout(8000)
      });
      const durationMs = Math.round(performance.now() - start);
      const cors = res.headers.get("access-control-allow-origin");
      const status = res.status;
      const text = await res.text();
      let json: OsrmRouteResponse | null = null;
      try {
        json = JSON.parse(text) as OsrmRouteResponse;
      } catch {
        // Ignored: non-JSON response handled below
      }

      console.log(`routing.openstreetmap.de / routed-${mode}: HTTP ${status} in ${durationMs}ms | CORS: ${cors ?? "none"} | Code: ${json?.code ?? text.slice(0, 40)}`);
      results.push({
        host: "routing.openstreetmap.de",
        mode,
        status,
        durationMs,
        cors,
        code: json?.code,
        routeDuration: json?.routes?.[0]?.duration
      });
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.log(`routing.openstreetmap.de / routed-${mode}: Failed: ${errorMsg}`);
    }
  }

  return results;
}

probeOsrm().catch(console.error);
