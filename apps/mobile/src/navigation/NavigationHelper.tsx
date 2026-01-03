/**
 * Helper functions to migrate from old navigation pattern to new stack-based navigation
 * This provides backward compatibility during the migration
 */

import { ScreenName, ScreenParams } from './NavigationStack';

/**
 * Creates a navigation handler that pushes to stack and updates state
 * Use this to replace setCurrentScreen calls during migration
 */
export function createNavigationHandler(
  push: (screen: ScreenName, params?: Partial<ScreenParams>) => void,
  stateSetters?: Record<string, (value: any) => void>,
) {
  return (screen: ScreenName, params?: Partial<ScreenParams>) => {
    // Push to navigation stack
    push(screen, params);

    // Update legacy state for backward compatibility
    if (stateSetters && params) {
      Object.entries(params).forEach(([key, value]) => {
        const setter = stateSetters[`set${key.charAt(0).toUpperCase() + key.slice(1)}`];
        if (setter && value !== undefined) {
          setter(value);
        }
      });
    }
  };
}

/**
 * Creates a back handler that pops from stack
 */
export function createBackHandler(pop: () => void) {
  return () => {
    pop();
  };
}

