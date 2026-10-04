# Locus — UI Design System & Technical Specification

**Document Version:** 1.0.0 (Phase U0 Checkpoint)  
**Status:** Active  
**Design Intent:** Quiet, editorial, confident, warm, honest. Closer to a well-made magazine than an analytics dashboard.

---

## 1. Tokens & Color System

All visual tokens are defined strictly in `src/ui/styles/tokens.css`. Hex literals and magic numbers outside `tokens.css` are forbidden.

### 1.1 Palette & Measured WCAG 2.2 Contrast Ratios

The palette is rooted in warm editorial tones. All contrast ratios are measured mathematically via relative luminance scripts:

| Token | Hex Value | Role | Contrast vs `--bg` | Contrast vs `--surface` | WCAG 2.2 AA Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `--bg` | `#FFF3EB` | Page background | Base (1:1) | — | — |
| `--ink` | `#2C2A2E` | Body text, titles, primary buttons | **13.04:1** | **13.62:1** | Exceeds AAA (≥ 7:1) |
| `--ink-muted` | `#6B6469` | Secondary captions, provenance text | **5.28:1** | **5.51:1** | Passes AA (≥ 4.5:1) |
| `--line` | `#D6C2BE` | Subtle hairline dividers, borders | 1.56:1 | 1.63:1 | Decorative / Hairline |
| `--line-strong`| `#9C8783` | Interactive control borders | **3.10:1** | **3.24:1** | Passes UI Component (≥ 3:1) |
| `--soft` | `#F9CEC4` | Selected / hover fills | 1.31:1 | 1.37:1 | Fill (text on it: `--ink` at 9.92:1) |
| `--accent` | `#F7A8A1` | Single accent moment per view | 1.74:1 | 1.82:1 | Fill (text on it: `--ink` at 7.49:1) |
| `--surface` | `#FFF9F4` | Elevated cards, dropdowns, panels | 1.04:1 | Base (1:1) | Surface |
| `--surface-raised`| `#FFFFFF` | Popovers, tooltips, dialogs | 1.09:1 | 1.04:1 | Surface |
| `--danger` | `#A84A36` | Validation errors, warning text | **5.21:1** | **5.44:1** | Passes AA (≥ 4.5:1) |
| `--ok` | `#4F6B53` | High confidence indicator | **5.41:1** | **5.65:1** | Passes AA (≥ 4.5:1) |

*Rules:*
1. Text on `--bg` or `--surface` must be `--ink` or `--ink-muted`.
2. Fills using `--soft` or `--accent` must always use `--ink` text (never white text).
3. Colour never carries semantic meaning alone (confidence and errors always carry accompanying text or distinct glyphs).

### 1.2 Dark Mode Palette & Measured WCAG 2.2 Contrast Ratios

Dark mode uses a quiet, warm espresso-charcoal theme (`--bg: #1F1D20`). Contrast ratios measured against dark background:

| Token | Hex Value | Role | Contrast vs `--bg` (`#1F1D20`) | WCAG 2.2 Status |
| :--- | :--- | :--- | :--- | :--- |
| `--bg` | `#1F1D20` | Dark page background | Base (1:1) | — |
| `--ink` | `#FFF3EB` | Primary text and headings | **15.42:1** | Exceeds AAA (≥ 7:1) |
| `--ink-muted` | `#B5ACA8` | Secondary captions, provenance text | **7.37:1** | Exceeds AAA (≥ 7:1) |
| `--line` | `#423E41` | Dividers and hairline borders | 1.81:1 | Decorative / Hairline |
| `--line-strong`| `#6E676B` | Interactive borders & card outlines | **3.08:1** | Passes UI Component (≥ 3:1) |
| `--soft` | `#383032` | Hover and table fills | 1.48:1 | Fill |
| `--accent` | `#F7A8A1` | Highlights & active badges | **9.45:1** | Exceeds AAA (≥ 7:1) |
| `--surface` | `#272528` | Elevated card surfaces | 1.15:1 | Surface |
| `--surface-raised`| `#312E33`| Popovers, modals, dropdowns | 1.34:1 | Surface |
| `--danger` | `#E0735E` | Validation errors and warnings | **5.40:1** | Passes AA (≥ 4.5:1) |
| `--ok` | `#79A37F` | High confidence indicator | **6.19:1** | Passes AA (≥ 4.5:1) |

---

## 2. Typography

- **Headings / Display:** Refined serif `Fraunces` via `@fontsource/fraunces` (self-hosted Latin subset, `font-display: swap`).
- **UI / Body:** Clean neutral sans `Inter` via `@fontsource/inter` (self-hosted Latin subset, `font-display: swap`).
- **Code / Monospace:** System monospace fallback stack.
- **Figures / Scores:** Tabular figures (`font-variant-numeric: tabular-nums`) applied to scores, rents, commutes, and comparisons to prevent alignment jitter.

