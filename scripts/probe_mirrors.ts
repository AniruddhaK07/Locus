/**
 * Probe script for candidate Overpass mirrors
 */

interface ProbeResult {
  url: string;
  reachable: boolean;
  connectTimeMs?: number;
  corsHeader?: string | null;
  statusEndpoint?: {
    ok: boolean;
    bodySnippet?: string;
    slotsAvailable?: number;
    rateLimit?: number;
    retryAfter?: string | null;
  };
  interpreterTest?: {
    ok: boolean;
    durationMs: number;
    httpStatus: number;
    error?: string;
  };
  notes: string;
}

const CANDIDATES = [
  "https://overpass-api.de/api",
  "https://z.overpass-api.de/api",
  "https://lz4.overpass-api.de/api",
  "https://overpass.kumi.systems/api",
  "https://overpass.private.coffee/api",
  "https://overpass.nchc.org.tw/api",
  "https://maps.mail.ru/osm/tools/overpass/api"
];

async function probeMirror(baseUrl: string): Promise<ProbeResult> {
  const res: ProbeResult = {
    url: baseUrl,
    reachable: false,
    notes: ""
  };

  // 1. Probe /status
  const statusStart = performance.now();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const statusResp = await fetch(`${baseUrl}/status`, {
      signal: controller.signal,
      headers: { "User-Agent": "Locus-Probe/0.1.0" }
    });
    clearTimeout(timeout);
    res.connectTimeMs = Math.round(performance.now() - statusStart);
    res.reachable = true;
    res.corsHeader = statusResp.headers.get("access-control-allow-origin");
    const retryAfter = statusResp.headers.get("retry-after");

    const text = await statusResp.text();
    const slotsMatch = text.match(/(\d+)\s+slots available now/i);
    const rateMatch = text.match(/Rate limit:\s*(\d+)/i);

    res.statusEndpoint = {
      ok: statusResp.ok,
      bodySnippet: text.slice(0, 300).replace(/\n/g, " "),
      slotsAvailable: slotsMatch ? parseInt(slotsMatch[1], 10) : undefined,
      rateLimit: rateMatch ? parseInt(rateMatch[1], 10) : undefined,
      retryAfter
    };
  } catch (err) {
    res.connectTimeMs = Math.round(performance.now() - statusStart);
    res.notes += `Status probe error: ${(err as Error).message}. `;
  }

  // 2. Probe /interpreter with simple query
  const intStart = performance.now();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    const queryResp = await fetch(`${baseUrl}/interpreter`, {
      method: "POST",
      body: "data=[out:json][timeout:5];node(1);out count;",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "Locus-Probe/0.1.0"
      },
      signal: controller.signal
    });
    clearTimeout(timeout);
    const dur = Math.round(performance.now() - intStart);
    const cors = queryResp.headers.get("access-control-allow-origin");
    if (!res.corsHeader && cors) res.corsHeader = cors;

    res.interpreterTest = {
      ok: queryResp.ok,
      durationMs: dur,
      httpStatus: queryResp.status
    };
    if (!queryResp.ok) {
      const errText = await queryResp.text().catch(() => "");
      res.interpreterTest.error = errText.slice(0, 100);
    }
  } catch (err) {
    const dur = Math.round(performance.now() - intStart);
    res.interpreterTest = {
      ok: false,
      durationMs: dur,
      httpStatus: 0,
      error: (err as Error).message
    };
  }

  return res;
}

async function main() {
  console.log("Probing Overpass candidate mirrors...\n");
  for (const url of CANDIDATES) {
    console.log(`Checking ${url}...`);
    const r = await probeMirror(url);
    console.log(`  Reachable:     ${r.reachable} (${r.connectTimeMs}ms)`);
    console.log(`  CORS Header:   ${r.corsHeader ?? "none"}`);
    if (r.statusEndpoint) {
      console.log(`  /status OK:    ${r.statusEndpoint.ok}`);
      console.log(`  Rate limit:    ${r.statusEndpoint.rateLimit ?? "N/A"}`);
      console.log(`  Slots avail:   ${r.statusEndpoint.slotsAvailable ?? "N/A"}`);
      console.log(`  Snippet:       ${r.statusEndpoint.bodySnippet?.slice(0, 120)}`);
    }
    if (r.interpreterTest) {
      console.log(`  /interpreter:  HTTP ${r.interpreterTest.httpStatus} in ${r.interpreterTest.durationMs}ms (OK: ${r.interpreterTest.ok})`);
      if (r.interpreterTest.error) {
        console.log(`  Query error:   ${r.interpreterTest.error}`);
      }
    }
    if (r.notes) {
      console.log(`  Notes:         ${r.notes}`);
    }
    console.log("");
  }
}

main().catch(console.error);
