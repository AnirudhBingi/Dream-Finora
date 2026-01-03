import React, { ReactNode } from 'react';
import { SwipeableScreen } from './SwipeableScreen';

interface ScreenWrapperProps {
  children: ReactNode;
  onSwipeBack: () => void;
  canGoBack: () => boolean;
  enableSwipe?: boolean;
}

/**
 * Universal wrapper for all screens that provides swipe-to-go-back functionality
 * This ensures consistent behavior across all screens
 */
export function ScreenWrapper({ 
  children, 
  onSwipeBack, 
  canGoBack,
  enableSwipe = true,
}: ScreenWrapperProps) {
  // Only wrap with swipe if enabled and we can go back
  if (!enableSwipe || !canGoBack()) {
    return <>{children}</>;
  }

  return (
    <SwipeableScreen
      onSwipeBack={onSwipeBack}
      canGoBack={canGoBack}
      enabled={enableSwipe}
    >
      {children}
    </SwipeableScreen>
  );
}
