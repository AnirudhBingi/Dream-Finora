/**
 * Theme System
 *
 * Centralized design tokens for the entire app with dynamic theming support.
 *
 * ⚠️ IMPORTANT: Always use useTheme() hook for dynamic theming!
 *
 * Usage:
 *   // ❌ DEPRECATED: Static theme import (doesn't react to theme changes)
 *   // DO NOT USE: import { theme } from '../theme';
 *   // This will NOT update when theme changes (light/dark/system)
 *
 *   // ✅ CORRECT: Dynamic theme hook (reacts to light/dark/system changes)
 *   import { useTheme } from '../theme';
 *   const { theme } = useTheme();
 *   const styles = useMemo(() => createStyles(theme), [theme]);
 *
 *   // For components that need dynamic theming:
 *   const createStyles = (theme) => StyleSheet.create({ ... });
 *
 * Colors automatically adapt to the current theme (light/dark/system).
 * Always use textInverse for text/icons on colored backgrounds.
 */

import { colors, Colors } from "./colors";
import { spacing, Spacing } from "./spacing";
import { typography, Typography } from "./typography";
import { shadows, Shadows } from "./shadows";
import { radii, Radii } from "./radii";
import { sizes, Sizes } from "./sizes";
import { ThemeProvider, useTheme } from "./ThemeProvider";
import type { ThemeMode, ResolvedThemeMode } from "./colorSchemes";
import {
  colorWithOpacity,
  getBackgroundVariant,
  hexToRgb,
  rgbaString,
  chartColor,
} from "./utils";

/**
 * @deprecated Static theme export - DO NOT USE in components/screens!
 * This is only exported for backward compatibility and will NOT react to theme changes.
 *
 * ⚠️ ALWAYS use useTheme() hook instead:
 *   const { theme } = useTheme();
 *   const styles = useMemo(() => createStyles(theme), [theme]);
 *
 * Using static theme will break light/dark/system theme switching.
 */
export const theme = {
  colors,
  spacing,
  typography,
  shadows,
} as const;

export type Theme = typeof theme;

// Re-export types for convenience
export type { Colors, Spacing, Typography, Shadows, Radii, Sizes };

// Theme runtime (light/dark/system)
export { ThemeProvider, useTheme };
export type { ThemeMode, ResolvedThemeMode };

// Theme utilities
export {
  colorWithOpacity,
  getBackgroundVariant,
  hexToRgb,
  rgbaString,
  chartColor,
};

// Default export
export default theme;
