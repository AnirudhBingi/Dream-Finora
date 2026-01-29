import React, { useEffect, useMemo } from "react";
import { View, StyleSheet, Animated, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../theme";

interface CollapsibleHeaderProps {
  children: React.ReactNode;
  scrollY: Animated.Value;
  headerHeight: number;
  headerTranslateY?: Animated.Value;
  onHeaderTranslateYChange?: (translateY: Animated.Value) => void;
  onSpacerHeightChange?: (
    spacerHeight: Animated.AnimatedInterpolation<number>,
  ) => void;
}

/**
 * CollapsibleHeader - Smoothly collapses header on scroll (Facebook-style)
 *
 * Behavior:
 * - Hides when scrolling down
 * - Shows when scrolling up
 * - Always visible at top (scroll position 0)
 * - Ultra-smooth animations using interpolation (no listeners, no jitter)
 *
 * Usage:
 * ```tsx
 * const scrollY = useRef(new Animated.Value(0)).current;
 * const HEADER_HEIGHT = 88;
 *
 * <CollapsibleHeader scrollY={scrollY} headerHeight={HEADER_HEIGHT}>
 *   <View style={styles.header}>
 *     Header content here
 *   </View>
 * </CollapsibleHeader>
 *
 * <Animated.ScrollView
 *   scrollEventThrottle={16}
 *   onScroll={Animated.event(
 *     [{ nativeEvent: { contentOffset: { y: scrollY } } }],
 *     { useNativeDriver: false }
 *   )}
 * >
 *   Scrollable content here
 * </Animated.ScrollView>
 * ```
 */
export function CollapsibleHeader({
  children,
  scrollY,
  headerHeight,
  headerTranslateY: externalTranslateY,
  onHeaderTranslateYChange,
  onSpacerHeightChange,
}: CollapsibleHeaderProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const insets = useSafeAreaInsets();
  const topInset = insets.top;

  // Total header height includes safe area top inset
  const totalHeaderHeight = headerHeight + topInset;

  // Pure interpolation approach - ZERO listeners = ZERO jitter
  // Direct interpolation from scrollY for both header and spacer
  // Handles negative values (overscroll/bounce) and provides smooth transitions
  const SCROLL_THRESHOLD = 30; // Hide header after scrolling 30px (larger threshold for stability)
  const HIDE_DISTANCE = totalHeaderHeight; // Distance to fully hide header

  // Header translateY: smooth interpolation with proper bounce handling
  // Uses wider input range to handle overscroll smoothly
  // Once hidden, stays hidden even during bounce (hysteresis effect)
  const translateY = scrollY.interpolate({
    inputRange: [
      -200, // Overscroll at top (bounce)
      0, // At top
      SCROLL_THRESHOLD, // Start hiding
      SCROLL_THRESHOLD + HIDE_DISTANCE, // Fully hidden
      10000, // Far down (stays hidden)
    ],
    outputRange: [
      0, // Always visible at top (even during bounce)
      0, // Visible at top
      0, // Still visible at threshold
      -totalHeaderHeight, // Fully hidden
      -totalHeaderHeight, // Stays hidden (no jitter on bounce back)
    ],
    extrapolate: "clamp",
  });

  // Spacer height: perfectly synchronized with header
  // Same input range ensures no desync during bounce
  const spacerHeight = scrollY.interpolate({
    inputRange: [
      -200, // Overscroll at top
      0, // At top
      SCROLL_THRESHOLD, // Start hiding
      SCROLL_THRESHOLD + HIDE_DISTANCE, // Fully hidden
      10000, // Far down
    ],
    outputRange: [
      totalHeaderHeight, // Full height at top
      totalHeaderHeight, // Full height at top
      totalHeaderHeight, // Still full at threshold
      0, // No spacer when hidden
      0, // Stays at 0 (no jitter)
    ],
    extrapolate: "clamp",
  });

  // Expose spacer height to parent
  useEffect(() => {
    if (onSpacerHeightChange) {
      onSpacerHeightChange(spacerHeight);
    }
  }, [spacerHeight, onSpacerHeightChange]);

  // Pure interpolation - no listeners, no syncing, zero jitter
  // Both header and spacer use the same interpolation source

  return (
    <Animated.View
      style={[
        styles.headerContainer,
        {
          height: totalHeaderHeight,
          paddingTop: topInset,
          transform: [{ translateY }],
        },
      ]}
      pointerEvents="box-none"
    >
      <View style={styles.headerContent}>{children}</View>
    </Animated.View>
  );
}

// Export helper to get spacer height interpolation
export function getSpacerHeightInterpolation(
  headerTranslateY: Animated.Value,
  totalHeaderHeight: number,
) {
  return headerTranslateY.interpolate({
    inputRange: [-totalHeaderHeight, 0],
    outputRange: [0, totalHeaderHeight],
    extrapolate: "clamp",
  });
}

const createStyles = (theme: ReturnType<typeof useTheme>["theme"]) =>
  StyleSheet.create({
    headerContainer: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      zIndex: 1000,
      backgroundColor: theme.colors.background,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
      ...Platform.select({
        ios: {
          shadowColor: theme.colors.black,
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.1,
          shadowRadius: 2,
        },
        android: {
          elevation: 3,
        },
      }),
    },
    headerContent: {
      flex: 1,
      justifyContent: "flex-end", // Push content to bottom of header
    },
  });
