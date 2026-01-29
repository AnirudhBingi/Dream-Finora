import React, { useMemo } from "react";
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  Platform,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { SpaceVIcon } from "./SpaceVIcon";
import { useTheme } from "../theme";

interface BottomNavigationProps {
  currentScreen: string;
  onNavigateToExpenses: () => void;
  onNavigateToChores: () => void;
  onNavigateToSpaceV: () => void;
  onNavigateToRides: () => void;
  onNavigateToHome: () => void;
}

export function BottomNavigation({
  currentScreen,
  onNavigateToExpenses,
  onNavigateToChores,
  onNavigateToSpaceV,
  onNavigateToRides,
  onNavigateToHome,
}: BottomNavigationProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const isActive = (screen: string) => {
    if (screen === "feed") {
      return currentScreen === "feed";
    }
    return currentScreen === screen;
  };

  return (
    <SafeAreaView edges={["bottom"]} style={styles.container}>
      <View style={styles.navBar}>
        <TouchableOpacity
          style={[styles.navItem, isActive("home") && styles.navItemActive]}
          onPress={onNavigateToHome}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Home"
          accessibilityHint="Navigate to home screen"
          accessibilityState={{ selected: isActive("home") }}
        >
          <MaterialIcons
            name="home"
            size={20}
            color={
              isActive("home")
                ? theme.colors.textInverse
                : theme.colors.inactiveOnPrimary
            }
            accessible={false}
          />
          <Text
            style={[styles.navLabel, isActive("home") && styles.navLabelActive]}
          >
            Home
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.navItem, isActive("expenses") && styles.navItemActive]}
          onPress={onNavigateToExpenses}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Billchop"
          accessibilityHint="Navigate to expense splitting screen"
          accessibilityState={{ selected: isActive("expenses") }}
        >
          <MaterialIcons
            name="receipt"
            size={20}
            color={
              isActive("expenses")
                ? theme.colors.textInverse
                : theme.colors.inactiveOnPrimary
            }
            accessible={false}
          />
          <Text
            style={[
              styles.navLabel,
              isActive("expenses") && styles.navLabelActive,
            ]}
          >
            Billchop
          </Text>
        </TouchableOpacity>

        {/* SpaceV tab in center - main feature */}
        <TouchableOpacity
          style={[
            styles.navItem,
            styles.navItemCenter,
            isActive("feed") && styles.navItemActive,
          ]}
          onPress={onNavigateToSpaceV}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="SpaceV"
          accessibilityHint="Navigate to SpaceV marketplace screen"
          accessibilityState={{ selected: isActive("feed") }}
        >
          <SpaceVIcon
            size={26}
            color={
              isActive("feed")
                ? theme.colors.textInverse
                : theme.colors.inactiveOnPrimary
            }
            active={isActive("feed")}
          />
          <Text
            style={[
              styles.navLabel,
              styles.navLabelCenter,
              isActive("feed") && styles.navLabelActive,
            ]}
          >
            SpaceV
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.navItem, isActive("chores") && styles.navItemActive]}
          onPress={onNavigateToChores}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Chores"
          accessibilityHint="Navigate to chore management screen"
          accessibilityState={{ selected: isActive("chores") }}
        >
          <MaterialIcons
            name="check-circle"
            size={20}
            color={
              isActive("chores")
                ? theme.colors.textInverse
                : theme.colors.inactiveOnPrimary
            }
            accessible={false}
          />
          <Text
            style={[
              styles.navLabel,
              isActive("chores") && styles.navLabelActive,
            ]}
          >
            Chores
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.navItem, isActive("rides") && styles.navItemActive]}
          onPress={onNavigateToRides}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Rides"
          accessibilityHint="Navigate to rides screen"
          accessibilityState={{ selected: isActive("rides") }}
        >
          <MaterialIcons
            name="directions-car"
            size={20}
            color={
              isActive("rides")
                ? theme.colors.textInverse
                : theme.colors.inactiveOnPrimary
            }
            accessible={false}
          />
          <Text
            style={[
              styles.navLabel,
              isActive("rides") && styles.navLabelActive,
            ]}
          >
            Rides
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>["theme"]) =>
  StyleSheet.create({
    container: {
      backgroundColor: "transparent",
      paddingBottom: 6,
      paddingHorizontal: theme.spacing.base,
    },
    navBar: {
      flexDirection: "row",
      justifyContent: "space-around",
      alignItems: "center",
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.sm,
      backgroundColor: theme.colors.primary,
      borderRadius: 24,
      // Floating island effect with 3D shadows
      ...Platform.select({
        ios: {
          shadowColor: theme.colors.primaryDark,
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.4,
          shadowRadius: 16,
        },
        android: {
          elevation: 12,
        },
      }),
      // Add border for depth
      borderWidth: 1,
      borderColor: theme.colors.primaryDark,
    },
    navItem: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 6,
      minHeight: 48,
      borderRadius: 16,
    },
    navItemCenter: {
      // Center item (SpaceV) can be slightly larger if needed
      minHeight: 50,
    },
    navItemActive: {
      backgroundColor: theme.colors.surfaceOverlayMedium, // Subtle highlight for active item
    },
    navLabel: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.inactiveOnPrimary,
      marginTop: 3,
      fontWeight: theme.typography.fontWeight.medium,
    },
    navLabelCenter: {
      fontSize: 10.5, // Slightly larger for center item
    },
    navLabelActive: {
      color: theme.colors.textInverse,
      fontWeight: theme.typography.fontWeight.semibold,
    },
  });
