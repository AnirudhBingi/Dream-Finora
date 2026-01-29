import React, { useMemo } from "react";
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useTheme } from "../theme";

type SettingsButtonVariant = "primary" | "danger" | "secondary";

interface SettingsButtonProps {
  label: string;
  onPress: () => void;
  variant?: SettingsButtonVariant;
  loading?: boolean;
  disabled?: boolean;
}

export function SettingsButton({
  label,
  onPress,
  variant = "primary",
  loading = false,
  disabled = false,
}: SettingsButtonProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const isDisabled = disabled || loading;

  const getButtonStyle = () => {
    switch (variant) {
      case "danger":
        return [
          styles.button,
          styles.dangerButton,
          isDisabled && styles.disabledButton,
        ];
      case "secondary":
        return [
          styles.button,
          styles.secondaryButton,
          isDisabled && styles.disabledButton,
        ];
      case "primary":
      default:
        return [
          styles.button,
          styles.primaryButton,
          isDisabled && styles.disabledButton,
        ];
    }
  };

  const getTextStyle = () => {
    switch (variant) {
      case "danger":
        return styles.dangerText;
      case "secondary":
        return styles.secondaryText;
      case "primary":
      default:
        return styles.primaryText;
    }
  };

  return (
    <TouchableOpacity
      style={getButtonStyle()}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator
          color={
            variant === "secondary"
              ? theme.colors.primary
              : theme.colors.textInverse
          }
          size="small"
        />
      ) : (
        <Text style={getTextStyle()}>{label}</Text>
      )}
    </TouchableOpacity>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>["theme"]) =>
  StyleSheet.create({
    button: {
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.lg,
      borderRadius: 8,
      alignItems: "center",
      justifyContent: "center",
      minHeight: 44,
      marginHorizontal: theme.spacing.base,
      marginVertical: theme.spacing.sm,
    },
    primaryButton: {
      backgroundColor: theme.colors.primary,
    },
    secondaryButton: {
      backgroundColor: theme.colors.background,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    dangerButton: {
      backgroundColor: theme.colors.error,
    },
    disabledButton: {
      opacity: 0.5,
    },
    primaryText: {
      color: theme.colors.textInverse,
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    secondaryText: {
      color: theme.colors.primary,
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    dangerText: {
      color: theme.colors.textInverse,
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.semibold,
    },
  });
