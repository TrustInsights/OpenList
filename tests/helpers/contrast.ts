// Test helper: WCAG 2.1 contrast ratio between two six digit hex colors

const HEX_COLOR = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i;

/**
 * Convert one sRGB channel byte to its linear light value.
 * @param byte - Channel value from 0 to 255.
 * @returns Linear value from 0 to 1.
 */
function linearChannel(byte: number): number {
  const scaled = byte / 255;
  return scaled <= 0.03928 ? scaled / 12.92 : ((scaled + 0.055) / 1.055) ** 2.4;
}

/**
 * Compute the WCAG relative luminance of a hex color.
 * @param color - Color as #rrggbb.
 * @returns Relative luminance from 0 to 1.
 */
function relativeLuminance(color: string): number {
  const match = HEX_COLOR.exec(color);
  if (!match) throw new Error(`Not a six digit hex color: ${color}`);
  const [red, green, blue] = [match[1], match[2], match[3]].map((part) =>
    linearChannel(Number.parseInt(part ?? '0', 16))
  );
  return 0.2126 * (red ?? 0) + 0.7152 * (green ?? 0) + 0.0722 * (blue ?? 0);
}

/**
 * Compute the WCAG contrast ratio between two colors.
 * @param foreground - Color as #rrggbb.
 * @param background - Color as #rrggbb.
 * @returns Ratio from 1 to 21, rounded to 2 decimals.
 */
export function contrastRatio(foreground: string, background: string): number {
  const first = relativeLuminance(foreground);
  const second = relativeLuminance(background);
  const lighter = Math.max(first, second);
  const darker = Math.min(first, second);
  return Math.round(((lighter + 0.05) / (darker + 0.05)) * 100) / 100;
}
