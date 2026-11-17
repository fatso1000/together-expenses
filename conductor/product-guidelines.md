# Product Guidelines: Daily Expenses (`together-expenses`)

## Brand & Aesthetic Principles
- **Modern Obsidian Dark-Mode Native**: Default dark aesthetic (`#0b1412` canvas, `#101c18` surface cards, `#38e2ab` emerald accent glow). High contrast, crisp borders (`rgba(255, 255, 255, 0.09)`), and deep obsidian backgrounds.
- **PrimeVue & Tailwind Synergy**: Leverage PrimeVue 5 with Aura preset adapted for sleek obsidian dark mode, complemented by Tailwind CSS utility-first styling for structural layout and responsive spacing.
- **Lightweight, High-Performance Simplicity**: Clean, responsive layout utilizing semantic HTML, Vue 3, and CSS. Avoid continuous CPU/GPU hogging shaders, heavy backdrop-filter blur chains, or resource-heavy perpetual animations that compromise frame rates on mobile devices.
- **Visual Hierarchy & Typography**: Crisp typography using `@fontsource-variable/dm-sans` for interface body text and `@fontsource-variable/manrope` for numeric totals, financial figures, and unit comparisons.

## Front-End & Vue Best Practices
- **Predictable Data Flow & Reactivity**: Single source of truth with Pinia stores; derive computed values rather than syncing duplicated local state. Keep templates declarative.
- **Sub-16ms Interactions (60fps)**: Modals, drawers, sheets, and tab switches must render and animate instantaneously without frame drops or jank.
- **Component Granularity**: Keep route views and root components as thin composition shells; delegate UI cards, input groups, and list entries to focused, single-responsibility components.
- **Accessibility & Ergonomics (WCAG 2.2)**: Touch-friendly targets (minimum 44x44px) for mobile, full keyboard navigation with visible focus rings, aria labels on icon-only actions, and semantic form labels.

## Tone, Voice & Localization
- **Pragmatic & Trustworthy**: Direct, clear financial terminology without hype, gamification, or condescending financial advice.
- **Transparent Privacy**: Honest messaging highlighting that records are kept locally on-device or encrypted with zero-knowledge keys without external monetization.
- **Bilingual & Localization First**: Seamless support for English and Spanish, respecting localized currency (NZD base with USD reference) and normalized unit measurements (kg, g, lb, oz, L, ml, m, cm).
