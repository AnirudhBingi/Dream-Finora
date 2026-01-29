/**
 * Typography Scale
 *
 * All typography values (font sizes, weights, line heights) used throughout the app.
 */

export const typography = {
  // Font Sizes
  fontSize: {
    xs: 12, // 12px - Extra small text
    sm: 14, // 14px - Small text
    base: 16, // 16px - Base text (body)
    lg: 18, // 18px - Large text
    xl: 20, // 20px - Extra large text
    "2xl": 24, // 24px - 2x extra large (h2)
    "3xl": 28, // 28px - 3x extra large (h1)
    "4xl": 32, // 32px - 4x extra large
  },

  // Font Weights
  fontWeight: {
    normal: "400" as const, // Normal weight
    medium: "500" as const, // Medium weight
    semibold: "600" as const, // Semi-bold weight
    bold: "700" as const, // Bold weight
  },

  // Line Heights
  lineHeight: {
    tight: 1.2, // Tight line height (for headings)
    normal: 1.5, // Normal line height (for body)
    relaxed: 1.75, // Relaxed line height (for long text)
  },

  // Typography Styles (pre-composed)
  styles: {
    // Headings
    h1: {
      fontSize: 28,
      fontWeight: "700" as const,
      lineHeight: 1.2,
    },
    h2: {
      fontSize: 24,
      fontWeight: "600" as const,
      lineHeight: 1.2,
    },
    h3: {
      fontSize: 20,
      fontWeight: "600" as const,
      lineHeight: 1.3,
    },
    h4: {
      fontSize: 18,
      fontWeight: "600" as const,
      lineHeight: 1.4,
    },

    // Body Text
    body: {
      fontSize: 16,
      fontWeight: "400" as const,
      lineHeight: 1.5,
    },
    bodyMedium: {
      fontSize: 16,
      fontWeight: "500" as const,
      lineHeight: 1.5,
    },
    bodySmall: {
      fontSize: 14,
      fontWeight: "400" as const,
      lineHeight: 1.5,
    },
    bodySmallMedium: {
      fontSize: 14,
      fontWeight: "500" as const,
      lineHeight: 1.5,
    },

    // Labels
    label: {
      fontSize: 14,
      fontWeight: "500" as const,
      lineHeight: 1.4,
    },
    labelSmall: {
      fontSize: 12,
      fontWeight: "600" as const,
      lineHeight: 1.4,
    },

    // Captions
    caption: {
      fontSize: 12,
      fontWeight: "400" as const,
      lineHeight: 1.4,
    },
    captionMedium: {
      fontSize: 12,
      fontWeight: "500" as const,
      lineHeight: 1.4,
    },
  },
} as const;

export type Typography = typeof typography;
