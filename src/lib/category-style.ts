import type { CSSProperties } from "vue";
import type { CategoryDefinition } from "@/lib/types";

export const DEFAULT_CATEGORY_COLOR = "#718469";

/**
 * Resolves a category's configured hex color from available definitions.
 */
export function resolveCategoryColor(
  categoryName: string,
  definitions: readonly CategoryDefinition[],
): string {
  const normalized = (categoryName || "").trim().toLowerCase();
  if (!normalized) {
    return DEFAULT_CATEGORY_COLOR;
  }

  const match = definitions.find(
    (def) => def.name.trim().toLowerCase() === normalized,
  );
  return match?.color || DEFAULT_CATEGORY_COLOR;
}

/**
 * Converts a #RGB or #RRGGBB hex string into a translucent #RRGGBBAA string.
 * Returns the trimmed input unchanged if it is not a standard 3- or 6-digit hex color.
 */
export function withHexAlpha(color: string, alphaHex: string): string {
  const trimmed = color.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(trimmed)) {
    return `${trimmed}${alphaHex}`;
  }
  if (/^#[0-9a-fA-F]{3}$/.test(trimmed)) {
    const expanded =
      "#" +
      trimmed[1] +
      trimmed[1] +
      trimmed[2] +
      trimmed[2] +
      trimmed[3] +
      trimmed[3];
    return `${expanded}${alphaHex}`;
  }
  return trimmed;
}

/**
 * Builds inline surface styles so a category card or button uses the category's
 * color directly as its own background instead of placing a background behind the icon.
 */
export function categorySurfaceStyle(
  color: string,
  options?: { selected?: boolean },
): CSSProperties {
  const selected = options?.selected ?? false;
  const backgroundAlpha = selected ? "3d" : "22";
  const borderAlpha = selected ? "cc" : "4d";

  const style: CSSProperties = {
    backgroundColor: withHexAlpha(color, backgroundAlpha),
    borderColor: withHexAlpha(color, borderAlpha),
  };

  if (selected) {
    style.boxShadow = `0 0 0 2px ${withHexAlpha(color, "55")}`;
  }

  return style;
}
