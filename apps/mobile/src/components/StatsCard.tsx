import React, { useMemo } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useTheme } from "../theme";

export interface StatItem {
  icon: keyof typeof MaterialIcons.glyphMap;
  value: string | number;
  label: string;
  iconColor?: string;
}

export interface StatsCardProps {
  stats: StatItem[];
  onPress?: () => void;
  style?: any;
}

/**
 * StatsCard - Reusable stats display card component
 *
 * Used for displaying statistics like:
 * - Points, Done, Streak (Chores)
 * - Total Expenses, Paid, Pending (Expenses)
 *
 * @example
 * <StatsCard
 *   stats={[
 *     { icon: 'stars', value: 78, label: 'pts', iconColor: theme.colors.warning },
 *     { icon: 'check-circle', value: 3, label: 'done', iconColor: theme.colors.success },
 *     { icon: 'local-fire-department', value: 0, label: 'streak', iconColor: theme.colors.error }
 *   ]}
 *   onPress={handleViewStats}
 * />
 */
export function StatsCard({ stats, onPress, style }: StatsCardProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const content = (
    <View style={[styles.container, style]}>
      <View style={styles.row}>
        {stats.map((stat, index) => (
          <React.Fragment key={index}>
            <View style={styles.statItem}>
              <MaterialIcons
                name={stat.icon}
                size={20}
                color={stat.iconColor || theme.colors.textSecondary}
              />
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
            {index < stats.length - 1 && <View style={styles.divider} />}
          </React.Fragment>
        ))}
        {onPress && (
          <MaterialIcons
            name="chevron-right"
            size={20}
            color={theme.colors.textSecondary}
          />
        )}
      </View>
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
}

const createStyles = (theme: ReturnType<typeof useTheme>["theme"]) =>
  StyleSheet.create({
    container: {
      backgroundColor: theme.colors.background,
      borderRadius: 16,
      paddingVertical: theme.spacing.base,
      paddingHorizontal: 18,
      marginBottom: theme.spacing.base,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    statItem: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
    },
    statValue: {
      fontSize: theme.typography.fontSize["2xl"],
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.textPrimary,
    },
    statLabel: {
      fontSize: 13,
      color: theme.colors.textSecondary,
      fontWeight: theme.typography.fontWeight.medium,
    },
    divider: {
      width: 1,
      height: 28,
      backgroundColor: theme.colors.border,
      marginHorizontal: theme.spacing.sm,
    },
  });
