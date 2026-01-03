import { useNavigation, ScreenName, ScreenParams } from './NavigationStack';
import { useCallback } from 'react';

/**
 * Backward-compatible navigation hook that provides both
 * the new stack-based navigation and legacy setCurrentScreen pattern
 */
export function useAppNavigation() {
  const nav = useNavigation();

  // Helper to push a screen with params
  const navigate = useCallback(
    (screen: ScreenName, params?: Partial<ScreenParams>) => {
      nav.push(screen, params);
    },
    [nav],
  );

  // Helper to go back
  const goBack = useCallback(() => {
    if (nav.canGoBack()) {
      nav.pop();
    }
  }, [nav]);

  // Helper to replace current screen
  const replace = useCallback(
    (screen: ScreenName, params?: Partial<ScreenParams>) => {
      nav.replace(screen, params);
    },
    [nav],
  );

  // Helper to reset stack
  const reset = useCallback(
    (screen: ScreenName, params?: Partial<ScreenParams>) => {
      nav.reset(screen, params);
    },
    [nav],
  );

  return {
    ...nav,
    navigate,
    goBack,
    replace,
    reset,
    // Legacy compatibility - these will be used during migration
    setCurrentScreen: navigate,
    currentScreen: nav.currentScreen,
    currentParams: nav.currentParams,
  };
}

