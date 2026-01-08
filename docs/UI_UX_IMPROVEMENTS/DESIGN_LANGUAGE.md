# Dream Finora - Design Language & Visual Identity

## Vision Statement

**"A vibrant, trustworthy companion for the global nomad"**

Dream Finora should feel like a trusted travel buddy - modern, energetic, and culturally aware. Designed for travelers, international students, and Gen-Z users who value authenticity, transparency, and seamless experiences across borders.

---

## Design Character

### Core Personality Traits

1. **Adventurous & Global**
   - Inspired by travel, exploration, cultural exchange
   - Celebrates diversity and international connections
   - Visual language that feels borderless and inclusive

2. **Trustworthy & Transparent**
   - Clear, honest communication
   - No hidden fees or dark patterns
   - Trust score prominently displayed (not intimidating)

3. **Modern & Energetic**
   - Gen-Z friendly: bold, expressive, fun
   - Vibrant but professional
   - Smooth animations and micro-interactions

4. **Social & Connected**
   - Feels like a community, not just a tool
   - Encourages connections and friendships
   - Profile-first design (Instagram-inspired)

5. **Practical & Smart**
   - Multi-currency support (visual emphasis)
   - Context-aware (local vs home country)
   - AI-powered insights that feel helpful, not intrusive

---

## Color System

### Primary Palette

**Indigo (Primary Brand Color)**
- `#6366F1` (Indigo-500) - Header, Navigation, Primary Actions
- `#4F46E5` (Indigo-600) - Borders, Shadows, Depth
- `#818CF8` (Indigo-400) - Hover states, Accents
- `#312E81` (Indigo-800) - Dark mode variant (future)

**Why Indigo?**
- Modern, tech-forward feel
- Trustworthy and professional
- Distinctive (not blue, not purple)
- Works well for global audience (culturally neutral)

### Accent Colors

**Vibrant Accents (Gen-Z Appeal)**
- `#EC4899` (Pink-500) - Social features, highlights
- `#8B5CF6` (Purple-500) - Special features, premium
- `#06B6D4` (Cyan-500) - Travel/global features
- `#F59E0B` (Amber-500) - Warnings, attention

**Financial Colors (Clear & Trustworthy)**
- `#10B981` (Green-500) - Income, positive, success
- `#EF4444` (Red-500) - Expenses, negative, errors
- `#F59E0B` (Amber-500) - Warnings, pending
- `#6B7280` (Gray-500) - Neutral, secondary

### Trust Score Colors

- `#10B981` (Green) - Excellent (90-100)
- `#3B82F6` (Blue) - Good (70-89)
- `#F59E0B` (Amber) - Fair (50-69)
- `#EF4444` (Red) - Poor (0-49)

### Background & Surface

- `#FFFFFF` - Primary background
- `#F9FAFB` (Gray-50) - Secondary backgrounds
- `#F3F4F6` (Gray-100) - Subtle backgrounds
- `#FFFFFF` with shadow - Cards, elevated surfaces

### Text Colors

- `#111827` (Gray-900) - Primary text, headings
- `#374151` (Gray-700) - Secondary text
- `#6B7280` (Gray-500) - Tertiary text, placeholders
- `#FFFFFF` - Text on colored backgrounds

---

## Typography

### Font Family

**Primary:** System fonts for performance
- **iOS:** SF Pro Display / SF Pro Text
- **Android:** Roboto
- **Web:** Inter (Google Fonts) - Modern, friendly, international

**Fallback Stack:**
```
-apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', Roboto, 
'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 
'Helvetica Neue', sans-serif
```

### Type Scale

**Display (Hero Text)**
- `48px` / `Bold` / `Line-height: 1.1` - App name, hero titles
- `36px` / `Bold` / `Line-height: 1.2` - Major section titles

**Headings**
- `32px` / `Bold` / `Line-height: 1.2` - Page titles
- `24px` / `Semi-bold` / `Line-height: 1.3` - Section titles
- `20px` / `Semi-bold` / `Line-height: 1.4` - Card titles
- `18px` / `Medium` / `Line-height: 1.4` - Subsection titles

**Body Text**
- `16px` / `Regular` / `Line-height: 1.5` - Primary body (prevents iOS zoom)
- `14px` / `Regular` / `Line-height: 1.5` - Secondary body
- `12px` / `Regular` / `Line-height: 1.4` - Small text, captions

**Special**
- `28-32px` / `Semi-bold` - Money amounts (context-dependent)
- `48px` / `Bold` - Trust score display
- `12px` / `Medium` / `Uppercase` / `Letter-spacing: 0.5px` - Labels

