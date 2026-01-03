# Header Design Pattern - Dream Finora

**Status:** ✅ Standardized - Reusable Header Component + Collapsible Header (SpaceV Screen)  
**Last Updated:** 2025-01-XX  
**Reference Implementation:** 
- `Header` component (`apps/mobile/src/components/Header.tsx`) - Reusable fixed header
- `SpaceVListScreen` (SpaceV) with `CollapsibleHeader` component

---

## Overview

This document defines the standardized header design patterns for all screens in the Dream Finora mobile app. 

**Default Pattern:** Fixed header with content scrolling beneath it (used on most screens including HomeScreen)

**Special Pattern:** Collapsible header that smoothly hides when scrolling down (used on SpaceV screen for better browsing experience)

Both patterns provide consistent design, safe area support, and accessibility.

---

## Key Features

✅ **Reusable Header Component** - Single `Header` component used across all fixed-header screens  
✅ **Fixed Header (Default)** - Header stays visible, content scrolls beneath it  
✅ **Collapsible Header (SpaceV Screen)** - Header hides when scrolling down for better content visibility  
✅ **3D Visual Design** - Modern indigo color (#6366F1) with platform-specific shadows/elevation  
✅ **Performance Optimized** - Module-level profile caching prevents unnecessary API calls  
✅ **Safe Area Support** - Automatically handles status bar spacing (no overlap)  
✅ **Smooth Animations** - Uses React Native Animated API with pure interpolation (zero jitter)  
✅ **Consistent Design** - Same visual design across all screens  
✅ **Accessible** - Full accessibility labels and proper touch targets  
✅ **Production Ready** - Tested, reliable, and unbreakable implementation  
✅ **Status Bar Aware** - Content positioned at bottom, status bar visible at top

---

## Header Types

### 1. Fixed Header (Default Pattern)

**Use Case:** Most screens (HomeScreen, Expenses, Chores, Rides, Settings, Profile, etc.)  
**Component:** Reusable `Header` component (`apps/mobile/src/components/Header.tsx`)

**Characteristics:**
- **Always Visible:** Header stays fixed at top
- **Content Scrolls Beneath:** ScrollView content scrolls under the header
- **Reusable Component:** Single `Header` component used across all screens
- **Profile Caching:** Module-level cache prevents re-fetching profile on every navigation
- **3D Visual Design:** Indigo color (#6366F1) with platform-specific shadows/elevation
- **Safe Area Support:** Uses `SafeAreaView` with `edges={['top', 'left', 'right']}`
- **Performance:** Zero overhead, instant rendering, cached profile data

**Implementation:**
```tsx
import { Header } from '../components/Header';
import { SafeAreaView } from 'react-native-safe-area-context';

<SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
  <Header
    onNavigateToProfile={() => navigate('profile')}
    onNavigateToNotifications={() => navigate('notifications')}
    onNavigateToSettings={() => navigate('settings')}
  />
  <ScrollView>
    {/* Content scrolls beneath header */}
  </ScrollView>
</SafeAreaView>
```

**Header Component Features:**
- **Profile Avatar:** Shows user's profile picture or initial placeholder
- **Notifications Badge:** Displays unread notification count
- **Settings Button:** Quick access to settings
- **Module-Level Caching:** Profile data cached at module level, preventing re-fetching on navigation
- **Auto-Refresh:** Unread count refreshes every 30 seconds

---

### 2. Collapsible Header (SpaceV Screen Only)

**Use Case:** SpaceV screen (browsing feed-like content)  
**Component:** `CollapsibleHeader`

**Characteristics:**
- **Position-Based Animation:** Hides after scrolling past threshold (30px), shows when scrolling back to top
- **Fixed Position:** Header stays at top, animates translateY
- **Safe Area Support:** Automatically handles status bar spacing (no overlap)
- **Content Positioning:** Header content aligned to bottom, status bar visible at top
- **Dynamic Spacer:** Spacer shrinks when header hides, allowing content to scroll into that space
- **Performance:** Uses pure interpolation (zero listeners, zero jitter, smooth 60fps)

**Behavior:**
- Scroll down past 30px → Header smoothly translates up (hides)
- Scroll back to top (≤30px) → Header smoothly translates down (shows)
- At top (scroll position ≤ 0) → Header always visible
- Smooth interpolation-based animation (no jitter, no listeners)
- Handles overscroll/bounce properly (no jitter during bounce)

**Layout:**
```
┌─────────────────────────────────────────┐
│  Status Bar (Time, Battery, Signal)     │  ← Safe area (auto-handled)
├─────────────────────────────────────────┤
│  [Avatar]          [Notifications] [⚙️] │  ← Header content (bottom-aligned)
└─────────────────────────────────────────┘
┌─────────────────────────────────────────┐
│                                         │  ← Spacer (prevents overlap)
│          Scrollable Content             │
│                                         │
└─────────────────────────────────────────┘
```

---

## Implementation

### Fixed Header (Default Pattern)

**Step 1: Import Required Components**

```tsx
import React from 'react';
import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Header } from '../components/Header';
```

**Step 2: Implement Header and ScrollView**

```tsx
<SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
  {/* Reusable Header Component */}
  <Header
    onNavigateToProfile={() => navigate('profile')}
    onNavigateToNotifications={() => navigate('notifications')}
    onNavigateToSettings={() => navigate('settings')}
  />

  {/* ScrollView - content scrolls beneath header */}
  <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
    {/* Your scrollable content */}
  </ScrollView>
</SafeAreaView>
```

**Header Component Props:**
```tsx
interface HeaderProps {
  onNavigateToProfile?: () => void;
  onNavigateToNotifications?: () => void;
  onNavigateToSettings?: () => void;
}
```

**Header Component Design:**
- **Background Color:** `#6366F1` (Indigo-500)
- **3D Effect:** Platform-specific shadows/elevation
- **Profile Avatar:** 48x48px with white border and shadow
- **Icon Buttons:** Semi-transparent white background with 3D effect
- **Notification Badge:** Red badge with unread count
- **Border:** Darker indigo border (`#4F46E5`) for depth

**Module-Level Caching:**
The `Header` component uses module-level caching to prevent re-fetching profile data on every navigation:
- Profile data cached at module level (outside component)
- Cache keyed by user token
- Cache cleared on logout/token change
- Prevents unnecessary API calls and loading flickers

---

### Collapsible Header (SpaceV Screen Only)

**Step 1: Import Required Components**

```tsx
import React, { useRef } from 'react';
import { Animated } from 'react-native';
import { CollapsibleHeader } from '../components/CollapsibleHeader';
```

**Step 2: Initialize Animation Values**

```tsx
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Animation values for collapsible header
const scrollY = useRef(new Animated.Value(0)).current;
const insets = useSafeAreaInsets();
const HEADER_HEIGHT = 60; // Content height only (back button + padding)
const TOTAL_HEADER_HEIGHT = HEADER_HEIGHT + insets.top; // Includes safe area
```

**Step 3: Create Spacer Interpolation**

```tsx
// Spacer interpolation - created directly from scrollY (perfectly synchronized)
const SCROLL_THRESHOLD = 30;
const HIDE_DISTANCE = TOTAL_HEADER_HEIGHT;
const spacerHeight = scrollY.interpolate({
  inputRange: [-200, 0, SCROLL_THRESHOLD, SCROLL_THRESHOLD + HIDE_DISTANCE, 10000],
  outputRange: [TOTAL_HEADER_HEIGHT, TOTAL_HEADER_HEIGHT, TOTAL_HEADER_HEIGHT, 0, 0],
  extrapolate: 'clamp',
});
```

**Step 4: Implement Header, Spacer, and ScrollView

```tsx
<SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
  {/* Collapsible Header - handles top safe area internally */}
  <CollapsibleHeader scrollY={scrollY} headerHeight={HEADER_HEIGHT}>
    <View style={styles.header}>
      {/* Header content (back button, create button, etc.) */}
    </View>
  </CollapsibleHeader>

  {/* Dynamic Spacer - shrinks when header hides */}
  {/* Create spacer interpolation directly from scrollY */}
  <Animated.View 
    style={{
      height: scrollY.interpolate({
        inputRange: [-200, 0, 30, 30 + TOTAL_HEADER_HEIGHT, 10000],
        outputRange: [TOTAL_HEADER_HEIGHT, TOTAL_HEADER_HEIGHT, TOTAL_HEADER_HEIGHT, 0, 0],
        extrapolate: 'clamp',
      }),
    }} 
  />

  {/* ScrollView with scroll tracking */}
  <Animated.ScrollView
    style={styles.container}
    contentContainerStyle={styles.scrollContent}
    scrollEventThrottle={16}
    onScroll={Animated.event(
      [{ nativeEvent: { contentOffset: { y: scrollY } } }],
      { useNativeDriver: false }
    )}
  >
    {/* Your scrollable content */}
  </Animated.ScrollView>
</SafeAreaView>
```

**Important Notes:**
- `SafeAreaView` edges should be `['left', 'right']` - NOT `'top'` (header handles top safe area)
- Use `HEADER_HEIGHT` for the component prop (content height only)
- Create spacer interpolation directly from `scrollY` (same source as header, perfectly synchronized)
- Spacer uses same interpolation logic as header (no callback needed, zero jitter)

---

## CollapsibleHeader Component

### Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `children` | `React.ReactNode` | Yes | Header content to render |
| `scrollY` | `Animated.Value` | Yes | Animated value tracking scroll position |
| `headerHeight` | `number` | Yes | Height of the header content area (not including safe area inset) |

### Implementation Details

**Location:** `apps/mobile/src/components/CollapsibleHeader.tsx`

**Key Features:**
- Uses `Animated.View` with `translateY` transform
- Automatically handles safe area insets (status bar)
- **Position-based animation** - uses pure interpolation from scrollY (zero listeners, zero jitter)
- Smooth interpolation-based transitions (no spring animations needed)
- Positioned absolutely at top with z-index
- Includes shadow/elevation for depth
- Content positioned at bottom of header (status bar at top)
- `pointerEvents="box-none"` to allow touch through when needed
- Handles overscroll/bounce properly (no jitter during bounce)

**Safe Area Handling:**
```tsx
const insets = useSafeAreaInsets();
const topInset = insets.top;
const totalHeaderHeight = headerHeight + topInset;
```

**Animation Logic:**
```tsx
// Pure interpolation approach - ZERO listeners = ZERO jitter
const SCROLL_THRESHOLD = 30; // Hide header after scrolling 30px
const HIDE_DISTANCE = totalHeaderHeight;

// Header translateY: pure interpolation (smooth, no jitter, no re-creation)
const translateY = scrollY.interpolate({
  inputRange: [
    -200,           // Overscroll at top (bounce)
    0,              // At top
    SCROLL_THRESHOLD, // Start hiding
    SCROLL_THRESHOLD + HIDE_DISTANCE, // Fully hidden
    10000           // Far down (stays hidden)
  ],
  outputRange: [
    0,              // Always visible at top (even during bounce)
    0,              // Visible at top
    0,              // Still visible at threshold
    -totalHeaderHeight, // Fully hidden
    -totalHeaderHeight  // Stays hidden (no jitter on bounce back)
  ],
  extrapolate: 'clamp',
});

// Spacer height: perfectly synchronized with header
const spacerHeight = scrollY.interpolate({
  inputRange: [
    -200,           // Overscroll at top
    0,              // At top
    SCROLL_THRESHOLD, // Start hiding
    SCROLL_THRESHOLD + HIDE_DISTANCE, // Fully hidden
    10000           // Far down
  ],
  outputRange: [
    totalHeaderHeight, // Full height at top
    totalHeaderHeight, // Full height at top
    totalHeaderHeight, // Still full at threshold
    0,              // No spacer when hidden
    0               // Stays at 0 (no jitter)
  ],
  extrapolate: 'clamp',
});
```

**Layout Structure:**
```tsx
<Animated.View style={{ height: totalHeaderHeight, paddingTop: topInset, transform: [{ translateY }] }}>
  <View style={{ flex: 1, justifyContent: 'flex-end' }}>
    {children} {/* Header content aligned to bottom */}
  </View>
</Animated.View>
```

This creates a smooth, position-based translation where:
- **At top (scrollY ≤ 0)** → Header always visible (even during bounce)
- **After threshold (scrollY > 30px)** → Header starts hiding smoothly
- **Fully hidden (scrollY > 30px + headerHeight)** → Header stays hidden
- **Pure interpolation** - no listeners, no jitter, perfectly smooth
- **Synchronized spacer** - shrinks/grows with header using same interpolation
- Status bar area is always visible (no overlap)

---

## Design Specifications

### Dimensions & Spacing

**Fixed Header (Header Component):**
- **Header Padding:** 20px horizontal, 16px vertical
- **Profile Avatar:** 48x48px with 2px white border
- **Icon Size:** 28px
- **Icon Button:** 44x44px minimum touch target with 8px padding
- **Gap between right buttons:** 16px
- **Badge:** 20px height, 10px border radius, 2px border

**Bottom Navigation:**
- **Container Padding:** 16px horizontal, 8px bottom
- **Nav Bar Padding:** 12px vertical, 8px horizontal
- **Nav Bar Border Radius:** 24px (floating island effect)
- **Nav Item:** 56px minimum height, 16px border radius
- **Icon Size:** 24px
- **Label Font Size:** 11px
- **Label Margin Top:** 4px
- **Border Width:** 1px (darker indigo for depth)

**Collapsible Header (SpaceV Screen):**
- **Header Content Height:** 88px (content area only)
  - Profile Avatar: 64x64px
  - Padding Vertical: 12px
  - Total: 64 + (12 * 2) = 88px
- **Total Header Height:** 88px + Safe Area Top Inset
  - Includes status bar height (varies by device)
  - Status bar: ~44px on iPhone with notch, ~20px on older devices
- **Padding Horizontal:** 20px
- **Padding Vertical:** 12px (within content area)
- **Safe Area Padding:** Automatically added at top (status bar space)
- **Content Alignment:** Bottom-aligned within header (content at bottom, status bar at top)
- **Icon Button Size:** 44x44px minimum touch target
- **Icon Size:** 28px
- **Gap between right buttons:** 20px

### Colors

- **Header Background:** `#6366F1` (Indigo-500) - Modern, vibrant color
- **Header Border:** `#4F46E5` (Indigo-600) - Darker indigo for depth
- **Icon Color:** `#FFFFFF` (White) - High contrast on indigo background
- **Icon Button Background:** `rgba(255, 255, 255, 0.15)` - Semi-transparent white for glass effect
- **Active Nav Item Background:** `rgba(255, 255, 255, 0.2)` - Subtle highlight
- **Badge Background:** `#EF4444` (Red-500)
- **Badge Text:** `#FFFFFF` (White)
- **Nav Label (Inactive):** `rgba(255, 255, 255, 0.7)` - Lighter white
- **Nav Label (Active):** `#FFFFFF` (White)

### Shadows & Elevation

**Header:**
- **iOS:** Shadow with `#4F46E5` color, 0.3 opacity, 4px offset, 8px radius
- **Android:** Elevation 8

**Bottom Navigation:**
- **iOS:** Shadow with `#4F46E5` color, 0.4 opacity, 8px offset, 16px radius
- **Android:** Elevation 12

**Profile Avatar:**
- **iOS:** Shadow with black color, 0.25 opacity, 2px offset, 4px radius
- **Android:** Elevation 4

**Icon Buttons:**
- **iOS:** Shadow with `#4F46E5` color, 0.2 opacity, 2px offset, 4px radius
- **Android:** Elevation 3

---

## Complete Example: SpaceVListScreen (SpaceV)

```tsx
import React, { useRef } from 'react';
import { View, Text, Animated } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { CollapsibleHeader } from '../components/CollapsibleHeader';

export function HomeScreen() {
  // Animation values
  const scrollY = useRef(new Animated.Value(0)).current;
  const insets = useSafeAreaInsets();
  const HEADER_HEIGHT = 88; // Content height only
  const TOTAL_HEADER_HEIGHT = HEADER_HEIGHT + insets.top; // Includes safe area

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
      {/* Collapsible Header - handles top safe area internally */}
      <CollapsibleHeader scrollY={scrollY} headerHeight={HEADER_HEIGHT}>
        <View style={styles.header}>
          {/* Profile avatar, notifications, settings buttons */}
        </View>
      </CollapsibleHeader>

      {/* Spacer - use total height including safe area */}
      <View style={{ height: TOTAL_HEADER_HEIGHT }} />

      {/* ScrollView */}
      <Animated.ScrollView
        scrollEventThrottle={16}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
      >
        {/* Content */}
      </Animated.ScrollView>
    </SafeAreaView>
  );
}
```

**Key Implementation Details:**
- `SafeAreaView` edges: `['left', 'right']` (NOT `'top'` - header handles it)
- `HEADER_HEIGHT`: Content area height only (passed to component)
- `TOTAL_HEADER_HEIGHT`: Used for spacer (includes safe area inset)
- Header component automatically adds `paddingTop` for status bar
- Header content is bottom-aligned within the header area

---

## Performance Considerations

### scrollEventThrottle

**Recommended:** `16` (fires ~60 times per second for smooth animation)

- Lower values (8-16): Smoother animation, more CPU usage
- Higher values (100+): Less CPU usage, less smooth animation
- **Best Practice:** Use `16` for smooth 60fps animations

### useNativeDriver

**Important:** We use `useNativeDriver: false` for the scroll event because:
- `scrollY` needs to track actual scroll position
- Transform animations on header can use native driver
- The interpolation happens on JS thread but is still performant

**Optimization Note:** The `translateY` transform is calculated via interpolation, which is efficient. For even better performance, consider using `react-native-reanimated` in the future.

---

## Usage Guidelines

### When to Use Collapsible Header

✅ **Use for:**
- **SpaceV screen only** - Feed-like browsing experience where hiding header provides more content space

❌ **Don't use for (use Fixed Header instead):**
- HomeScreen (dashboard) - Header should stay visible for quick access to profile/notifications
- List screens (ExpenseList, ChoreList, GroupList, etc.) - Header provides context and actions
- Detail screens - Header shows title and actions
- Settings/Profile screens - Header provides navigation
- Modal screens - Header provides context
- Full-screen forms - Header provides navigation/actions
- Screens without ScrollView - No need for collapsible behavior

### When to Use Fixed Header (Default)

✅ **Use for:**
- **All screens except SpaceV** - Provides consistent, always-accessible header
- Better for screens where header actions are frequently used
- Simpler implementation, zero performance overhead

### Header Content Guidelines

**Left Side:**
- HomeScreen: Profile avatar (identity)
- List/Detail: Back button (navigation)

**Center:**
- HomeScreen: None (context clear from content)
- List: Usually none (content makes context clear)
- Detail: Screen title (provides context)

**Right Side:**
- HomeScreen: Notifications, Settings (global actions)
- List: Primary action ("+ New"), optional secondary actions
- Detail: Context-specific actions (Edit, Delete, Share, etc.)

---

## Accessibility

All interactive elements should have proper accessibility labels:

```tsx
<TouchableOpacity
  style={styles.profileButton}
  onPress={onNavigateToProfile}
  activeOpacity={0.7}
  accessibilityRole="button"
  accessibilityLabel="Profile"
  accessibilityHint="Opens your profile screen"
>
  {/* Avatar */}
</TouchableOpacity>

<TouchableOpacity
  style={styles.headerIconButton}
  onPress={onNavigateToNotifications}
  activeOpacity={0.7}
  accessibilityRole="button"
  accessibilityLabel={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
  accessibilityHint="Opens notifications screen"
>
  <Icon name="notifications" size={28} color="#111827" />
  {/* Badge */}
</TouchableOpacity>
```

### Touch Targets

- **Minimum Size:** 44x44px for all interactive elements
- **Padding:** Additional padding can be used to increase touch target without increasing visual size
- **Spacing:** Adequate spacing between buttons to prevent accidental taps

---

## Implementation Details

### How It Works (Technical)

The collapsible header uses **pure interpolation** from `scrollY` - no listeners, no callbacks, zero jitter:

1. **Header translateY** interpolates directly from `scrollY`:
   - At top (scrollY ≤ 0): `translateY = 0` (visible)
   - After threshold (scrollY > 30px): `translateY` interpolates to `-totalHeaderHeight` (hidden)

2. **Spacer height** interpolates from same `scrollY`:
   - At top: `height = TOTAL_HEADER_HEIGHT` (full spacer)
   - After threshold: `height` interpolates to `0` (no spacer)

3. **Both use same interpolation source** - perfectly synchronized, no desync possible

4. **Handles overscroll/bounce** - wide input range (-200 to 10000) ensures smooth behavior at boundaries

### Why This Approach?

- **Zero Jitter:** Pure interpolation, no listeners running on JS thread
- **Perfect Sync:** Header and spacer use same `scrollY` value
- **Smooth:** Interpolation is hardware-accelerated
- **Simple:** No complex direction detection, no animation state management
- **Reliable:** Works consistently across all devices and scroll speeds

---

## Troubleshooting

### Header Not Animating

1. **Check scrollY is connected:** Ensure `scrollY` is passed to both `CollapsibleHeader` and `onScroll` event
2. **Check headerHeight:** Must match actual header content height (not including safe area)
3. **Check spacer:** Include spacer View with `TOTAL_HEADER_HEIGHT` (includes safe area)
4. **Check scrollEventThrottle:** Should be 16 for smooth animation

### Header Overlaps Content

- Add spacer View: `<View style={{ height: TOTAL_HEADER_HEIGHT }} />`
- Ensure spacer height uses `TOTAL_HEADER_HEIGHT` (includes safe area inset)
- Use `HEADER_HEIGHT + insets.top` for spacer, but only `HEADER_HEIGHT` for component prop

### Header Overlaps Status Bar

- **Fixed:** Header now automatically handles safe area
- Component uses `useSafeAreaInsets()` internally
- Ensure `SafeAreaView` edges are `['left', 'right']` (NOT `'top'`)
- Header content is automatically positioned below status bar

### Animation Not Smooth

- Reduce scrollEventThrottle value (try 8 instead of 16)
- Check for heavy computations during scroll
- The direction detection uses a threshold (5px) to prevent jittery behavior
- Spring animation parameters can be adjusted for different feel (tension: 300, friction: 30)
- Consider using react-native-reanimated for even better performance

---

## Future Enhancements

Potential improvements for future iterations:

1. **React Native Reanimated:** Migrate to `react-native-reanimated` for even better performance
2. **Velocity-Based Animation:** Use scroll velocity to make animations more responsive
3. **Header Variations:** Different collapse behaviors (fade, scale, etc.)
4. **Threshold-Based Hiding:** Hide only after scrolling a certain distance (currently hides immediately on scroll down)
5. **Reusable Hook:** Create `useCollapsibleHeader` hook for cleaner implementation

---

## Bottom Navigation

The bottom navigation bar uses the same indigo color scheme as the header for visual consistency.

### Design

- **Floating Island Effect:** Rounded corners (24px) with padding from screen edges
- **Background Color:** `#6366F1` (Indigo-500) - matches header
- **3D Effect:** Platform-specific shadows/elevation for depth
- **Position:** Absolutely positioned at bottom with `zIndex: 10`
- **Safe Area:** Automatically handles bottom safe area (notch/home indicator)

### Implementation

**Component:** `apps/mobile/src/components/BottomNavigation.tsx`

**Usage:**
```tsx
import { BottomNavigation } from '../components/BottomNavigation';

<BottomNavigation
  currentScreen={currentScreen}
  onNavigateToHome={() => navigate('home')}
  onNavigateToExpenses={() => navigate('expenses')}
  onNavigateToChores={() => navigate('chores')}
  onNavigateToSpaceV={() => navigate('spacev')}
  onNavigateToRides={() => navigate('rides')}
/>
```

**Rendering:**
The bottom navigation is rendered at the root level via `RootScreenRenderer` component, which ensures it:
- Stays above all screen content
- Only shows on screens that require it (`requiresBottomNav: true`)
- Maintains proper z-index layering

**Navigation Items:**
- Home (house icon)
- Billchop (receipt icon)
- Chores (check-circle icon)
- SpaceV (custom SpaceV icon)
- Rides (directions-car icon)

**Active State:**
- Active item: White icon and label with subtle background highlight
- Inactive item: Lighter white (70% opacity) icon and label
- Smooth transitions between states

---

## References

- **UI/UX Design Guide:** `SOP/UI_UX_DESIGN_GUIDE.md`
- **Navigation System:** `docs/NAVIGATION_TRANSITIONS.md` (Screen transitions and root-level rendering)
- **Fixed Header Component:** `apps/mobile/src/components/Header.tsx` (Reusable header)
- **Fixed Header Implementation:** `apps/mobile/src/screens/HomeScreen.tsx` (Example usage)
- **Collapsible Header Implementation:** `apps/mobile/src/screens/SpaceVListScreen.tsx` (SpaceV screen)
- **CollapsibleHeader Component:** `apps/mobile/src/components/CollapsibleHeader.tsx`
- **Bottom Navigation Component:** `apps/mobile/src/components/BottomNavigation.tsx`
- **Icon System:** `apps/mobile/src/components/Icon.tsx`
- **React Native Animated API:** https://reactnative.dev/docs/animated

---

## Summary

- **Reusable Header Component:** Single `Header` component used across all fixed-header screens with module-level profile caching
- **Fixed Header (Default):** Used on most screens (HomeScreen, Expenses, Chores, Rides, Settings, Profile, etc.) - Always visible, content scrolls beneath
- **Collapsible Header (SpaceV Only):** Used only on SpaceV screen - Hides when scrolling for better browsing experience
- **3D Visual Design:** Modern indigo color (#6366F1) with platform-specific shadows/elevation for depth
- **Bottom Navigation:** Floating island design matching header color, absolutely positioned at bottom
- **Performance Optimized:** Module-level caching prevents unnecessary API calls, native driver animations
- Both patterns provide consistent design, safe area support, and accessibility
- Collapsible header uses pure interpolation (zero listeners, zero jitter) for smooth performance

*This pattern provides a modern, smooth, and performant header experience with the right pattern for each screen type, unified design language, and optimal performance.*
