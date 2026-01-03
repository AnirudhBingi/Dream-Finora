import React, { useMemo, useRef, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { ScreenContainer } from './ScreenContainer';

interface ScreenEntry {
  name: string;
  component: React.ReactNode;
  key: string;
  requiresBottomNav?: boolean;
}

interface RootScreenRendererProps {
  currentScreen: string;
  screens: ScreenEntry[];
  bottomNavigation?: React.ReactNode;
}

/**
 * Root-level screen renderer that automatically handles smooth transitions
 * for ALL screens. Prevents flickering by keeping screens mounted during transitions.
 * 
 * This is the core component that makes transitions work across the entire app.
 * It renders all visited screens simultaneously, with only the active one visible.
 */
export function RootScreenRenderer({
  currentScreen,
  screens,
  bottomNavigation,
}: RootScreenRendererProps) {
  // Track which screens have been visited (rendered at least once)
  const visitedScreens = useRef<Set<string>>(new Set());

  // Mark current screen as visited
  useEffect(() => {
    visitedScreens.current.add(currentScreen);
  }, [currentScreen]);

  // Filter to only render screens that have been visited
  // This prevents rendering all screens at once on first load
  const screensToRender = useMemo(() => {
    return screens.filter((screen) => {
      // Always render if it's the current screen
      if (screen.name === currentScreen) {
        return true;
      }
      // Render if it's been visited before (for smooth transitions)
      if (visitedScreens.current.has(screen.name)) {
        return true;
      }
      return false;
    });
  }, [screens, currentScreen]);

  // Determine if bottom navigation should be shown
  const currentScreenConfig = screens.find(s => s.name === currentScreen);
  const showBottomNav = currentScreenConfig?.requiresBottomNav ?? false;

  return (
    <View style={styles.container}>
      {screensToRender.map((screen) => (
        <ScreenContainer
          key={screen.key}
          isActive={screen.name === currentScreen}
          duration={250}
        >
          {screen.component}
        </ScreenContainer>
      ))}
      {showBottomNav && (
        <View style={styles.bottomNavContainer}>
          {bottomNavigation}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  bottomNavContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 10, // Ensure it's above screens but below modals
  },
});

