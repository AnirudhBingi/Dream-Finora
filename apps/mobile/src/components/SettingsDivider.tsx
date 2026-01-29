import React, { useMemo } from "react";
import { View, StyleSheet } from "react-native";
import { useTheme } from "../theme";

interface SettingsDividerProps {
  vertical?: boolean;
}

export function SettingsDivider({ vertical = false }: SettingsDividerProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  if (vertical) {
    return <View style={styles.verticalDivider} />;
  }

  return <View style={styles.horizontalDivider} />;
}

const createStyles = (theme: ReturnType<typeof useTheme>["theme"]) =>
  StyleSheet.create({
    horizontalDivider: {
      height: 1,
      backgroundColor: theme.colors.borderLight,
    },
    verticalDivider: {
      width: 1,
      backgroundColor: theme.colors.borderLight,
    },
  });
