import React, { ReactNode, useRef, useEffect } from 'react';
import { View, StyleSheet, Animated, PanResponder, Dimensions } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SWIPE_THRESHOLD = 80;
const SWIPE_VELOCITY_THRESHOLD = 0.3;
const EDGE_THRESHOLD = 20;

interface NavigationStackProps {
  currentScreen: ReactNode;
  previousScreen: ReactNode | null;
  onSwipeBack: () => void;
  canGoBack: boolean;
  enabled?: boolean;
}

/**
 * Navigation stack component that renders both current and previous screens
 * Previous screen is visible behind during swipe gesture
 */
export function NavigationStack({
  currentScreen,
  previousScreen,
  onSwipeBack,
  canGoBack,
  enabled = true,
}: NavigationStackProps) {
  const translateX = useRef(new Animated.Value(0)).current;
  const currentOpacity = useRef(new Animated.Value(1)).current;
  const previousOpacity = useRef(new Animated.Value(0)).current;
  const isSwipeActive = useRef(false);

  // Reset animations when screens change
  useEffect(() => {
    translateX.setValue(0);
    currentOpacity.setValue(1);
    previousOpacity.setValue(0);
    isSwipeActive.current = false;
  }, [currentScreen]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: (evt) => {
        if (!enabled || !canGoBack || !previousScreen) return false;
        return evt.nativeEvent.pageX < EDGE_THRESHOLD;
      },
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        if (!enabled || !canGoBack || !previousScreen) return false;
        const isFromLeftEdge = evt.nativeEvent.pageX < EDGE_THRESHOLD;
        const isHorizontalSwipe = Math.abs(gestureState.dx) > Math.abs(gestureState.dy);
        const isSwipeRight = gestureState.dx > 0;
        return isFromLeftEdge && isHorizontalSwipe && isSwipeRight;
      },
      onPanResponderGrant: () => {
        if (!previousScreen) return;
        isSwipeActive.current = true;
        translateX.setOffset(translateX._value);
        translateX.setValue(0);
        // Show previous screen immediately
        previousOpacity.setValue(1);
      },
      onPanResponderMove: (_, gestureState) => {
        if (!isSwipeActive.current || !previousScreen) return;
        const dx = Math.max(0, Math.min(gestureState.dx, SCREEN_WIDTH));
        translateX.setValue(dx);
        // Fade current screen slightly as we swipe
        const progress = Math.min(dx / SCREEN_WIDTH, 1);
        currentOpacity.setValue(1 - progress * 0.2);
        // Previous screen stays fully visible
        previousOpacity.setValue(1);
      },
      onPanResponderRelease: (_, gestureState) => {
        if (!isSwipeActive.current) return;
        isSwipeActive.current = false;
        translateX.flattenOffset();

        const shouldSwipeBack =
          gestureState.dx > SWIPE_THRESHOLD ||
          (gestureState.dx > 50 && gestureState.vx > SWIPE_VELOCITY_THRESHOLD);

        if (shouldSwipeBack) {
          // Animate current screen off to the right
          Animated.parallel([
            Animated.timing(translateX, {
              toValue: SCREEN_WIDTH,
              duration: 250,
              useNativeDriver: false,
            }),
            Animated.timing(currentOpacity, {
              toValue: 0,
              duration: 250,
              useNativeDriver: true,
            }),
          ]).start(() => {
            onSwipeBack();
            // Reset after navigation
            translateX.setValue(0);
            currentOpacity.setValue(1);
            previousOpacity.setValue(0);
          });
        } else {
          // Spring back
          Animated.parallel([
            Animated.spring(translateX, {
              toValue: 0,
              useNativeDriver: false,
              tension: 50,
              friction: 8,
            }),
            Animated.spring(currentOpacity, {
              toValue: 1,
              useNativeDriver: true,
              tension: 50,
              friction: 8,
            }),
            Animated.timing(previousOpacity, {
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
        Animated.parallel([
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: false,
            tension: 50,
            friction: 8,
          }),
          Animated.spring(currentOpacity, {
            toValue: 1,
            useNativeDriver: true,
            tension: 50,
            friction: 8,
          }),
          Animated.timing(previousOpacity, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }),
        ]).start();
      },
    }),
  ).current;

  if (!enabled || !canGoBack || !previousScreen) {
    return <>{currentScreen}</>;
  }

  return (
    <View style={styles.container}>
      {/* Previous screen - always rendered behind */}
      <Animated.View
        style={[
          styles.previousScreen,
          {
            opacity: previousOpacity,
          },
        ]}
        pointerEvents="none"
      >
        {previousScreen}
      </Animated.View>

      {/* Current screen - slides on top */}
      <Animated.View
        style={[
          styles.currentScreen,
          {
            transform: [{ translateX }],
            opacity: currentOpacity,
          },
        ]}
        {...panResponder.panHandlers}
      >
        {currentScreen}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
  previousScreen: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 0,
    backgroundColor: '#F4F7F6',
  },
  currentScreen: {
    flex: 1,
    zIndex: 1,
    backgroundColor: '#F4F7F6',
  },
});

