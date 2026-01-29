import React, { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTheme } from "../theme";

interface NotificationBadgeProps {
  count: number;
  style?: any;
}

export function NotificationBadge({ count, style }: NotificationBadgeProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  if (count <= 0) return null;

  const displayCount = count > 99 ? "99+" : count.toString();

  return (
    <View style={[styles.badge, style]}>
      <Text style={styles.badgeText}>{displayCount}</Text>
    </View>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>["theme"]) =>
  StyleSheet.create({
    badge: {
      position: "absolute",
      top: -8,
      right: -8,
      backgroundColor: theme.colors.error,
      borderRadius: 10,
      minWidth: 20,
      height: 20,
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: 6,
      borderWidth: 2,
      borderColor: theme.colors.background,
    },
    badgeText: {
      color: theme.colors.textInverse,
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.bold,
    },
  });
