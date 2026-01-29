import React, { useMemo } from "react";
import { View, Text, StyleSheet, Switch } from "react-native";
import { useTheme } from "../theme";

interface SettingsToggleProps {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
  description?: string;
  disabled?: boolean;
  loading?: boolean;
}

export function SettingsToggle({
  label,
  value,
  onChange,
  description,
  disabled = false,
  loading = false,
}: SettingsToggleProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.label} numberOfLines={1}>
          {label}
        </Text>
        {description && (
          <Text style={styles.description} numberOfLines={2}>
            {description}
          </Text>
        )}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        disabled={disabled || loading}
        trackColor={{
          false: theme.colors.gray200,
          true: theme.colors.primaryLight,
        }}
        thumbColor={value ? theme.colors.primary : theme.colors.gray400}
      />
    </View>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>["theme"]) =>
  StyleSheet.create({
    container: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.base,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.borderLight,
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
  });
