import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import type { Destination, HouseholdType, PlaceSuggestion, Preferences, TransportMode } from "@engine";
import { getEngine } from "@engine";

export function PlanPage() {
  const navigate = useNavigate();
  const engine = getEngine();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Step 1: City & Workplace
  const [cityQuery, setCityQuery] = useState("Bengaluru");
  const [citySuggestions, setCitySuggestions] = useState<PlaceSuggestion[]>([]);
  const [resolvedCity, setResolvedCity] = useState<PlaceSuggestion | null>({
    id: "city-bengaluru",
    name: "Bengaluru",
    city: "Bengaluru",
    lat: 12.9716,
    lon: 77.5946,
    type: "city"
  });

  const [workQuery, setWorkQuery] = useState("Manyata Tech Park");
  const [workSuggestions, setWorkSuggestions] = useState<PlaceSuggestion[]>([]);
  const [resolvedWorkplace, setResolvedWorkplace] = useState<Destination | null>({
    id: "workplace",
    label: "Workplace",
    name: "Manyata Tech Park",
    lat: 13.0489,
    lon: 77.6200
  });

  // Step 2: Commute & Extra Destinations
  const [transportMode, setTransportMode] = useState<TransportMode>("car");
  const [maxCommuteMin, setMaxCommuteMin] = useState(45);
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [newDestLabel, setNewDestLabel] = useState("");
  const [newDestName, setNewDestName] = useState("");

  // Step 3: Budget & Household
  const [budgetMin, setBudgetMin] = useState<number | undefined>(20000);
  const [budgetMax, setBudgetMax] = useState<number>(60000);
  const [householdType, setHouseholdType] = useState<HouseholdType>("balanced");
  const [priorityFocus, setPriorityFocus] = useState<Preferences["priorityFocus"]>("commute");

  // Typeahead search
  useEffect(() => {
    let active = true;
    if (cityQuery.length >= 2 && !resolvedCity) {
      engine.suggestPlaces(cityQuery).then((res) => {
        if (active) setCitySuggestions(res);
      });
    } else {
      setCitySuggestions([]);
    }
    return () => { active = false; };
  }, [cityQuery, resolvedCity, engine]);

  useEffect(() => {
    let active = true;
    if (workQuery.length >= 2 && !resolvedWorkplace) {
      engine.suggestPlaces(workQuery, { city: resolvedCity?.name }).then((res) => {
        if (active) setWorkSuggestions(res);
      });
    } else {
      setWorkSuggestions([]);
    }
    return () => { active = false; };
  }, [workQuery, resolvedWorkplace, resolvedCity, engine]);

  const handleAddDestination = () => {
    if (destinations.length >= 3) {
      setErrorMsg("Maximum 3 additional destinations allowed.");
      return;
    }
    if (!newDestLabel.trim() || !newDestName.trim()) {
      setErrorMsg("Please specify both a label (e.g. Gym) and a place name.");
      return;
    }
    const newDest: Destination = {
      id: `dest-${Date.now()}`,
      label: newDestLabel.trim(),
      name: newDestName.trim(),
      lat: (resolvedCity?.lat ?? 12.9716) + (Math.random() - 0.5) * 0.05,
      lon: (resolvedCity?.lon ?? 77.5946) + (Math.random() - 0.5) * 0.05
    };
    setDestinations([...destinations, newDest]);
    setNewDestLabel("");
    setNewDestName("");
    setErrorMsg(null);
  };

  const handleRemoveDestination = (id: string) => {
    setDestinations(destinations.filter((d) => d.id !== id));
  };

  const handleNext = () => {
    setErrorMsg(null);
    if (step === 1) {
      if (!resolvedCity) {
        setErrorMsg("Please select and resolve a city from the suggestion list.");
        return;
      }
      if (!resolvedWorkplace) {
        setErrorMsg("Please select and resolve a workplace location.");
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (maxCommuteMin < 10 || maxCommuteMin > 180) {
        setErrorMsg("Maximum commute must be between 10 and 180 minutes.");
        return;
      }
      setStep(3);
    }
  };

  const handleBack = () => {
    setErrorMsg(null);
    if (step === 2) setStep(1);
    if (step === 3) setStep(2);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolvedCity || !resolvedWorkplace) {
      setErrorMsg("City and workplace are required.");
      return;
    }
    if (budgetMax <= 0) {
      setErrorMsg("Please enter a valid maximum budget.");
      return;
    }
    if (budgetMin !== undefined && budgetMin > budgetMax) {
      setErrorMsg("Minimum budget cannot exceed maximum budget.");
      return;
    }

    const prefs: Preferences = {
      city: resolvedCity.name,
      workplace: resolvedWorkplace,
      destinations,
      transportMode,
      maxCommuteMin,
      budgetMin,
      budgetMax,
      householdType,
      priorityFocus
    };

    try {
      localStorage.setItem("locus_last_prefs", JSON.stringify(prefs));
    } catch {
      // storage unavailable
    }

    const query = engine.prefsToQuery(prefs);
    navigate(`/results?${query}`);
  };

  return (
    <main data-feature="plan-screen" data-state="ready" className="box">
      <header>
        <h2>Preferences Stepper (Step {step} of 3)</h2>
        <div className="row" style={{ margin: "8px 0" }}>
          <span className={`badge ${step === 1 ? "winner" : ""}`}>1. City & Anchors</span>
          <span>&gt;</span>
          <span className={`badge ${step === 2 ? "winner" : ""}`}>2. Transit & Commute</span>
          <span>&gt;</span>
          <span className={`badge ${step === 3 ? "winner" : ""}`}>3. Budget & Lifestyle</span>
        </div>
      </header>

      {errorMsg && (
        <div className="error-msg" data-feature="validation-error">
          [Validation Error]: {errorMsg}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* STEP 1 */}
        {step === 1 && (
          <fieldset data-feature="step-1-panel">
            <legend>Step 1: City & Workplace</legend>

            <div>
              <label htmlFor="city-input">City Name:</label>
              <br />
              <input
                id="city-input"
                data-feature="city-input"
                value={cityQuery}
                onChange={(e) => {
                  setCityQuery(e.target.value);
                  setResolvedCity(null);
                }}
                placeholder="e.g. Bengaluru, Pune, Delhi"
              />
              {resolvedCity && (
                <div className="chip" data-feature="city-chip" style={{ marginLeft: "8px" }}>
                  <span>✓ {resolvedCity.name}</span>
                  <button type="button" onClick={() => setResolvedCity(null)}>×</button>
                </div>
              )}
            </div>

            {citySuggestions.length > 0 && !resolvedCity && (
              <div data-feature="city-suggestions" className="box" style={{ background: "#fff", padding: "6px" }}>
                <small>Select matching city:</small>
                {citySuggestions.map((s) => (
                  <div key={s.id} className="row" style={{ justifyContent: "space-between", margin: "4px 0" }}>
                    <span>{s.name} ({s.state || s.type})</span>
                    <button
                      type="button"
                      data-feature="city-select-btn"
                      onClick={() => {
                        setResolvedCity(s);
                        setCityQuery(s.name);
                        setCitySuggestions([]);
                      }}
                    >
                      Select
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div style={{ marginTop: "16px" }}>
              <label htmlFor="workplace-input">Primary Anchor / Workplace:</label>
              <br />
              <input
                id="workplace-input"
                data-feature="workplace-input"
                value={workQuery}
                onChange={(e) => {
                  setWorkQuery(e.target.value);
                  setResolvedWorkplace(null);
                }}
                placeholder="e.g. Manyata Tech Park, Cyber City"
              />
              {resolvedWorkplace && (
                <div className="chip" data-feature="workplace-chip" style={{ marginLeft: "8px" }}>
                  <span>✓ {resolvedWorkplace.name}</span>
                  <button type="button" onClick={() => setResolvedWorkplace(null)}>×</button>
                </div>
              )}
            </div>

            {workSuggestions.length > 0 && !resolvedWorkplace && (
              <div data-feature="workplace-suggestions" className="box" style={{ background: "#fff", padding: "6px" }}>
                <small>Select workplace location:</small>
                {workSuggestions.map((s) => (
                  <div key={s.id} className="row" style={{ justifyContent: "space-between", margin: "4px 0" }}>
                    <span>{s.name} ({s.city || s.type})</span>
                    <button
                      type="button"
                      data-feature="workplace-select-btn"
                      onClick={() => {
                        setResolvedWorkplace({
                          id: s.id,
                          label: "Workplace",
                          name: s.name,
                          lat: s.lat,
                          lon: s.lon
                        });
                        setWorkQuery(s.name);
                        setWorkSuggestions([]);
                      }}
                    >
                      Select
                    </button>
                  </div>
                ))}
              </div>
            )}
          </fieldset>
        )}

        {/* STEP 2 */}
        {step === 2 && (
          <fieldset data-feature="step-2-panel">
            <legend>Step 2: Commute & Additional Destinations</legend>

            <div>
              <label htmlFor="transport-select">Transport Mode:</label>
              <br />
              <select
                id="transport-select"
                data-feature="transport-select"
                value={transportMode}
                onChange={(e) => setTransportMode(e.target.value as TransportMode)}
              >
                <option value="car">Driving / Car (OSRM routed-car)</option>
                <option value="bike">Bicycle / Two-Wheeler (OSRM routed-bike)</option>
                <option value="walk">Walking (OSRM routed-foot)</option>
                <option value="transit">Public Transit (Metro/Bus - Heuristic)</option>
              </select>
            </div>

            <div style={{ marginTop: "12px" }}>
              <label htmlFor="max-commute-input">Maximum Acceptable Commute (minutes):</label>
              <br />
              <input
                id="max-commute-input"
                type="number"
                data-feature="max-commute-input"
                min="10"
                max="180"
                value={maxCommuteMin}
                onChange={(e) => setMaxCommuteMin(Number(e.target.value))}
              />
            </div>

            <fieldset style={{ marginTop: "16px" }}>
              <legend>Additional Regular Destinations (Max 3)</legend>
              {destinations.map((d) => (
                <div key={d.id} className="row" data-feature="dest-row" style={{ margin: "4px 0" }}>
                  <span className="badge">[{d.label}]</span>
                  <span>{d.name}</span>
                  <button
                    type="button"
                    data-feature="remove-dest-btn"
                    onClick={() => handleRemoveDestination(d.id)}
                  >
                    Remove
                  </button>
                </div>
              ))}

              {destinations.length < 3 && (
                <div className="row" style={{ marginTop: "8px" }}>
                  <input
                    placeholder="Label (e.g. Gym)"
                    value={newDestLabel}
                    onChange={(e) => setNewDestLabel(e.target.value)}
                    style={{ width: "120px" }}
                  />
                  <input
                    placeholder="Location Name"
                    value={newDestName}
                    onChange={(e) => setNewDestName(e.target.value)}
                    style={{ width: "200px" }}
                  />
                  <button type="button" data-feature="add-dest-btn" onClick={handleAddDestination}>
                    + Add Destination
                  </button>
                </div>
              )}
            </fieldset>
          </fieldset>
        )}

        {/* STEP 3 */}
        {step === 3 && (
          <fieldset data-feature="step-3-panel">
            <legend>Step 3: Budget & Household Profile</legend>

            <div className="row">
              <div>
                <label htmlFor="budget-min-input">Min Monthly Rent (₹/mo):</label>
                <br />
                <input
                  id="budget-min-input"
                  type="number"
                  data-feature="budget-min-input"
                  step="1000"
                  value={budgetMin ?? ""}
                  placeholder="Optional"
                  onChange={(e) => setBudgetMin(e.target.value ? Number(e.target.value) : undefined)}
                />
              </div>

              <div>
                <label htmlFor="budget-max-input">Max Monthly Rent (₹/mo):</label>
                <br />
                <input
                  id="budget-max-input"
                  type="number"
                  data-feature="budget-max-input"
                  step="1000"
                  value={budgetMax}
                  onChange={(e) => setBudgetMax(Number(e.target.value))}
                />
              </div>
            </div>

            <div style={{ marginTop: "12px" }}>
              <label htmlFor="household-select">Household Type:</label>
              <br />
              <select
                id="household-select"
                data-feature="household-select"
                value={householdType}
                onChange={(e) => setHouseholdType(e.target.value as HouseholdType)}
              >
                <option value="balanced">Balanced Individual / General</option>
                <option value="family">Family (Prioritizes Schools, Parks, Healthcare)</option>
                <option value="couple">Couple (Prioritizes Food, Dining, Leisure)</option>
                <option value="student">Student (Prioritizes Education, Transit, Budget)</option>
              </select>
            </div>

            <div style={{ marginTop: "12px" }}>
              <label htmlFor="priority-select">Top Priority Focus (Optional):</label>
              <br />
              <select
                id="priority-select"
                data-feature="priority-select"
                value={priorityFocus}
                onChange={(e) => setPriorityFocus(e.target.value as Preferences["priorityFocus"])}
              >
                <option value="commute">Shortest Commute</option>
                <option value="budget">Best Budget Fit</option>
                <option value="amenities">Rich Daily Amenities</option>
                <option value="safety">Infrastructure & Well-lit Streets</option>
                <option value="transit">Public Transit Connectivity</option>
              </select>
            </div>
          </fieldset>
        )}

        {/* CONTROLS */}
        <div className="row" style={{ marginTop: "16px", justifyContent: "space-between" }}>
          {step > 1 ? (
            <button type="button" data-feature="step-back-btn" onClick={handleBack}>
              &larr; Back
            </button>
          ) : <div />}

          {step < 3 ? (
            <button type="button" data-feature="step-next-btn" onClick={handleNext}>
              Next Step &rarr;
            </button>
          ) : (
            <button type="submit" data-feature="submit-search-btn" style={{ fontWeight: "bold" }}>
              Discover & Rank Neighbourhoods &rarr;
            </button>
          )}
        </div>
      </form>
    </main>
  );
}
