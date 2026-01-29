import React, { useMemo } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { Icon } from "./Icon";
import { useTheme } from "../theme";

export interface QuickAccessButton {
  label: string;
  icon?: string; // Icon component name
  materialIcon?: keyof typeof MaterialIcons.glyphMap; // MaterialIcons name
  onPress: () => void;
  iconColor?: string;
}

export interface QuickAccessSectionProps {
  buttons: QuickAccessButton[];
  style?: any;
}

/**
 * QuickAccessSection - Reusable quick access button section
 *
 * Used for displaying capsule-shaped quick action buttons:
 * - History, Create, Analytics (Rides)
 * - Friends, Circles (Billchop)
 *
 * @example
 * <QuickAccessSection
 *   buttons={[
 *     { label: 'History', icon: 'activity', iconColor: theme.colors.primary, onPress: handleHistory },
 *     { label: 'Create', materialIcon: 'add', iconColor: theme.colors.success, onPress: handleCreate },
 *     { label: 'Analytics', icon: 'analytics', iconColor: theme.colors.blue, onPress: handleAnalytics }
 *   ]}
 * />
 */
export function QuickAccessSection({
  buttons,
  style,
}: QuickAccessSectionProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  return (
    <View style={[styles.container, style]}>
      {buttons.map((button, index) => (
        <TouchableOpacity
          key={index}
          style={styles.capsule}
          onPress={button.onPress}
          activeOpacity={0.7}
        >
          {button.icon ? (
            <Icon
              name={button.icon}
              size={18}
              color={button.iconColor || theme.colors.textPrimary}
            />
          ) : button.materialIcon ? (
            <MaterialIcons
              name={button.materialIcon}
              size={18}
              color={button.iconColor || theme.colors.textPrimary}
            />
          ) : null}
          <Text style={styles.capsuleText}>{button.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>["theme"]) =>
  StyleSheet.create({
    container: {
      flexDirection: "row",
      gap: theme.spacing.sm,
      marginBottom: theme.spacing.xl,
    },
    capsule: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.background,
      borderRadius: 20,
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
      gap: theme.spacing.xs,
      ...theme.shadows.sm,
    },
    capsuleText: {
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.medium,
      color: theme.colors.textPrimary,
    },
  });
