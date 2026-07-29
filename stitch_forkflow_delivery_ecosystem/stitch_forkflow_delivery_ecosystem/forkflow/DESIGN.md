---
name: ForkFlow
colors:
  surface: '#fff8f7'
  surface-dim: '#eed4d2'
  surface-bright: '#fff8f7'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#fff0ef'
  surface-container: '#ffe9e7'
  surface-container-high: '#fde2e0'
  surface-container-highest: '#f7ddda'
  on-surface: '#261817'
  on-surface-variant: '#5a403f'
  inverse-surface: '#3c2c2b'
  inverse-on-surface: '#ffedeb'
  outline: '#8e706f'
  outline-variant: '#e2bebc'
  surface-tint: '#b52330'
  primary: '#92001c'
  on-primary: '#ffffff'
  primary-container: '#b52330'
  on-primary-container: '#ffccca'
  inverse-primary: '#ffb3b1'
  secondary: '#545f73'
  on-secondary: '#ffffff'
  secondary-container: '#d5e0f8'
  on-secondary-container: '#586377'
  tertiary: '#005138'
  on-tertiary: '#ffffff'
  tertiary-container: '#006c4c'
  on-tertiary-container: '#93eac2'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffdad8'
  primary-fixed-dim: '#ffb3b1'
  on-primary-fixed: '#410007'
  on-primary-fixed-variant: '#92001c'
  secondary-fixed: '#d8e3fb'
  secondary-fixed-dim: '#bcc7de'
  on-secondary-fixed: '#111c2d'
  on-secondary-fixed-variant: '#3c475a'
  tertiary-fixed: '#9df4cb'
  tertiary-fixed-dim: '#81d7b0'
  on-tertiary-fixed: '#002114'
  on-tertiary-fixed-variant: '#005138'
  background: '#fff8f7'
  on-background: '#261817'
  surface-variant: '#f7ddda'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: '700'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: '1.3'
  title-lg:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.4'
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: '1.2'
    letterSpacing: 0.01em
  display-lg-mobile:
    fontFamily: Inter
    fontSize: 36px
    fontWeight: '700'
    lineHeight: '1.2'
rounded:
  sm: 0.5rem
  DEFAULT: 1rem
  md: 1.5rem
  lg: 2rem
  xl: 3rem
  full: 9999px
spacing:
  base: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  xxl: 48px
  gutter: 24px
  margin: 24px
---

## Brand & Style
The design system is built on a foundation of **Modern Warmth**—a blend of high-end hospitality and technical precision. It targets food enthusiasts who value both the speed of a utility and the sensory experience of dining. 

The aesthetic is a sophisticated evolution of **Glassmorphism**, moving away from cold, futuristic blues toward a palette of appetizing corals and organic neutrals. By layering translucent surfaces over vibrant, high-quality food imagery, the UI feels airy and immersive. Every interaction should evoke a sense of "premium comfort," using soft elevation and organic transitions to guide the user from discovery to checkout.

## Colors
This design system utilizes a warm-toned Material Design 3 logic. The **Primary Red** provides appetite-stimulating urgency, while the **Tertiary Green** acts as a fresh accent for health-conscious options and success states.

- **Warmth over Neutrality:** Avoid pure greys. Surfaces use a "warm off-white" base to maintain a culinary, hospitable feel.
- **Glassmorphism Tint:** Translucent layers should use an `rgba(255, 255, 255, 0.7)` white tint in light mode, and a muted warm-red tint in dark mode to maintain the "glow."
- **Contrast:** Ensure all text on primary and tertiary containers meets WCAG AA standards by utilizing the deep warm brown for maximum legibility against light backgrounds.

## Typography
The typography system relies exclusively on **Inter** to provide a clean, systematic framework that allows photography to take center stage. 

- **Weight Hierarchy:** Heavy weights (700) are reserved for headlines and price points to ensure immediate scanning. 
- **Readability:** Body text uses a generous 1.6 line-height to maintain an open, relaxed reading experience on restaurant descriptions and menus.
- **Iconography:** Pair typography with **Material Symbols Outlined**. Icons should generally match the stroke weight of the accompanying text (approx 1.5px to 2px stroke).

## Layout & Spacing
The layout follows a **Fluid Grid** model with an 8px base unit (4px for micro-adjustments). 

- **Desktop:** 12-column grid with 24px gutters and wide margins (at least 80px) to center the content and provide a boutique feel.
- **Mobile:** 4-column grid with 16px margins. 
- **Padding:** Vertical spacing between sections should be generous (xxl) to emphasize the minimalist, "Airbnb-style" layout philosophy. 
- **Containers:** Use `max-width: 1280px` for main content areas to prevent line lengths from becoming unreadable on ultra-wide displays.

## Elevation & Depth
Depth is created through a mix of **Tonal Layering** and **Glassmorphism**.

- **Surfaces:** Floating elements (like navigation bars or cart summaries) utilize `backdrop-filter: blur(20px)` and a 1px white "hairline" border to separate them from the background.
- **Shadows:** Use "Soft Red Shadows"—low-opacity `rgba(181, 35, 48, 0.08)`—to give elevated elements a subtle glow rather than a heavy, muddy grey drop shadow.
- **Active States:** Elements should feel "lifted" on hover using a slightly more pronounced shadow and a 2px vertical translation (fade-up).

## Shapes
The shape language is extremely soft and approachable. 

- **Cards:** Use a 24px corner radius for restaurant and food cards to create a modern, friendly frame for imagery.
- **Buttons:** All primary and secondary buttons must be **Pill-shaped** (full rounding) to maximize the "friendly" brand attribute.
- **Inputs:** Form fields use a 12px radius, balancing the extreme roundness of buttons with the structural needs of text input.

## Components
- **Buttons:** Primary buttons use the Red-to-Coral gradient or solid Red with white text. Apply a subtle pulse animation on "Processing" states.
- **Glass Cards:** Used for overlays and filters. Must include a `1px` stroke in `rgba(255, 255, 255, 0.4)` to define edges against busy food photos.
- **Chips:** For cuisine categories (e.g., "Sushi," "Italian"). Use the tertiary green container for "Healthy" or "Promoted" tags.
- **Theme Toggle:** A floating glassmorphic pill at the bottom corner of the viewport. Use a sliding "Sun/Moon" icon toggle with a smooth 300ms transition between light and dark modes.
- **Input Fields:** Use the warm off-white surface with a `1px` border that transitions from `#e2bebc` to `#b52330` on focus.
- **Lists:** Menu items should be separated by subtle horizontal rules in `#e2bebc`, with ample padding to prevent a cluttered "spreadsheet" look.