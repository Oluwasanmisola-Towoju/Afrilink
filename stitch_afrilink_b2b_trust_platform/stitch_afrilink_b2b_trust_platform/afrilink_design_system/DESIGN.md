---
name: AfriLink Design System
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
  on-surface-variant: '#41484b'
  inverse-surface: '#213145'
  inverse-on-surface: '#eaf1ff'
  outline: '#71787c'
  outline-variant: '#c1c7cc'
  surface-tint: '#396476'
  primary: '#002431'
  on-primary: '#ffffff'
  primary-container: '#073b4c'
  on-primary-container: '#7ba5b9'
  inverse-primary: '#a2cde2'
  secondary: '#9a442d'
  on-secondary: '#ffffff'
  secondary-container: '#fc9174'
  on-secondary-container: '#742814'
  tertiary: '#341b00'
  on-tertiary: '#ffffff'
  tertiary-container: '#4f2f0a'
  on-tertiary-container: '#c59669'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#bde9ff'
  primary-fixed-dim: '#a2cde2'
  on-primary-fixed: '#001f2a'
  on-primary-fixed-variant: '#1f4c5d'
  secondary-fixed: '#ffdbd2'
  secondary-fixed-dim: '#ffb4a1'
  on-secondary-fixed: '#3c0800'
  on-secondary-fixed-variant: '#7c2e19'
  tertiary-fixed: '#ffdcbe'
  tertiary-fixed-dim: '#f0bd8c'
  on-tertiary-fixed: '#2c1600'
  on-tertiary-fixed-variant: '#623f19'
  background: '#f8f9ff'
  on-background: '#0b1c30'
  surface-variant: '#d3e4fe'
typography:
  display-lg:
    fontFamily: Hanken Grotesk
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Hanken Grotesk
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Hanken Grotesk
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  headline-md:
    fontFamily: Hanken Grotesk
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
  data-mono:
    fontFamily: JetBrains Mono
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  unit: 4px
  container-max: 1440px
  sidebar-width: 280px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 32px
---

## Brand & Style
The design system is engineered for high-stakes B2B trade finance, prioritizing institutional trust and operational clarity. It adopts a **Corporate / Modern** aesthetic that balances the technical rigor of international banking with the vibrant potential of pan-African trade.

The UI is intentionally data-dense but avoids clutter through a systematic application of whitespace and a "content-first" hierarchy. It draws inspiration from modern fintech leaders, utilizing a restrained palette and precise geometric shapes to convey reliability. The emotional goal is to provide users with a sense of control and security as they navigate complex cross-border transactions and regulatory requirements.

## Colors
The color strategy uses a deep, "Midnight Teal" as the primary anchor to establish professional gravity. The terracotta accent is used with surgical precision—reserved for primary calls to action or meaningful brand moments—to represent the African landscape without compromising the enterprise feel.

The status system is the most critical functional element. It uses a high-chroma palette against a neutral background to ensure that trade milestones (Pending, In Progress, Complete, Dispute) are immediately identifiable at a glance. Neutral grays are cool-toned to maintain a clean, "tech-forward" appearance.

## Typography
The typography system is optimized for legibility in complex dashboards. **Hanken Grotesk** provides a sharp, contemporary edge for headlines, while **Inter** handles the heavy lifting of body copy and forms due to its exceptional tall x-height and clarity.

For transaction IDs, currency amounts, and swift codes, **JetBrains Mono** is utilized. This monospaced font ensures that numerical data aligns perfectly in tables, reducing cognitive load when auditing financial figures. Hierarchy is maintained primarily through weight and color (using primary teal for headings and slate grays for secondary text) rather than dramatic size shifts.

## Layout & Spacing
The design system utilizes a **fixed-fluid hybrid grid**. The main navigation is a persistent 280px left-hand sidebar, while the content area uses a 12-column grid that expands to a maximum width of 1440px.

A strict 4px baseline grid governs all internal component spacing. For data-dense views, padding is reduced (12px - 16px), while landing pages and high-level overviews utilize generous 32px - 48px gaps to provide "breathing room." Content reflows for mobile by collapsing the sidebar into a bottom navigation bar or a hamburger menu, switching to a single-column layout with 16px side margins.

## Elevation & Depth
Depth is conveyed through **Tonal Layers** and **Low-Contrast Outlines** rather than heavy shadows. The background canvas uses a light off-white (#F8FAFC), while primary interactive cards use a pure white surface.

To separate layers, a thin 1px border (#E2E8F0) is the primary divider. Shadows are used sparingly—only on floating elements like dropdowns or active modals—and are defined as "Ambient Shadows": extremely diffused (20px - 30px blur), low opacity (4%-8%), and tinted with the primary teal to maintain color harmony. This approach keeps the interface feeling flat, fast, and professional.

## Shapes
The shape language is **Soft (0.25rem)**. This subtle rounding removes the harshness of a purely "brutalist" corporate grid while maintaining a disciplined, architectural feel. 

Buttons and input fields follow the base 4px (0.25rem) radius. Large dashboard cards may scale up to 8px (0.5rem) to better frame nested content. Circular shapes are reserved exclusively for avatars and status "pips" to ensure they stand out as distinct functional elements against the predominantly rectangular UI.

## Components
- **Buttons:** Primary buttons use the Midnight Teal background with white text. The "Warm Terracotta" is reserved for the most important single action on a page (e.g., "Initiate Transfer"). Buttons feature a subtle 1px inner border for a tactile, "pressed" feel.
- **Data Tables:** Tables are the core of the platform. They use zebra striping (on-hover only) and 1px horizontal dividers. Columns containing currency use the `data-mono` typography and are right-aligned.
- **Milestone Trackers:** A horizontal or vertical linear stepper. Completed steps use the "Complete" green; active steps use a primary teal outline with a pulsing center; pending steps use a light gray.
- **Status Chips:** Small, pill-shaped indicators with a low-opacity background tint of the status color and high-contrast text (e.g., Light Green background with Deep Green text).
- **Input Fields:** Use a 1px border that shifts to a 2px primary teal border on focus. Labels use the `label-md` style, positioned strictly above the field for maximum scanability.
- **Cards:** White backgrounds, thin gray borders, and no shadows unless hovered. Cards should group related data (e.g., "Export Documents") into logical clusters.