export {};

const CANDIDATES = [
  "https://overpass.private.coffee/api",
  "https://overpass.openstreetmap.fr/api",
  "https://overpass.openstreetmap.ru/api"
];

async function checkIndependentMirrors() {
  console.log("=== Checking Independent Overpass Mirrors ===");
  for (const base of CANDIDATES) {
    try {
      const res = await fetch(`${base}/status`, {
        headers: {
          "User-Agent": "Locus-Probe/0.1 (https://github.com/locus-app)",
          "Origin": "http://localhost:5173"
        },
        signal: AbortSignal.timeout(6000)
      });
      const text = await res.text();
      const cors = res.headers.get("access-control-allow-origin");
      console.log(`${base}: HTTP ${res.status} | CORS: ${cors} | ${text.slice(0, 100).replace(/\n/g, " ")}`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      console.log(`${base}: failed (${msg})`);
    }
  }
}

checkIndependentMirrors().catch(console.error);
