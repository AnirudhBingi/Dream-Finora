import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useTheme } from "../theme";

interface SettingsSectionProps {
  title: string;
  children: React.ReactNode;
  defaultExpanded?: boolean;
}

export function SettingsSection({
  title,
  children,
  defaultExpanded = true,
}: SettingsSectionProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [expanded, setExpanded] = useState(defaultExpanded);
  const rotateAnim = React.useRef(
    new Animated.Value(defaultExpanded ? 1 : 0),
  ).current;

  const toggleExpanded = () => {
    setExpanded(!expanded);
    Animated.timing(rotateAnim, {
      toValue: !expanded ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  };

  const rotateInterpolate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "180deg"],
  });

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.header, expanded && styles.headerExpanded]}
        onPress={toggleExpanded}
        activeOpacity={0.7}
      >
        <Text style={styles.title}>{title}</Text>
        <Animated.View
          style={{
            transform: [{ rotate: rotateInterpolate }],
          }}
        >
          <MaterialIcons
            name="expand-more"
            size={24}
            color={theme.colors.textSecondary}
          />
        </Animated.View>
      </TouchableOpacity>

      {expanded && <View style={styles.content}>{children}</View>}
    </View>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>["theme"]) =>
  StyleSheet.create({
    container: {
      marginHorizontal: theme.spacing.base,
      marginBottom: theme.spacing.base,
      backgroundColor: theme.colors.background,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.colors.borderLight,
      overflow: "hidden",
      ...(theme.shadows.sm || {}),
    },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      padding: theme.spacing.base,
      paddingVertical: theme.spacing.md,
    },
    headerExpanded: {
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.borderLight,
    },
    title: {
      fontSize: theme.typography.fontSize.lg,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.textPrimary,
      flex: 1,
    },
    content: {
      paddingBottom: theme.spacing.xs,
    },
  });
