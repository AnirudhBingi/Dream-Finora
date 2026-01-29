import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  TextInputProps,
  Platform,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useTheme } from "../theme";

export interface InputFieldProps extends TextInputProps {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: keyof typeof MaterialIcons.glyphMap;
  rightIcon?: keyof typeof MaterialIcons.glyphMap;
  onRightIconPress?: () => void;
  containerStyle?: ViewStyle;
}

export function InputField({
  label,
  error,
  helperText,
  leftIcon,
  rightIcon,
  onRightIconPress,
  containerStyle,
  style,
  placeholderTextColor,
  ...textInputProps
}: InputFieldProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [isFocused, setIsFocused] = useState(false);

  const resolvedPlaceholderColor =
    placeholderTextColor ?? theme.colors.textTertiary;

  const getInputStyle = () => {
    const baseStyle: ViewStyle & { fontSize?: number; color?: string } = {
      backgroundColor: isFocused
        ? theme.colors.background
        : theme.colors.backgroundSecondary,
      borderWidth: 2,
      borderColor: error
        ? theme.colors.error
        : isFocused
          ? theme.colors.primary
          : theme.colors.border,
      borderRadius: theme.radii.input, // Use token (8px)
      paddingHorizontal: theme.spacing.base,
      paddingVertical: theme.spacing.md, // Use token instead of hardcoded 14
      fontSize: theme.typography.fontSize.base,
      color: theme.colors.textPrimary,
      minHeight: theme.sizes.input.md, // Use token (48px)
    };

    if (leftIcon) {
      baseStyle.paddingLeft = theme.spacing["3xl"]; // Use token instead of hardcoded 48
    }

    if (rightIcon) {
      baseStyle.paddingRight = theme.spacing["3xl"]; // Use token instead of hardcoded 48
    }

    if (isFocused && Platform.OS === "ios") {
      baseStyle.shadowColor = theme.colors.primary;
      baseStyle.shadowOffset = { width: 0, height: 0 };
      baseStyle.shadowOpacity = 0.1;
      baseStyle.shadowRadius = 4;
    }

    if (error) {
      baseStyle.backgroundColor = theme.colors.errorBackground;
    }

    return baseStyle;
  };

  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <Text style={[styles.label, error && styles.labelError]}>{label}</Text>
      )}

      <View style={styles.inputWrapper}>
        {leftIcon && (
          <MaterialIcons
            name={leftIcon}
            size={20}
            color={
              error
                ? theme.colors.error
                : isFocused
                  ? theme.colors.primary
                  : theme.colors.textSecondary
            }
            style={styles.leftIcon}
          />
        )}

        <TextInput
          style={[getInputStyle(), style]}
          placeholderTextColor={resolvedPlaceholderColor}
          onFocus={(e) => {
            setIsFocused(true);
            textInputProps.onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            textInputProps.onBlur?.(e);
          }}
          {...textInputProps}
        />

        {rightIcon && (
          <TouchableOpacity
            onPress={onRightIconPress}
            style={styles.rightIcon}
            activeOpacity={0.7}
          >
            <MaterialIcons
              name={rightIcon}
              size={20}
              color={
                error
                  ? theme.colors.error
                  : isFocused
                    ? theme.colors.primary
                    : theme.colors.textSecondary
              }
            />
          </TouchableOpacity>
        )}
      </View>

      {(error || helperText) && (
        <Text style={[styles.helperText, error && styles.errorText]}>
          {error || helperText}
        </Text>
      )}
    </View>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>["theme"]) =>
  StyleSheet.create({
    container: {
      marginBottom: theme.spacing.lg,
    },
    label: {
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.medium,
      color: theme.colors.textSecondary,
      marginBottom: theme.spacing.sm,
    },
    labelError: {
      color: theme.colors.error,
    },
    inputWrapper: {
      position: "relative",
    },
    leftIcon: {
      position: "absolute",
      left: theme.spacing.base,
      top: 16,
      zIndex: 1,
    },
    rightIcon: {
      position: "absolute",
      right: theme.spacing.base,
      top: 16,
      zIndex: 1,
      padding: theme.spacing.xs,
    },
    helperText: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.textSecondary,
      marginTop: theme.spacing.xs,
    },
    errorText: {
      color: theme.colors.error,
    },
  });
