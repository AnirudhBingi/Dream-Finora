import { colors as lightColors, type Colors } from "./colors";

export type ThemeMode = "light" | "dark" | "system";
export type ResolvedThemeMode = "light" | "dark";

// Minimal dark palette that keeps brand colors but flips surfaces + text.
export const darkColors: Colors = {
  ...lightColors,
  // Neutral grays (shifted for dark surfaces)
  gray50: "#0B1020",
  gray100: "#111827",
  gray200: "#1F2937",
  gray300: "#374151",
  gray400: "#4B5563",
  gray500: "#6B7280",
  gray600: "#9CA3AF",
  gray700: "#D1D5DB",
  gray800: "#E5E7EB",
  gray900: "#F9FAFB",
  // Tinted backgrounds (avoid light-mode pastels in dark mode)
  primaryBackground: "rgba(99, 102, 241, 0.18)",
  blueBackground: "rgba(37, 99, 235, 0.18)",
  successBackground: "rgba(16, 185, 129, 0.18)",
  errorBackground: "rgba(239, 68, 68, 0.18)",
  warningBackground: "rgba(245, 158, 11, 0.18)",
  infoBackground: "rgba(59, 130, 246, 0.18)",
  // In light mode, screens often use a slightly tinted background (backgroundSecondary),
  // while cards/surfaces use background. Mirror that relationship in dark mode:
  // - backgroundSecondary: darkest "app background"
  // - background: slightly lighter "surface/card"
  background: "#111827",
  backgroundSecondary: "#0B1020",
  backgroundTertiary: "#1F2937",
  textPrimary: "#F9FAFB",
  textSecondary: "#D1D5DB",
  textTertiary: "#9CA3AF",
  border: "#374151",
  borderLight: "#1F2937",
  borderDark: "#4B5563",
  overlay: "rgba(0, 0, 0, 0.7)",
  overlayLight: "rgba(0, 0, 0, 0.5)",
  overlayDark: "rgba(0, 0, 0, 0.85)",
  // Surface overlays - in dark mode, use white overlays for elevation
  surfaceOverlay: "rgba(255, 255, 255, 0.1)",
  surfaceOverlayLight: "rgba(255, 255, 255, 0.05)",
  surfaceOverlayMedium: "rgba(255, 255, 255, 0.15)",
  surfaceOverlayStrong: "rgba(255, 255, 255, 0.2)",
  // Inactive states remain similar in dark mode
  inactiveOnPrimary: "rgba(255, 255, 255, 0.6)",
  inactiveOnDark: "rgba(255, 255, 255, 0.5)",
  // New semantic tokens for dark mode
  borderSubtle: "#1F2937", // Subtle border in dark mode
  borderStrong: "#4B5563", // Strong border in dark mode
  divider: "#374151", // Divider in dark mode
  accent: "#6366F1", // Accent (keep brand color)
  accentForeground: "#FFFFFF", // Text on accent
  accentMuted: "rgba(99, 102, 241, 0.18)", // Muted accent in dark mode
  pressed: "rgba(255, 255, 255, 0.12)", // Pressed state in dark mode
  selected: "rgba(99, 102, 241, 0.18)", // Selected state in dark mode
  disabled: "#1F2937", // Disabled background in dark mode
  disabledText: "#4B5563", // Disabled text in dark mode
  focusRing: "#6366F1", // Focus ring (keep brand color)
  iconDefault: "#9CA3AF", // Default icon in dark mode (gray-600)
  iconMuted: "#6B7280", // Muted icon in dark mode (gray-500)
};

export function resolveThemeMode(
  mode: ThemeMode,
  systemMode: string | null | undefined,
): ResolvedThemeMode {
  if (mode === "light" || mode === "dark") return mode;
  return systemMode === "dark" ? "dark" : "light";
}

export function getColorsForResolvedMode(resolved: ResolvedThemeMode): Colors {
  return resolved === "dark" ? darkColors : lightColors;
}
