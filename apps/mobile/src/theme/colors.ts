/**
 * Color Palette
 *
 * All colors used throughout the app.
 * Designers can modify these values without touching feature code.
 */

export const colors = {
  // Primary Colors
  primary: "#6366F1", // Indigo-500 - Primary brand color
  primaryDark: "#4F46E5", // Indigo-600 - Darker primary
  primaryLight: "#818CF8", // Indigo-400 - Lighter primary
  primaryBackground: "#EEF2FF", // Indigo-50 - Primary background tint

  // Blue Colors (used for links, actions)
  blue: "#2563EB", // Blue-600 - Links, actions
  blueDark: "#1D4ED8", // Blue-700 - Darker blue
  blueLight: "#3B82F6", // Blue-500 - Lighter blue
  blueBackground: "#EFF6FF", // Blue-50 - Blue background tint

  // Neutral Grays
  gray50: "#F9FAFB", // Gray-50 - Lightest background
  gray100: "#F3F4F6", // Gray-100 - Light background
  gray200: "#E5E7EB", // Gray-200 - Borders, dividers
  gray300: "#D1D5DB", // Gray-300 - Disabled borders
  gray400: "#9CA3AF", // Gray-400 - Placeholder text
  gray500: "#6B7280", // Gray-500 - Secondary text
  gray600: "#4B5563", // Gray-600 - Medium text
  gray700: "#374151", // Gray-700 - Dark text
  gray800: "#1F2937", // Gray-800 - Darker text
  gray900: "#111827", // Gray-900 - Darkest text

  // Semantic Colors
  white: "#FFFFFF", // White
  black: "#000000", // Black

  // Status Colors
  success: "#10B981", // Green-500 - Success states
  successBackground: "#D1FAE5", // Green-100 - Success background
  error: "#EF4444", // Red-500 - Error states
  errorBackground: "#FEE2E2", // Red-100 - Error background
  warning: "#F59E0B", // Amber-500 - Warning states
  warningBackground: "#FEF3C7", // Amber-100 - Warning background
  info: "#3B82F6", // Blue-500 - Info states
  infoBackground: "#DBEAFE", // Blue-100 - Info background

  // Chart Colors (for analytics and visualization)
  chartPink: "#EC4899", // Pink-500 - Chart color variant
  chartLime: "#84CC16", // Lime-500 - Chart color variant
  chartOrange: "#F97316", // Orange-500 - Chart color variant

  // Background Colors (Semantic Surface Hierarchy)
  background: "#FFFFFF", // Main background / surface-1 (cards, main surfaces)
  backgroundSecondary: "#F9FAFB", // Secondary background / surface-0 (page background)
  backgroundTertiary: "#F3F4F6", // Tertiary background / surface-2 (elevated/modal)

  // Text Colors
  textPrimary: "#111827", // Primary text (gray-900)
  textSecondary: "#6B7280", // Secondary text (gray-500)
  textTertiary: "#9CA3AF", // Tertiary text (gray-400)
  textInverse: "#FFFFFF", // Text on dark backgrounds

  // Border Colors
  border: "#E5E7EB", // Default border (gray-200)
  borderLight: "#F3F4F6", // Light border (gray-100)
  borderDark: "#D1D5DB", // Dark border (gray-300)
  borderSubtle: "#F3F4F6", // Subtle border (same as borderLight)
  borderStrong: "#D1D5DB", // Strong border (same as borderDark)
  divider: "#E5E7EB", // Divider line (same as border)

  // Overlay Colors
  overlay: "rgba(0, 0, 0, 0.5)", // Modal overlay
  overlayLight: "rgba(0, 0, 0, 0.3)", // Light overlay
  overlayDark: "rgba(0, 0, 0, 0.7)", // Dark overlay

  // Surface Overlays (for search bars, hover states on colored backgrounds)
  surfaceOverlay: "rgba(255, 255, 255, 0.15)", // Light overlay on colored surfaces
  surfaceOverlayLight: "rgba(255, 255, 255, 0.1)", // Lighter surface overlay
  surfaceOverlayMedium: "rgba(255, 255, 255, 0.2)", // Medium surface overlay
  surfaceOverlayStrong: "rgba(255, 255, 255, 0.25)", // Stronger surface overlay

  // Inactive States (for navigation, disabled items on colored backgrounds)
  inactiveOnPrimary: "rgba(255, 255, 255, 0.7)", // Inactive text/icons on primary color
  inactiveOnDark: "rgba(255, 255, 255, 0.6)", // Inactive text/icons on dark backgrounds

  // Accent Colors (semantic roles for accent/highlight)
  accent: "#6366F1", // Accent color (same as primary for now)
  accentForeground: "#FFFFFF", // Text/icon on accent background
  accentMuted: "#EEF2FF", // Muted accent background (primary-50)

  // Interactive States
  pressed: "rgba(0, 0, 0, 0.08)", // Pressed state overlay
  selected: "#EEF2FF", // Selected state background (primary-50)
  disabled: "#F3F4F6", // Disabled background (gray-100)
  disabledText: "#D1D5DB", // Disabled text (gray-300)
  focusRing: "#6366F1", // Focus ring color (primary)

  // Icon Colors
  iconDefault: "#6B7280", // Default icon color (gray-500)
  iconMuted: "#9CA3AF", // Muted icon color (gray-400)
} as const;

// Use string-valued tokens so alternate palettes (dark mode) can reuse the same keys.
export type Colors = Record<keyof typeof colors, string>;
