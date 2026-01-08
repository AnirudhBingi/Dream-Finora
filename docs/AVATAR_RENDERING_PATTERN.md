# Avatar Rendering Pattern

## Overview

This document outlines the standardized pattern for rendering user profile pictures (avatars) across the entire application. This pattern ensures consistency, reliability, and a professional appearance similar to Facebook and Instagram.

## Core Principles

1. **Single Source of Truth**: Always use the `Avatar` component from `apps/mobile/src/components/Avatar.tsx`
2. **Consistent Fallback**: When no avatar URL is available, show user initials in a colored circle
3. **URL Processing**: Always use `getAvatarUrl` utility to process avatar URLs (handles relative/absolute URLs)
4. **Consistent Styling**: Same size, colors, and appearance across all screens

## Implementation

### Using the Avatar Component

```tsx
import { Avatar } from '../components/Avatar';

// Basic usage
<Avatar
  avatarUrl={user?.profile?.avatarUrl}
  displayName={user?.profile?.displayName || user?.email || 'Unknown'}
  size={48}
/>

// With border (for selected states, etc.)
<Avatar
  avatarUrl={user?.profile?.avatarUrl}
  displayName={user?.profile?.displayName || user?.email || 'Unknown'}
  size={48}
  borderColor="#6366F1"
  borderWidth={2}
/>
```

### Component Props

- `avatarUrl` (string | null | undefined): The raw avatar URL from the API
- `displayName` (string): User's display name or email (used for initials fallback)
- `size` (number, default: 48): Size of the avatar in pixels
- `style` (ViewStyle, optional): Additional styles for the container
- `textStyle` (TextStyle, optional): Additional styles for the initials text
- `borderColor` (string, default: 'transparent'): Border color
- `borderWidth` (number, default: 0): Border width

## How It Works

1. **URL Processing**: The component uses `getAvatarUrl` utility to:
   - Return `null` if no URL is provided
   - Return the URL as-is if it's already a full HTTP/HTTPS URL
   - Prepend the API base URL if it's a relative path

2. **Image Display**: If a processed URL exists:
   - Attempts to load the image
   - On error, silently falls back to initials (the component re-renders)

3. **Initials Fallback**: If no URL or on image load error:
   - Extracts initials from display name (first letter of each word, max 2)
   - Generates a consistent background color based on the display name hash
   - Displays initials in white text on the colored background

## Data Structure

### Friend Object
```typescript
{
  friend: {
    id: string;
    email: string;
    profile?: {
      displayName: string | null;
      avatarUrl: string | null;
    } | null;
  }
}
```

### User Object (from balances, expenses, etc.)
```typescript
{
  id: string;
  email: string;
  profile?: {
    displayName: string | null;
    avatarUrl: string | null;
  } | null;
}
```

## Common Patterns

### Friends List
```tsx
<Avatar
  avatarUrl={friend?.friend?.profile?.avatarUrl}
  displayName={friend?.friend?.profile?.displayName || friend?.friend?.email || 'Unknown'}
  size={48}
/>
```

### Balance Summary
```tsx
<Avatar
  avatarUrl={item.user?.profile?.avatarUrl}
  displayName={item.user?.profile?.displayName || item.user?.email || 'Unknown'}
  size={48}
/>
```

### Participant Picker (Small)
```tsx
<Avatar
  avatarUrl={friend?.friend?.profile?.avatarUrl}
  displayName={getUserDisplayName(friend)}
  size={32}
  borderColor={isSelected ? '#FFFFFF' : 'transparent'}
  borderWidth={isSelected ? 2 : 0}
/>
```

## Migration Guide

### Before (Inconsistent)
```tsx
// ❌ Hardcoded icon
<View style={styles.avatar}>
  <MaterialIcons name="person" size={24} color="#6B7280" />
</View>

// ❌ Manual initials without proper URL processing
<View style={styles.avatar}>
  <Text style={styles.avatarText}>
    {userName.charAt(0).toUpperCase()}
  </Text>
</View>

// ❌ Inconsistent URL processing
const avatarUrl = user.profile?.avatarUrl 
  ? `${baseUrl}${user.profile.avatarUrl}` 
  : null;
```

### After (Standardized)
```tsx
// ✅ Use Avatar component
<Avatar
  avatarUrl={user?.profile?.avatarUrl}
  displayName={userName}
  size={48}
/>
```

## Best Practices

1. **Always use the Avatar component** - Don't create custom avatar rendering logic
2. **Provide displayName** - Always provide a fallback display name (email if displayName is missing)
3. **Consistent sizing** - Use standard sizes: 32px (small/chips), 48px (default), 64px (large/profile)
4. **Handle null/undefined** - The component handles null/undefined gracefully
5. **Don't duplicate URL processing** - The component handles it internally via `getAvatarUrl`

## Screens Updated

- ✅ `FriendsListScreen` - Fixed hardcoded icons
- ✅ `BalanceSummaryScreen` - Fixed initials-only display
- ✅ `BillchopFriendsScreen` - Fixed getUserAvatar to use getAvatarUrl
- ✅ `ParticipantPicker` - Fixed hardcoded icons for friends and group members

## Reference Implementation

See `apps/mobile/src/screens/BillchopGroupsScreen.tsx` for a reference implementation that was already working correctly:

```tsx
const avatarUrl = getAvatarUrl(member.user?.profile?.avatarUrl || null);
const displayName = member.user?.profile?.displayName || member.user?.email || 'Unknown';

{avatarUrl ? (
  <Image 
    source={{ uri: avatarUrl }} 
    style={styles.memberAvatarImage}
    resizeMode="cover"
  />
) : (
  <View style={styles.memberAvatarPlaceholder}>
    <Text style={styles.memberAvatarText}>
      {displayName.charAt(0).toUpperCase()}
    </Text>
  </View>
)}
```

This pattern is now encapsulated in the `Avatar` component for consistency.

## Facebook/Instagram Inspiration

This pattern is inspired by how Facebook and Instagram handle profile pictures:

1. **Always show something** - Never show a broken image or empty space
2. **Consistent fallback** - Same user always gets the same color for initials
3. **Fast loading** - Images are optimized and cached
4. **Graceful degradation** - Falls back to initials if image fails to load
5. **Visual consistency** - Same size and styling across all contexts

