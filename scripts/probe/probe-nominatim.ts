import fs from "node:fs";
import path from "node:path";

interface NominatimResult {
  city: string;
  status?: number;
  durationMs?: number;
  cors?: string | null;
  osm_type?: string;
  osm_id?: number;
  category?: string;
  type?: string;
  place_rank?: number;
  display_name?: string;
  boundingbox?: string[];
  hasRelation?: boolean;
  error?: string;
}

interface NominatimItem {
  osm_type?: string;
  osm_id?: number;
  category?: string;
  type?: string;
  place_rank?: number;
  display_name?: string;
  boundingbox?: string[];
}

async function probeNominatim() {
  console.log("=== Probing Nominatim Geocoding API ===");
  const testCities = ["Pune, India", "Bengaluru, India", "Delhi, India"];
  const baseUrl = "https://nominatim.openstreetmap.org/search";

  const results: NominatimResult[] = [];

  for (const city of testCities) {
    const url = `${baseUrl}?q=${encodeURIComponent(city)}&format=jsonv2&polygon_geojson=1&addressdetails=1&extratags=1`;
    const start = performance.now();
    try {
      // Respect Nominatim 1 req/sec policy
      await new Promise((r) => setTimeout(r, 1200));

      const res = await fetch(url, {
        headers: {
          "User-Agent": "Locus-Probe/0.1 (https://github.com/locus-app)",
          "Origin": "http://localhost:5173"
        }
      });

      const durationMs = Math.round(performance.now() - start);
      const cors = res.headers.get("access-control-allow-origin");
      const status = res.status;
      const data = (await res.json()) as NominatimItem[];

      console.log(`City "${city}": HTTP ${status} in ${durationMs}ms | CORS: ${cors ?? "none"} | Results: ${data.length}`);
      
      const first = data[0];
      results.push({
        city,
        status,
        durationMs,
        cors,
        osm_type: first?.osm_type,
        osm_id: first?.osm_id,
        category: first?.category,
        type: first?.type,
        place_rank: first?.place_rank,
        display_name: first?.display_name,
        boundingbox: first?.boundingbox,
        hasRelation: first?.osm_type === "relation"
      });

      const filename = city.toLowerCase().startsWith("pune") ? "nominatim-pune.json" : "nominatim-bengaluru.json";
      const fixturePath = path.resolve(`fixtures/recorded/${filename}`);
      fs.writeFileSync(fixturePath, JSON.stringify({
        fetchedAt: new Date().toISOString(),
        requestUrl: url,
        status,
        headers: Object.fromEntries(res.headers.entries()),
        data
      }, null, 2));
      console.log(`Saved fixture to ${fixturePath}`);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.error(`Failed to probe "${city}":`, errorMsg);
      results.push({ city, error: errorMsg });
    }
  }

  return results;
}

probeNominatim().then((res) => {
  console.log("\nNominatim Probe Summary:", JSON.stringify(res, null, 2));
}).catch(console.error);
