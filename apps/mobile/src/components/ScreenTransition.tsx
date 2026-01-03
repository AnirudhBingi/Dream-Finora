import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

interface ScreenTransitionProps {
  children: React.ReactNode;
  isActive: boolean;
  duration?: number;
}

/**
 * Smooth screen transition component that fades screens in/out
 * Prevents flickering by keeping previous screen mounted during transition
 */
export function ScreenTransition({ 
  children, 
  isActive, 
  duration = 200 
}: ScreenTransitionProps) {
  const opacity = useRef(new Animated.Value(isActive ? 1 : 0)).current;
  const scale = useRef(new Animated.Value(isActive ? 1 : 0.98)).current;
  const previousActive = useRef(isActive);

  useEffect(() => {
    if (isActive !== previousActive.current) {
      previousActive.current = isActive;
      
      if (isActive) {
        // Fade in and scale up
        Animated.parallel([
          Animated.timing(opacity, {
            toValue: 1,
            duration,
            useNativeDriver: true,
          }),
          Animated.timing(scale, {
            toValue: 1,
            duration,
            useNativeDriver: true,
          }),
        ]).start();
      } else {
        // Fade out and scale down slightly
        Animated.parallel([
          Animated.timing(opacity, {
            toValue: 0,
            duration: duration * 0.7, // Faster fade out
            useNativeDriver: true,
          }),
          Animated.timing(scale, {
            toValue: 0.98,
            duration: duration * 0.7,
            useNativeDriver: true,
          }),
        ]).start();
      }
    }
  }, [isActive, duration, opacity, scale]);

  // Don't render if not active and fully faded out (for performance)
  if (!isActive && opacity._value === 0) {
    return null;
  }

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity,
          transform: [{ scale }],
        },
      ]}
      pointerEvents={isActive ? 'auto' : 'none'}
    >
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
});

