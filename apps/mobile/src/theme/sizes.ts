/**
 * Size Scale
 *
 * Standardized sizes for UI elements like buttons, inputs, icons, and avatars.
 * Ensures consistency across all interactive elements.
 */

export const sizes = {
  // Button Heights
  button: {
    sm: 36, // 36px - Small button (compact actions)
    md: 44, // 44px - Medium button (default, iOS standard)
    lg: 52, // 52px - Large button (primary CTAs)
  },

  // Input Heights
  input: {
    sm: 40, // 40px - Small input
    md: 48, // 48px - Medium input (default)
    lg: 56, // 56px - Large input
  },

  // Icon Sizes
  icon: {
    xs: 16, // 16px - Extra small icon
    sm: 20, // 20px - Small icon
    md: 24, // 24px - Medium icon (default)
    lg: 28, // 28px - Large icon
    xl: 32, // 32px - Extra large icon
    "2xl": 40, // 40px - 2x extra large icon
    "3xl": 48, // 48px - 3x extra large icon
  },

  // Avatar Sizes
  avatar: {
    xs: 24, // 24px - Extra small avatar (inline)
    sm: 32, // 32px - Small avatar (list items)
    md: 40, // 40px - Medium avatar (default)
    lg: 48, // 48px - Large avatar (cards)
    xl: 64, // 64px - Extra large avatar (profile headers)
    "2xl": 80, // 80px - 2x extra large avatar
    "3xl": 96, // 96px - 3x extra large avatar (profile pages)
  },

  // Touch Target (minimum accessible tap area)
  touchTarget: 44, // 44px - Minimum touch target (iOS/Android standard)

  // Screen Layout
  screenGutter: 24, // 24px - Standard horizontal screen padding
  headerHeight: 56, // 56px - Standard header height
  bottomNavHeight: 64, // 64px - Bottom navigation height
} as const;

export type Sizes = typeof sizes;
