/**
 * Border Radius Scale
 *
 * All border radius values used throughout the app.
 * Provides consistent rounding for cards, buttons, inputs, and other UI elements.
 */

export const radii = {
  // Base scale
  none: 0, // 0px - No rounding
  xs: 4, // 4px - Extra small rounding
  sm: 8, // 8px - Small rounding (buttons, inputs)
  md: 12, // 12px - Medium rounding (cards, small modals)
  lg: 16, // 16px - Large rounding (large cards, sheets)
  xl: 20, // 20px - Extra large rounding
  "2xl": 24, // 24px - 2x extra large
  "3xl": 32, // 32px - 3x extra large (rounded containers)
  full: 9999, // 9999px - Full rounding (circles, pills)

  // Semantic tokens (common use cases)
  button: 8, // 8px - Default button rounding
  input: 8, // 8px - Default input rounding
  card: 16, // 16px - Default card rounding
  modal: 20, // 20px - Default modal/sheet rounding
  avatar: 9999, // Full circle - Avatar rounding
  badge: 9999, // Full circle - Badge/pill rounding
} as const;

export type Radii = typeof radii;
