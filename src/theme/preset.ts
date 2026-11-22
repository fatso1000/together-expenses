import { definePreset } from "@primeuix/themes";
import Aura from "@primeuix/themes/aura";

/**
 * PrimeVue preset customizations.
 * Uses definePreset on an external file to customize PrimeVue Drawer at the theme level instead of CSS:
 * - Removes borders bottom, left, and right from PrimeVue Drawer.
 * - Adds a border bottom for the header on PrimeVue Drawer using design tokens.
 */
export const DrawerPreset = definePreset(Aura, {
  components: {
    drawer: {
      css: ({ dt }) => `
        .p-drawer,
        .p-drawer-full .p-drawer,
        .p-drawer-top .p-drawer,
        .p-drawer-bottom .p-drawer,
        .p-drawer-left .p-drawer,
        .p-drawer-right .p-drawer {
          border-bottom: none;
          border-left: none;
          border-right: none;
        }

        .p-drawer-bottom .p-drawer {
          border-radius: 24px 24px 0 0;
        }

        .p-drawer-bottom .p-drawer-header {
          position: relative;
          padding-top: 1.35rem;
        }

        .p-drawer-bottom .p-drawer-header::before {
          content: "";
          position: absolute;
          top: 8px;
          left: 50%;
          transform: translateX(-50%);
          width: 36px;
          height: 4px;
          border-radius: 9999px;
          background: rgba(255, 255, 255, 0.24);
          pointer-events: none;
        }

        .p-drawer-header {
          border-bottom: 1px solid ${dt("drawer.border.color")};
        }
      `,
    },
  },
});

export const ExpensesTheme = definePreset(Aura, {
  ...DrawerPreset,
  semantic: {
    typography: {
      fontFamily: "'Meiryo UI', Meiryo, sans-serif",
    },
  },
});

export default DrawerPreset;
