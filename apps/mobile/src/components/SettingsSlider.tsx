import React, { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTheme } from "../theme";

interface SettingsSliderProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  description?: string;
  disabled?: boolean;
}

export function SettingsSlider({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  unit,
  description,
  disabled = false,
}: SettingsSliderProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.content}>
          <Text style={styles.label}>{label}</Text>
          {description && <Text style={styles.description}>{description}</Text>}
        </View>
        <Text style={styles.value}>
          {Math.round(value)}
          {unit ? ` ${unit}` : ""}
        </Text>
      </View>

      <View style={styles.sliderContainer}>
        <View
          style={[
            styles.trackBackground,
            {
              width: `${((value - min) / (max - min)) * 100}%`,
            },
          ]}
        />
      </View>
    </View>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>["theme"]) =>
  StyleSheet.create({
    container: {
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.base,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.borderLight,
    },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      marginBottom: theme.spacing.md,
    },
    content: {
      flex: 1,
      marginRight: theme.spacing.md,
    },
    label: {
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.medium,
      color: theme.colors.textPrimary,
      marginBottom: theme.spacing.xs,
    },
    description: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.textTertiary,
    },
    value: {
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.primary,
      minWidth: 50,
      textAlign: "right",
    },
    sliderContainer: {
      height: 4,
      backgroundColor: theme.colors.gray200,
      borderRadius: 2,
      overflow: "hidden",
    },
    trackBackground: {
      height: "100%",
      backgroundColor: theme.colors.primary,
      borderRadius: 2,
    },
  });
