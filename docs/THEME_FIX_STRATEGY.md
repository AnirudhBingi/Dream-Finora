# Theme Fix Strategy - Dark/Light Mode Support

## Problem
329 instances across 64 files are using hardcoded `gray50`, `gray100`, and `white` colors that don't adapt to dark mode.

## Color Inversion Issue
In the theme system:
- **Light Mode**: `gray50` = `#F9FAFB` (almost white), `white` = `#FFFFFF`
- **Dark Mode**: `gray50` = `#0B1020` (very dark), `white` = `#FFFFFF`

This causes cards to appear dark on dark backgrounds in dark mode.

## Solution: Use Semantic Colors

### For Screen Backgrounds
- ❌ `theme.colors.gray50`
- ✅ `theme.colors.backgroundSecondary`

### For Card/Surface Backgrounds  
- ❌ `theme.colors.white`
- ❌ `theme.colors.gray100`
- ✅ `theme.colors.background`

### For Elevated/Secondary Surfaces
- ❌ `theme.colors.gray100`
- ✅ `theme.colors.backgroundTertiary`

### For Borders
- ❌ Hardcoded light grays
- ✅ `theme.colors.border` or `theme.colors.borderLight`

## Semantic Color Definitions

### Light Mode
- `backgroundSecondary`: `#F3F4F6` (light gray, screen background)
- `background`: `#FFFFFF` (white, cards/surfaces)
- `backgroundTertiary`: `#F9FAFB` (lighter, elevated surfaces)

### Dark Mode  
- `backgroundSecondary`: `#0B1020` (darkest, screen background)
- `background`: `#111827` (dark, cards/surfaces - slightly lighter than screen)
- `backgroundTertiary`: `#1F2937` (medium dark, elevated surfaces)

## Fix Priority

### Critical (User Screenshots)
1. ✅ GroupDetailScreen (Circle Detail) - 23 instances
2. ✅ ChoreStatsScreen - 3 instances
3. ✅ BillchopFriendsScreen - 6 instances

### High Priority (Common Screens)
4. HomeScreen - 2 instances
5. ExpenseDetailScreen - 7 instances
6. ChoreDetailScreen - 12 instances
7. ProfileScreen - 5 instances

### Medium Priority (Feature Screens)
- All Create*/Edit* screens
- Analytics screens
- Settings screens

## Implementation Plan
1. Create automated replacement script for common patterns
2. Manually review screens with complex styling
3. Test each screen in both light and dark modes
4. Update design system documentation

## Files Affected: 64 screens total