### Typography Personality

- **Friendly but Professional:** Clear, readable, approachable
- **Modern:** Slightly rounded, not harsh
- **International:** Supports multiple languages gracefully
- **Hierarchical:** Clear visual hierarchy guides attention

---

## Spacing System

**Base Unit:** 4px (all spacing multiples of 4)

**Scale:**
```
xs:  4px   - Tight spacing (icon padding)
sm:  8px   - Small gaps (between related items)
md:  16px  - Medium spacing (card padding, gaps)
lg:  24px  - Large spacing (section spacing, screen padding)
xl:  32px  - Extra large (major sections)
2xl: 48px  - Hero spacing
3xl: 64px  - Maximum spacing
```

**Usage Guidelines:**
- **Screen Padding:** `lg` (24px) horizontal, `md` (16px) vertical
- **Card Padding:** `md` (16px) all sides
- **Section Gaps:** `lg` (24px) vertical, `md` (16px) horizontal
- **Element Gaps:** `sm` (8px) for related items, `md` (16px) for separate items
- **Touch Targets:** Minimum `44px` height/width

---

## Component Design Language

### Avatar Component

**Standardized User Profile Pictures**

The `Avatar` component provides consistent, reliable avatar rendering across the entire application, inspired by Facebook and Instagram patterns.

**Location:** `apps/mobile/src/components/Avatar.tsx`

**Usage:**
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
  avatarUrl={friend?.friend?.profile?.avatarUrl}
  displayName={getUserDisplayName(friend)}
  size={32}
  borderColor={isSelected ? '#FFFFFF' : 'transparent'}
  borderWidth={isSelected ? 2 : 0}
/>
```

**Features:**
- **Automatic URL Processing**: Handles relative and absolute URLs via `getAvatarUrl` utility
- **Graceful Fallback**: Shows colored initials circle when image unavailable or fails to load
- **Consistent Colors**: Same user always gets the same background color (hash-based)
- **Error Handling**: Automatically falls back to initials on image load failure
- **Configurable**: Size, borders, and custom styles supported

**Standard Sizes:**
- `32px` - Small (chips, participant picker)
- `48px` - Default (lists, cards)
- `64px` - Large (profile screens, headers)

**Color Palette for Initials:**
- Indigo (`#6366F1`)
- Purple (`#8B5CF6`)
- Pink (`#EC4899`)
- Amber (`#F59E0B`)
- Green (`#10B981`)
- Blue (`#3B82F6`)
- Red (`#EF4444`)
- Teal (`#14B8A6`)

**Best Practices:**
1. Always use the Avatar component - don't create custom avatar rendering
2. Always provide a displayName fallback (email if displayName missing)
3. Use standard sizes for consistency
4. Component handles null/undefined gracefully
5. Don't duplicate URL processing - component handles it internally

**See:** `docs/AVATAR_RENDERING_PATTERN.md` for complete documentation

### Buttons

**Primary Button (Main Actions)**
- Background: `#6366F1` (Indigo-500)
- Text: `#FFFFFF` (White)
- Padding: `12px 24px`
- Border-radius: `12px` (more rounded, friendly)
- Font: `16px` / `Semi-bold`
- Height: `48px` (generous touch target)
- Shadow: Subtle elevation (3D effect)
- Hover/Press: Scale to `0.98`, darker shade

**Secondary Button**
- Background: Transparent
- Border: `2px solid #6366F1`
- Text: `#6366F1`
- Same padding/radius as primary
- Hover: Fill with indigo background

**Social Sign-In Buttons (Google/Apple)**
- Background: `#FFFFFF` with border
- Border: `1px solid #E5E7EB`
- Icon: Left-aligned (Google/Apple logo)
- Text: `#111827` (Dark)
- Height: `52px` (slightly taller for prominence)
- Border-radius: `12px`
- Shadow: Subtle on press

**Text Button**
- No background
- Text: `#6366F1`
- Underline on press (web)
- Used for secondary actions

**Danger Button**
- Background: `#EF4444` (Red-500)
- Text: `#FFFFFF`
- Same styling as primary
- Used for destructive actions

**Disabled State**
- Opacity: `0.5`
- Not clickable
- Visual feedback that action is unavailable

### Input Fields

**Standard Input**
- Background: `#F9FAFB` (Gray-50)
- Border: `2px solid #E5E7EB` (Gray-200)
- Border-radius: `12px` (rounded, friendly)
- Padding: `14px 16px`
- Font: `16px` (prevents iOS zoom)
- Color: `#111827` (Dark)
- Height: `52px` (generous, easy to tap)

