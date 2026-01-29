import React, { type ReactNode } from "react";
import { View, ScrollView, StyleSheet, type ViewStyle, type ScrollViewProps, type NativeSyntheticEvent, type NativeScrollEvent } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../theme";
import { useBottomNavPadding } from "../hooks/useBottomNavPadding";

/**
 * ScreenWrapper Component
 *
 * Standardized screen layout wrapper that provides:
 * - Safe area handling
 * - Consistent screen gutters/padding
 * - Automatic bottom navigation padding
 * - Optional scrolling with custom scroll handling
 *
 * This replaces manual SafeAreaView + ScrollView setup in each screen.
 */

interface ScreenWrapperProps {
  children: ReactNode;
  /** Enable scrolling (default: true) */
  scroll?: boolean;
  /** Apply horizontal gutter/padding (default: true) */
  gutter?: boolean;
  /** Custom background color */
  backgroundColor?: string;
  /** Custom styles for container */
  style?: ViewStyle;
  /** Custom styles for content area */
  contentStyle?: ViewStyle;
  /** Safe area edges */
  edges?: Array<"top" | "bottom" | "left" | "right">;
  /** RefreshControl for pull-to-refresh */
  refreshControl?: ScrollViewProps["refreshControl"];
  /** Custom scroll event handler */
  onScroll?: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
  /** Scroll event throttle in ms (default: 16) */
  scrollEventThrottle?: number;
  /** Show vertical scroll indicator (default: false) */
  showsVerticalScrollIndicator?: boolean;
  /** Show horizontal scroll indicator (default: false) */
  showsHorizontalScrollIndicator?: boolean;
  /** Enable scroll to top on status bar press (iOS) (default: true) */
  scrollsToTop?: boolean;
  /** Keyboard dismiss mode */
  keyboardDismissMode?: ScrollViewProps["keyboardDismissMode"];
  /** Keyboard should persist taps */
  keyboardShouldPersistTaps?: ScrollViewProps["keyboardShouldPersistTaps"];
}

export function ScreenWrapper({
  children,
  scroll = true,
  gutter = true,
  backgroundColor,
  style,
  contentStyle,
  edges = ["left", "right", "bottom"],
  refreshControl,
  onScroll,
  scrollEventThrottle = 16,
  showsVerticalScrollIndicator = false,
  showsHorizontalScrollIndicator = false,
  scrollsToTop = true,
  keyboardDismissMode,
  keyboardShouldPersistTaps,
}: ScreenWrapperProps) {
  const { theme } = useTheme();
  const bottomNavPadding = useBottomNavPadding();

  const containerStyle: ViewStyle = {
    flex: 1,
    backgroundColor: backgroundColor || theme.colors.backgroundSecondary,
  };

  const contentContainerStyle: ViewStyle = {
    flexGrow: 1,
    paddingHorizontal: gutter ? theme.spacing.screenGutter : 0,
    paddingBottom: bottomNavPadding,
  };

  if (scroll) {
    return (
      <SafeAreaView style={[containerStyle, style]} edges={edges}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[contentContainerStyle, contentStyle]}
          showsVerticalScrollIndicator={showsVerticalScrollIndicator}
          showsHorizontalScrollIndicator={showsHorizontalScrollIndicator}
          refreshControl={refreshControl}
          onScroll={onScroll}
          scrollEventThrottle={scrollEventThrottle}
          scrollsToTop={scrollsToTop}
          keyboardDismissMode={keyboardDismissMode}
          keyboardShouldPersistTaps={keyboardShouldPersistTaps}
        >
          {children}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[containerStyle, style]} edges={edges}>
      <View style={[styles.content, contentContainerStyle, contentStyle]}>
        {children}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
});
