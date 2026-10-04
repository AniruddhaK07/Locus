import { describe, it, expect } from "vitest";
import { getEngine } from "../src/engine";
import type { Preferences } from "../src/engine";

describe("Phase U1: Plan Stepper & Query Contract (§6)", () => {
  const engine = getEngine();

  it("serializes preferences to query string identically to wireframe contract", () => {
    const prefs: Preferences = {
      city: "Bengaluru",
      workplace: {
        id: "workplace",
        label: "Workplace",
        name: "Manyata Tech Park",
        lat: 13.0489,
        lon: 77.62,
      },
      destinations: [
        {
          id: "dest-1",
          label: "Gym",
          name: "Cult Fit Koramangala",
          lat: 12.935,
          lon: 77.62,
        },
      ],
      transportMode: "car",
      maxCommuteMin: 45,
      budgetMin: 25000,
      budgetMax: 55000,
      householdType: "balanced",
      priorityFocus: "commute",
    };

    const query = engine.prefsToQuery(prefs);
    expect(query).toBeTruthy();

    const parsed = engine.queryToPrefs(query);
    expect(parsed).not.toBeNull();
    expect(parsed?.city).toBe("Bengaluru");
    expect(parsed?.workplace.name).toBe("Manyata Tech Park");
    expect(parsed?.destinations).toHaveLength(1);
    expect(parsed?.destinations[0].label).toBe("Gym");
    expect(parsed?.transportMode).toBe("car");
    expect(parsed?.maxCommuteMin).toBe(45);
    expect(parsed?.budgetMin).toBe(25000);
    expect(parsed?.budgetMax).toBe(55000);
    expect(parsed?.householdType).toBe("balanced");
    expect(parsed?.priorityFocus).toBe("commute");
  });

  it("filters routing profiles to available transport modes per engine.method()", () => {
    const method = engine.method();
    const availableModes = Object.entries(method.routingProfiles)
      .filter(([, p]) => p.available)
      .map(([mode]) => mode);

    expect(availableModes).toContain("car");
    expect(availableModes).toContain("bike");
    expect(availableModes).toContain("walk");
  });
});