**Focused State**
- Border: `2px solid #6366F1` (Indigo)
- Background: `#FFFFFF` (White)
- Shadow: Subtle glow effect
- Transition: Smooth 200ms

**Error State**
- Border: `2px solid #EF4444` (Red)
- Background: `#FEF2F2` (Red-50)
- Error message below: `12px` / `#EF4444`
- Icon: Red warning icon (optional)

**Placeholder**
- Color: `#9CA3AF` (Gray-400)
- Style: Italic (subtle)

**Label**
- Font: `14px` / `Medium`
- Color: `#374151` (Gray-700)
- Margin-bottom: `8px` (sm)

### Cards

**Standard Card**
- Background: `#FFFFFF`
- Border-radius: `16px` (rounded, modern)
- Padding: `20px` (md + 4px for breathing room)
- Shadow: 
  - iOS: `shadowColor: #000, shadowOffset: {0, 2}, shadowOpacity: 0.1, shadowRadius: 8`
  - Android: `elevation: 4`
- Border: `1px solid #F3F4F6` (subtle, optional)

**Elevated Card (Modals, Important)**
- Same as standard
- Shadow: Stronger (elevation: 8)
- Used for modals, important content

**Interactive Card (Tappable)**
- Same as standard
- Hover/Press: Scale to `0.98`, slight shadow increase
- Visual feedback on interaction

### Trust Score Display

**Large (Profile)**
- Size: `120px x 120px` (circular or rounded square)
- Background: Gradient based on score
- Score: `48px` / `Bold` / `#FFFFFF`
- Label: `12px` / `#FFFFFF` / `70% opacity`
- Shadow: Prominent (elevation: 8)

**Medium (Cards)**
- Size: `64px x 64px`
- Score: `32px` / `Bold`
- Color-coded background

**Small (Lists)**
- Badge style: `32px x 32px`
- Score: `14px` / `Bold`
- Rounded corners

### Money/Amount Display

**Large Amount**
- Font: `32px` / `Semi-bold`
- Color: Green (positive) or Red (negative)
- Format: `$1,234.56` (currency symbol, commas, 2 decimals)
- Currency indicator: Small badge or flag icon

**Medium Amount**
- Font: `20px` / `Semi-bold`
- Same formatting rules

**Small Amount**
- Font: `16px` / `Medium`
- Color: `#374151` (Gray-700) for secondary amounts

---

## Layout Principles

### Screen Structure

**Standard Screen Layout:**
```
┌─────────────────────────────────┐
│  Header (Indigo, Fixed)         │  ← 80px height
├─────────────────────────────────┤
│                                 │
│  Content Area (Scrollable)      │
│  - Padding: 24px horizontal     │
│  - Padding: 16px vertical       │
│                                 │
│  ┌───────────────────────────┐ │
│  │ Card / Section            │ │
│  │ Padding: 20px             │ │
│  └───────────────────────────┘ │
│                                 │
└─────────────────────────────────┘
│  Bottom Navigation (Indigo)      │  ← Floating island
└─────────────────────────────────┘
```

### Header Integration

**Fixed Header (Most Screens)**
- Always visible at top
- Indigo background (`#6366F1`)
- Profile avatar (left), Notifications & Settings (right)
- Content scrolls beneath
- Height: `80px` (includes safe area)

**Collapsible Header (SpaceV Only)**
- Hides on scroll down
- Shows on scroll up
- Better for feed-like browsing

### Bottom Navigation

**Floating Island Design**
- Position: Absolutely positioned at bottom
- Background: `#6366F1` (Indigo-500)
- Border-radius: `24px` (rounded, floating)
- Padding: `16px` horizontal, `8px` vertical
- Shadow: Prominent (elevation: 12)
- Height: `64px` + safe area

**Navigation Items:**
- Home, Billchop, SpaceV (center), Chores, Rides
- Active: White icon + label with subtle background
- Inactive: 70% opacity white
- Icon size: `24px`
- Label: `10px` / `Medium`

### Content Alignment

**Screen Padding:**
- Horizontal: `24px` (lg)
- Vertical: `16px` (md) - first section
- Between sections: `24px` (lg)

**Card Spacing:**
- Between cards: `16px` (md)
- Card padding: `20px` (md + 4px)

**Form Spacing:**
- Between fields: `20px` (md + 4px)
- Label to input: `8px` (sm)
- Input height: `52px` (generous)

---

## Visual Effects & Depth

### Shadows & Elevation

**Level 1 (Subtle)**
- iOS: `shadowOpacity: 0.1, shadowRadius: 4`
- Android: `elevation: 2`
- Used for: Cards, inputs

