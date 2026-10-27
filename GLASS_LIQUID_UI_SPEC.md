# Glass / Liquid UI Design Specification & Architecture Plan

> **Status:** Planned / Architecture Blueprint (Do Not Implement Yet)  
> **Target Release:** Future Visual Overhaul  
> **Inspiration:** Apple VisionOS, macOS Sonoma Liquid Glass, iOS Frosted Translucency, Modern Neumorphic Caustics

---

## 1. Executive Summary & Design Vision

The objective of the **Liquid Glass UI** overhaul is to elevate Together Expenses into a tactile, luminous, high-end financial dashboard that feels like an organic piece of physical glass floating over an ambient fluid light source.

Instead of flat, opaque white panels on solid backgrounds, the application will embrace:
- **Translucent Multi-layer Depth:** Physical sensation of stacked optical lenses where underlying data, charts, and ambient light gently bleed through.
- **Dynamic Liquid Caustics:** Smoothly animating background fluid orbs (emerald, mint, teal, soft amber) providing refracted highlights through glass surfaces.
- **Specular Edge Highlighting:** Precision 1px gradient borders simulating refraction of light bouncing off the chamfered rim of polished crystal.
- **Fluid Spring Physics:** Viscous, organic micro-interactions using Apple-standard spring curves (`cubic-bezier(0.16, 1, 0.3, 1)`).

---

## 2. Design Tokens & Surface System

### 2.1 Glass Surface Materials (CSS Tokens)

```css
:root {
  /* Ambient Fluid Canvas Palette */
  --liquid-mesh-1: rgba(30, 142, 107, 0.22);   /* Deep Emerald */
  --liquid-mesh-2: rgba(72, 199, 142, 0.28);   /* Radiant Mint */
  --liquid-mesh-3: rgba(43, 187, 173, 0.18);   /* Oceanic Teal */
  --liquid-mesh-4: rgba(247, 194, 66, 0.14);   /* Soft Gold (Savings) */
  --liquid-bg-base: #f4f8f6;

  /* Glass Surface Levels */
  /* Level 1: Base Shell / Background Canvas */
  --glass-surface-base: rgba(255, 255, 255, 0.45);
  --glass-blur-base: blur(20px) saturate(160%);

  /* Level 2: Standard Cards & Panels */
  --glass-card-bg: rgba(255, 255, 255, 0.62);
  --glass-card-border: 1px solid rgba(255, 255, 255, 0.65);
  --glass-card-shadow: 
    0 4px 24px -1px rgba(18, 53, 44, 0.07),
    0 1px 3px 0 rgba(0, 0, 0, 0.02),
    inset 0 1px 1px 0 rgba(255, 255, 255, 0.85);
  --glass-card-blur: blur(28px) saturate(190%);

  /* Level 3: Elevated Drawers, Modals & Floating Toolbars */
  --glass-elevated-bg: rgba(255, 255, 255, 0.78);
  --glass-elevated-border: 1px solid rgba(255, 255, 255, 0.85);
  --glass-elevated-shadow:
    0 16px 48px -4px rgba(14, 46, 38, 0.16),
    0 2px 8px 0 rgba(0, 0, 0, 0.04),
    inset 0 1px 2px 0 rgba(255, 255, 255, 0.95);
  --glass-elevated-blur: blur(40px) saturate(220%);

  /* Level 4: Interactive Liquid Pills & Buttons */
  --liquid-pill-bg: rgba(255, 255, 255, 0.75);
  --liquid-pill-hover-bg: rgba(255, 255, 255, 0.92);
  --liquid-pill-active-bg: rgba(220, 245, 235, 0.85);
  --liquid-pill-border: 1px solid rgba(255, 255, 255, 0.75);
  --liquid-pill-shadow:
    0 2px 8px rgba(22, 68, 56, 0.08),
    inset 0 1px 1px rgba(255, 255, 255, 0.9);

  /* Primary Accent Liquid Button */
  --liquid-primary-bg: linear-gradient(135deg, #1f8e6c 0%, #16684f 100%);
  --liquid-primary-shadow:
    0 4px 16px rgba(27, 120, 91, 0.35),
    inset 0 1px 1px rgba(255, 255, 255, 0.35);
}
```

### 2.2 Specular Border Gradient Pattern

To achieve Apple-style razor-sharp chamfered glass rims:

```css
.glass-specular-edge {
  position: relative;
  background: var(--glass-card-bg);
  backdrop-filter: var(--glass-card-blur);
  -webkit-backdrop-filter: var(--glass-card-blur);
  border-radius: 20px;
}

.glass-specular-edge::before {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: inherit;
  padding: 1px;
  background: linear-gradient(
    140deg,
    rgba(255, 255, 255, 0.85) 0%,
    rgba(255, 255, 255, 0.35) 45%,
    rgba(255, 255, 255, 0.08) 80%,
    rgba(255, 255, 255, 0.45) 100%
  );
  -webkit-mask: 
    linear-gradient(#fff 0 0) content-box, 
    linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  pointer-events: none;
}
```

---

## 3. Ambient Fluid Canvas (Background Mesh)

Behind all pages will sit a hardware-accelerated ambient fluid canvas. It uses 3 smooth CSS radial gradient orbs that subtly drift and mutate, creating living light refractions beneath transparent cards.

```html
<div class="ambient-fluid-mesh" aria-hidden="true">
  <div class="fluid-orb orb-1"></div>
  <div class="fluid-orb orb-2"></div>
  <div class="fluid-orb orb-3"></div>
</div>
```

