# Billchop Design Patterns & UI/UX Reference Guide

## Overview

This document extracts design patterns, UI/UX elements, components, and best practices from the completed Billchop (Expense Splitting) screens. Use this as a reference guide when implementing or improving other features in the app.

**Last Updated:** 2025-01-29  
**Source Screens:** ExpenseListScreen, BillchopFriendsScreen, FriendExpenseListScreen, BalanceSummaryScreen, BillchopAnalyticsScreen

---

## Table of Contents

1. [Card Patterns](#card-patterns)
2. [Button Patterns](#button-patterns)
3. [Icon Usage](#icon-usage)
4. [Typography & Spacing](#typography--spacing)
5. [Color System](#color-system)
6. [Loading States](#loading-states)
7. [Error States](#error-states)
8. [Empty States](#empty-states)
9. [Search & Filter Patterns](#search--filter-patterns)
10. [Navigation Patterns](#navigation-patterns)
11. [Balance Display Patterns](#balance-display-patterns)
12. [List & Card Layouts](#list--card-layouts)
13. [Interactive Elements](#interactive-elements)
14. [Reusable Components](#reusable-components)

---

## Card Patterns

### 1. Standard Card (Expense Card, Friend Card, Person Card)

**Structure:**
```typescript
<TouchableOpacity style={styles.card} activeOpacity={0.7}>
  <View style={styles.cardHeader}>
    {/* Title/Name */}
    {/* Action buttons */}
  </View>
  <View style={styles.cardContent}>
    {/* Main content */}
  </View>
</TouchableOpacity>
```

**Styling:**
- `backgroundColor: '#FFFFFF'`
- `borderRadius: 12` (or `16` for larger cards)
- `padding: 14-16px`
- `marginBottom: 12px`
- `borderWidth: 1`
- `borderColor: '#E5E7EB'`
- Subtle shadow (iOS: `shadowOpacity: 0.08`, Android: `elevation: 2`)

**Example:** Expense cards, Friend cards, Person cards in BalanceSummaryScreen

---

### 2. Balance Flow Card (Advanced)

**Structure:**
- Two-column layout with divider
- Floating action button in center
- Net balance banner at top (conditional)
- Color-coded sides (red for "You Owe", green for "You're Owed")

**Key Features:**
- `minHeight: 110`
- Split background colors: `#FEF2F2` (red tint) and `#F0FDF4` (green tint)
- Floating connector button: `44x44`, `borderRadius: 22`, primary color `#6366F1`
- Icon containers: `28x28`, white background, subtle shadow

**Example:** Balance card in ExpenseListScreen

---

### 3. Summary Card

**Structure:**
- Title at top (`fontSize: 18`, `fontWeight: '700'`)
- Rows with label and amount
- Currency badge next to amounts
- Net balance row with divider

**Styling:**
- `padding: 16px`
- `borderRadius: 16`
- `marginBottom: 16px`
- Row spacing: `marginBottom: 12px` between rows
- Net balance row: `marginTop: 12px`, `paddingTop: 12px`, `borderTopWidth: 1`

**Example:** Summary card in BalanceSummaryScreen

---

### 4. Navigation Card (Quick Access)

**Structure:**
- Horizontal layout with icon, text, and chevron
- Icon in colored container
- Flex layout for spacing

**Styling:**
- `flexDirection: 'row'`
- `alignItems: 'center'`
- Icon container: `36x36`, `borderRadius: 18`, `backgroundColor: '#F3F4F6'`
- Text: `fontSize: 15`, `fontWeight: '600'`, `marginLeft: 12`
- Chevron: `#9CA3AF`

**Example:** Friends and Circles cards in ExpenseListScreen

---

### 5. Stat Card (Filterable)

**Structure:**
- Tappable card that acts as filter
- Large value, small label
- Active state styling

**Styling:**
- Active: `backgroundColor: '#6366F1'`, white text
- Inactive: `backgroundColor: '#FFFFFF'`, gray text
- `borderRadius: 12`
- `padding: 16px`
- Value: `fontSize: 18-20`, `fontWeight: '700'`
- Label: `fontSize: 12-13`, `fontWeight: '500'`

**Example:** Financial stats cards in BillchopFriendsScreen

---

## Button Patterns

### 1. Primary Action Button

**Styling:**
- `backgroundColor: '#6366F1'` (Primary Indigo)
- `borderRadius: 12`
- `paddingVertical: 12px`
- `paddingHorizontal: 16px`
- `minHeight: 44px` (touch target)
- `fontSize: 15-16`
- `fontWeight: '600'`
- White text
- Shadow: iOS `shadowOpacity: 0.2`, Android `elevation: 3`

**Example:** "Simplify Debts", "Settle Up", "Add New Friends"

---

### 2. Secondary Button (Text-based)

**Styling:**
- Transparent background
- `fontSize: 14-15`
- `fontWeight: '600'`
- Primary color text (`#6366F1`)
- `padding: 8-12px`
- `minHeight: 44px`

**Example:** "View History", "Retry"

---

### 3. Icon Button (Header Actions)

**Styling:**
- `padding: 8px`
- `minWidth: 44px`
- `minHeight: 44px`
- Icon size: `20-24px`
- Primary color or gray (`#6B7280`)

**Example:** Sort button, filter button, analytics button

---

### 4. Floating Action Button (FAB)

**Styling:**
- `width: 44px`
- `height: 44px`
- `borderRadius: 22`
- `backgroundColor: '#6366F1'`
- `borderWidth: 3`
- `borderColor: '#FFFFFF'`
- Centered icon: `20px`, white
- Strong shadow: iOS `shadowOpacity: 0.4`, Android `elevation: 6`

**Example:** Create expense button in balance flow card

---

### 5. Chip/Filter Button

**Styling:**
- `paddingVertical: 12px`
- `paddingHorizontal: 16px`
- `borderRadius: 8`
- Active: `backgroundColor: '#6366F1'`, white text
- Inactive: `backgroundColor: '#FFFFFF'`, gray text, `borderWidth: 1`, `borderColor: '#E5E7EB'`
- `fontSize: 14`
- `fontWeight: '500'`

**Example:** Filter chips in FriendExpenseListScreen

---

## Icon Usage

### Icon Sizes
- **Small:** `14-16px` (inline with text, indicators)
- **Medium:** `18-20px` (buttons, cards)
- **Large:** `24px` (header actions)
- **Extra Large:** `28-32px` (empty states, large indicators)

### Icon Colors
- **Primary:** `#6366F1` (Indigo)
- **Success/Positive:** `#10B981` (Green)
- **Error/Negative:** `#EF4444` (Red)
- **Neutral:** `#6B7280` (Gray-500)
- **Muted:** `#9CA3AF` (Gray-400)

### Icon Containers
- Circular: `borderRadius: 50%`
- Square with rounded corners: `borderRadius: 6-8px`
- Background colors: `#F3F4F6` (light gray), `#EEF2FF` (light indigo), white

### Common Icons
- **Add/Create:** `add`, `add-circle`
- **Navigation:** `chevron-right`, `arrow-back`
- **Actions:** `edit`, `delete`, `more-vert`
- **Status:** `check-circle`, `error-outline`, `info`
- **Financial:** `account-balance-wallet`, `trending-up`, `trending-down`, `arrow-up`, `arrow-down`
- **Social:** `person`, `group`, `people`
- **Search/Filter:** `search`, `filter-list`, `sort`

---

## Typography & Spacing

### Font Sizes
- **H1/Title:** `20-24px`, `fontWeight: '700'`
- **H2/Section Title:** `18px`, `fontWeight: '700'`
- **H3/Card Title:** `16px`, `fontWeight: '700'`
- **Body Large:** `16px`, `fontWeight: '400-500'`
- **Body:** `15px`, `fontWeight: '400-500'`
- **Body Small:** `14px`, `fontWeight: '400-500'`
- **Caption:** `12-13px`, `fontWeight: '400-500'`
- **Label:** `10-11px`, `fontWeight: '700'`, `textTransform: 'uppercase'`, `letterSpacing: 1`

### Letter Spacing
- **Tight:** `-0.3` to `-0.5` (large amounts, titles)
- **Normal:** `0` (body text)
- **Wide:** `1` (uppercase labels)

### Spacing System (4px base)
- **xs:** `4px`
- **sm:** `8px`
- **md:** `12px`
- **base:** `16px` (most common)
- **lg:** `20px`
- **xl:** `24px`
- **2xl:** `32px`

### Padding Patterns
- **Card padding:** `14-16px`
- **Section padding:** `16px` horizontal
- **Button padding:** `12px` vertical, `16-24px` horizontal
- **Input padding:** `12-14px`

---

## Color System

### Primary Colors
- **Indigo:** `#6366F1` (Primary actions, buttons, accents)
- **Indigo Light:** `#EEF2FF` (Badges, backgrounds)

### Semantic Colors
- **Success/Positive:** `#10B981` (Green)
- **Success Light:** `#D1FAE5` (Green-100)
- **Success Background:** `#F0FDF4` (Green-50)
- **Error/Negative:** `#EF4444` (Red)
- **Error Light:** `#FEE2E2` (Red-100)
- **Error Background:** `#FEF2F2` (Red-50)

### Neutral Colors
- **Gray-900:** `#111827` (Primary text)
- **Gray-700:** `#374151` (Secondary text)
- **Gray-500:** `#6B7280` (Muted text, icons)
- **Gray-400:** `#9CA3AF` (Disabled, borders)
- **Gray-300:** `#D1D5DB` (Light borders)
- **Gray-200:** `#E5E7EB` (Card borders)
- **Gray-100:** `#F3F4F6` (Light backgrounds)
- **Gray-50:** `#F9FAFB` (Page backgrounds)

### Background Colors
- **Page:** `#F9FAFB` or `#FFFFFF`
- **Card:** `#FFFFFF`
- **Input:** `#FFFFFF` or `#F9FAFB`
- **Hover/Active:** `#F3F4F6`

---

## Loading States

### 1. Full Screen Loading

**Structure:**
```typescript
<View style={styles.loadingContainer}>
  <ActivityIndicator size="large" color="#6366F1" />
  <Text style={styles.loadingText}>Loading...</Text>
</View>
```

**Styling:**
- `flex: 1`
- `justifyContent: 'center'`
- `alignItems: 'center'`
- `padding: 24px`
- Text: `marginTop: 16px`, `fontSize: 16px`, `color: '#6B7280'`

---

### 2. Skeleton Loaders

**Components:**
- `SkeletonExpenseList` - For expense lists
- `SkeletonDetailScreen` - For detail screens
- `SkeletonCard` - For individual cards

**Usage:** Replace `ActivityIndicator` with skeleton for better UX

---

### 3. Inline Loading

**Structure:**
- Small `ActivityIndicator` in button or inline
- `size="small"` or `size="large"`
- Primary color

---

## Error States

### 1. Full Screen Error

**Structure:**
```typescript
<ErrorState
  message={error}
  onRetry={loadData}
/>
```

**Styling:**
- Centered layout
- Large error icon (48px)
- Error message text
- Retry button

---

### 2. Inline Error Banner

**Structure:**
```typescript
<View style={styles.errorContainer}>
  <Text style={styles.errorText}>{error}</Text>
  <TouchableOpacity style={styles.retryButton} onPress={loadData}>
    <Text style={styles.retryButtonText}>Retry</Text>
  </TouchableOpacity>
</View>
```

**Styling:**
- `padding: 16px`
- `backgroundColor: '#FEF2F2'` (Red-50)
- `borderRadius: 8px`
- `marginBottom: 16px`
- Text: `fontSize: 14px`, `color: '#EF4444'`
- Button: Red background, white text

---

### 3. Error Banner (Subtle)

**Structure:**
- Small banner at top of scroll view
- Icon + message + retry button
- Non-blocking

**Styling:**
- `flexDirection: 'row'`
- `alignItems: 'center'`
- `gap: 8px`
- `padding: 12px`
- `backgroundColor: '#FEF2F2'`
- `borderRadius: 8px`

---

## Empty States

### EmptyState Component

**Props:**
- `icon`: Icon name
- `title`: Main message
- `message`: Description
- `actionLabel`: Optional button text
- `onAction`: Optional button handler

**Styling:**
- Centered layout
- Large icon (48-64px)
- Title: `fontSize: 20px`, `fontWeight: '600'`
- Message: `fontSize: 16px`, `color: '#6B7280'`
- Button: Primary style if provided

**Example Usage:**
```typescript
<EmptyState
  icon="receipt"
  title="No billchops yet"
  message="Create your first billchop to start splitting bills with friends!"
  actionLabel="Chop a bill"
  onAction={onCreateExpense}
/>
```

---

## Search & Filter Patterns

### 1. Search Bar

**Structure:**
```typescript
<View style={styles.searchContainer}>
  <Icon name="search" size={20} color="#6B7280" />
  <TextInput
    style={styles.searchInput}
    placeholder="Search..."
    value={searchQuery}
    onChangeText={setSearchQuery}
  />
  {searchQuery.length > 0 && (
    <TouchableOpacity onPress={() => setSearchQuery('')}>
      <Icon name="close" size={20} color="#6B7280" />
    </TouchableOpacity>
  )}
</View>
```

**Styling:**
- `flexDirection: 'row'`
- `alignItems: 'center'`
- `paddingHorizontal: 12px`
- `paddingVertical: 10px`
- `backgroundColor: '#F9FAFB'` or `#FFFFFF`
- `borderRadius: 12px`
- `borderWidth: 1`
- `borderColor: '#E5E7EB'`
- Input: `flex: 1`, `marginLeft: 8px`, `fontSize: 15px`

---

### 2. Filter Toggle

**Structure:**
- Icon button to show/hide filters
- Active state: Primary color
- Inactive state: Gray

**Styling:**
- `padding: 8px`
- Icon: `20px`
- Active: `color: '#6366F1'`
- Inactive: `color: '#6B7280'`

---

### 3. Filter Chips

**Structure:**
- Horizontal row of tappable chips
- Active chip: Primary background, white text
- Inactive chip: White background, gray text, border

**Styling:**
- `flexDirection: 'row'`
- `gap: 8px`
- Chip: `paddingVertical: 12px`, `paddingHorizontal: 16px`, `borderRadius: 8px`
- Text: `fontSize: 14px`, `fontWeight: '500'`

---

### 4. Sort Options

**Structure:**
- Dropdown or horizontal chips
- Label: "Sort by"
- Options: Amount, Date, Name, etc.

**Styling:**
- Container: `padding: 16px`, `backgroundColor: '#F9FAFB'`, `borderRadius: 12px`
- Title: `fontSize: 14px`, `fontWeight: '600'`, `marginBottom: 12px`
- Options: Same as filter chips

---

## Navigation Patterns

### Header Actions

**Right Actions:**
- Primary action (e.g., Create): Icon button, primary color
- Secondary actions: Icon buttons, gray or primary color
- Multiple actions: Array of buttons

**Example:**
```typescript
<Header
  title="Expenses"
  rightContent={
    <>
      <TouchableOpacity onPress={onViewAnalytics}>
        <MaterialIcons name="analytics" size={24} color="#6366F1" />
      </TouchableOpacity>
      <TouchableOpacity onPress={onCreateExpense}>
        <MaterialIcons name="add" size={24} color="#6366F1" />
      </TouchableOpacity>
    </>
  }
/>
```

---

### Section Headers

**Structure:**
- Title on left
- Action button on right (optional)
- `flexDirection: 'row'`
- `justifyContent: 'space-between'`
- `alignItems: 'center'`
- `marginBottom: 12px`

**Styling:**
- Title: `fontSize: 18px`, `fontWeight: '700'`
- Button: Icon, `padding: 4px`

---

## Balance Display Patterns

### 1. Balance Flow Card

**Features:**
- Two-column split layout
- Color-coded sides (red/green)
- Net balance banner (conditional)
- Floating action button
- Icon indicators

**Layout:**
```
┌─────────────────────────┐
│ Net Balance Banner      │ (if non-zero)
├──────────┬──────────────┤
│ You Owe  │ You're Owed  │
│ (Red)    │ (Green)      │
│    [+ Button]           │ (floating)
└──────────┴──────────────┘
```

---

### 2. Summary Card

**Features:**
- Label + Amount rows
- Currency badge
- Net balance row with divider
- Color-coded amounts (green/red)

---

### 3. Balance Badge/Indicator

**Features:**
- Small circular or pill-shaped indicator
- Icon + text
- Color-coded (green for positive, red for negative)

**Styling:**
- `flexDirection: 'row'`
- `alignItems: 'center'`
- `gap: 4-8px`
- `paddingHorizontal: 8px`
- `paddingVertical: 4px`
- `borderRadius: 6px`
- Background: Light color matching semantic (green/red)

---

## List & Card Layouts

### 1. Expense Card

**Structure:**
- Header: Description + Amount + Chevron
- Creator: "Created by [name]"
- Receipt: Thumbnail (if available)
- Splits: Avatars + amounts + paid status

**Styling:**
- Card: Standard card styling
- Header: `flexDirection: 'row'`, `justifyContent: 'space-between'`
- Description: `fontSize: 16px`, `fontWeight: '700'`
- Amount: `fontSize: 16px`, `fontWeight: '700'`
- Creator: `fontSize: 13px`, `color: '#6B7280'`
- Splits: Avatar row, `gap: 8px`

---

### 2. Friend Card

**Structure:**
- Header: Name + Settle button + Chevron
- Avatar + Details
- Balance status
- Recent expenses preview
- Breakdown (collapsed)

**Styling:**
- Card: Standard card styling
- Header: `flexDirection: 'row'`, `justifyContent: 'space-between'`
- Avatar: `48px` or `40px`
- Balance: Icon + text, color-coded

---

### 3. Person Card (Balance)

**Structure:**
- Avatar + Name + Amount
- Settle Up button

**Styling:**
- `flexDirection: 'row'`
- `justifyContent: 'space-between'`
- `alignItems: 'center'`
- Avatar: `40px`
- Name: `fontSize: 15px`, `fontWeight: '600'`
- Amount: `fontSize: 16px`, `fontWeight: '700'`, color-coded

---

## Interactive Elements

### 1. Pull-to-Refresh

**Implementation:**
```typescript
<ScrollView
  refreshControl={
    <RefreshControl
      refreshing={refreshing}
      onRefresh={loadData}
      tintColor="#6366F1"
      colors={['#6366F1']}
    />
  }
>
```

---

### 2. Infinite Scroll

**Implementation:**
```typescript
<ScrollView
  onScroll={(e) => {
    const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;
    const paddingToBottom = 20;
    if (layoutMeasurement.height + contentOffset.y >= contentSize.height - paddingToBottom) {
      if (hasMore && !loadingMore) {
        loadMore();
      }
    }
  }}
  scrollEventThrottle={400}
>
```

---

### 3. Active Opacity

**Standard:** `activeOpacity={0.7}` for cards and buttons  
**High:** `activeOpacity={0.9}` for important actions  
**Low:** `activeOpacity={0.5}` for subtle interactions

---

## Reusable Components

### 1. Header Component

**Props:**
- `title`: String
- `onBack`: Function
- `rightContent`: ReactNode (optional)
- `rightAction`: ReactNode (optional)
- Navigation props (profile, notifications, settings)

**Usage:** Standard across all screens

---

### 2. Avatar Component

**Props:**
- `avatarUrl`: String (optional)
- `displayName`: String
- `size`: Number (default: 40)

**Features:**
- Falls back to initials
- Circular shape
- Consistent sizing

---

### 3. EmptyState Component

**Props:**
- `icon`: String
- `title`: String
- `message`: String
- `actionLabel`: String (optional)
- `onAction`: Function (optional)

---

### 4. ErrorState Component

**Props:**
- `message`: String
- `onRetry`: Function (optional)

---

### 5. SkeletonLoader Components

**Variants:**
- `SkeletonExpenseList`
- `SkeletonDetailScreen`
- `SkeletonCard`

---

### 6. Icon Component

**Props:**
- `name`: String (icon name)
- `size`: Number
- `color`: String

**Features:**
- Consistent icon library (MaterialIcons)
- Size and color props

---

## Best Practices

### 1. Spacing Consistency
- Use 16px as base spacing unit
- Maintain consistent padding/margins across similar elements
- Use gap property for flex layouts

### 2. Touch Targets
- Minimum 44px height for buttons
- Adequate padding for tappable areas
- Clear visual feedback (activeOpacity)

### 3. Color Usage
- Use semantic colors (green/red) for financial data
- Use primary color sparingly for key actions
- Maintain sufficient contrast

### 4. Typography Hierarchy
- Clear size differences between headings and body
- Use font weight to create hierarchy
- Consistent letter spacing for amounts

### 5. Loading States
- Show skeleton loaders instead of spinners when possible
- Provide context in loading messages
- Handle loading more gracefully

### 6. Error Handling
- Show user-friendly error messages
- Provide retry actions
- Don't block the entire UI for non-critical errors

### 7. Empty States
- Provide helpful guidance
- Include action buttons when appropriate
- Use appropriate icons

### 8. Accessibility
- Use `accessibilityLabel` for icon buttons
- Maintain proper touch target sizes
- Ensure color contrast ratios

---

## Common Patterns Summary

### Card Pattern
- White background
- 12-16px border radius
- 1px border (#E5E7EB)
- Subtle shadow
- 14-16px padding
- 12px bottom margin

### Button Pattern
- Primary: Indigo (#6366F1), white text, 12px vertical padding
- Secondary: Transparent, primary color text
- Minimum 44px height
- 12px border radius

### Icon Pattern
- 20-24px for buttons
- 14-16px inline
- Primary color or gray
- Circular containers when needed

### Typography Pattern
- Titles: 18-20px, bold (700)
- Body: 15-16px, regular (400-500)
- Captions: 12-13px
- Labels: 10-11px, uppercase, letter-spacing

### Spacing Pattern
- Base: 16px
- Small: 8-12px
- Large: 20-24px
- Consistent gaps in flex layouts

---

## Implementation Checklist

When implementing a new screen, ensure:

- [ ] Uses Header component
- [ ] Consistent card styling
- [ ] Proper loading states (skeleton preferred)
- [ ] Error handling with retry
- [ ] Empty states with helpful messages
- [ ] Pull-to-refresh where appropriate
- [ ] Proper spacing (16px base)
- [ ] Touch targets ≥44px
- [ ] Color-coded financial data
- [ ] Consistent typography
- [ ] Avatar component for users
- [ ] Search/filter if list is long
- [ ] Proper navigation patterns

---

## Notes

- All measurements are in pixels
- Colors use hex format
- Spacing follows 4px base system
- Typography uses system fonts
- Icons use MaterialIcons from Expo
- Components are in `apps/mobile/src/components/`
- Hooks are in `apps/mobile/src/hooks/`

---

**This document should be updated as new patterns emerge from other feature implementations.**