**Level 2 (Medium)**
- iOS: `shadowOpacity: 0.15, shadowRadius: 8`
- Android: `elevation: 4`
- Used for: Elevated cards, modals

**Level 3 (Prominent)**
- iOS: `shadowOpacity: 0.2, shadowRadius: 12`
- Android: `elevation: 8`
- Used for: Header, bottom navigation

**Level 4 (Maximum)**
- iOS: `shadowOpacity: 0.3, shadowRadius: 16`
- Android: `elevation: 12`
- Used for: Bottom navigation, important modals

### Border Radius

- **Small:** `8px` - Buttons, small elements
- **Medium:** `12px` - Inputs, standard buttons
- **Large:** `16px` - Cards, containers
- **Extra Large:** `24px` - Bottom navigation, large containers
- **Circular:** `50%` - Avatars, badges

### 3D Effects

**Glass Morphism (Subtle)**
- Background: `rgba(255, 255, 255, 0.15)`
- Backdrop blur: Subtle (where supported)
- Used for: Header icon buttons, overlays

**Gradients (Selective Use)**
- Trust score backgrounds
- Hero sections (future)
- Subtle, not overwhelming

---

## Animation & Motion

### Principles

1. **Purposeful:** Every animation has a reason
2. **Smooth:** 60fps, no jank
3. **Fast:** Keep under 300ms for most interactions
4. **Natural:** Use easing functions (ease-in-out)

### Common Animations

**Page Transitions**
- Duration: `250ms`
- Easing: `ease-in-out`
- Type: Fade + slight scale

**Button Press**
- Scale: `0.98`
- Duration: `100ms`
- Easing: `ease-out`

**Card Tap**
- Scale: `0.98`
- Duration: `150ms`
- Shadow increase

**Loading**
- Skeleton pulse: `1.5s` loop
- Spinner: `1s` rotation loop

**Success Feedback**
- Checkmark draw: `300ms`
- Scale bounce: `200ms`

**Error Shake**
- Horizontal shake: `100ms` x 3
- Red border flash

---

## Iconography

### Icon Style

- **Style:** Outlined, modern, friendly
- **Library:** Material Icons (primary), Custom icons for features
- **Size Scale:**
  - Small: `16px` - Inline with text
  - Medium: `24px` - Buttons, navigation
  - Large: `32px` - Feature icons
  - Extra Large: `48px` - Hero icons

### Icon Usage

- **Consistent:** Same icon for same action across app
- **Meaningful:** Icons should be intuitive
- **Accessible:** Always have text labels or aria-labels
- **Color:** Inherit text color or use brand color

---

## Empty States

### Design Pattern

**Visual:**
- Large icon or illustration (80-120px)
- Friendly, encouraging tone
- Clear call-to-action

**Layout:**
```
┌─────────────────────────┐
│                         │
│      [Icon/Illustration] │  ← 80-120px
│                         │
│   No [items] yet        │  ← 24px / Bold
│                         │
│   [Helpful message]     │  ← 16px / Regular
│   explaining what to do │
│                         │
│   [➕ Action Button]    │  ← Primary button
│                         │
└─────────────────────────┘
```

**Tone:**
- Friendly, not intimidating
- Helpful, not condescending
- Encouraging action

---

## Loading States

### Skeleton Screens (Preferred)

**Pattern:**
- Show content structure
- Animated shimmer effect
- Placeholder shapes match final content

**Example:**
```
┌─────────────────────────┐
│  [Shimmer Card]         │
│  [Shimmer Card]         │
│  [Shimmer Card]         │
└─────────────────────────┘
```

### Spinners (Fallback)

- Use when skeleton not feasible
- Centered, not blocking
- Clear what's loading

---

## Error States

### Design Pattern

**Visual:**
- Red border/background (subtle)
- Error icon (optional)
- Clear error message
- Suggested solution
- Retry button (if applicable)

**Tone:**
- Helpful, not blaming
- Clear, not technical
- Actionable

**Example:**
```
┌─────────────────────────┐
│  ⚠️ Connection Error     │
│                         │
│  We couldn't load your  │
│  expenses. Check your   │
│  connection and try     │
│  again.                 │
│                         │
│  [Retry Button]         │
└─────────────────────────┘
```

---

## Accessibility

### Color Contrast

- **Normal Text:** Minimum 4.5:1 ratio
- **Large Text:** Minimum 3:1 ratio
- **Interactive Elements:** Minimum 3:1 ratio
- **Don't rely on color alone** - Use icons, labels, patterns

### Touch Targets

- **Minimum:** `44px x 44px`
- **Recommended:** `48px x 48px` (generous)
- **Spacing:** Adequate gap between targets

