import React, { useMemo } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useTheme } from "../theme";

export interface SegmentedControlOption {
  value: string;
  label: string;
  icon?: keyof typeof MaterialIcons.glyphMap;
  badge?: number | string;
}

export interface SegmentedControlProps {
  options: SegmentedControlOption[];
  value: string;
  onChange: (value: string) => void;
  style?: any;
}

/**
 * SegmentedControl - Reusable segmented control component
 *
 * Used for context switchers like:
 * - Groups / Individual (Chores)
 * - Local Finance / Home Country (Finance)
 * - All / Assigned / Unassigned (Filter tabs)
 *
 * @example
 * <SegmentedControl
 *   options={[
 *     { value: 'groups', label: 'Groups', icon: 'groups', badge: 12 },
 *     { value: 'individual', label: 'Individual', icon: 'person', badge: 1 }
 *   ]}
 *   value={selectedTab}
 *   onChange={setSelectedTab}
 * />
 */
export function SegmentedControl({
  options,
  value,
  onChange,
  style,
}: SegmentedControlProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  return (
    <View style={[styles.container, style]}>
      {options.map((option) => {
        const isActive = option.value === value;

        return (
          <TouchableOpacity
            key={option.value}
            style={[styles.button, isActive && styles.buttonActive]}
            onPress={() => onChange(option.value)}
            activeOpacity={0.7}
          >
            {option.icon && (
              <MaterialIcons
                name={option.icon}
                size={20}
                color={
                  isActive
                    ? theme.colors.textInverse
                    : theme.colors.textSecondary
                }
              />
            )}
            <Text
              style={[styles.buttonText, isActive && styles.buttonTextActive]}
            >
              {option.label}
            </Text>
            {option.badge !== undefined && option.badge !== null && (
              <View style={[styles.badge, isActive && styles.badgeActive]}>
                <Text
                  style={[styles.badgeText, isActive && styles.badgeTextActive]}
                >
                  {option.badge}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>["theme"]) =>
  StyleSheet.create({
    container: {
      flexDirection: "row",
      gap: 12,
      backgroundColor: theme.colors.backgroundTertiary,
      borderRadius: 8,
      padding: 4,
    },
    button: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: theme.spacing.md,
      paddingHorizontal: 16,
      borderRadius: 6,
      gap: 8,
    },
    buttonActive: {
      backgroundColor: theme.colors.blue,
    },
    buttonText: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      fontWeight: "500",
    },
    buttonTextActive: {
      color: theme.colors.textInverse,
    },
    badge: {
      minWidth: 18,
      height: 18,
      borderRadius: 9,
      backgroundColor: theme.colors.border,
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: theme.spacing.xs,
      marginLeft: theme.spacing.xs,
    },
    badgeActive: {
      backgroundColor: theme.colors.overlayLight,
    },
    badgeText: {
      fontSize: 11,
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.textSecondary,
    },
    badgeTextActive: {
      color: theme.colors.textInverse,
    },
  });
