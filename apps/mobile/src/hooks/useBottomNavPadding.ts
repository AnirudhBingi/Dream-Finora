import { useSafeAreaInsets } from "react-native-safe-area-context";

/**
 * Hook to calculate the proper bottom padding for ScrollView content
 * to ensure content is accessible above the bottom navigation bar.
 *
 * The bottom navigation bar consists of:
 * - Safe area bottom inset (device-specific, typically 20-34px)
 * - Container paddingBottom: 6px
 * - navBar paddingVertical: 8px * 2 = 16px
 * - navItem minHeight: 48px
 * - Additional spacing: 16px for comfortable scroll
 *
 * Total: ~106-120px depending on device
 */
export function useBottomNavPadding(requiresBottomNav: boolean = true): number {
  const insets = useSafeAreaInsets();

  if (!requiresBottomNav) {
    // If no bottom nav, just use safe area inset + minimal padding
    return insets.bottom + 24;
  }

  // Bottom nav height calculation:
  // Safe area bottom + container padding (6) + navBar padding (8*2) + navItem height (48) + extra spacing (16)
  const bottomNavHeight = insets.bottom + 6 + 16 + 48 + 16;

  return bottomNavHeight;
}
