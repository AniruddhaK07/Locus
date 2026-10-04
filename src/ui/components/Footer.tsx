import { Link } from "react-router-dom";
import { isDevMode } from "../utils/dev";

export function Footer() {
  const showDev = isDevMode();

  return (
    <footer className="locus-footer" role="contentinfo">
      <div className="locus-footer__content">
        <div className="locus-footer__meta">
          <p className="locus-footer__statement">
            Locus · Transparent neighbourhood intelligence for relocating in India. OpenStreetMap &amp; open routing models.
          </p>
          <p className="locus-footer__sub">
            $0 public infrastructure · Zero proprietary tracking · Calibrated open data
          </p>
        </div>

        <nav className="locus-footer__links" aria-label="Footer links">
          <Link to="/method" className="locus-footer__link">
            How it works (Methodology)
          </Link>
          <Link to="/saved" className="locus-footer__link">
            Saved Localities
          </Link>
          {showDev && (
            <Link to="/_map" className="locus-footer__link locus-footer__link--dev">
              Dev Route Catalog
            </Link>
          )}
        </nav>
      </div>
    </footer>
  );
}
