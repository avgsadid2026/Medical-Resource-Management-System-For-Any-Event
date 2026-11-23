---
name: Architectural Command
colors:
  surface: '#f9f9f9'
  surface-dim: '#dadada'
  surface-bright: '#f9f9f9'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f3f3f3'
  surface-container: '#eeeeee'
  surface-container-high: '#e8e8e8'
  surface-container-highest: '#e2e2e2'
  on-surface: '#1a1c1c'
  on-surface-variant: '#45464d'
  inverse-surface: '#2f3131'
  inverse-on-surface: '#f0f1f1'
  outline: '#76777d'
  outline-variant: '#c6c6cd'
  surface-tint: '#565e74'
  primary: '#000000'
  on-primary: '#ffffff'
  primary-container: '#131b2e'
  on-primary-container: '#7c839b'
  inverse-primary: '#bec6e0'
  secondary: '#5e5e5e'
  on-secondary: '#ffffff'
  secondary-container: '#e3e2e2'
  on-secondary-container: '#646464'
  tertiary: '#000000'
  on-tertiary: '#ffffff'
  tertiary-container: '#410002'
  on-tertiary-container: '#f63a35'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dae2fd'
  primary-fixed-dim: '#bec6e0'
  on-primary-fixed: '#131b2e'
  on-primary-fixed-variant: '#3f465c'
  secondary-fixed: '#e3e2e2'
  secondary-fixed-dim: '#c7c6c6'
  on-secondary-fixed: '#1b1c1c'
  on-secondary-fixed-variant: '#464747'
  tertiary-fixed: '#ffdad6'
  tertiary-fixed-dim: '#ffb4ab'
  on-tertiary-fixed: '#410002'
  on-tertiary-fixed-variant: '#93000b'
  background: '#f9f9f9'
  on-background: '#1a1c1c'
  surface-variant: '#e2e2e2'
typography:
  headline-xl:
    fontFamily: Hanken Grotesk
    fontSize: 36px
    fontWeight: '600'
    lineHeight: 44px
    letterSpacing: -0.02em
  headline-xl-mobile:
    fontFamily: Hanken Grotesk
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 36px
    letterSpacing: -0.015em
  headline-lg:
    fontFamily: Hanken Grotesk
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.015em
  headline-md:
    fontFamily: Hanken Grotesk
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 26px
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Geist
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Geist
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Geist
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
  label-lg:
    fontFamily: Geist
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-md:
    fontFamily: Geist
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.02em
  label-sm:
    fontFamily: Geist
    fontSize: 10px
    fontWeight: '600'
    lineHeight: 14px
    letterSpacing: 0.04em
  metric-display:
    fontFamily: Geist
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 36px
    letterSpacing: -0.03em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-desktop: 1.5rem
  margin: 1rem
  margin-desktop: 2rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
---

## Brand & Style

This design system delivers an elevated, architectural precision interface engineered for mission-critical medical dispatch and incident command. Merging Swiss modernism with developer-grade technical rigor, the visual environment prioritizes radical legibility, structural order, and rapid cognitive parsing under high-stress operational conditions.

The visual style is characterized by:
- **Structural Minimalism:** Eliminating superfluous ornament in favor of strict alignments, tabular metrics, and unambiguous status hierarchies.
- **Utilitarian Balance:** High-density data matrices framed by disciplined whitespace, allowing dispatchers and medical officers to scan vital signs, triage states, and resource queues without sensory fatigue.
- **Architectural Framing:** Subtle hairline dividers and planar surfaces that anchor complex telemetry into an unyielding, dependable grid.

## Colors

The palette is anchored in deep slate precision and clinical clarity. Chromatic noise is strictly suppressed: neutral tones build the structural foundation, while high-alert pigments are reserved solely for live triage priorities.

- **Primary (`#0F172A`):** Deep executive slate. Used for primary interactive actions, high-emphasis headings, key navigation anchors, and dominant metric indicators.
- **Secondary (`#737373`):** Neutral slate mid-tone. Applied to secondary labels, tabular column headers, metadata readouts, and unselected control states.
- **Tertiary / Critical Indicator (`#DC2626`):** Pure clinical crimson. Strictly non-decorative; reserved exclusively for critical triage alerts, real-time dispatch escalations, and life-safety notifications.
- **Neutral Canvas (`#FAFAFA`):** Stark, anti-glare off-white background ensuring high contrast with hairline structural borders (`#E5E5E5`) and pristine white surfaces (`#FFFFFF`).
- **Surface Elevation (`#F4F4F4`):** Secondary container surface used for table headers, embedded telemetry wells, and inactive panel backgrounds.

## Typography

Typography establishes an unwavering informational hierarchy through the pairing of Hanken Grotesk’s architectural clarity and Geist’s dense, monoline tabular precision.