### Text Sizing

- **Minimum:** `16px` for body text (prevents iOS zoom)
- **Support system font scaling**
- **Test with large text sizes**

### Screen Readers

- Proper semantic components
- Alt text for images
- ARIA labels where needed
- Focus indicators visible

---

## Responsive Design

### Breakpoints (Web)

```
Mobile:    < 640px
Tablet:    640px - 1024px
Desktop:   > 1024px
Large:     > 1440px
```

### Mobile-First Approach

- Design for mobile first
- Progressive enhancement for larger screens
- Touch-friendly by default

---

## Cultural Considerations

### International Audience

- **Currency Display:** Always show currency symbol/flag
- **Date Format:** Support multiple formats (user preference)
- **Language:** Prepare for i18n (future)
- **Colors:** Culturally neutral palette
- **Icons:** Universal, not culture-specific

### Traveler-Friendly

- **Multi-currency:** Prominent currency indicators
- **Context Switching:** Clear local vs home country
- **Time Zones:** Display relative times
- **Maps/Location:** Support location features

---

## Gen-Z Appeal

### Visual Elements

- **Bold Colors:** Vibrant accents (pink, purple, cyan)
- **Rounded Corners:** Friendly, approachable
- **Smooth Animations:** Modern, polished
- **Gradient Accents:** Subtle gradients for depth

### Interaction Patterns

- **Swipe Gestures:** Natural, intuitive
- **Haptic Feedback:** Subtle vibrations (where supported)
- **Quick Actions:** Shortcuts, quick access
- **Social Features:** Profile-first, connection-focused

### Content Tone

- **Friendly:** "Hey!" not "Hello"
- **Casual:** "Chop a bill" not "Create expense"
- **Encouraging:** "You're doing great!" not "Status: Good"
- **Transparent:** Clear, honest communication

---

## Design Tokens

### Implementation

Create shared design tokens file:
```typescript
// packages/shared/src/design-tokens.ts

export const colors = {
  // Primary
  indigo: {
    50: '#EEF2FF',
    400: '#818CF8',
    500: '#6366F1', // Primary
    600: '#4F46E5', // Darker
    800: '#312E81',
  },
  // Accents
  pink: '#EC4899',
  purple: '#8B5CF6',
  cyan: '#06B6D4',
  // Financial
  green: '#10B981',
  red: '#EF4444',
  amber: '#F59E0B',
  // Grays
  gray: {
    50: '#F9FAFB',
    100: '#F3F4F6',
    200: '#E5E7EB',
    400: '#9CA3AF',
    500: '#6B7280',
    700: '#374151',
    900: '#111827',
  },
  white: '#FFFFFF',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  '2xl': 48,
  '3xl': 64,
};

export const typography = {
  display: { fontSize: 48, fontWeight: 'bold', lineHeight: 1.1 },
  h1: { fontSize: 32, fontWeight: 'bold', lineHeight: 1.2 },
  h2: { fontSize: 24, fontWeight: '600', lineHeight: 1.3 },
  h3: { fontSize: 20, fontWeight: '600', lineHeight: 1.4 },
  body: { fontSize: 16, fontWeight: '400', lineHeight: 1.5 },
  small: { fontSize: 12, fontWeight: '400', lineHeight: 1.4 },
};

export const borderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};

export const shadows = {
  sm: {
    ios: { shadowOpacity: 0.1, shadowRadius: 4 },
    android: { elevation: 2 },
  },
  md: {
    ios: { shadowOpacity: 0.15, shadowRadius: 8 },
    android: { elevation: 4 },
  },
  lg: {
    ios: { shadowOpacity: 0.2, shadowRadius: 12 },
    android: { elevation: 8 },
  },
  xl: {
    ios: { shadowOpacity: 0.3, shadowRadius: 16 },
    android: { elevation: 12 },
  },
};
```

---

## Implementation Checklist

When building/updating screens:

- [ ] Uses indigo (`#6366F1`) for primary actions
- [ ] Follows spacing system (4px base unit)
- [ ] Uses correct typography scale
- [ ] Has proper touch targets (44px minimum)
- [ ] Includes empty states
- [ ] Includes loading states (skeleton preferred)
- [ ] Includes error states
- [ ] Accessible (contrast, labels, targets)
- [ ] Responsive (mobile-first)
- [ ] Smooth animations (60fps)
- [ ] Consistent with header/navigation
- [ ] Gen-Z friendly (friendly tone, modern visuals)

---

**This design language evolves with the app. Start with these guidelines and refine based on user feedback and testing!**

*Last Updated: January 2025*

