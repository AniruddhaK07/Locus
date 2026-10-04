import fs from "node:fs";
import path from "node:path";

const USER_AGENT = "Locus-Probe/0.1 (locus.hackathon@gmail.com)";

const MIRRORS = [
  { name: "overpass-api.de", base: "https://overpass-api.de/api" },
  { name: "kumi.systems", base: "https://overpass.kumi.systems/api" },
  { name: "maps.mail.ru", base: "https://maps.mail.ru/osm/tools/overpass/api" },
  { name: "lz4.overpass-api.de", base: "https://lz4.overpass-api.de/api" },
  { name: "z.overpass-api.de", base: "https://z.overpass-api.de/api" }
];

interface MirrorStatus {
  status: number;
  cors: string | null;
  alive: boolean;
  statusSnippet?: string;
  error?: string;
}

interface OverpassElement {
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

interface OverpassResponse {
  version?: number;
  generator?: string;
  elements?: OverpassElement[];
  error?: string;
  snippet?: string;
}

async function checkMirrorStatus(mirror: typeof MIRRORS[0]): Promise<MirrorStatus> {
  const statusUrl = `${mirror.base}/status`;
  try {
    const res = await fetch(statusUrl, {
      headers: {
        "User-Agent": USER_AGENT,
        "Origin": "http://localhost:5173"
      },
      signal: AbortSignal.timeout(8000)
    });
    const text = await res.text();
    const cors = res.headers.get("access-control-allow-origin");
    return {
      status: res.status,
      cors,
      alive: res.ok,
      statusSnippet: text.slice(0, 160).replace(/\n/g, " ")
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return {
      status: 0,
      cors: null,
      alive: false,
      error: errorMsg
    };
  }
}

async function runQuery(mirrorBase: string, query: string, timeoutMs = 25000) {
  const url = `${mirrorBase}/interpreter`;
  const start = performance.now();
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": USER_AGENT,
      "Origin": "http://localhost:5173"
    },
    body: `data=${encodeURIComponent(query)}`,
    signal: AbortSignal.timeout(timeoutMs)
  });
  const durationMs = Math.round(performance.now() - start);
  const cors = res.headers.get("access-control-allow-origin");
  const rawText = await res.text();
  let data: OverpassResponse;
  try {
    data = JSON.parse(rawText) as OverpassResponse;
  } catch {
    data = { error: "Non-JSON response", snippet: rawText.slice(0, 200) };
  }
  return { status: res.status, durationMs, cors, data };
}

async function probeOverpass() {
  console.log("=== 1. Probing Overpass Mirrors Status & CORS ===");
  const mirrorResults: Record<string, MirrorStatus> = {};
  for (const m of MIRRORS) {
    console.log(`Checking ${m.name}...`);
    const status = await checkMirrorStatus(m);
    console.log(`  ${m.name}: ${status.alive ? "ALIVE" : "DEAD"} | CORS: ${status.cors ?? "none"} | ${status.statusSnippet ?? status.error}`);
    mirrorResults[m.name] = status;
  }

  // Find a healthy mirror for query tests
  const activeMirror = MIRRORS.find(m => mirrorResults[m.name]?.alive) || MIRRORS[0];
  console.log(`\n=== 2. Probing Locality Discovery on ${activeMirror.name} ===`);

  // Bengaluru Area ID: 3607902476 (from relation 7902476)
  const localityQuery = `[out:json][timeout:25];
area(3607902476)->.searchArea;
(
  nwr["place"~"^(suburb|neighbourhood|quarter)$"](area.searchArea);
);
out center;`;

  try {
    const localityRes = await runQuery(activeMirror.base, localityQuery, 30000);
    console.log(`Locality query on Bengaluru: HTTP ${localityRes.status} in ${localityRes.durationMs}ms | Elements returned: ${localityRes.data?.elements?.length}`);
    
    // Inspect elements types (node, way, relation)
    const typesCount = (localityRes.data?.elements || []).reduce<Record<string, number>>((acc, el) => {
      acc[el.type] = (acc[el.type] || 0) + 1;
      return acc;
    }, {});
    console.log("Locality elements by type:", typesCount);

    const fixturePath = path.resolve("fixtures/recorded/overpass-locality-bengaluru.json");
    fs.writeFileSync(fixturePath, JSON.stringify({
      fetchedAt: new Date().toISOString(),
      mirror: activeMirror.name,
      query: localityQuery,
      elementsCount: localityRes.data?.elements?.length,
      typesCount,
      sampleElements: localityRes.data?.elements?.slice(0, 5),
      elements: localityRes.data?.elements
    }, null, 2));
    console.log(`Saved locality fixture to ${fixturePath}`);
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("Locality query failed:", errorMsg);
  }

  console.log("\n=== 3. Probing Amenity Count Syntax on Overpass ===");
  // Test A: Single category count
  const countQueryA = `[out:json][timeout:15];
(
  nwr["amenity"="hospital"](around:1500, 12.9352, 77.6245);
);
out count;`;

  try {
    const resA = await runQuery(activeMirror.base, countQueryA, 15000);
    console.log(`Single count query: HTTP ${resA.status} in ${resA.durationMs}ms`);
    console.log(`Response elements:`, JSON.stringify(resA.data?.elements, null, 2));
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("Single count query failed:", errorMsg);
  }

  // Test B: Multi-category single-request count
  const multiCountQuery = `[out:json][timeout:20];
nwr["amenity"~"^(hospital|clinic|pharmacy)$"](around:1500, 12.9352, 77.6245)->.health;
nwr["amenity"~"^(school|college|kindergarten)$"](around:1500, 12.9352, 77.6245)->.education;
nwr["shop"~"^(supermarket|convenience|grocery)$"](around:800, 12.9352, 77.6245)->.grocery;
nwr["amenity"~"^(restaurant|cafe|fast_food)$"](around:800, 12.9352, 77.6245)->.food;
nwr["leisure"~"^(park|garden|fitness_centre)$"](around:1500, 12.9352, 77.6245)->.leisure;
nwr["highway"="bus_stop"](around:500, 12.9352, 77.6245)->.bus;
nwr["railway"~"^(station|subway_entrance)$"](around:1500, 12.9352, 77.6245)->.rail;

.health out count;
.education out count;
.grocery out count;
.food out count;
.leisure out count;
.bus out count;
.rail out count;
`;

  try {
    const resMulti = await runQuery(activeMirror.base, multiCountQuery, 25000);
    console.log(`Multi count query: HTTP ${resMulti.status} in ${resMulti.durationMs}ms`);
    console.log(`Multi count elements count: ${resMulti.data?.elements?.length}`);
    console.log(`Multi count elements:`, JSON.stringify(resMulti.data?.elements, null, 2));

    const fixturePath = path.resolve("fixtures/recorded/overpass-amenity-counts.json");
    fs.writeFileSync(fixturePath, JSON.stringify({
      fetchedAt: new Date().toISOString(),
      mirror: activeMirror.name,
      query: multiCountQuery,
      elements: resMulti.data?.elements
    }, null, 2));
    console.log(`Saved amenity counts fixture to ${fixturePath}`);
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("Multi count query failed:", errorMsg);
  }
}

probeOverpass().catch(console.error);
