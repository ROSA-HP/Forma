---
name: TrainLog Core
colors:
  surface: '#111317'
  surface-dim: '#111317'
  surface-bright: '#37393d'
  surface-container-lowest: '#0c0e11'
  surface-container-low: '#1a1c1f'
  surface-container: '#1e2023'
  surface-container-high: '#282a2d'
  surface-container-highest: '#333538'
  on-surface: '#e2e2e6'
  on-surface-variant: '#c5c9ad'
  inverse-surface: '#e2e2e6'
  inverse-on-surface: '#2f3034'
  outline: '#8f937a'
  outline-variant: '#444933'
  surface-tint: '#aed500'
  primary: '#ffffff'
  on-primary: '#293500'
  primary-container: '#c8f31d'
  on-primary-container: '#576c00'
  inverse-primary: '#526600'
  secondary: '#a4c9ff'
  on-secondary: '#00315d'
  secondary-container: '#0267b8'
  on-secondary-container: '#d6e5ff'
  tertiary: '#ffffff'
  on-tertiary: '#003731'
  tertiary-container: '#62fae3'
  on-tertiary-container: '#007165'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#c8f31d'
  primary-fixed-dim: '#aed500'
  on-primary-fixed: '#171e00'
  on-primary-fixed-variant: '#3d4d00'
  secondary-fixed: '#d4e3ff'
  secondary-fixed-dim: '#a4c9ff'
  on-secondary-fixed: '#001c39'
  on-secondary-fixed-variant: '#004883'
  tertiary-fixed: '#62fae3'
  tertiary-fixed-dim: '#3cddc7'
  on-tertiary-fixed: '#00201c'
  on-tertiary-fixed-variant: '#005047'
  background: '#111317'
  on-background: '#e2e2e6'
  surface-variant: '#333538'
typography:
  display-hero:
    fontFamily: Geist
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 52px
    letterSpacing: -0.03em
  display-hero-mobile:
    fontFamily: Geist
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Geist
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 38px
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Geist
    fontSize: 26px
    fontWeight: '700'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Geist
    fontSize: 22px
    fontWeight: '600'
    lineHeight: 28px
  headline-sm:
    fontFamily: Geist
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
  metric-xl:
    fontFamily: Geist
    fontSize: 40px
    fontWeight: '700'
    lineHeight: 44px
    letterSpacing: -0.02em
  metric-md:
    fontFamily: Geist
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 28px
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
  label-md:
    fontFamily: Geist
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 18px
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Geist
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 14px
    letterSpacing: 0.04em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-tablet: 1.5rem
  gutter-desktop: 2rem
  margin: 1rem
  margin-tablet: 2rem
  margin-desktop: 3rem
  space-2xs: 0.25rem
  space-xs: 0.5rem
  space-sm: 0.75rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
  space-2xl: 3rem
---

## Brand & Style

This design system delivers a focused, utilitarian athletic utility designed for rapid data logging and clear visual feedback in high-friction environments (e.g., mid-workout, sweat, motion). The aesthetic blends technical minimalism with flat structural surfaces: deliberate high-contrast structural borders, zero elevation blur, generous negative space, and oversized touch geometries.

### Core Tenets
- **High Friction Readiness:** Critical interface targets maintain an absolute minimum interactive area of 48×48px with generous spacing to prevent mis-taps during intense physical exertion.
- **Flat Spatial Hierarchy:** Visual separation is achieved strictly through perimeter borders and surface tint adjustments rather than shadows or skeuomorphic depths.
- **Data Clarity Over Decoration:** Metrics (reps, weight, timer intervals) leverage monospaced or tabular-proportional numerals to prevent jitter during state updates and live counting.
- **Bi-Directional Architecture:** Every component natively adheres to start/end logic to support complete RTL (Right-to-Left) parity without structural reflow regressions.

## Colors

The system uses a dark-first color scheme designed for low-light gym environments and OLED battery savings, alongside a high-legibility light theme.

### Theme Implementations

#### Dark Theme (Default)
- **Canvas / Background:** `#0B0D10`
- **Surface / Card:** `#14171C`
- **Raised Surface:** `#1C2027`
- **Structural Border:** `#272C34`
- **Text Primary:** `#F2F4F7`
- **Text Muted:** `#9AA3AF`
- **Brand Accent:** `#C8F31D` (Electric Lime; text on accent must be `#0B0D10`)

#### Light Theme
- **Canvas / Background:** `#F6F7F9`
- **Surface / Card:** `#FFFFFF`
- **Raised Surface:** `#EEF0F3`
- **Structural Border:** `#E2E5EA`
- **Text Primary:** `#0F1318`
- **Text Muted:** `#5B6573`
- **Brand Accent:** `#4D7C0F` (Deep Lime / Green; text on accent must be `#FFFFFF`)

### Domain Categories
- **Gym:** `#60A5FA`
- **Calisthenics:** `#A78BFA`
- **Martial Arts:** `#FB7185`
- **Cardio:** `#FBBF24`
- **Custom Disciplines:** `#2DD4BF`

### Functional Alerts
- **Success:** `#34D399`
- **Danger:** `#F87171`

## Typography

The typography relies on **Geist**, a neutral, precision-engineered grotesque sans-serif that balances high legibility on small screens with clean mechanical forms.

