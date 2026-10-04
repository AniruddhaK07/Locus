export {};

const originCoord = { lon: 77.6200, lat: 13.0489 }; // Manyata Tech Park
const destCoord = { lon: 77.6245, lat: 12.9352 };    // Koramangala
const coords = `${originCoord.lon},${originCoord.lat};${destCoord.lon},${destCoord.lat}`;

interface RouteResponse {
  code?: string;
  routes?: Array<{ duration: number; distance: number }>;
}

interface TableResponse {
  code?: string;
  durations?: number[][];
}

async function checkOsrmProfiles() {
  console.log("=== Checking OSRM Demo Profiles on Same Origin/Destination ===");
  
  // 1. router.project-osrm.org
  for (const profile of ["driving", "car", "bike", "bicycle", "foot", "walking"]) {
    const url = `https://router.project-osrm.org/route/v1/${profile}/${coords}?overview=false`;
    try {
      const res = await fetch(url, { headers: { Origin: "http://localhost:5173" } });
      const data = (await res.json()) as RouteResponse;
      console.log(`router.project-osrm.org [${profile}]: duration=${data.routes?.[0]?.duration}s, distance=${data.routes?.[0]?.distance}m, code=${data.code}`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      console.log(`router.project-osrm.org [${profile}]: error ${msg}`);
    }
  }

  // 2. routing.openstreetmap.de (routed-car, routed-bike, routed-foot)
  console.log("\n=== Checking routing.openstreetmap.de Endpoints ===");
  for (const mode of ["car", "bike", "foot"]) {
    const routeUrl = `https://routing.openstreetmap.de/routed-${mode}/route/v1/driving/${coords}?overview=false`;
    try {
      const res = await fetch(routeUrl, { headers: { Origin: "http://localhost:5173" } });
      const cors = res.headers.get("access-control-allow-origin");
      const data = (await res.json()) as RouteResponse;
      console.log(`routing.openstreetmap.de routed-${mode} [route]: duration=${data.routes?.[0]?.duration}s, distance=${data.routes?.[0]?.distance}m, CORS=${cors}`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      console.log(`routing.openstreetmap.de routed-${mode} [route]: error ${msg}`);
    }

    const tableUrl = `https://routing.openstreetmap.de/routed-${mode}/table/v1/driving/${coords}?sources=0`;
    try {
      const res = await fetch(tableUrl, { headers: { Origin: "http://localhost:5173" } });
      const cors = res.headers.get("access-control-allow-origin");
      const data = (await res.json()) as TableResponse;
      console.log(`routing.openstreetmap.de routed-${mode} [table]: durations=${JSON.stringify(data.durations)}, CORS=${cors}`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      console.log(`routing.openstreetmap.de routed-${mode} [table]: error ${msg}`);
    }
  }
}

checkOsrmProfiles().catch(console.error);