- **Headlines (Hanken Grotesk):** Employs tight letter-spacing and substantial vertical anchor weights. Reserved for workspace titles, modal headers, and primary operational section labels.
- **Body & Telemetry (Geist):** Optimized for low latency parsing. All numerical data, timestamps, vital ranges, and coordinates must render using tabular figure settings (`font-variant-numeric: tabular-nums`) to prevent horizontal jitter during live telemetry updates.
- **Micro-Labels (Geist Medium/SemiBold):** Scaled at 10px–12px with slightly opened tracking for persistent status tags, field descriptors, and triage classifications.

## Layout & Spacing

The spatial model relies on a rigorous 4px baseline sub-grid supporting a 12-column responsive fluid architecture. High-density zones enforce compact data footprints while boundary margins maintain situational awareness.

- **Desktop (≥1280px):** 12-column layout with 24px gutters (`gutter-desktop`) and 32px canvas margins (`margin-desktop`). Split-view panels and command monitors lock to full height without decorative inner margins.
- **Tablet (768px - 1279px):** 8-column layout with 16px gutters and 24px margins. Peripheral panels collapse into dedicated sliding drawer overlays.
- **Mobile (<768px):** 4-column layout with 16px gutters and 16px outer boundary padding (`margin`). Data tables switch to vertical stacked card viewports with pinned micro-action strips.

## Elevation & Depth

Visual hierarchy is maintained through planar surface tiers, hairline borders, and subtle ambient diffusion rather than deep physical drop shadows.

- **Level 0 (Base Canvas):** `#FAFAFA` with zero elevation. Anchors background activities and inactive viewport expanses.
- **Level 1 (Card & Module Surface):** `#FFFFFF` bordered by a 1px solid stroke of `#E5E5E5`. Used for primary telemetry modules, table rows, and KPI containers.
- **Level 2 (Popovers, Filter Menus, Flyouts):** `#FFFFFF` bordered by 1px `#E5E5E5`, supplemented by a precise micro-diffused ambient shadow: `0 4px 12px -2px rgba(15, 23, 42, 0.06), 0 2px 4px -1px rgba(15, 23, 42, 0.04)`.
- **Level 3 (Emergency Modals & Critical Incident Alerts):** Elevated overlays utilizing Level 2 elevation augmented by an explicit 1px `#DC2626` warning stroke or an inset status border indicator.

## Shapes

The design system enforces a sharp geometric posture (Level 1: Soft). Structural elements feature restrained 0.25rem (4px) radii, projecting technical efficiency and operational authority.

- **Containers & Controls:** Primary cards, inputs, data grid cells, and buttons utilize `0.25rem` (4px) corners.
- **Large Panels:** Modals and flyout drawers scale up to `0.5rem` (8px).
- **Status Pills & Triage Badges:** Maintained as full capsules (`9999px`) solely to distinguish dynamic operational states and medical flags from clickable rectangular surfaces.

## Components

### Buttons & Interactive Controls
- **Primary Action:** Solid `#0F172A` background, `#FFFFFF` text, 4px border radius, 36px height for data-dense bars, crisp hover transition to `#1E293B`.
- **Secondary Action:** `#FFFFFF` background, 1px `#E5E5E5` hairline border, `#0F172A` text. Hover brings border color to `#0F172A`.
- **Destructive / Emergency Action:** Solid `#DC2626` background, `#FFFFFF` text. Used only for unrecoverable state changes or live mass-casualty escalations.

### Clinical Data Tables
- **Header:** Sticky `#F4F4F4` row, uppercase 10px Geist tracking, `#737373` foreground, separated by a bottom 1px `#E5E5E5` border.
- **Rows:** Alternating hover highlight (`#F8FAFC`), 44px standard compact row height. Tabular numbers throughout.
- **Triage Priority Columns:** Fixed-width column carrying medical classification tags:
  - *Immediate (P1):* Inset `#DC2626` pill, `#FFFFFF` text, bold tabular weight.
  - *Delayed (P2):* Deep amber tint indicator (`#D97706`).
  - *Minimal (P3):* Deep emerald tint indicator (`#059669`).
  - *Expectant (P0):* Neutral dark charcoal (`#1E293B`).

### KPI Statistic Cards
- **Construction:** `#FFFFFF` surface, 1px `#E5E5E5` border, 16px internal padding.
- **Metrics:** `metric-display` (32px tabular Geist) paired with uppercase 10px secondary label. Includes an embedded micro sparkline or status trend marker (1px stroke) anchored directly below the numeric value.

### Search, Filter, & Pagination Strips
- **Search Bar:** Integrated `#FFFFFF` field with a 1px `#E5E5E5` frame, inner magnifying glyph, and trailing keyboard shortcut badge (`⌘K`).
- **Filter Segment:** Hairline segment control using 4px interior toggles; active filter indicated by `#0F172A` fill with `#FFFFFF` text.
- **Pagination Strip:** Anchored directly to table footers without separation margin; includes total incident counts, discrete page jump controls, and single-click row-limit selectors.