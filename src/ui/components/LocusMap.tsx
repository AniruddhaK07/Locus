import { useState, useId } from "react";

export interface MapPoint {
  id: string;
  name: string;
  lat: number;
  lon: number;
  matchScore?: number;
  rank?: number;
  isWorkplace?: boolean;
}

export interface LocusMapProps {
  points: MapPoint[];
  workplace?: { lat: number; lon: number; name: string };
  selectedId?: string;
  onSelectPoint?: (id: string) => void;
  className?: string;
  height?: string | number;
}

export function LocusMap({
  points,
  workplace,
  selectedId,
  onSelectPoint,
  className = "",
  height = "360px",
}: LocusMapProps) {
  const patternId = useId();
  const [hoveredPoint, setHoveredPoint] = useState<MapPoint | null>(null);

  // Combine workplace and area points for bounding box calculation
  const allPoints: MapPoint[] = [
    ...(workplace ? [{ id: "wp", name: workplace.name, lat: workplace.lat, lon: workplace.lon, isWorkplace: true }] : []),
    ...points,
  ];

  if (allPoints.length === 0) {
    return (
      <div
        data-feature="map-placeholder"
        className={`locus-map ${className}`.trim()}
        style={{ height }}
        role="region"
        aria-label="Map view"
      >
        <div className="locus-map__empty">
          <p>No coordinate data available to map.</p>
        </div>
      </div>
    );
  }

  // Calculate bounding box with padding
  const lats = allPoints.map((p) => p.lat);
  const lons = allPoints.map((p) => p.lon);

  const rawMinLat = Math.min(...lats);
  const rawMaxLat = Math.max(...lats);
  const rawMinLon = Math.min(...lons);
  const rawMaxLon = Math.max(...lons);

  const latSpan = Math.max(rawMaxLat - rawMinLat, 0.04);
  const lonSpan = Math.max(rawMaxLon - rawMinLon, 0.04);

  const padLat = latSpan * 0.15;
  const padLon = lonSpan * 0.15;

  const minLat = rawMinLat - padLat;
  const maxLat = rawMaxLat + padLat;
  const minLon = rawMinLon - padLon;
  const maxLon = rawMaxLon + padLon;

  const width = 800;
  const svgHeight = 500;

  const project = (lat: number, lon: number): [number, number] => {
    const x = ((lon - minLon) / (maxLon - minLon)) * width;
    const y = (1 - (lat - minLat) / (maxLat - minLat)) * svgHeight;
    return [Math.round(x * 10) / 10, Math.round(y * 10) / 10];
  };

  const centerLat = (rawMinLat + rawMaxLat) / 2;
  const centerLon = (rawMinLon + rawMaxLon) / 2;

  return (
    <div
      data-feature="map-placeholder"
      className={`locus-map ${className}`.trim()}
      style={{ height }}
      role="region"
      aria-label="Interactive locality map"
    >
      <svg
        className="locus-map__svg"
        viewBox={`0 0 ${width} ${svgHeight}`}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label="Map coordinate canvas showing locality pins"
      >
        <defs>
          {/* Subtle cartographic grid pattern */}
          <pattern id={patternId} width="40" height="40" patternUnits="userSpaceOnUse">
            <path
              d="M 40 0 L 0 0 0 40"
              fill="none"
              stroke="var(--line)"
              strokeWidth="0.5"
              strokeDasharray="2, 4"
              opacity="0.6"
            />
          </pattern>
        </defs>

        {/* Paper map background with subtle cartographic grid */}
        <rect width={width} height={svgHeight} fill="var(--surface)" />
        <rect width={width} height={svgHeight} fill={`url(#${patternId})`} />

        {/* Connector lines from workplace to points */}
        {workplace && points.map((p) => {
          const [wx, wy] = project(workplace.lat, workplace.lon);
          const [px, py] = project(p.lat, p.lon);
          const isSelected = selectedId === p.id;
          return (
            <line
              key={`conn-${p.id}`}
              x1={wx}
              y1={wy}
              x2={px}
              y2={py}
              stroke={isSelected ? "var(--ink)" : "var(--line-strong)"}
              strokeWidth={isSelected ? "1.5" : "0.75"}
              strokeDasharray={isSelected ? "none" : "3, 3"}
              opacity={isSelected ? "0.8" : "0.35"}
            />
          );
        })}

        {/* Locality candidate pins */}
        {points.map((p) => {
          const [x, y] = project(p.lat, p.lon);
          const isSelected = selectedId === p.id;
          const isHovered = hoveredPoint?.id === p.id;
          const radius = isSelected || isHovered ? 14 : 11;

          return (
            <g
              key={p.id}
              className="locus-map__pin"
              transform={`translate(${x}, ${y})`}
              onClick={() => onSelectPoint?.(p.id)}
              onMouseEnter={() => setHoveredPoint(p)}
              onMouseLeave={() => setHoveredPoint(null)}
              style={{ cursor: "pointer" }}
              tabIndex={0}
              role="button"
              aria-label={`${p.name} (Rank #${p.rank ?? "-"}, Score ${p.matchScore ?? "-"})`}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelectPoint?.(p.id);
                }
              }}
            >
              {/* Pulsing selection aura */}
              {(isSelected || isHovered) && (
                <circle
                  r={radius + 6}
                  fill="var(--accent)"
                  opacity="0.4"
                  className="locus-map__pulse"
                />
              )}

              {/* Pin circle */}
              <circle
                r={radius}
                fill={isSelected ? "var(--ink)" : "var(--surface-raised)"}
                stroke={isSelected ? "var(--ink)" : "var(--line-strong)"}
                strokeWidth={isSelected ? "2" : "1.5"}
              />

              {/* Rank text */}
              <text
                textAnchor="middle"
                dy="0.35em"
                fontSize={radius > 12 ? "11px" : "10px"}
                fontFamily="var(--font-sans)"
                fontWeight="600"
                fill={isSelected ? "var(--bg)" : "var(--ink)"}
              >
                {p.rank ?? "•"}
              </text>

              {/* Name label beneath pin */}
              <text
                y={radius + 12}
                textAnchor="middle"
                fontSize="10px"
                fontFamily="var(--font-sans)"
                fontWeight="500"
                fill="var(--ink)"
                className="locus-map__pin-label"
              >
                {p.name}
              </text>
            </g>
          );
        })}

        {/* Workplace pin */}
        {workplace && (() => {
          const [wx, wy] = project(workplace.lat, workplace.lon);
          return (
            <g
              className="locus-map__workplace-pin"
              transform={`translate(${wx}, ${wy})`}
              tabIndex={0}
              role="img"
              aria-label={`Workplace: ${workplace.name}`}
            >
              <rect
                x="-10"
                y="-10"
                width="20"
                height="20"
                transform="rotate(45)"
                fill="var(--danger)"
                stroke="var(--surface-raised)"
                strokeWidth="2"
              />
              <text
                y="18"
                textAnchor="middle"
                fontSize="10px"
                fontFamily="var(--font-sans)"
                fontWeight="600"
                fill="var(--danger)"
              >
                Workplace
              </text>
            </g>
          );
        })()}
      </svg>

      {/* Floating candidate info badge */}
      {hoveredPoint && (
        <div className="locus-map__popover" role="tooltip">
          <strong>{hoveredPoint.name}</strong>
          {hoveredPoint.rank && <span>Rank #{hoveredPoint.rank}</span>}
          {hoveredPoint.matchScore && <span>Match: {hoveredPoint.matchScore}/100</span>}
          <span style={{ fontSize: "10px", color: "var(--ink-muted)" }}>
            {hoveredPoint.lat.toFixed(3)}, {hoveredPoint.lon.toFixed(3)}
          </span>
        </div>
      )}

      {/* Cartographic footer metadata & OSM attribution */}
      <div className="locus-map__footer">
        <span className="locus-map__coords">
          Center: {centerLat.toFixed(3)}°N, {centerLon.toFixed(3)}°E · {points.length} candidates mapped
        </span>
        <span className="locus-map__attribution">
          Map data © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors
        </span>
      </div>
    </div>
  );
}
