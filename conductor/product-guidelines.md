# Product Guidelines: Daily Expenses (`together-expenses`)

## Brand & Aesthetic Principles
- **Lightweight, High-Performance Simplicity**: Clean, responsive layout utilizing native HTML, CSS, Vue, and Tailwind utility classes.
- **Zero Heavy Render Cost**: Avoid resource-heavy 3D effects, dynamic canvas/WebGL shaders, heavy continuous backdrop-filter blur chains, or complex perpetual animations that compromise frame rates on mobile and lower-power hardware.
- **Visual Clarity & Contrast**: Clear visual hierarchy with crisp typography (`DM Sans`, `Manrope`), solid readable card backgrounds, clean borders, and accessible color contrast.

## Tone and Voice
- **Pragmatic & Trustworthy**: Direct, clear financial terminology without hype, financial jargon, or condescending gamification.
- **Transparent Privacy**: Honest messaging highlighting that records are kept locally on-device or encrypted with zero-knowledge keys without external monetization.
- **Bilingual & Localization First**: Seamless support for English and Spanish, respecting localized currency (NZD base with USD reference) and measurements (kg, g, lb, oz, L, ml, m, cm).

## User Experience & Performance Standards
- **Sub-16ms Interactions (60fps)**: Drawers, modals, sheets, and tab transitions must open instantly without frame drops, using standard native CSS transitions and performant layouts.
- **Offline Reliability**: The app must function reliably offline, reading cached OCR models and persisting data instantaneously to IndexedDB/LocalStorage.
- **Keyboard & Touch Ergonomics**: Touch-friendly tap targets (minimum 44x44px) for mobile, accompanied by smooth keyboard accessibility and intuitive auto-focus flows.
