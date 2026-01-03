import React, { useState } from 'react';

export type ScreenName = string;

interface NavigationEntry {
  screen: ScreenName;
  params?: Record<string, any>;
}

/**
 * Simple navigation history hook that tracks screen navigation
 * Works alongside existing state-based navigation
 */
export function useNavigationHistory() {
  const [history, setHistory] = useState<NavigationEntry[]>([
    { screen: 'home', params: {} },
  ]);

  const push = (screen: ScreenName, params?: Record<string, any>) => {
    setHistory((prev) => {
      // Don't push if the last entry is already this screen (avoid duplicates)
      if (prev.length > 0 && prev[prev.length - 1].screen === screen) {
        return prev;
      }
      return [...prev, { screen, params }];
    });
  };

  const pop = () => {
    setHistory((prev) => {
      if (prev.length <= 1) return prev;
      return prev.slice(0, -1);
    });
  };

  const canGoBack = () => {
    return history.length > 1;
  };

  const getPreviousScreen = () => {
    if (history.length <= 1) return null;
    return history[history.length - 2];
  };

  return {
    history,
    push,
    pop,
    canGoBack,
    getPreviousScreen,
    // Note: currentScreen is not returned to avoid conflicts with state variables
    // Use history[history.length - 1]?.screen if you need the current screen from history
  };
}

