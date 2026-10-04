import React, { useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import type {
  Destination,
  HouseholdType,
  PlaceSuggestion,
  Preferences,
  TransportMode,
} from "@engine";
import { getEngine } from "@engine";
import { Combobox } from "../components/Combobox";
import { Button } from "../primitives/Button";
import { Slider } from "../primitives/Slider";
import { Select } from "../primitives/Select";
import { Field } from "../primitives/Field";
import { formatCurrency } from "../utils/format";

export function PlanPage() {
  const navigate = useNavigate();
  const engine = getEngine();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Step 1: City & Workplace Anchor
  const [cityQuery, setCityQuery] = useState("Bengaluru");
  const [resolvedCity, setResolvedCity] = useState<PlaceSuggestion | null>({
    id: "city-bengaluru",
    name: "Bengaluru",
    city: "Bengaluru",
    lat: 12.9716,
    lon: 77.5946,
    type: "city",
  });

  const [workQuery, setWorkQuery] = useState("Manyata Tech Park");
  const [resolvedWorkplace, setResolvedWorkplace] = useState<Destination | null>({
    id: "workplace",
    label: "Workplace",
    name: "Manyata Tech Park",
    lat: 13.0489,
    lon: 77.62,
  });

  // Step 2: Commute & Secondary Destinations
  const [transportMode, setTransportMode] = useState<TransportMode>("car");
  const [maxCommuteMin, setMaxCommuteMin] = useState(45);
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [isAddingDest, setIsAddingDest] = useState(false);
  const [newDestLabel, setNewDestLabel] = useState("");
  const [newDestName, setNewDestName] = useState("");

  // Step 3: Budget & Household Fit
  const [budgetMin, setBudgetMin] = useState<number | undefined>(20000);
  const [budgetMax, setBudgetMax] = useState<number>(60000);
  const [householdType, setHouseholdType] = useState<HouseholdType>("balanced");
  const [priorityFocus, setPriorityFocus] = useState<Preferences["priorityFocus"]>("commute");

  // Routing profiles from engine.method() (§3)
  const routingProfiles = useMemo(() => {
    try {
      return engine.method().routingProfiles;
    } catch {
      return null;
    }
  }, [engine]);

  const transportOptions = useMemo(() => {
    const modes: { mode: TransportMode; label: string }[] = [
      { mode: "car", label: "Car" },
      { mode: "bike", label: "Two-wheeler (Bike)" },
      { mode: "walk", label: "Walking" },
      { mode: "transit", label: "Public Transit" },
    ];

    if (!routingProfiles) {
      return modes.map((m) => ({ value: m.mode, label: m.label }));
    }

    return modes
      .filter((m) => routingProfiles[m.mode]?.available)
      .map((m) => {
        const isHeuristic = routingProfiles[m.mode]?.isHeuristic;
        const note = isHeuristic ? " (estimate)" : "";
        return {
          value: m.mode,
          label: `${m.label}${note}`,
        };
      });
  }, [routingProfiles]);

  // Place suggestions fetchers
  const fetchCitySuggestions = useCallback(
    async (query: string, signal: AbortSignal) => {
      return engine.suggestPlaces(query, undefined, signal);
    },
    [engine]
  );

  const fetchWorkplaceSuggestions = useCallback(
    async (query: string, signal: AbortSignal) => {
      return engine.suggestPlaces(query, { city: resolvedCity?.name }, signal);
    },
    [engine, resolvedCity]
  );

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
      lon: (resolvedCity?.lon ?? 77.5946) + (Math.random() - 0.5) * 0.05,
    };

    setDestinations([...destinations, newDest]);
    setNewDestLabel("");
    setNewDestName("");
    setIsAddingDest(false);
    setErrorMsg(null);
  };

  const handleRemoveDestination = (id: string) => {
    setDestinations(destinations.filter((d) => d.id !== id));
  };

  const handleNext = () => {
    setErrorMsg(null);
    if (step === 1) {
      if (!resolvedCity) {
        setErrorMsg("Please select and resolve a city from the suggestions.");
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
      setErrorMsg("Please enter a valid maximum monthly budget.");
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
      priorityFocus,
    };

    try {
      localStorage.setItem("locus_last_prefs", JSON.stringify(prefs));
    } catch {
      // storage unavailable
    }

    const query = engine.prefsToQuery(prefs);
    navigate(`/results?${query}`);
  };

  // Keyboard Enter navigation between steps
  const handleFormKeyDown = (e: React.KeyboardEvent<HTMLFormElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      const target = e.target as HTMLElement;
      // Do not advance if user is typing in combobox or button
      if (target.tagName === "INPUT" && target.getAttribute("role") !== "combobox") {
        if (step < 3) {
          e.preventDefault();
          handleNext();
        }
      }
    }
  };

  return (
    <main data-feature="plan-screen" data-state="ready" className="locus-stepper">
      {/* 3-Segment Progress Indicator (§6) */}
      <div className="locus-stepper__progress" aria-hidden="true">
        <div className={`locus-stepper__segment ${step === 1 ? "locus-stepper__segment--active" : "locus-stepper__segment--completed"}`} />
        <div className={`locus-stepper__segment ${step === 2 ? "locus-stepper__segment--active" : step > 2 ? "locus-stepper__segment--completed" : ""}`} />
        <div className={`locus-stepper__segment ${step === 3 ? "locus-stepper__segment--active" : ""}`} />
      </div>

      <div className="locus-stepper__meta">
        <span className="locus-stepper__step-tag">Step {step} of 3</span>
        <span style={{ fontSize: "var(--text-xs)", color: "var(--ink-muted)" }}>
          {step === 1 ? "City & Workplace" : step === 2 ? "Transit & Commute" : "Budget & Household"}
        </span>
      </div>

      <form onSubmit={handleSubmit} onKeyDown={handleFormKeyDown} noValidate>
        {/* ==================================================================
            STEP 1: City & Workplace Anchors
            ================================================================== */}
        {step === 1 && (
          <fieldset data-feature="step-1-panel" className="locus-stepper__panel">
            <legend className="locus-stepper__title">Where do you work and live?</legend>
            <p className="locus-stepper__desc">
              Specify your destination city and primary workplace or study anchor.
            </p>

            <Combobox
              label="Destination City"
              inputId="city-input"
              value={cityQuery}
              selectedItem={resolvedCity}
              onInputChange={(val) => {
                setCityQuery(val);
                setResolvedCity(null);
              }}
              onSelect={(item) => {
                setResolvedCity(item);
                setCityQuery(item.name);
              }}
              onClear={() => {
                setResolvedCity(null);
                setCityQuery("");
              }}
              fetchSuggestions={fetchCitySuggestions}
              inputDataFeature="city-input"
              suggestionsDataFeature="city-suggestions"
              selectBtnDataFeature="city-select-btn"
              chipDataFeature="city-chip"
              placeholder="e.g. Bengaluru, Pune, Delhi"
              autoFocus
            />

            <Combobox
              label="Primary Workplace or Anchor"
              inputId="workplace-input"
              value={workQuery}
              selectedItem={resolvedWorkplace}
              onInputChange={(val) => {
                setWorkQuery(val);
                setResolvedWorkplace(null);
              }}
              onSelect={(item) => {
                setResolvedWorkplace({
                  id: "workplace",
                  label: "Workplace",
                  name: item.name,
                  lat: item.lat,
                  lon: item.lon,
                });
                setWorkQuery(item.name);
              }}
              onClear={() => {
                setResolvedWorkplace(null);
                setWorkQuery("");
              }}
              fetchSuggestions={fetchWorkplaceSuggestions}
              inputDataFeature="workplace-input"
              suggestionsDataFeature="workplace-suggestions"
              selectBtnDataFeature="workplace-select-btn"
              chipDataFeature="workplace-chip"
              placeholder="e.g. Manyata Tech Park, Cyber City, BKC"
            />
          </fieldset>
        )}

        {/* ==================================================================
            STEP 2: Transit & Commute
            ================================================================== */}
        {step === 2 && (
          <fieldset data-feature="step-2-panel" className="locus-stepper__panel">
            <legend className="locus-stepper__title">How do you get around?</legend>
            <p className="locus-stepper__desc">
              Configure your daily commute mode and maximum acceptable travel time.
            </p>

            <Select
              label="Daily Transport Mode"
              id="transport-select"
              data-feature="transport-select"
              value={transportMode}
              options={transportOptions}
              onChange={(e) => setTransportMode(e.target.value as TransportMode)}
            />

            <Slider
              label="Maximum One-Way Commute"
              id="max-commute-input"
              data-feature="max-commute-input"
              min={15}
              max={120}
              step={5}
              value={maxCommuteMin}
              unit="min"
              onChange={setMaxCommuteMin}
            />

            {/* Secondary Destinations (gym, school, etc. up to 3) */}
            <div style={{ marginTop: "var(--space-4)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <span className="locus-field__label">Secondary Destinations ({destinations.length}/3)</span>
                {!isAddingDest && destinations.length < 3 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    data-feature="add-dest-btn"
                    onClick={() => setIsAddingDest(true)}
                  >
                    + Add a destination
                  </Button>
                )}
              </div>

              {destinations.length > 0 && (
                <div className="locus-dest-list">
                  {destinations.map((d) => (
                    <div key={d.id} className="locus-dest-item" data-feature="dest-row">
                      <div>
                        <strong>{d.label}:</strong> <span>{d.name}</span>
                      </div>
                      <button
                        type="button"
                        data-feature="remove-dest-btn"
                        className="locus-chip__remove"
                        onClick={() => handleRemoveDestination(d.id)}
                        aria-label={`Remove ${d.label}`}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {isAddingDest && (
                <div
                  style={{
                    backgroundColor: "var(--surface)",
                    border: "var(--border-hairline)",
                    borderRadius: "var(--radius-sm)",
                    padding: "var(--space-3)",
                    marginTop: "var(--space-2)",
                    display: "flex",
                    flexDirection: "column",
                    gap: "var(--space-2)",
                  }}
                >
                  <div style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: "var(--space-2)" }}>
                    <input
                      placeholder="Label (e.g. Gym)"
                      value={newDestLabel}
                      onChange={(e) => setNewDestLabel(e.target.value)}
                      className="locus-field__input"
                    />
                    <input
                      placeholder="Locality or place name"
                      value={newDestName}
                      onChange={(e) => setNewDestName(e.target.value)}
                      className="locus-field__input"
                    />
                  </div>
                  <div style={{ display: "flex", gap: "var(--space-2)", justifyContent: "flex-end" }}>
                    <Button type="button" variant="ghost" size="sm" onClick={() => setIsAddingDest(false)}>
                      Cancel
                    </Button>
                    <Button type="button" variant="secondary" size="sm" onClick={handleAddDestination}>
                      Add
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </fieldset>
        )}

        {/* ==================================================================
            STEP 3: Budget & Household
            ================================================================== */}
        {step === 3 && (
          <fieldset data-feature="step-3-panel" className="locus-stepper__panel">
            <legend className="locus-stepper__title">What is your budget & household fit?</legend>
            <p className="locus-stepper__desc">
              Rental bands are calibrated against city tiers. No broker listings are contacted.
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-4)" }}>
              <Field
                label="Target Monthly Budget"
                id="budget-min-input"
                data-feature="budget-min-input"
                type="number"
                step="1000"
                min="5000"
                value={budgetMin ?? ""}
                hint={budgetMin ? formatCurrency(budgetMin) : "Optional"}
                onChange={(e) => setBudgetMin(e.target.value ? Number(e.target.value) : undefined)}
              />

              <Field
                label="Maximum Budget"
                id="budget-max-input"
                data-feature="budget-max-input"
                type="number"
                step="1000"
                min="10000"
                required
                value={budgetMax}
                hint={formatCurrency(budgetMax)}
                onChange={(e) => setBudgetMax(Number(e.target.value))}
              />
            </div>

            {/* Segmented Control for Household */}
            <div className="locus-field">
              <label htmlFor="household-select" className="locus-field__label">
                Household Composition
              </label>
              <div className="locus-segmented" role="radiogroup" aria-label="Household Composition">
                {[
                  { value: "balanced", label: "Balanced / Standard" },
                  { value: "student", label: "Student / Single" },
                  { value: "couple", label: "Couple / Dual Income" },
                  { value: "family", label: "Family with Children" },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    role="radio"
                    aria-checked={householdType === opt.value}
                    data-feature="household-select"
                    className={`locus-segmented__btn ${householdType === opt.value ? "locus-segmented__btn--active" : ""}`}
                    onClick={() => setHouseholdType(opt.value as HouseholdType)}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <Select
              label="Priority Focus (Optional)"
              id="priority-select"
              data-feature="priority-select"
              value={priorityFocus ?? "commute"}
              options={[
                { value: "commute", label: "Commute Convenience" },
                { value: "budget", label: "Rent & Budget Fit" },
                { value: "amenities", label: "Amenity Richness" },
                { value: "safety", label: "Infrastructure & Safety" },
                { value: "transit", label: "Transit Connectivity" },
              ]}
              onChange={(e) => setPriorityFocus(e.target.value as Preferences["priorityFocus"])}
            />
          </fieldset>
        )}

        {/* Inline validation error (reserved slot, zero layout jump) */}
        <div className="locus-field__error-slot" aria-live="polite" style={{ minHeight: "1.5rem", marginTop: "var(--space-2)" }}>
          {errorMsg && (
            <span role="alert" data-feature="validation-error" style={{ color: "var(--danger)" }}>
              {errorMsg}
            </span>
          )}
        </div>

        {/* Stepper Navigation Buttons */}
        <div className="locus-stepper__actions">
          {step > 1 ? (
            <Button
              type="button"
              variant="secondary"
              data-feature="step-back-btn"
              onClick={handleBack}
            >
              Back
            </Button>
          ) : (
            <div />
          )}

          {step < 3 ? (
            <Button
              type="button"
              variant="primary"
              data-feature="step-next-btn"
              onClick={handleNext}
              arrow
            >
              Continue
            </Button>
          ) : (
            <Button
              type="submit"
              variant="primary"
              data-feature="submit-search-btn"
              arrow
            >
              Find Neighbourhoods
            </Button>
          )}
        </div>
      </form>
    </main>
  );
}
