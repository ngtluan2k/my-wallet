---
name: Mindful Wealth
colors:
  surface: '#f8f9ff'
  surface-dim: '#cbdbf5'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e5eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d3e4fe'
  on-surface: '#0b1c30'
  on-surface-variant: '#3d4a42'
  inverse-surface: '#213145'
  inverse-on-surface: '#eaf1ff'
  outline: '#6d7a72'
  outline-variant: '#bccac0'
  surface-tint: '#006c4a'
  primary: '#006948'
  on-primary: '#ffffff'
  primary-container: '#00855d'
  on-primary-container: '#f5fff7'
  inverse-primary: '#68dba9'
  secondary: '#006c49'
  on-secondary: '#ffffff'
  secondary-container: '#6cf8bb'
  on-secondary-container: '#00714d'
  tertiary: '#545c72'
  on-tertiary: '#ffffff'
  tertiary-container: '#6c748b'
  on-tertiary-container: '#fefcff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#85f8c4'
  primary-fixed-dim: '#68dba9'
  on-primary-fixed: '#002114'
  on-primary-fixed-variant: '#005137'
  secondary-fixed: '#6ffbbe'
  secondary-fixed-dim: '#4edea3'
  on-secondary-fixed: '#002113'
  on-secondary-fixed-variant: '#005236'
  tertiary-fixed: '#dae2fd'
  tertiary-fixed-dim: '#bec6e0'
  on-tertiary-fixed: '#131b2e'
  on-tertiary-fixed-variant: '#3f465c'
  background: '#f8f9ff'
  on-background: '#0b1c30'
  surface-variant: '#d3e4fe'
  expense-red: '#EF4444'
  budget-warning: '#F59E0B'
  surface-bg-light: '#F8FAFC'
  surface-card-light: '#FFFFFF'
  surface-elevated-light: '#F1F5F9'
  border-hairline: '#E2E8F0'
typography:
  headline-xl:
    fontFamily: Inter
    fontSize: 34px
    fontWeight: '700'
    lineHeight: 41px
  headline-xl-mobile:
    fontFamily: Inter
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 34px
  headline-lg:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 30px
  headline-md:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 26px
  body-lg:
    fontFamily: Inter
    fontSize: 17px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 15px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
  label-lg:
    fontFamily: Inter
    fontSize: 17px
    fontWeight: '600'
    lineHeight: 22px
  label-md:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '600'
    lineHeight: 18px
  label-sm:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 14px
  currency-display:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 38px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1rem
  margin: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.25rem
  space-xl: 1.75rem
---

## Brand & Style

This design system crafts an intentional, calm, and trustworthy personal finance environment inspired by Apple's Human Interface Guidelines (HIG). It addresses the emotional friction, stress, and cognitive fatigue commonly associated with tracking money, transforming budget monitoring into a mindful, empowering daily ritual.

The aesthetic blends **Modern iOS Craftsmanship** with **Soft Minimalist Depth**:
- **Clarity & Precision**: Clear hierarchy prioritizes numerical legibility and Vietnamese typography, keeping financial data glanceable without sensory overload.
- **Organic Trust**: Emerald and jade tones evoke sustainable balance, natural prosperity, and stability, steering away from speculative or aggressive neon fintech tropes.
- **Tactile Softness**: Layered frosted glass, subtle hairline boundaries, and smooth squircle cards build an authentic iOS-native tactile surface.

## Colors

The palette balances positive financial feedback with high-contrast functional alerts:

- **Primary (`#059669`) & Secondary (`#10B981`)**: Anchor the system with rich emerald and jade hues, representing income, positive net flow, and completed savings targets.
- **Tertiary (`#0F172A`)**: Deep slate blue providing grounded structure for high-emphasis numerals, primary headings, and navigation labels.
- **Neutral (`#64748B`)**: Balanced cool slate used for timestamps, category captions, secondary transaction metadata, and inactive states.
- **Functional Semantics**:
  - `expense-red` (`#EF4444`): Crisp coral red allocated for outflows, debit transactions, and critical budget limits.
  - `budget-warning` (`#F59E0B`): Amber gold dedicated to cautionary indicators when a monthly category consumes 80% to 99% of its allocated funds.
  - `border-hairline` (`#E2E8F0`): Ultra-subtle border defining surface boundaries cleanly across high-density displays.

## Typography

The type system is powered by **Inter**, chosen for its optical balance, robust rendering of complex Vietnamese tone accents (dấu câu), and exceptional numerical clarity.

- **Tabular Figures (`tnum`)**: Enable proportional and tabular lining across all numerical balances, transaction lists, and financial comparisons to prevent layout jitter when values adjust.
- **Currency Typography (`currency-display`)**: Currency symbols (`₫`, `VND`) scale at 75% the font size of adjacent amounts with medium weight (`500`) to maintain numerical visual balance.
- **Hierarchy Rules**: Reserve `headline-xl` solely for top-level account balances and monthly review totals. Section subheaders rely on `headline-md` or `label-md` uppercase caption styles.

