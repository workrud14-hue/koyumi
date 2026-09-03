---
name: Midnight Neo-Street
colors:
  surface: '#161219'
  surface-dim: '#161219'
  surface-bright: '#3d3740'
  surface-container-lowest: '#110c14'
  surface-container-low: '#1f1a22'
  surface-container: '#231e26'
  surface-container-high: '#2d2831'
  surface-container-highest: '#38333c'
  on-surface: '#e9dfeb'
  on-surface-variant: '#cfc2d4'
  inverse-surface: '#e9dfeb'
  inverse-on-surface: '#342e37'
  outline: '#988d9e'
  outline-variant: '#4c4452'
  surface-tint: '#dfb7ff'
  primary: '#dfb7ff'
  on-primary: '#4a007f'
  primary-container: '#6b21a8'
  on-primary-container: '#d7a8ff'
  inverse-primary: '#803abd'
  secondary: '#fbabff'
  on-secondary: '#580065'
  secondary-container: '#ae05c6'
  on-secondary-container: '#ffd8fd'
  tertiary: '#faba72'
  on-tertiary: '#482900'
  tertiary-container: '#6d4100'
  on-tertiary-container: '#eeaf68'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#f1dbff'
  primary-fixed-dim: '#dfb7ff'
  on-primary-fixed: '#2d0050'
  on-primary-fixed-variant: '#661aa3'
  secondary-fixed: '#ffd6fd'
  secondary-fixed-dim: '#fbabff'
  on-secondary-fixed: '#36003e'
  on-secondary-fixed-variant: '#7c008e'
  tertiary-fixed: '#ffddbb'
  tertiary-fixed-dim: '#faba72'
  on-tertiary-fixed: '#2b1700'
  on-tertiary-fixed-variant: '#673d00'
  background: '#161219'
  on-background: '#e9dfeb'
  surface-variant: '#38333c'
typography:
  display-xl:
    fontFamily: Anybody
    fontSize: 80px
    fontWeight: '800'
    lineHeight: 88px
    letterSpacing: -0.04em
  headline-lg:
    fontFamily: Anybody
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Anybody
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 38px
  subheading:
    fontFamily: Hanken Grotesk
    fontSize: 20px
    fontWeight: '500'
    lineHeight: 28px
    letterSpacing: 0.05em
  body-regular:
    fontFamily: Hanken Grotesk
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-mono:
    fontFamily: Geist
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.1em
spacing:
  unit: 4px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 64px
  section-gap: 128px
---

## Brand & Style

The design system is a sophisticated fusion of **Tokyo’s neon-drenched nightlife** and **high-fashion minimalism**. It caters to an audience that values subculture exclusivity, gaming aesthetics, and premium craftsmanship. 

The visual direction follows a **Modern-Brutalist** hybrid:
- **Minimalism:** Use of extreme whitespace (or "black-space") to let product photography breathe.
- **Cinematic Tension:** High contrast between deep charcoal backgrounds and razor-sharp off-white typography creates an editorial, mysterious atmosphere.
- **Digital Pulse:** Sparingly applied neon gradients and sharp borders act as "data-glitches" or "power-lines," nodding to cyberpunk and gaming influences without becoming loud.
- **Voice:** The tone is "Low-frequency, High-impact." It is confident, selective, and unapologetically fashion-forward.

## Colors

The palette is rooted in a "Void and Glow" philosophy. The primary environment is dark to ensure that vibrant product photography and accent colors pop with maximum luminosity.

- **The Void (#0A0A0A):** The primary canvas. Use this for main page backgrounds to create depth.
- **The Structure (#1A1A1A):** Used for cards, navigation bars, and section dividers to provide subtle containment.
- **The High-Vis Accents:** Purple (#6B21A8) and Magenta (#D946EF) are reserved for critical actions and brand markers. They should frequently appear as a **linear gradient (45deg)** to mimic neon light tubes.
- **The Signal (#F5F5F5):** High-readability white for primary information.
- **The Shadow Text (#A0A0A0):** Used for secondary details, metadata, and captions to maintain hierarchy.

## Typography

The typography strategy relies on the tension between the expressive, variable nature of **Anybody** and the technical precision of **Geist**.

- **Display & Headlines:** Use **Anybody** with heavy weights. It provides an editorial, almost aggressive confidence suitable for streetwear drops.
- **Body Text:** **Hanken Grotesk** offers a clean, contemporary feel that balances the "loudness" of the display type.
- **Technical Metadata:** Use **Geist** (monospaced style) for SKU numbers, price tags, and sizing labels to reinforce the gaming/technical aesthetic.
- **Styling Note:** Headlines should favor tight tracking (letter-spacing) to look "locked-in," while labels should have generous tracking for a premium, airy feel.

## Layout & Spacing

The layout follows a **Fixed-Fluid hybrid** model that prioritizes dramatic composition.

- **Grid:** A 12-column grid for desktop with wide 64px outer margins to create a "letterboxed" cinematic feel. 
- **Rhythm:** Use a strict 4px/8px base unit. 
- **Dramatic Whitespace:** Section gaps are intentionally large (128px+) to separate "collections" or "stories," forcing the user to focus on one editorial concept at a time.
- **Reflow:** On mobile, margins shrink to 16px, and the grid collapses to 2 columns for product feeds to maintain image impact.

## Elevation & Depth

This design system avoids traditional shadows in favor of **Tonal Layering** and **Sharp Definition**.

- **Stacking:** Use `#0A0A0A` as the base and `#1A1A1A` for elements that sit "above" the surface (like cards or menus).
- **Subtle Glow:** Instead of a drop shadow, use a very faint 1px solid border of `#333333` or a subtle 10% opacity purple outer glow for active states to simulate light spill from a neon sign.
- **Interaction Depth:** Hovering over a card should not lift it with a shadow, but rather change the border color to the primary magenta-purple gradient.

## Shapes

To align with the brand's sharp, fashion-forward aesthetic, the design system utilizes **zero roundedness**.

- **Sharp Corners:** All buttons, input fields, and image containers must have 0px border-radius. This creates a geometric, brutalist look that feels "hard" and architectural.
- **Consistency:** Even "pill-like" elements (like tags) should be replaced with rectangular boxes or ghost-borders with sharp 90-degree angles.

## Components

- **Buttons:** Primary buttons use the Magenta-to-Purple gradient background with black text for maximum contrast. Secondary buttons use a white 1px border with no fill. All buttons use uppercase **Geist** for the label.
- **Input Fields:** Bottom-border only (2px thick, `#A0A0A0`). On focus, the border transitions to the brand gradient.
- **Cards:** Product cards are borderless. The image fills the container. Text is placed underneath using asymmetrical alignment (e.g., Title left-aligned, Price right-aligned).
- **Chips/Tags:** Small rectangular boxes with a `#1A1A1A` background and `#F5F5F5` monospaced text.
- **Navigation:** A minimalist top-bar with ultra-thin separators. Use icons (mask, shopping bag, search) that utilize the same stroke weight as the body typography.
- **Hover States:** Any interactive element should trigger a "glitch" color shift or a sharp border highlight in the accent colors.