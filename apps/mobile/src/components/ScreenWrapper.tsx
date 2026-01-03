import React from 'react';
import { StyleSheet, ViewStyle } from 'react-native';
import { SafeAreaView, Edge } from 'react-native-safe-area-context';

interface ScreenWrapperProps {
  children: React.ReactNode;
  edges?: Edge[];
  style?: ViewStyle;
}

/**
 * Consistent wrapper for all screens to prevent layout shifts
 * Always uses SafeAreaView with proper edges to avoid status bar overlap
 */
export function ScreenWrapper({ 
  children, 
  edges = ['top', 'left', 'right'],
  style 
}: ScreenWrapperProps) {
  return (
    <SafeAreaView style={[styles.safeArea, style]} edges={edges}>
      {children}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
});

