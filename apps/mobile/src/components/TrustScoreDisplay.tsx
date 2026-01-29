import React, { useMemo } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useTheme } from "../theme";

interface TrustScoreDisplayProps {
  score: number;
  size?: "small" | "medium" | "large";
  showLabel?: boolean;
  onPress?: () => void;
}

export function TrustScoreDisplay({
  score,
  size = "medium",
  showLabel = true,
  onPress,
}: TrustScoreDisplayProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const color = getTrustScoreColor(score, theme);
  const sizeStyles = getSizeStyles(size);

  const content = (
    <View
      style={[
        styles.container,
        sizeStyles.container,
        onPress && styles.pressable,
      ]}
    >
      <View style={[styles.circle, sizeStyles.circle, { borderColor: color }]}>
        <Text style={[styles.score, sizeStyles.score, { color }]}>{score}</Text>
      </View>
      {showLabel && (
        <Text style={[styles.label, sizeStyles.label]}>Trust Score</Text>
      )}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
}

export function TrustScoreBadge({
  score,
  size = "small",
}: {
  score: number;
  size?: "small" | "medium";
}) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const color = getTrustScoreColor(score, theme);
  const badgeSize = size === "small" ? 20 : 24;

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: `${color}20`,
          width: badgeSize,
          height: badgeSize,
          borderRadius: badgeSize / 2,
        },
      ]}
    >
      <MaterialIcons name="star" size={badgeSize * 0.6} color={color} />
    </View>
  );
}

function getTrustScoreColor(
  score: number,
  theme: ReturnType<typeof useTheme>["theme"],
): string {
  if (score >= 90) return theme.colors.success;
  if (score >= 70) return theme.colors.blue;
  if (score >= 50) return theme.colors.warning;
  return theme.colors.error;
}

function getSizeStyles(size: "small" | "medium" | "large") {
  switch (size) {
    case "small":
      return {
        container: { marginVertical: 4 },
        circle: { width: 48, height: 48, borderRadius: 24 },
        score: { fontSize: 16, fontWeight: "600" as const },
        label: { fontSize: 10, marginTop: 4 },
      };
    case "large":
      return {
        container: { marginVertical: 8 },
        circle: { width: 120, height: 120, borderRadius: 60 },
        score: { fontSize: 48, fontWeight: "700" as const },
        label: { fontSize: 16, marginTop: 8 },
      };
    default: // medium
      return {
        container: { marginVertical: 6 },
        circle: { width: 80, height: 80, borderRadius: 40 },
        score: { fontSize: 32, fontWeight: "700" as const },
        label: { fontSize: 14, marginTop: 6 },
      };
  }
}

const createStyles = (theme: ReturnType<typeof useTheme>["theme"]) =>
  StyleSheet.create({
    container: {
      alignItems: "center",
      justifyContent: "center",
    },
    pressable: {
      opacity: 1,
    },
    circle: {
      borderWidth: 3,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: theme.colors.background,
    },
    score: {
      fontWeight: theme.typography.fontWeight.bold,
    },
    label: {
      color: theme.colors.textSecondary,
      fontWeight: theme.typography.fontWeight.medium,
      textAlign: "center",
    },
    badge: {
      justifyContent: "center",
      alignItems: "center",
    },
  });
