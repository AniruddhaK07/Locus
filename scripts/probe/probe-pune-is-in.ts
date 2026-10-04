export {};

const PUNE_LAT = 18.5214;
const PUNE_LON = 73.8545;

interface OverpassAdminElement {
  id: number;
  tags?: {
    admin_level?: string;
    name?: string;
    type?: string;
  };
}

interface OverpassAdminResponse {
  elements?: OverpassAdminElement[];
}

interface OverpassLocalityElement {
  tags?: { name?: string };
}

interface OverpassLocalityResponse {
  elements?: OverpassLocalityElement[];
}

async function probePuneAdminArea() {
  console.log("=== Probing Overpass is_in for Pune Admin Areas ===");
  
  const query = `[out:json][timeout:25];
is_in(${PUNE_LAT},${PUNE_LON})->.a;
area.a["boundary"="administrative"];
out tags;`;

  try {
    const res = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "Locus-Probe/0.1 (https://github.com/locus-app)",
        "Origin": "http://localhost:5173"
      },
      body: `data=${encodeURIComponent(query)}`
    });

    const data = (await res.json()) as OverpassAdminResponse;
    console.log(`Overpass is_in returned ${data.elements?.length} enclosing administrative areas:`);
    for (const el of data.elements || []) {
      console.log(`  Area ID: ${el.id}, admin_level: ${el.tags?.admin_level}, name: ${el.tags?.name}, type: ${el.tags?.type}`);
    }

    const municipalArea = data.elements?.find((el) => el.tags?.admin_level === "8" || el.tags?.admin_level === "6" || el.tags?.admin_level === "7");
    if (municipalArea) {
      console.log(`\nTesting locality query inside enclosing area ID ${municipalArea.id} (${municipalArea.tags?.name}):`);
      const locQuery = `[out:json][timeout:25];
area(${municipalArea.id})->.searchArea;
(
  nwr["place"~"^(suburb|neighbourhood|quarter)$"](area.searchArea);
);
out center;`;
      const locRes = await fetch("https://overpass-api.de/api/interpreter", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": "Locus-Probe/0.1 (https://github.com/locus-app)",
          "Origin": "http://localhost:5173"
        },
        body: `data=${encodeURIComponent(locQuery)}`
      });
      const locData = (await locRes.json()) as OverpassLocalityResponse;
      console.log(`  Localities in ${municipalArea.tags?.name}: returned ${locData.elements?.length} elements!`);
    }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("is_in probe failed:", msg);
  }
}

probePuneAdminArea().catch(console.error);
