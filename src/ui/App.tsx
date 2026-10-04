import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import "./skeleton.css";

import { Nav } from "./components/Nav";
import { ScenarioSwitcher } from "./components/ScenarioSwitcher";
import { HomePage } from "./pages/HomePage";
import { PlanPage } from "./pages/PlanPage";
import { ResultsPage } from "./pages/ResultsPage";
import { AreaDetailPage } from "./pages/AreaDetailPage";
import { ComparePage } from "./pages/ComparePage";
import { SavedPage } from "./pages/SavedPage";
import { MethodPage } from "./pages/MethodPage";
import { DevMapPage } from "./pages/DevMapPage";
import { PrimitivesPage } from "./pages/PrimitivesPage";

export function App() {
  return (
    <BrowserRouter>
      <div data-feature="app-shell" style={{ maxWidth: "1100px", margin: "0 auto", padding: "8px" }}>
        {/* Dev Scenario Switcher always visible in skeleton */}
        <ScenarioSwitcher />

        {/* Global Main Navigation */}
        <Nav />

        {/* Primary Page Routes */}
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/plan" element={<PlanPage />} />
          <Route path="/results" element={<ResultsPage />} />
          <Route path="/area/:id" element={<AreaDetailPage />} />
          <Route path="/compare" element={<ComparePage />} />
          <Route path="/saved" element={<SavedPage />} />
          <Route path="/method" element={<MethodPage />} />
          <Route path="/_map" element={<DevMapPage />} />
          <Route path="/primitives" element={<PrimitivesPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>

        <footer style={{ marginTop: "32px", borderTop: "1px solid #ddd", paddingTop: "12px", fontSize: "11px", color: "#666" }}>
          <p>Locus Wireframe Skeleton · Framework-Agnostic Engine Contract · $0 Public Infrastructure</p>
        </footer>
      </div>
    </BrowserRouter>
  );
}