### Tabular Formatting Rule
Every metric presentation—including weights, repetitions, rest timers, percentage increases, and set counters—**must** use `font-variant-numeric: tabular-nums` (or CSS `font-feature-settings: "tnum"`). This prevents jumping layouts when numbers cycle dynamically in real-time clocks or scrubbers.

### Case Strategy
Use uppercase transformations strictly for `label-sm` when designating workout categories or status tags. Keep headings and form labels in standard sentence casing to retain visual softness and swift scanning.

## Layout & Spacing

The interface applies a strictly mobile-first layout based on a continuous single-column stack on mobile, reflowing to a 6-column fluid structure on tablet, and a maximum 12-column constrained system (capped at 1120px) on desktop viewports.

### Breakpoints & Layout Adapters
- **Mobile (<640px):** Single-column layout. Margin `1rem` (16px), gutter `1rem`. Structural navigation anchors to the persistent bottom bar.
- **Tablet (640px–1023px):** 6-column grid. Margin `2rem` (32px), gutter `1.5rem` (24px). Workouts split into overview and current set panels.
- **Desktop (≥1024px):** 12-column centered layout with max-width `1120px`. The bottom navigation transforms into an inline sticky side rail.

### Spacing Guidelines
Component interiors require standard padding blocks:
- Inner card bodies: `space-md` (16px) or `space-lg` (24px) for milestone cards.
- Stack distance between successive set rows: `space-xs` (8px).
- Bottom safe-area clearance: All scrollable containers reserve at least `5rem` (80px) bottom padding to clear the 5-tab navigation bar.

## Elevation & Depth

This design system avoids all blurred shadows and diffusion effects. Depth is flat, structured, and tectonic:

1. **Flat Stacking:** Hierarchy is established through solid background tone stepping:
   - Ground level: `Canvas / Background`
   - Level 1: `Card Surface`
   - Level 2: `Raised Card / Active Layer`
2. **Structural Borders:** Surfaces must be explicitly outlined with a `1px solid` border using the designated theme border token (`#272C34` in dark, `#E2E5EA` in light).
3. **Active State Representation:** Elements express activation, selection, or focus not by raising or casting shadows, but by switching their border to the brand accent (`#C8F31D` / `#4D7C0F`) or their discipline category color.
4. **Modals & Drawers:** High-priority overlays use an unblurred 60% opacity dark overlay, framing the inner sheet with the standard 1px structural outline.

## Shapes

The interface is defined by uniform, controlled geometric curves. 

- **Cards & Primary Modules:** Standardized to `12px` (`0.75rem`), providing a modern, ergonomic visual boundary that preserves content real estate on mobile screens.
- **Interactive Buttons & Input Fields:** Consistent with the `12px` card radius to ensure visual harmony when inputs sit stacked inside card containers.
- **Micro Badges & Category Chips:** Fixed at `6px` (`0.375rem`) for compact tags, or fully rounded (pill) strictly when denoting ongoing live stopwatch status.
- **Data Points & Graphs:** Line endpoints and progression bars use square or slight 2px caps for an analytical feel.

## Components

### Buttons
- **Touch Target:** Minimum height of 48px across all variants.
- **Primary (Accent):** Filled with accent color. Dark theme: `#C8F31D` fill with `#0B0D10` bold text. Light theme: `#4D7C0F` fill with `#FFFFFF` bold text. Radius: 12px. No shadow.
- **Secondary / Surface:** Filled with Raised Surface (`#1C2027` / `#EEF0F3`), 1px solid theme border, primary text.
- **Ghost:** Transparent background, zero border, highlighted by muted-to-primary text transition on hover/active.

### Input Fields & Metric Steppers
- **Text Inputs:** Height 48px, background surface matching Card Surface, border `1px solid` theme border. Active state: 1px solid accent.
- **Workout Set Steppers:** Dedicated split controls with 48px minimum touch targets on decrement (`-`) and increment (`+`) buttons, framing a center numerical input with `tabular-nums`.

### Chips & Category Badges
- Inline category indicator using a `3px` left-border strip (or right-border strip in RTL) utilizing the discipline color, paired with a subtle 10% tint background of the respective category token.

### Checkboxes & Set Completion Radios
- Size: 24×24px box enclosed in an unclipped 48×48px click target area.
- Check state: Solid accent fill with a contrasting checkmark.
- Success indication: On checking a finished set, the row shifts its border to `#34D399` with a subtle momentary tint before settling to standard muted state.

### Cards
- Border radius: 12px.
- Border: `1px solid` (`#272C34` dark / `#E2E5EA` light).
- Padding: 16px standard, 12px for nested set rows.
- Structural header: Contains exercise name, category indicator badge, and three-dot contextual action menu.

### Navigation (Bottom Bar)
- **Layout:** 5 equal distribution slots: `Home`, `Library`, `Calendar`, `Progress`, `More`.
- **Dimensions:** 64px height + device bottom safe-area-inset.
- **Style:** Background matching Card Surface with a continuous `1px solid` top border. No ambient blur.
- **Icons:** Thin-stroke (1.5px to 1.75px) line icons. Active icon changes to Accent color accompanied by an 11px uppercase label; inactive items use Muted Text.

### RTL (Right-to-Left) Adaptation
- Use logical CSS properties (`margin-inline-start`, `padding-inline-end`, `border-inline-start`).
- Timers, numeric series, and progression curves retain LTR orientation (left-to-right calculation) to adhere to standard scientific measurement norms, while navigation icons, chevron arrows, and structural layouts mirror across the inline axis.