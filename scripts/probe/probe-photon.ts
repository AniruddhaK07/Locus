import fs from "node:fs";
import path from "node:path";

interface ProbeResult {
  query: string;
  status?: number;
  durationMs?: number;
  cors?: string | null;
  featureCount?: number;
  sampleProperties?: Record<string, unknown>;
  sampleCoordinates?: number[];
  error?: string;
}

async function probePhoton() {
  console.log("=== Probing Photon Geocoding API ===");
  const testQueries = ["Koramangala", "Indiranagar, Bangalore", "Connaught Place, Delhi", "Hinjawadi, Pune"];
  const baseUrl = "https://photon.komoot.io/api/";

  const results: ProbeResult[] = [];

  for (const q of testQueries) {
    const url = `${baseUrl}?q=${encodeURIComponent(q)}&limit=5`;
    const start = performance.now();
    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent": "Locus-Probe/0.1 (locus.hackathon@gmail.com)"
        }
      });
      const durationMs = Math.round(performance.now() - start);
      const cors = res.headers.get("access-control-allow-origin");
      const status = res.status;
      const data = await res.json() as { features?: Array<{ properties?: Record<string, unknown>; geometry?: { coordinates?: number[] } }> };

      console.log(`Query "${q}": HTTP ${status} in ${durationMs}ms | CORS: ${cors ?? "none"} | Features: ${data.features?.length ?? 0}`);
      results.push({
        query: q,
        status,
        durationMs,
        cors,
        featureCount: data.features?.length ?? 0,
        sampleProperties: data.features?.[0]?.properties,
        sampleCoordinates: data.features?.[0]?.geometry?.coordinates
      });

      if (q === "Koramangala") {
        const fixturePath = path.resolve("fixtures/recorded/photon-koramangala.json");
        fs.writeFileSync(fixturePath, JSON.stringify({
          fetchedAt: new Date().toISOString(),
          requestUrl: url,
          status,
          headers: Object.fromEntries(res.headers.entries()),
          data
        }, null, 2));
        console.log(`Saved fixture to ${fixturePath}`);
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.error(`Failed to probe "${q}":`, errorMsg);
      results.push({ query: q, error: errorMsg });
    }
  }

  return results;
}

probePhoton().then((res) => {
  console.log("\nPhoton Probe Summary:", JSON.stringify(res, null, 2));
}).catch(console.error);
