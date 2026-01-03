# Navigation & Screen Transitions - Dream Finora

**Status:** ✅ Implemented - Root-Level Screen Rendering with Smooth Transitions  
**Last Updated:** 2025-01-XX  
**Reference Implementation:** `RootScreenRenderer` component and `ScreenContainer` component

---

## Overview

This document describes the root-level navigation and screen transition system implemented in the Dream Finora mobile app. The system ensures smooth, flicker-free transitions between all screens by managing screen rendering at the root level and keeping screens mounted during transitions.

**Key Principle:** Screens are rendered at the root level and remain mounted during transitions, with only their visibility controlled via opacity animations. This prevents flickering and provides a smooth, professional navigation experience.

---

## Key Features

✅ **Root-Level Rendering** - All screens rendered at app root, not conditionally  
✅ **Smooth Fade Transitions** - 250ms fade in/out with cubic easing  
✅ **No Flickering** - Screens stay mounted during transitions  
✅ **Lazy Loading** - Screens only render after first visit  
✅ **Swipe-to-Go-Back** - Integrated swipe gesture support for detail screens  
✅ **Bottom Navigation Integration** - Properly layered above screens  
✅ **Performance Optimized** - Uses native driver for animations  

---

## Architecture

### Component Hierarchy

```
App.tsx
└── RootScreenRenderer
    ├── ScreenContainer (for each visited screen)
    │   └── Screen Component (HomeScreen, ExpenseListScreen, etc.)
    └── BottomNavigation (conditionally rendered)
```

### Core Components

1. **`RootScreenRenderer`** - Manages all screen rendering at root level
2. **`ScreenContainer`** - Provides fade transitions for individual screens
3. **`SwipeableScreen`** - Adds swipe-to-go-back gesture (for detail screens)

---

## RootScreenRenderer Component

**Location:** `apps/mobile/src/components/RootScreenRenderer.tsx`

### Purpose

The `RootScreenRenderer` component is the core of the navigation system. It:
- Renders all visited screens simultaneously
- Controls which screen is visible via `isActive` prop
- Manages lazy loading (screens only render after first visit)
- Handles bottom navigation positioning

### Props

```tsx
interface RootScreenRendererProps {
  currentScreen: string;
  screens: ScreenEntry[];
  bottomNavigation?: React.ReactNode;
}

interface ScreenEntry {
  name: string;
  component: React.ReactNode;
  key: string;
  requiresBottomNav?: boolean;
}
```

### Implementation Details

**Lazy Loading:**
- Tracks visited screens using a `useRef<Set<string>>`
- Only renders screens that have been visited at least once
- Prevents rendering all screens on app startup

**Bottom Navigation:**
- Conditionally rendered based on `requiresBottomNav` flag
- Absolutely positioned at bottom with `zIndex: 10`
- Stays above all screen content

**Screen Rendering:**
```tsx
{screensToRender.map((screen) => (
  <ScreenContainer
    key={screen.key}
    isActive={screen.name === currentScreen}
    duration={250}
  >
    {screen.component}
  </ScreenContainer>
))}
```

---

## ScreenContainer Component

**Location:** `apps/mobile/src/components/ScreenContainer.tsx`

### Purpose

The `ScreenContainer` component provides smooth fade transitions for screens. It:
- Keeps screens mounted during transitions (prevents flickering)
- Animates opacity for fade in/out
- Uses native driver for performance
- Handles pointer events (disables interaction on inactive screens)

### Props

```tsx
interface ScreenContainerProps {
  children: React.ReactNode;
  isActive: boolean;
  duration?: number; // Default: 250ms
}
```

### Implementation Details

**Animation Logic:**
- Uses `Animated.Value` for opacity (0 to 1)
- Fade in: Ease-out cubic curve (smooth start, quick end)
- Fade out: Ease-in cubic curve (quick start, smooth end)
- Fade out is slightly faster (80% of duration) for snappier feel

**Rendering Strategy:**
- `shouldRender` state controls actual rendering
- Screen mounts before fade-in starts
- Screen unmounts after fade-out completes
- Prevents flash of content during transitions

**Pointer Events:**
- Active screen: `pointerEvents="auto"` (interactive)
- Inactive screens: `pointerEvents="none"` (non-interactive)

**Positioning:**
- Uses `StyleSheet.absoluteFillObject` to fill entire screen
- All screens stack on top of each other
- Only active screen is visible (opacity: 1)

---

## Usage in App.tsx

### Screen Definition

All screens are defined in a `useMemo` hook that returns an array of `ScreenEntry` objects:

```tsx
const allScreens = useMemo(() => {
  const screens: ScreenEntry[] = [];

  // Tab screens (with bottom navigation)
  screens.push({
    name: 'home',
    component: <HomeScreen {...props} />,
    key: 'home',
    requiresBottomNav: true,
  });

  // Detail screens (without bottom navigation)
  screens.push({
    name: 'profile',
    component: <ProfileScreen {...props} />,
    key: 'profile',
  });

  return screens;
}, [dependencies]);
```

### Rendering

```tsx
return (
  <RootScreenRenderer
    currentScreen={currentScreen}
    screens={allScreens}
    bottomNavigation={bottomNavigation}
  />
);
```

