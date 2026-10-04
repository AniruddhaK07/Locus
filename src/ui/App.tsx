import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import "./styles/dev.css";
import "./styles/shell.css";
import "./styles/home.css";
import "./styles/plan.css";
import "./styles/results.css";
import "./styles/detail.css";
import "./styles/method.css";
import "./styles/compare.css";
import "./styles/saved.css";
import "./styles/map.css";

import { Header } from "./components/Header";
import { Footer } from "./components/Footer";
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
      <div data-feature="app-shell" className="locus-shell">
        {/* Global Header with Navigation, Mode Banner, and Dev Scenario Switcher */}
        <Header />

        {/* Primary Route Surface */}
        <div className="locus-main-content">
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
        </div>

        {/* Quiet, Editorial Footer */}
        <Footer />
      </div>
    </BrowserRouter>
  );
}
