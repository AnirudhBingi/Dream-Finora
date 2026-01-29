/**
 * Theme Utility Functions
 *
 * Helper functions for working with theme colors and styles.
 */

/**
 * Convert a hex color to rgba with the specified opacity.
 *
 * @param hexColor - Hex color string (e.g., '#6366F1' or '6366F1')
 * @param opacity - Opacity value between 0 and 1 (e.g., 0.5 for 50%)
 * @returns RGBA color string (e.g., 'rgba(99, 102, 241, 0.5)')
 *
 * @example
 * colorWithOpacity('#6366F1', 0.2) // 'rgba(99, 102, 241, 0.2)'
 * colorWithOpacity(theme.colors.primary, 0.5) // 'rgba(99, 102, 241, 0.5)'
 */
export function colorWithOpacity(hexColor: string, opacity: number): string {
  // Remove # if present
  const hex = hexColor.replace("#", "");

  // Parse hex to RGB
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  // Return rgba string
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

/**
 * Get background color variant with reduced opacity for the given color.
 * Useful for status badges, alerts, and highlights.
 *
 * @param hexColor - Hex color string
 * @param opacity - Opacity value (default: 0.1 for 10%)
 * @returns RGBA color string
 *
 * @example
 * getBackgroundVariant(theme.colors.success) // 'rgba(16, 185, 129, 0.1)'
 * getBackgroundVariant(theme.colors.error, 0.15) // 'rgba(239, 68, 68, 0.15)'
 */
export function getBackgroundVariant(
  hexColor: string,
  opacity: number = 0.1,
): string {
  return colorWithOpacity(hexColor, opacity);
}

/**
 * Extract RGB values from hex color for chart libraries.
 * Some chart libraries require separate RGB values.
 *
 * @param hexColor - Hex color string
 * @returns Object with r, g, b values
 *
 * @example
 * hexToRgb('#6366F1') // { r: 99, g: 102, b: 241 }
 */
export function hexToRgb(hexColor: string): {
  r: number;
  g: number;
  b: number;
} {
  const hex = hexColor.replace("#", "");
  return {
    r: parseInt(hex.substring(0, 2), 16),
    g: parseInt(hex.substring(2, 4), 16),
    b: parseInt(hex.substring(4, 6), 16),
  };
}

/**
 * Create rgba color string from RGB values and opacity.
 * Useful for chart configurations that need dynamic opacity.
 *
 * @param r - Red value (0-255)
 * @param g - Green value (0-255)
 * @param b - Blue value (0-255)
 * @param opacity - Opacity value (0-1)
 * @returns RGBA color string
 *
 * @example
 * rgbaString(99, 102, 241, 0.5) // 'rgba(99, 102, 241, 0.5)'
 */
export function rgbaString(
  r: number,
  g: number,
  b: number,
  opacity: number,
): string {
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

/**
 * Get color with dynamic opacity for charts.
 * Combines hexToRgb and rgbaString for convenience.
 *
 * @param hexColor - Hex color string
 * @param opacity - Opacity value (0-1)
 * @returns RGBA color string
 *
 * @example
 * chartColor(theme.colors.primary, 0.5) // 'rgba(99, 102, 241, 0.5)'
 */
export function chartColor(hexColor: string, opacity: number): string {
  const { r, g, b } = hexToRgb(hexColor);
  return rgbaString(r, g, b, opacity);
}