### Navigation

Navigation is handled via state management:
- `setCurrentScreenWithHistory()` - Navigate forward (adds to history)
- `goBack()` - Navigate back (removes from history)
- `navigate()` - Direct navigation (replaces current screen)

---

## Transition Behavior

### Fade In (Screen Becoming Active)

1. Screen component mounts (if not already mounted)
2. Opacity set to 0
3. Animate opacity from 0 to 1 over 250ms
4. Ease-out cubic curve for smooth feel

### Fade Out (Screen Becoming Inactive)

1. Animate opacity from 1 to 0 over 200ms (80% of duration)
2. Ease-in cubic curve for quick exit
3. Screen unmounts after animation completes
4. Prevents flash of content

### Multiple Screen Transitions

When navigating between screens:
- Previous screen fades out
- New screen fades in
- Both animations can overlap slightly for smooth feel
- No flickering because screens stay mounted during transition

---

## Swipe-to-Go-Back

**Component:** `apps/mobile/src/components/SwipeableScreen.tsx`

### Purpose

Provides swipe gesture support for detail screens (screens that can go back).

### Implementation

- Renders previous screen behind current screen
- Animates `translateX` and `opacity` during swipe
- Triggers `goBack()` when swipe threshold is reached
- Only enabled for screens that can go back (not tab screens)

### Integration

The `wrapScreen` function in `App.tsx` automatically wraps detail screens with `SwipeableScreen`:

```tsx
const wrapScreen = useCallback((screen: React.ReactNode, enableSwipe: boolean = true) => {
  // Wrap with ScreenContainer for fade
  const screenWithTransition = (
    <ScreenContainer isActive={isActive} duration={250}>
      {screen}
    </ScreenContainer>
  );

  // Wrap with SwipeableScreen for swipe gesture (if enabled)
  if (enableSwipe && canGoBack()) {
    return (
      <SwipeableScreen
        previousScreen={previousScreen}
        onSwipeBack={goBack}
        canGoBack={canGoBack}
      >
        {screenWithTransition}
      </SwipeableScreen>
    );
  }

  return screenWithTransition;
}, [dependencies]);
```

---

## Performance Considerations

### Native Driver

All animations use `useNativeDriver: true` for optimal performance:
- Animations run on UI thread (not JS thread)
- 60fps smooth animations
- No blocking of JS thread

### Lazy Loading

Screens are only rendered after first visit:
- Reduces initial render time
- Prevents memory bloat
- Improves app startup performance

### Mounted Screens

Screens stay mounted during transitions:
- Prevents re-mounting overhead
- Maintains component state
- Enables smooth transitions

### Cleanup

Proper cleanup prevents memory leaks:
- Animation refs are cleaned up on unmount
- Screens are unmounted after fade-out completes
- No orphaned animations

---

## Troubleshooting

### Flickering During Navigation

**Problem:** Screen flickers when navigating.

**Solution:**
- Ensure screens are defined in `allScreens` array
- Check that `RootScreenRenderer` is used at root level
- Verify `ScreenContainer` wraps all screen components
- Ensure screens stay mounted (check `shouldRender` logic)

### Bottom Navigation Overlapping Content

**Problem:** Bottom navigation appears above screen content.

**Solution:**
- Check `zIndex: 10` is set on `bottomNavContainer`
- Verify `position: 'absolute'` is set
- Ensure screens use `StyleSheet.absoluteFillObject`

### Transitions Not Smooth

**Problem:** Animations feel choppy or slow.

**Solution:**
- Check `useNativeDriver: true` is set
- Verify duration is appropriate (250ms default)
- Ensure no heavy computations during transitions
- Check for console errors that might block JS thread

### Screen Not Appearing

**Problem:** Screen doesn't show when navigating.

**Solution:**
- Check screen is in `allScreens` array
- Verify `currentScreen` matches screen `name`
- Check `isActive` prop is correctly passed
- Ensure screen component renders correctly

---

## Future Enhancements

Potential improvements for future iterations:

1. **React Native Reanimated:** Migrate to `react-native-reanimated` for even better performance
2. **Shared Element Transitions:** Add shared element transitions between screens
3. **Custom Transition Types:** Support slide, scale, or other transition types
4. **Gesture-Based Navigation:** Enhanced swipe gestures with velocity detection
5. **Screen Preloading:** Preload screens before navigation for instant transitions

---

## References

- **RootScreenRenderer:** `apps/mobile/src/components/RootScreenRenderer.tsx`
- **ScreenContainer:** `apps/mobile/src/components/ScreenContainer.tsx`
- **SwipeableScreen:** `apps/mobile/src/components/SwipeableScreen.tsx`
- **App.tsx:** `apps/mobile/App.tsx` (Main navigation logic)
- **Header Design Pattern:** `docs/HEADER_DESIGN_PATTERN.md`
- **React Native Animated API:** https://reactnative.dev/docs/animated

---

## Summary

The navigation system provides a smooth, professional experience by:
- Rendering all screens at the root level
- Keeping screens mounted during transitions
- Using native driver animations for 60fps performance
- Lazy loading screens for optimal startup time
- Properly layering bottom navigation above content

*This system ensures consistent, flicker-free navigation across the entire app.*

