import React, { useEffect, useRef, useState } from "react";
import { Animated, StyleSheet, Easing } from "react-native";

interface ScreenContainerProps {
  children: React.ReactNode;
  isActive: boolean;
  duration?: number;
}

/**
 * Screen container that provides smooth fade transitions
 * Keeps screens mounted during transition to prevent flickering
 *
 * Improved version with:
 * - Better easing for smoother transitions
 * - Optimized rendering (only renders when needed)
 * - Proper cleanup after transitions
 */
export function ScreenContainer({
  children,
  isActive,
  duration = 250,
}: ScreenContainerProps) {
  const opacity = useRef(new Animated.Value(isActive ? 1 : 0)).current;
  const [shouldRender, setShouldRender] = useState(isActive);
  const previousActive = useRef(isActive);
  const animationRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (isActive !== previousActive.current) {
      previousActive.current = isActive;

      // Cancel any ongoing animation
      if (animationRef.current) {
        animationRef.current.stop();
      }

      if (isActive) {
        // Screen is becoming active - render it first, then fade in
        setShouldRender(true);
        // Reset opacity to 0 before animating to 1 for smooth fade-in
        opacity.setValue(0);
        animationRef.current = Animated.timing(opacity, {
          toValue: 1,
          duration,
          easing: Easing.out(Easing.cubic), // Smooth ease-out curve
          useNativeDriver: true,
        });
        animationRef.current.start(() => {
          animationRef.current = null;
        });
      } else {
        // Screen is becoming inactive - fade out, then remove
        animationRef.current = Animated.timing(opacity, {
          toValue: 0,
          duration: duration * 0.8, // Slightly faster fade out
          easing: Easing.in(Easing.cubic), // Smooth ease-in curve
          useNativeDriver: true,
        });
        animationRef.current.start(() => {
          // Only remove from render tree after animation completes
          setShouldRender(false);
          animationRef.current = null;
        });
      }
    }

    // Cleanup on unmount
    return () => {
      if (animationRef.current) {
        animationRef.current.stop();
        animationRef.current = null;
      }
    };
  }, [isActive, duration, opacity]);

  if (!shouldRender) {
    return null;
  }

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity,
        },
      ]}
      pointerEvents={isActive ? "auto" : "none"}
    >
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
  },
});
