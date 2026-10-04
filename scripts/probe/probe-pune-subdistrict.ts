export {};

interface LocalityElement {
  tags?: { name?: string };
}

interface LocalityResponse {
  elements?: LocalityElement[];
}

async function testPuneArea() {
  const query = `[out:json][timeout:25];
area(3610351626)->.a;
(
  nwr["place"~"^(suburb|neighbourhood|quarter)$"](area.a);
);
out center;`;

  const res = await fetch("https://overpass-api.de/api/interpreter", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": "Locus-Probe/0.1 (https://github.com/locus-app)"
    },
    body: `data=${encodeURIComponent(query)}`
  });

  const text = await res.text();
  console.log("Status:", res.status);
  try {
    const json = JSON.parse(text) as LocalityResponse;
    console.log("Elements count in Pune City Subdistrict:", json.elements?.length);
    console.log("Sample localities:", json.elements?.slice(0, 5).map((e) => e.tags?.name));
  } catch {
    console.log("Non-JSON:", text.slice(0, 300));
  }
}

testPuneArea().catch(console.error);
