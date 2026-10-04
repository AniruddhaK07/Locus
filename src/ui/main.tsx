import { StrictMode } from "react";
import ReactDOM from "react-dom/client";
import "@fontsource/fraunces/latin-600.css";
import "@fontsource/inter/latin-400.css";
import "@fontsource/inter/latin-500.css";
import "@fontsource/inter/latin-600.css";
import "./styles/tokens.css";
import "./styles/reset.css";
import "./styles/primitives.css";
import { App } from "./App";

const rootElement = document.getElementById("root");
if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <StrictMode>
      <App />
    </StrictMode>
  );
}