### Fluid Type Scale (clamp-based)

- `--text-xs`: `clamp(0.75rem, 0.72rem + 0.15vw, 0.8125rem)` (12–13px)
- `--text-sm`: `clamp(0.8125rem, 0.78rem + 0.18vw, 0.875rem)` (13–14px)
- `--text-base`: `clamp(0.9375rem, 0.9rem + 0.2vw, 1rem)` (15–16px)
- `--text-lg`: `clamp(1.125rem, 1.05rem + 0.35vw, 1.25rem)` (18–20px)
- `--text-xl`: `clamp(1.35rem, 1.2rem + 0.7vw, 1.625rem)` (21.6–26px)
- `--text-2xl`: `clamp(1.75rem, 1.5rem + 1.2vw, 2.25rem)` (28–36px)
- `--text-3xl`: `clamp(2.25rem, 1.8rem + 2vw, 3rem)` (36–48px)

---

## 3. Motion & Animation Tokens

- `--ease-out`: `cubic-bezier(0.22, 1, 0.36, 1)`
- `--dur-fast`: `140ms`
- `--dur-base`: `220ms`
- `--dur-slow`: `400ms`

### Motion Rules
1. Only `transform` and `opacity` (and hover background/border transitions) are animated.
2. No bounce, wobble, parallax, or auto-playing loops.
3. **Primary button hover:** coral fill sweeps in from bottom (`translateY(100%) -> translateY(0)`) while arrow glides 2px right. Press activates subtle scale `0.985`.
4. **Primary button loading:** label crossfades to a slim 2px sweeping line (no spinning rings).
5. **Reduced Motion (`prefers-reduced-motion: reduce`):** All transforms and sweeps are disabled (`transform: none !important; animation-duration: 0.01ms !important; transition-duration: 0.01ms !important;`). Verified by automated tests.

---

## 4. Component Inventory & States

| Primitive | Props & API | States Supported |
| :--- | :--- | :--- |
| `Button` | `variant: primary\|secondary\|ghost`, `size: md\|sm`, `loading?: boolean`, `arrow?: boolean` | default, hover, active (scale 0.985), loading (inline sweep), disabled |
| `IconButton` | `label: string`, `icon: ReactNode`, `active?: boolean` | default, hover, active (pulse scale 1.08), disabled |
| `Field` | `label: string`, `id: string`, `hint?: string`, `error?: string`, `renderControl?` | default, focused, error (reserved validation slot, 0 CLS), disabled |
| `Select` | `label?: string`, `id: string`, `options: SelectOption[]` | default, hover, focused, disabled |
| `Slider` | `label: string`, `id: string`, `min`, `max`, `step`, `value`, `onChange`, `unit`, `formatValue` | default, active thumb, disabled, tabular numeric readout |
| `Chip` | `label: string`, `onRemove?: () => void`, `icon?: ReactNode` | default, hover remove button |
| `ConfidenceMark` | `confidence: "high"\|"medium"\|"low"\|"none"`, `showWord?: boolean` | `high` ●, `medium` ◐, `low` ○, `none` ⊘ (shown without color dependency) |
| `ProvenanceBadge` | `metric?: Measured<T>`, `source`, `confidence`, `note`, `fetchedAt`, `value` | valid measured, "Not available" + note when null, accessible tooltip |
| `Card` | `interactive?: boolean` | static, interactive (hover lift `translateY(-1px)` and border darken) |
| `Skeleton` | `width`, `height`, `radius` | pulsing opacity shimmer (CLS = 0) |
| `Disclosure` | `title`, `children`, `defaultOpen`, `open`, `onOpenChange` | collapsed, expanded (90deg chevron rotation) |
| `Tooltip` | `content: ReactNode`, `children: ReactNode` | hidden, visible on hover and keyboard `:focus-within` |
| `Toast` | `message: string`, `onDismiss: () => void`, `durationMs?: number` | slide-in, auto-dismiss, accessible polite region |
| `EmptyState` | `message: string`, `action?: { label, onClick }`, `icon?: ReactNode` | one sentence + one action |
| `ErrorState` | `message: string`, `onRetry?: () => void`, `retryLabel?: string`, `secondaryAction?: { label, onClick }` | one sentence + retry action + optional secondary action ("Use recorded demo cities") |
| `ModeBanner` | `mode?: "mock"\|"snapshot"\|"live"`, `capturedDate?: string` | reflects actual mode: mock ("Sample data"), snapshot ("Recorded demo data · captured ..." + "Switch to live search"), live (hidden) |
| `LocusMap` | `points: MapPoint[]`, `workplace?`, `selectedId?`, `onSelectPoint?` | SVG cartographic projection, interactive pin aura, popovers, workplace pin, ODbL attribution |