## Layout & Spacing

Designed around the constraints of iOS handheld viewports using a flexible single-column flow with strict adherence to standard safe areas (notch, dynamic island, and home indicator).

- **Screen Padding**: Outer content margins are locked to `margin` (`1rem` / 16px) on mobile viewports, expanding to `1.5rem` (24px) on tablet split-views.
- **Vertical Flow**:
  - `space-xs` (4px): Icon-to-text spacing within inline chips and badges.
  - `space-sm` (8px): Stack gap between titles and metadata subtitles.
  - `space-md` (16px): Internal padding for transaction rows, input boxes, and card containers.
  - `space-lg` (20px): Structural gap separating sequential financial cards and analytical summary blocks.
  - `space-xl` (28px): Boundary gap isolating distinct functional zones (e.g., wallet summary card from daily transaction logs).
- **Responsive Handling**: On tablet views (iPadOS), financial overview sections adopt a 2-column or 3-column split grid with `gutter` spacing of `1rem`, whereas detail transaction feeds remain constrained to a max-width of 640px to ensure thumb reachability.

## Elevation & Depth

Visual hierarchy uses subtle iOS-inspired depth, combining structural surface layering with gentle ambient shadows rather than harsh drop shadows:

- **Level 0 (Canvas Base)**: The foundational backdrop is tinted `surface-bg-light` (`#F8FAFC`), giving a restful, low-glare surface.
- **Level 1 (Card & Grouped Lists)**: Pure white (`#FFFFFF`) containers resting on the base canvas. Paired with a 0.5px hairline outline in `border-hairline` (`#E2E8F0`) and an ambient shadow (`box-shadow: 0px 4px 20px -2px rgba(15, 23, 42, 0.04)`).
- **Level 2 (Interactive Floating Surfaces)**: Quick-entry FABs, sticky date headers, and persistent filter tabs. Features elevated diffusion: `box-shadow: 0px 8px 24px -4px rgba(15, 23, 42, 0.08)`.
- **Level 3 (Modals & Sheet Overlays)**: Bottom sheets for rapid transaction input use standard frosted background blurs (`backdrop-filter: blur(24px)`) paired with a 20% darkened scrim backdrop and an elevated shadow (`0px -8px 32px rgba(15, 23, 42, 0.12)`).

## Shapes

The design uses Apple-style continuous curves (squircles) with a standardized rounded scale:

- **Base Components (`roundedness: 2`, 0.5rem / 8px)**: Segmented controls, input fields, and status badges.
- **Surface Cards & Action Panels (`rounded-lg`, 1rem / 16px to 1.25rem / 20px)**: Balance presentation cards, monthly overview modules, and grouped category rows.
- **Pills & Floating Action Triggers (`rounded-full`, 9999px)**: Quick category selectors, filter chips, and primary floating action buttons.
- **Dividers**: Dividers within grouped lists feature a 0.5px hairline width with an inset matching the leading icon's width plus padding (typically 56px inset from the left edge).

## Components

### Buttons
- **Primary Action**: Full-width or prominent pill button with emerald fill (`#059669`), white text (`label-lg`), and haptic click feedback. Height locked to 50px for touch precision.
- **Secondary / Ghost**: Muted surface (`#F1F5F9`) with primary slate label (`#0F172A`).
- **Destructive**: Soft red tint background (`rgba(239, 68, 68, 0.1)`) with `expense-red` label (`#EF4444`).

### Financial Cards
- Rendered in `#FFFFFF` with continuous squircle corners (18px radius) and hairline stroke (`#E2E8F0`).
- Net worth balance card features a dark emerald gradient background (`#065F46` to `#047857`) overlaid with crisp white typography and a subtle frosted micro-chip displaying the balance period.

### Input Fields & Quick Keypad
- **Custom Amount Input**: Extra-large numerical display (`currency-display`, 32px-40px) centered with automatic punctuation formatting (`1.000.000 ₫`).
- **Numeric Keypad Grid**: 3x4 iOS-style tactile keypad with generous hitboxes (64px key height), gentle active-state background shifts, and haptic feedback on touch down.

### Progress & Budget Bars
- Minimum track height of 8px with fully rounded caps.
- Background track set to `#F1F5F9`. The indicator fill transitions dynamically:
  - `< 80%`: `primary_color_hex` (`#059669`)
  - `80% - 99%`: `budget-warning` (`#F59E0B`)
  - `>= 100%`: `expense-red` (`#EF4444`) with an alert pulse animation.

### Category Chips & Lists
- **Category Icon Circle**: 40px diameter rounded circle filled with a 12% opacity tint of the category's assigned theme color.
- **List Item Layout**: Grouped table row style with left category glyph, vertical title/subtitle stack, and right-aligned amount (`+` in green, `-` in slate/red) accompanied by secondary relative timestamps (`Hôm nay`, `Hôm qua`).