```css
.ambient-fluid-mesh {
  position: fixed;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
  z-index: 0;
  background-color: var(--liquid-bg-base);
}

.fluid-orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  opacity: 0.75;
  will-change: transform;
}

.orb-1 {
  width: 550px;
  height: 550px;
  background: radial-gradient(circle, var(--liquid-mesh-2) 0%, transparent 70%);
  top: -120px;
  right: -80px;
  animation: floatOrb1 24s ease-in-out infinite alternate;
}

.orb-2 {
  width: 650px;
  height: 650px;
  background: radial-gradient(circle, var(--liquid-mesh-1) 0%, transparent 70%);
  bottom: 5%;
  left: -150px;
  animation: floatOrb2 28s ease-in-out infinite alternate;
}

.orb-3 {
  width: 480px;
  height: 480px;
  background: radial-gradient(circle, var(--liquid-mesh-4) 0%, transparent 70%);
  top: 40%;
  right: 15%;
  animation: floatOrb3 20s ease-in-out infinite alternate;
}

@keyframes floatOrb1 {
  0% { transform: translate3d(0, 0, 0) scale(1); }
  50% { transform: translate3d(-80px, 60px, 0) scale(1.1); }
  100% { transform: translate3d(40px, 120px, 0) scale(0.95); }
}

@keyframes floatOrb2 {
  0% { transform: translate3d(0, 0, 0) scale(1); }
  50% { transform: translate3d(100px, -70px, 0) scale(1.08); }
  100% { transform: translate3d(50px, -130px, 0) scale(0.92); }
}

@keyframes floatOrb3 {
  0% { transform: translate3d(0, 0, 0) scale(1); }
  50% { transform: translate3d(-60px, -90px, 0) scale(1.15); }
  100% { transform: translate3d(-110px, 40px, 0) scale(0.9); }
}
```

---

## 4. Key Component Redesigns

### 4.1 Floating Nav Dock (Sidebar / Mobile Bar)
- **Desktop:** The current flat green sidebar transforms into a floating vertical glass capsule suspended 16px from the screen edge with rounded corners (`border-radius: 24px`) and deep specular rim.
- **Mobile:** The bottom nav becomes an iOS-style floating liquid glass pill dock with 14px margins, elevated by `var(--glass-elevated-shadow)`.

### 4.2 Weekly Limit Hero & Gauge
- The progress bar track switches from an opaque grey trench to a semi-translucent recessed bevel (`inset 0 2px 4px rgba(0,0,0,0.06)`).
- The fill bar glows with an internal glass gradient and a glistening leading edge highlight.

### 4.3 Frequent Payments & Bills Cards
- Each bill row renders as an individual frosted micro-slab.
- Due status tags (Today / Soon / Overdue) use luminous translucent pill badges with specular inner glow.

### 4.4 Slide-Up Expense Drawer (`ExpenseForm.vue`)
- The modal backdrop becomes an ultra-smooth progressive blur mask (`backdrop-filter: blur(16px)`).
- The sheet itself uses `var(--glass-elevated-bg)` with an organic top drag handle and soft shadow bleed.

---

## 5. Performance, Battery & Accessibility Guardrails

1. **Hardware Acceleration:**
   - Background orbs use only `transform: translate3d` and `scale` (avoiding expensive layout reflows or repaint cycles).
   - Use `contain: strict` on the ambient fluid container.

2. **Progressive Fallback for Low-Power / Unsupported Browsers:**
   ```css
   @supports not (backdrop-filter: blur(10px)) {
     :root {
       --glass-card-bg: rgba(255, 255, 255, 0.94);
       --glass-elevated-bg: #ffffff;
     }
     .ambient-fluid-mesh {
       display: none;
     }
   }
   ```

3. **Accessibility Motion Toggle:**
   ```css
   @media (prefers-reduced-motion: reduce) {
     .fluid-orb {
       animation: none !important;
       transform: none !important;
     }
     * {
       transition-duration: 0.01ms !important;
     }
   }
   ```

4. **WCAG 2.2 AA Contrast Compliance:**
   - Text color remains high-contrast `#1c3831` (contrast ratio > 7:1 against glass cards).
   - Card backgrounds maintain at least 62% white opacity to guarantee consistent legibility regardless of which fluid orb passes underneath.

---

## 6. Phased Implementation Roadmap

| Phase | Scope | Risk | Estimated Effort |
| :--- | :--- | :--- | :--- |
| **Phase 1: Foundations** | Extract CSS tokens into `styles/tokens.css`, define specular edge mixins, add ambient orb container | Low | 1 Session |
| **Phase 2: App Shell** | Convert `App.vue` sidebar and mobile dock to floating glass capsules, add backdrop filters | Low | 1 Session |
| **Phase 3: Core Cards** | Upgrade `WeeklyLimit.vue`, `AccountsOverview.vue`, `FrequentPayments.vue`, `TrendChart.vue` to frosted glass | Med | 2 Sessions |
| **Phase 4: Drawers & Inputs** | Upgrade `ExpenseForm.vue`, `ReceiptReader.vue`, text inputs, and select fields to translucent glass | Med | 1 Session |
| **Phase 5: Polish & QA** | Mobile GPU FPS benchmarking, dark mode liquid variants, contrast audits | Low | 1 Session |

---
*Document author: Antigravity Senior Engineering Team*  
*Ready for future implementation upon activation.*
