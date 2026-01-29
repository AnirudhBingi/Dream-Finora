import React, { useMemo } from "react";
import {
  Text as RNText,
  StyleSheet,
  type TextProps as RNTextProps,
  type TextStyle,
} from "react-native";
import { useTheme } from "../theme";

/**
 * Typography Component
 *
 * A semantic text component that standardizes typography across the app.
 * Replaces raw <Text> usage with consistent styling from theme tokens.
 *
 * Variants:
 * - h1, h2, h3: Headings
 * - body, body2: Body text
 * - caption, label: Smaller text
 * - button: Button text styling
 */

export type TextVariant =
  | "h1"
  | "h2"
  | "h3"
  | "h4"
  | "body"
  | "body2"
  | "caption"
  | "label"
  | "button";

export type TextColor =
  | "primary"
  | "secondary"
  | "tertiary"
  | "inverse"
  | "success"
  | "error"
  | "warning"
  | "info";

interface TextProps extends Omit<RNTextProps, "style"> {
  /** Typography variant */
  variant?: TextVariant;
  /** Semantic color */
  color?: TextColor;
  /** Font weight override */
  weight?: "normal" | "medium" | "semibold" | "bold";
  /** Text alignment */
  align?: "left" | "center" | "right";
  /** Custom styles */
  style?: TextStyle | TextStyle[];
}

export function Text({
  variant = "body",
  color = "primary",
  weight,
  align,
  style,
  children,
  ...rest
}: TextProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const variantStyle = useMemo(() => {
    switch (variant) {
      case "h1":
        return styles.h1;
      case "h2":
        return styles.h2;
      case "h3":
        return styles.h3;
      case "h4":
        return styles.h4;
      case "body":
        return styles.body;
      case "body2":
        return styles.body2;
      case "caption":
        return styles.caption;
      case "label":
        return styles.label;
      case "button":
        return styles.button;
      default:
        return styles.body;
    }
  }, [variant, styles]);

  const colorStyle = useMemo(() => {
    switch (color) {
      case "primary":
        return { color: theme.colors.textPrimary };
      case "secondary":
        return { color: theme.colors.textSecondary };
      case "tertiary":
        return { color: theme.colors.textTertiary };
      case "inverse":
        return { color: theme.colors.textInverse };
      case "success":
        return { color: theme.colors.success };
      case "error":
        return { color: theme.colors.error };
      case "warning":
        return { color: theme.colors.warning };
      case "info":
        return { color: theme.colors.info };
      default:
        return { color: theme.colors.textPrimary };
    }
  }, [color, theme.colors]);

  const weightStyle = useMemo(() => {
    if (!weight) return null;
    switch (weight) {
      case "normal":
        return { fontWeight: theme.typography.fontWeight.normal };
      case "medium":
        return { fontWeight: theme.typography.fontWeight.medium };
      case "semibold":
        return { fontWeight: theme.typography.fontWeight.semibold };
      case "bold":
        return { fontWeight: theme.typography.fontWeight.bold };
      default:
        return null;
    }
  }, [weight, theme.typography.fontWeight]);

  const alignStyle = useMemo(() => {
    if (!align) return null;
    return { textAlign: align };
  }, [align]);

  return (
    <RNText
      style={[variantStyle, colorStyle, weightStyle, alignStyle, style]}
      {...rest}
    >
      {children}
    </RNText>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>["theme"]) =>
  StyleSheet.create({
    h1: {
      fontSize: theme.typography.fontSize["3xl"],
      lineHeight: theme.typography.fontSize["3xl"] * theme.typography.lineHeight.normal,
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.textPrimary,
    },
    h2: {
      fontSize: theme.typography.fontSize["2xl"],
      lineHeight: theme.typography.fontSize["2xl"] * theme.typography.lineHeight.normal,
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.textPrimary,
    },
    h3: {
      fontSize: theme.typography.fontSize.xl,
      lineHeight: theme.typography.fontSize.xl * theme.typography.lineHeight.normal,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.textPrimary,
    },
    h4: {
      fontSize: theme.typography.fontSize.lg,
      lineHeight: theme.typography.fontSize.lg * theme.typography.lineHeight.normal,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.textPrimary,
    },
    body: {
      fontSize: theme.typography.fontSize.base,
      lineHeight: theme.typography.fontSize.base * theme.typography.lineHeight.normal,
      fontWeight: theme.typography.fontWeight.normal,
      color: theme.colors.textPrimary,
    },
    body2: {
      fontSize: theme.typography.fontSize.sm,
      lineHeight: theme.typography.fontSize.sm * theme.typography.lineHeight.normal,
      fontWeight: theme.typography.fontWeight.normal,
      color: theme.colors.textSecondary,
    },
    caption: {
      fontSize: theme.typography.fontSize.xs,
      lineHeight: theme.typography.fontSize.xs * theme.typography.lineHeight.normal,
      fontWeight: theme.typography.fontWeight.normal,
      color: theme.colors.textSecondary,
    },
    label: {
      fontSize: theme.typography.fontSize.sm,
      lineHeight: theme.typography.fontSize.sm * theme.typography.lineHeight.normal,
      fontWeight: theme.typography.fontWeight.medium,
      color: theme.colors.textPrimary,
    },
    button: {
      fontSize: theme.typography.fontSize.base,
      lineHeight: theme.typography.fontSize.base * theme.typography.lineHeight.normal,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.textPrimary,
    },
  });
