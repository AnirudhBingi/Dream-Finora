import React, { ReactNode, useMemo, useRef, useEffect } from "react";
import {
  Animated,
  PanResponder,
  Dimensions,
  StyleSheet,
  View,
} from "react-native";
import { useTheme } from "../theme";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const SWIPE_THRESHOLD = 80; // Minimum distance to trigger swipe
const SWIPE_VELOCITY_THRESHOLD = 0.3; // Minimum velocity to trigger swipe
const EDGE_THRESHOLD = 20; // Distance from left edge to start detecting swipe

interface SwipeableScreenProps {
  children: ReactNode;
  previousScreen?: ReactNode; // The previous screen to show behind during swipe
  onSwipeBack: () => void;
  canGoBack: () => boolean;
  enabled?: boolean;
}

export function SwipeableScreen({
  children,
  previousScreen,
  onSwipeBack,
  canGoBack,
  enabled = true,
}: SwipeableScreenProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const translateX = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  const isSwipeActive = useRef(false);
  // Previous screen starts invisible, fades in when swipe starts
  const previousScreenOpacity = useRef(new Animated.Value(0)).current;

  // Reset opacity when previousScreen changes
  useEffect(() => {
    if (!previousScreen) {
      previousScreenOpacity.setValue(0);
    }
  }, [previousScreen]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: (evt) => {
        // Only start if we're near the left edge and can go back
        if (!enabled || !canGoBack()) return false;
        return evt.nativeEvent.pageX < EDGE_THRESHOLD;
      },
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        // Only respond to horizontal swipes from the left edge
        if (!enabled || !canGoBack()) return false;

        const isFromLeftEdge = evt.nativeEvent.pageX < EDGE_THRESHOLD;
        const isHorizontalSwipe =
          Math.abs(gestureState.dx) > Math.abs(gestureState.dy);
        const isSwipeRight = gestureState.dx > 0;

        return isFromLeftEdge && isHorizontalSwipe && isSwipeRight;
      },
      onPanResponderGrant: () => {
        isSwipeActive.current = true;
        translateX.flattenOffset();
        translateX.setOffset(0);
        translateX.setValue(0);
        // Show previous screen immediately at full opacity when swipe starts
        // This is critical - previous screen should be fully visible from the start
        if (previousScreen) {
          previousScreenOpacity.setValue(1);
        } else {
          // Debug: log if previous screen is missing
          console.log("SwipeableScreen: previousScreen is null/undefined");
        }
      },
      onPanResponderMove: (_, gestureState) => {
        if (!isSwipeActive.current) return;

        // Only allow swiping right (positive dx), clamp to screen width
        const dx = Math.max(0, Math.min(gestureState.dx, SCREEN_WIDTH));
        translateX.setValue(dx);

        // Calculate progress (0 to 1)
        const progress = Math.min(dx / SCREEN_WIDTH, 1);

        // Fade out current screen as we swipe (20% opacity reduction as specified)
        opacity.setValue(1 - progress * 0.2);

        // Previous screen stays fully visible (opacity 1) during entire swipe
        // It was set to 1 in onPanResponderGrant, keep it at 1
        if (previousScreen) {
          previousScreenOpacity.setValue(1);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (!isSwipeActive.current) return;
        isSwipeActive.current = false;
        translateX.flattenOffset();

        const shouldSwipeBack =
          gestureState.dx > SWIPE_THRESHOLD ||
          (gestureState.dx > 50 && gestureState.vx > SWIPE_VELOCITY_THRESHOLD);

        if (shouldSwipeBack) {
          // Animate current screen off to the right and navigate back
          Animated.parallel([
            Animated.timing(translateX, {
              toValue: SCREEN_WIDTH,
              duration: 250,
              useNativeDriver: false, // translateX requires false
            }),
            Animated.timing(opacity, {
              toValue: 0,
              duration: 250,
              useNativeDriver: true,
            }),
          ]).start(() => {
            onSwipeBack();
            // Reset values for next screen
            translateX.setValue(0);
            opacity.setValue(1);
            previousScreenOpacity.setValue(0);
          });
        } else {
          // Spring back to original position, hide previous screen
          Animated.parallel([
            Animated.spring(translateX, {
              toValue: 0,
              useNativeDriver: false,
              tension: 50,
              friction: 8,
            }),
            Animated.spring(opacity, {
              toValue: 1,
              useNativeDriver: true,
              tension: 50,
              friction: 8,
            }),
            Animated.timing(previousScreenOpacity, {
              toValue: 0,
              duration: 200,
              useNativeDriver: true,
            }),
          ]).start();
        }
      },
      onPanResponderTerminate: () => {
        isSwipeActive.current = false;
        translateX.flattenOffset();
        // Spring back if interrupted
        Animated.parallel([
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: false,
            tension: 50,
            friction: 8,
          }),
          Animated.spring(opacity, {
            toValue: 1,
            useNativeDriver: true,
            tension: 50,
            friction: 8,
          }),
          Animated.timing(previousScreenOpacity, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }),
        ]).start();
      },
    }),
  ).current;

  if (!enabled || !canGoBack()) {
    return <>{children}</>;
  }

  return (
    <View style={styles.container}>
      {/* Previous screen rendered behind - always render if available, control visibility with opacity */}
      {previousScreen ? (
        <Animated.View
          style={[
            styles.previousScreen,
            {
              opacity: previousScreenOpacity,
            },
          ]}
          pointerEvents="none" // Don't capture touches on previous screen
        >
          {previousScreen}
        </Animated.View>
      ) : null}

      {/* Current screen on top */}
      <Animated.View
        style={[
          styles.currentScreen,
          {
            transform: [{ translateX }],
            opacity,
          },
        ]}
        {...panResponder.panHandlers}
      >
        {children}
      </Animated.View>
    </View>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>["theme"]) =>
  StyleSheet.create({
    container: {
      flex: 1,
      position: "relative",
      backgroundColor: theme.colors.backgroundSecondary, // Base background to prevent black screen
    },
    previousScreen: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 0,
      backgroundColor: theme.colors.backgroundSecondary, // Ensure background color matches
    },
    currentScreen: {
      flex: 1,
      zIndex: 1,
      backgroundColor: theme.colors.backgroundSecondary, // Ensure background color
    },
  });
