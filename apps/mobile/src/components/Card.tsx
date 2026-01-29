import React, { useMemo, type ReactNode } from "react";
import { View, StyleSheet, type ViewStyle, Platform } from "react-native";
import { useTheme } from "../theme";

/**
 * Card Component
 *
 * A flexible card component with semantic surface levels and standardized styling.
 * Replaces custom card implementations across the app for consistency.
 *
 * Features:
 * - Surface levels (0, 1, 2) for visual hierarchy
 * - Padding variants (none, sm, md, lg)
 * - Optional borders
 * - Theme-aware colors and shadows
 */

export type CardSurfaceLevel = 0 | 1 | 2;
export type CardPadding = "none" | "sm" | "md" | "lg";

interface CardProps {
  children: ReactNode;
  /** Surface level for visual hierarchy (0=page bg, 1=card, 2=elevated) */
  surface?: CardSurfaceLevel;
  /** Padding variant */
  padding?: CardPadding;
  /** Show border */
  border?: boolean;
  /** Custom styles */
  style?: ViewStyle;
  /** Border radius override */
  radius?: keyof ReturnType<typeof useTheme>["theme"]["radii"];
}

export function Card({
  children,
  surface = 1,
  padding = "md",
  border = false,
  style,
  radius,
}: CardProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const surfaceStyle = useMemo(() => {
    switch (surface) {
      case 0:
        return styles.surface0;
      case 1:
        return styles.surface1;
      case 2:
        return styles.surface2;
      default:
        return styles.surface1;
    }
  }, [surface, styles]);

  const paddingStyle = useMemo(() => {
    switch (padding) {
      case "none":
        return null;
      case "sm":
        return styles.paddingSm;
      case "md":
        return styles.paddingMd;
      case "lg":
        return styles.paddingLg;
      default:
        return styles.paddingMd;
    }
  }, [padding, styles]);

  const radiusStyle = useMemo(() => {
    if (radius) {
      return { borderRadius: theme.radii[radius] };
    }
    return null;
  }, [radius, theme.radii]);

  return (
    <View
      style={[
        styles.card,
        surfaceStyle,
        paddingStyle,
        border && styles.border,
        radiusStyle,
        style,
      ]}
    >
      {children}
    </View>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>["theme"]) =>
  StyleSheet.create({
    card: {
      borderRadius: theme.radii.card,
      ...Platform.select({
        ios: {
          shadowColor: theme.colors.black,
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.05,
          shadowRadius: 4,
        },
        android: {
          elevation: 2,
        },
      }),
    },
    surface0: {
      backgroundColor: theme.colors.backgroundSecondary,
    },
    surface1: {
      backgroundColor: theme.colors.background,
    },
    surface2: {
      backgroundColor: theme.colors.backgroundTertiary,
    },
    border: {
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    paddingSm: {
      padding: theme.spacing.md, // 12px
    },
    paddingMd: {
      padding: theme.spacing.base, // 16px
    },
    paddingLg: {
      padding: theme.spacing.xl, // 24px
    },
  });
