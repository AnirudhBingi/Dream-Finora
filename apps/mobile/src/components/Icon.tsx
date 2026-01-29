import React, { useMemo } from "react";
import { View, StyleSheet, ViewStyle } from "react-native";
import Svg, { Path, Circle, Rect, Polygon, G } from "react-native-svg";
import { MaterialIcons } from "@expo/vector-icons";
import {
  categoryIconMap,
  CategoryIconName,
  normalizeCategoryName,
} from "../utils/categoryIcons";
import {
  navigationIconMap,
  NavigationIconName,
} from "../utils/navigationIcons";
import { useTheme } from "../theme";

export type IconSize = "xs" | "sm" | "md" | "lg" | "xl";

const sizeMap: Record<IconSize, number> = {
  xs: 16,
  sm: 20,
  md: 24,
  lg: 32,
  xl: 48,
};

interface IconProps {
  name: CategoryIconName | NavigationIconName | string;
  size?: IconSize | number;
  color?: string;
  style?: ViewStyle;
  fallbackToMaterial?: boolean;
}

/**
 * Icon component that renders custom SVG icons or falls back to MaterialIcons
 *
 * @example
 * <Icon name="groceries" size="md" color={theme.colors.blue} />
 * <Icon name="restaurants" size={24} color={theme.colors.success} />
 */
export function Icon({
  name,
  size = "md",
  color,
  style,
  fallbackToMaterial = true,
}: IconProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const iconSize = typeof size === "number" ? size : sizeMap[size];
  const resolvedColor = color ?? theme.colors.textSecondary;

  // Check if it's a navigation icon first
  const NavigationIconComponent = navigationIconMap[name as NavigationIconName];
  if (NavigationIconComponent) {
    return (
      <View style={[styles.container, style]}>
        <Svg width={iconSize} height={iconSize} viewBox="0 0 24 24">
          <NavigationIconComponent color={resolvedColor} />
        </Svg>
      </View>
    );
  }

  // Normalize the category name (handles variations like "Restaurants & Dining" -> "restaurants-dining")
  const normalizedName = normalizeCategoryName(name);

  // Check if we have a custom icon for this category
  const IconComponent = categoryIconMap[normalizedName];

  if (IconComponent) {
    return (
      <View style={[styles.container, style]}>
        <Svg width={iconSize} height={iconSize} viewBox="0 0 24 24">
          <IconComponent color={resolvedColor} />
        </Svg>
      </View>
    );
  }

  // Fallback to MaterialIcons if enabled
  if (fallbackToMaterial) {
    // Map common category names to MaterialIcons names
    const materialIconName = getMaterialIconName(name);
    return (
      <MaterialIcons
        name={materialIconName}
        size={iconSize}
        color={resolvedColor}
        style={style}
      />
    );
  }

  return null;
}

/**
 * Maps category names to MaterialIcons names as fallback
 */
function getMaterialIconName(categoryName: string): any {
  // Navigation icons mapping
  const navigationMapping: Record<string, any> = {
    notifications: "notifications",
    settings: "settings",
    friends: "people",
    groups: "group",
    messages: "message",
    activity: "history",
    finance: "account-balance-wallet",
    analytics: "insights",
    "arrow-down": "arrow-downward",
    "arrow-up": "arrow-upward",
    expenses: "attach-money",
  };

  // Try navigation mapping first
  if (navigationMapping[categoryName.toLowerCase()]) {
    return navigationMapping[categoryName.toLowerCase()];
  }

  const mapping: Record<string, any> = {
    // Food & Dining
    groceries: "shopping-cart",
    restaurants: "restaurant",
    coffee: "local-cafe",
    "food-delivery": "delivery-dining",

    // Transportation
    gas: "local-gas-station",
    transportation: "directions-car",
    parking: "local-parking",
    "car-maintenance": "build",

    // Bills & Utilities
    utilities: "bolt",
    internet: "wifi",
    phone: "phone",
    water: "water-drop",

    // Shopping
    clothing: "checkroom",
    electronics: "devices",
    "home-garden": "home",
    books: "menu-book",
    sports: "sports",

    // Entertainment
    movies: "movie",
    streaming: "play-circle",
    games: "sports-esports",

    // Health
    pharmacy: "local-pharmacy",
    medical: "medical-services",
    gym: "fitness-center",
    "personal-care": "spa",

    // Education
    education: "school",
    software: "code",

    // Travel
    travel: "flight",
    hotels: "hotel",

    // Other
    gifts: "card-giftcard",
    pets: "pets",
    subscriptions: "subscriptions",
    other: "more-horiz",
  };

  // Try direct match first
  if (mapping[categoryName.toLowerCase()]) {
    return mapping[categoryName.toLowerCase()];
  }

  // Try partial match
  const lowerName = categoryName.toLowerCase();
  for (const [key, value] of Object.entries(mapping)) {
    if (lowerName.includes(key) || key.includes(lowerName)) {
      return value;
    }
  }

  return "category"; // Default fallback
}

const createStyles = (theme: ReturnType<typeof useTheme>["theme"]) =>
  StyleSheet.create({
    container: {
      alignItems: "center",
      justifyContent: "center",
    },
  });