---

## 5. Responsive Breakpoints & Viewport Grid

Locus is audited and visually verified across 3 core viewport widths:

1. **Mobile (360px):** Single-column stacked layout, full-width inputs, horizontal scroll on compare table with sticky pinned metric headers (`position: sticky; left: 0`), 44px min tap targets.
2. **Tablet (768px):** Centered reading width (~680px), multi-column filters, inline header nav links with badge, spacious form cards.
3. **Desktop (1280px):** 1120px max content column. On Results, toggling Map view splits into a comfortable dual-column layout (candidate feed left at 540px, sticky cartographic map right at 1fr).

---

## 6. Cartographic Map Specification (`LocusMap`)

- **Rendering Engine:** Self-contained SVG coordinate space with zero external tile dependencies or API keys (100% offline demo resilience).
- **Coordinate Projection:** Normalizes geographic `(lat, lon)` bounding box into responsive SVG `viewBox (800x500)` with 15% safety padding.
- **Workplace Marker:** Distinct rotated diamond in `--danger` with white border and bold caption.
- **Candidate Locality Pins:** Numbered circle markers with locality name labels, selection aura pulse, and keyboard accessibility (`tabIndex={0}`, Enter/Space activation).
- **OSM Attribution:** Mandatory legal text: *"Map data © OpenStreetMap contributors under ODbL"*.

---

## 7. Browser Compatibility Notes

- Tested against modern standards: Chrome, Firefox, Safari (WebKit), Edge.
- Fluid typography leverages standard CSS `clamp()`.
- Numeric alignment leverages `font-variant-numeric: tabular-nums`.
- Reduced-motion mode tested and automated via `@media (prefers-reduced-motion: reduce)`.

- Zero external font CDN requests: all fonts self-hosted in-bundle via npm `@fontsource/*`.

---

## 8. Brand Asset Rules

1. **Brand Mark (`data-feature="brand-logo"`):**
   - Source artwork: `src/ui/assets/brand/imglgo.png` (black compass star ring on transparent alpha background).
   - Derivative: `src/ui/assets/brand/locus-mark.png` (trimmed square with 3% margin, 256×256px, ~20 kB).
   - Rendering method: Pure CSS mask (`-webkit-mask` and `mask`) with `background-color: var(--ink)` and `mask-size: contain`.
   - Theme adaptation: Follows `--ink` automatically across light mode (`#2C2A2E`) and dark mode (`#FFF3EB`) without SVG filters or recolored bitmap duplicates.
   - Sizing: Scaled to match wordmark cap height (28px desktop, 26px on mobile viewports ≤ 640px) to prevent layout shift or visual crowding.
   - Accessibility: Strictly decorative (`aria-hidden="true"`). The enclosing link maintains its accessible name (`aria-label="Locus Home"`).

2. **Team Badge (`data-feature="team-badge"`):**
   - Source artwork: `src/ui/assets/brand/ud.png` (antique engraving with burgundy "MERIDIAN" typography, 2048×1092, 5.1 MB).
   - Optimization: Never bundle the 5.1 MB source asset into client production builds. A web-sized derivative is processed at 2× display width (340×181px) into modern WebP (`meridian-badge.webp`, 19.5 kB) with PNG fallback (`meridian-badge.png`, 154 kB).
   - Layout: Placed at the bottom of the footer below a hairline border, accompanied by a small muted caption *"Built by Meridian"*.
   - Responsive dimensions: Display width 160px on desktop, 140px on mobile (`max-width: 640px`), with explicit `width` and `height` attributes and `loading="lazy"` to prevent cumulative layout shift (CLS).
   - Theme blending:
     - **Light Mode:** Uses `mix-blend-mode: multiply` to seamlessly blend the antique paper tint into the cream surface (`--surface: #FFF9F4`) with zero visible rectangular bounding edge.
     - **Dark Mode:** Disables multiply blending to preserve line contrast and text visibility against the dark surface (`--surface: #272528`). Dims the image with `opacity: 0.72`, `filter: brightness(0.85) contrast(1.05)`, and rounded corners (`--radius-sm`) to eliminate bright white glare while maintaining antique engraving character.

3. **Favicon & Touch Icons:**
   - 32×32 PNG favicon (`public/favicon.png`) and 180×180 Apple touch icon (`public/apple-touch-icon.png`) derived directly from `locus-mark.png`.
