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
3. **Primary button hover:** coral fill sweeps in from bottom (`translateY(100%) -> translateY(0)`) while arrow glides 3px right. Press activates subtle scale `0.985`.
4. **Primary button loading:** label crossfades to a slim 2px sweeping line (no spinning rings).
5. **Reduced Motion (`prefers-reduced-motion: reduce`):** All transforms and sweeps are disabled (`transform: none !important; animation-duration: 0.01ms !important; transition-duration: 0.01ms !important;`). Verified by automated tests.

---

## 4. Component Inventory & States (Phase U0 Primitives)

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
| `ErrorState` | `message: string`, `onRetry?: () => void`, `retryLabel?: string` | one sentence + one retry action |
| `ModeBanner` | `mode: "mock"\|"snapshot"\|"live"`, `capturedDate?: string` | mock ("Sample data"), snapshot ("Recorded demo data · captured ..."), live (hidden) |

---

## 5. Browser Compatibility Notes

- Tested against modern standards: Chrome, Firefox, Safari (WebKit), Edge.
- Fluid typography leverages standard CSS `clamp()`.
- Numeric alignment leverages `font-variant-numeric: tabular-nums`.
- Zero external font CDN requests: all fonts self-hosted in-bundle via npm `@fontsource/*`.
