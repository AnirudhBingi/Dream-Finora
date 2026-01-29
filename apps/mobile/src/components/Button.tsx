import React from "react";
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from "react-native";
import { useTheme } from "../theme";

export type ButtonVariant = "primary" | "secondary" | "text" | "danger";
export type ButtonSize = "small" | "medium" | "large";

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  fullWidth?: boolean;
}

export function Button({
  title,
  onPress,
  variant = "primary",
  size = "medium",
  disabled = false,
  loading = false,
  style,
  textStyle,
  fullWidth = true,
}: ButtonProps) {
  const { theme } = useTheme();
  const isDisabled = disabled || loading;

  const getButtonStyle = (): ViewStyle => {
    const baseStyle: ViewStyle = {
      borderRadius: theme.radii.button, // Use token
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "row",
    };

    // Size - Use size tokens
    if (size === "small") {
      baseStyle.paddingVertical = theme.spacing.sm;
      baseStyle.paddingHorizontal = theme.spacing.base;
      baseStyle.minHeight = theme.sizes.button.sm; // 36px token
    } else if (size === "medium") {
      baseStyle.paddingVertical = theme.spacing.md;
      baseStyle.paddingHorizontal = theme.spacing.xl;
      baseStyle.minHeight = theme.sizes.button.md; // 44px token
    } else {
      baseStyle.paddingVertical = theme.spacing.md;
      baseStyle.paddingHorizontal = theme.spacing["2xl"];
      baseStyle.minHeight = theme.sizes.button.lg; // 52px token
    }

    // Variant
    if (variant === "primary") {
      baseStyle.backgroundColor = theme.colors.primary;
      Object.assign(baseStyle, theme.shadows.button);
    } else if (variant === "secondary") {
      baseStyle.backgroundColor = "transparent";
      baseStyle.borderWidth = 2;
      baseStyle.borderColor = theme.colors.primary;
    } else if (variant === "danger") {
      baseStyle.backgroundColor = theme.colors.error;
      Object.assign(baseStyle, theme.shadows.button);
    } else {
      // text variant
      baseStyle.backgroundColor = "transparent";
      baseStyle.paddingVertical = theme.spacing.sm;
      baseStyle.paddingHorizontal = theme.spacing.md;
      baseStyle.minHeight = 44;
    }

    // Disabled state
    if (isDisabled && variant !== "text") {
      baseStyle.opacity = 0.5;
    }

    // Full width
    if (fullWidth) {
      baseStyle.width = "100%";
    }

    return baseStyle;
  };

  const getTextStyle = (): TextStyle => {
    const baseStyle: TextStyle = {
      fontSize:
        size === "small"
          ? theme.typography.fontSize.sm
          : size === "medium"
            ? theme.typography.fontSize.base
            : theme.typography.fontSize.lg,
      fontWeight: theme.typography.fontWeight.semibold,
    };

    if (variant === "primary" || variant === "danger") {
      baseStyle.color = theme.colors.textInverse;
    } else if (variant === "secondary") {
      baseStyle.color = theme.colors.primary;
    } else {
      // text variant
      baseStyle.color = theme.colors.primary;
      baseStyle.fontSize = theme.typography.fontSize.sm;
      baseStyle.fontWeight = theme.typography.fontWeight.medium;
    }

    return baseStyle;
  };

  return (
    <TouchableOpacity
      style={[getButtonStyle(), style]}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator
          color={
            variant === "primary" || variant === "danger"
              ? theme.colors.textInverse
              : theme.colors.primary
          }
          size="small"
        />
      ) : (
        <Text style={[getTextStyle(), textStyle]}>{title}</Text>
      )}
    </TouchableOpacity>
  );
}
