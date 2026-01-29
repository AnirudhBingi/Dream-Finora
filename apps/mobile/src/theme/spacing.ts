/**
 * Spacing Scale
 *
 * All spacing values used throughout the app.
 * Based on 4px base unit for consistency.
 */

export const spacing = {
  // Base unit: 4px
  xs: 4, // 4px - Extra small spacing
  sm: 8, // 8px - Small spacing
  md: 12, // 12px - Medium spacing
  base: 16, // 16px - Base spacing (most common)
  lg: 20, // 20px - Large spacing
  xl: 24, // 24px - Extra large spacing
  "2xl": 32, // 32px - 2x extra large
  "3xl": 40, // 40px - 3x extra large
  "4xl": 48, // 48px - 4x extra large
  "5xl": 64, // 64px - 5x extra large

  // Common combinations
  padding: {
    xs: 4, // 4px padding
    sm: 8, // 8px padding
    md: 12, // 12px padding
    base: 16, // 16px padding
    lg: 20, // 20px padding
    xl: 24, // 24px padding
    "2xl": 32, // 32px padding
  },

  margin: {
    xs: 4, // 4px margin
    sm: 8, // 8px margin
    md: 12, // 12px margin
    base: 16, // 16px margin
    lg: 20, // 20px margin
    xl: 24, // 24px margin
    "2xl": 32, // 32px margin
  },

  // Gap (for flexbox gap)
  gap: {
    xs: 4, // 4px gap
    sm: 8, // 8px gap
    md: 12, // 12px gap
    base: 16, // 16px gap
    lg: 20, // 20px gap
    xl: 24, // 24px gap
  },

  // Screen Layout
  screenGutter: 16, // 16px - Standard horizontal screen padding/gutter (reduced from 24px per user feedback)
  sectionSpacing: 24, // 24px - Standard spacing between sections
  headerContentGap: 16, // 16px - Standard gap between Header and first content element
} as const;

export type Spacing = typeof spacing;
