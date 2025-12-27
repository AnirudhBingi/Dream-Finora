# UI/UX Design Guide - Dream Finora

## Design Philosophy

**"Clean, Trustworthy, Social"**

Dream Finora should feel like a reliable friend helping you manage your shared life - professional enough for finances, friendly enough for social connections, and transparent enough to build trust.

---

## Core Design Principles

### 1. **Trust Through Transparency**
- Clear, visible trust scores (not hidden or intimidating)
- Transparent financial data presentation
- Honest, upfront information
- No dark patterns or misleading UI

### 2. **Simplicity Over Complexity**
- One primary action per screen
- Clear navigation hierarchy
- Familiar patterns (users shouldn't be lost)
- Progressive disclosure (show details when needed)

### 3. **Social But Private**
- Social features feel connected
- Personal finance completely private
- Clear visual distinction between public/private sections
- User controls what's visible

### 4. **Financial Clarity**
- Money amounts are prominent and clear
- Color coding: Green (income/savings), Red (expenses/debts)
- Easy-to-read numbers with proper formatting
- Visual hierarchy guides attention to important info

### 5. **Consistent Experience**
- Same design language across mobile and web
- Predictable patterns and interactions
- Familiar components reused throughout
- Consistent spacing, colors, typography

---

## Color Palette

### Primary Colors

```
Primary Blue (Trust, Stability):
#2563EB (Blue-600)
- Primary buttons
- Links
- Active states
- Brand elements

Primary Blue Dark:
#1E40AF (Blue-800)
- Hover states
- Pressed states
- Darker variants

Primary Blue Light:
#3B82F6 (Blue-500)
- Secondary buttons
- Accents
```

### Financial Colors

```
Success Green (Income, Positive):
#10B981 (Green-500)
- Income amounts
- Positive balances
- Completed tasks
- Success states

Danger Red (Expenses, Negative):
#EF4444 (Red-500)
- Expense amounts
- Negative balances
- Warnings
- Error states

Warning Orange (Attention):
#F59E0B (Amber-500)
- Pending actions
- Unsettled expenses
- Incomplete chores

Neutral Gray (Backgrounds, Text):
#F9FAFB (Gray-50) - Light backgrounds
#F3F4F6 (Gray-100) - Subtle backgrounds
#6B7280 (Gray-500) - Secondary text
#374151 (Gray-700) - Primary text
#111827 (Gray-900) - Headings, dark text
```

### Trust Score Colors

```
Excellent (90-100): #10B981 (Green)
Good (70-89): #3B82F6 (Blue)
Fair (50-69): #F59E0B (Amber)
Poor (0-49): #EF4444 (Red)
```

### Background & Surface Colors

```
White: #FFFFFF - Primary background
Off-White: #F9FAFB - Secondary backgrounds
Card Background: #FFFFFF with subtle shadow
Overlay: rgba(0, 0, 0, 0.5) - Modals, bottom sheets
```

---

## Typography

### Font Family

**Primary:** System fonts for performance and familiarity
- **iOS:** SF Pro Display / SF Pro Text
- **Android:** Roboto
- **Web:** Inter (Google Fonts) or system sans-serif

**Fallback Stack:**
```
-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 
'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 
'Helvetica Neue', sans-serif
```

### Type Scale

**Headings:**
```
H1 (Page Titles): 32px, Bold, Line-height: 1.2
H2 (Section Titles): 24px, Semi-bold, Line-height: 1.3
H3 (Card Titles): 20px, Semi-bold, Line-height: 1.4
H4 (Subsection): 18px, Medium, Line-height: 1.4
```

**Body Text:**
```
Large Body: 16px, Regular, Line-height: 1.5
Body: 14px, Regular, Line-height: 1.5
Small: 12px, Regular, Line-height: 1.4
```

**Special:**
```
Money/Amounts: 20-32px, Semi-bold (depends on context)
Labels: 12px, Medium, Uppercase, Letter-spacing: 0.5px
Trust Score: 48px, Bold (prominent display)
```

---

## Spacing System

**Base Unit:** 4px

**Scale:**
```
xs: 4px
sm: 8px
md: 16px
lg: 24px
xl: 32px
2xl: 48px
3xl: 64px
```

**Usage:**
- Padding: md (16px) for cards, lg (24px) for screens
- Gaps: sm (8px) between related items, md (16px) between sections
- Margins: lg (24px) for vertical spacing, md (16px) for horizontal

---

## Component Library

### Buttons

**Primary Button:**
- Background: Primary Blue (#2563EB)
- Text: White
- Padding: 12px 24px
- Border-radius: 8px
- Font: 16px, Medium
- Height: 44px (touch target)

**Secondary Button:**
- Background: Transparent
- Border: 1px solid Primary Blue
- Text: Primary Blue
- Same padding/radius as primary

**Text Button:**
- No background
- Text: Primary Blue
- Underline on hover (web)

**Danger Button:**
- Background: Red (#EF4444)
- Text: White
- Use for destructive actions

**Disabled State:**
- Opacity: 0.5
- Not clickable

### Cards

**Standard Card:**
- Background: White
- Border-radius: 12px
- Shadow: 0 1px 3px rgba(0,0,0,0.1)
- Padding: 16px
- Margin: 8px 0

**Elevated Card:**
- Same as standard + shadow: 0 4px 6px rgba(0,0,0,0.1)
- Use for modals, important content

### Forms

**Input Field:**
- Border: 1px solid Gray-300 (#D1D5DB)
- Border-radius: 8px
- Padding: 12px 16px
- Font: 16px (prevents zoom on iOS)
- Focus: Border becomes Primary Blue, 2px width

**Label:**
- Font: 12px, Medium
- Color: Gray-700
- Margin-bottom: 4px

**Error State:**
- Border: Red (#EF4444)
- Error message below input: 12px, Red
- Icon indicator (optional)

### Trust Score Display

**Large Display (Profile):**
- Circular or rounded square
- Size: 120px x 120px
- Background: Gradient based on score
- Score: 48px, Bold, White
- Label: "Trust Score", 12px, White, Semi-transparent

**Medium Display (Cards):**
- Size: 64px x 64px
- Score: 32px, Bold
- Color-coded background

**Small Display (Lists):**
- Badge style: 32px x 32px
- Score: 14px, Bold

### Money/Amount Display

**Large Amount:**
- Font: 32px, Semi-bold
- Color: Green (positive) or Red (negative)
- Format: $1,234.56 (with currency symbol, commas, 2 decimals)

**Medium Amount:**
- Font: 20px, Semi-bold
- Same formatting rules

**Small Amount:**
- Font: 16px, Medium
- Color: Gray-700 (for secondary amounts)

---

## Screen Layouts & User Flows

### Mobile App Structure

**Bottom Tab Navigation (5 tabs):**
1. **Home** - Dashboard, quick actions, recent activity
2. **Expenses** - Expense splitting, groups, balances
3. **Finance** - Personal finance (private section)
4. **Listings** - Browse/create listings
5. **Profile** - User profile, settings, friends

### Key Screens

#### 1. Home Screen
```
┌─────────────────────────┐
│  [Profile]  Dream Finora│
│                         │
│  👋 Hello, [Name]       │
│                         │
│  ┌───────────────────┐  │
│  │  Trust Score      │  │
│  │  ⭐⭐⭐⭐⭐ 95    │  │
│  └───────────────────┘  │
│                         │
│  Quick Actions:         │
│  [➕ Add Expense]       │
│  [🏠 Create Group]      │
│  [📋 New Chore]         │
│                         │
│  Recent Activity:       │
│  • Expense added        │
│  • Chore completed      │
│  • New message          │
│                         │
│  Your Balances:         │
│  You owe: $45.50        │
│  Owed to you: $120.00   │
└─────────────────────────┘
```

#### 2. Expense Screen
```
┌─────────────────────────┐
│  Expenses      [➕ New] │
│                         │
│  Tabs: [All] [Groups]   │
│                         │
│  ┌───────────────────┐  │
│  │ Total Balance     │  │
│  │ Net: +$74.50      │  │
│  └───────────────────┘  │
│                         │
│  Groups:                │
│  ┌───────────────────┐  │
│  │ 🏠 Roommates      │  │
│  │ 3 members • $120  │  │
│  │ [View Details →]  │  │
│  └───────────────────┘  │
│                         │
│  Recent Expenses:       │
│  ┌───────────────────┐  │
│  │ 🍕 Pizza          │  │
│  │ $45.50 • Split 3  │  │
│  │ 2 hours ago       │  │
│  └───────────────────┘  │
└─────────────────────────┘
```

#### 3. Create Expense Flow
```
Step 1: Basic Info
┌─────────────────────────┐
│  New Expense     [Cancel]│
│                         │
│  Amount:                │
│  [$______]              │
│                         │
│  Description:           │
│  [_________________]    │
│                         │
│  Date: [Today ▼]       │
│                         │
│         [Next →]        │
└─────────────────────────┘

Step 2: Split
┌─────────────────────────┐
│  Split Expense          │
│                         │
│  Split by:              │
│  ○ Equal               │
│  ● Custom              │
│                         │
│  Participants:          │
│  ☑ You - $15.17        │
│  ☑ John - $15.17       │
│  ☑ Sarah - $15.16      │
│  ☐ [Add Person]        │
│                         │
│         [Create]        │
└─────────────────────────┘
```

#### 4. Profile Screen
```
┌─────────────────────────┐
│  [Settings]  Profile    │
│                         │
│  ┌───────────────────┐  │
│  │  [Avatar]         │  │
│  │  John Doe         │  │
│  │  @johndoe         │  │
│  │  ✅ Verified      │  │
│  └───────────────────┘  │
│                         │
│  ┌───────────────────┐  │
│  │  Trust Score      │  │
│  │  ⭐⭐⭐⭐⭐ 95    │  │
│  │  Breakdown →      │  │
│  └───────────────────┘  │
│                         │
│  Stats:                 │
│  • 12 Friends           │
│  • 45 Expenses          │
│  • 28 Chores Completed  │
│                         │
│  [Edit Profile]         │
│  [View Friends]         │
│  [Settings]             │
└─────────────────────────┘
```

#### 5. Personal Finance Screen (Private)
```
┌─────────────────────────┐
│  Finance      [➕ Add]  │
│                         │
│  ┌───────────────────┐  │
│  │  Total Balance    │  │
│  │  $2,450.00        │  │
│  │  ↑ $150 this month│  │
│  └───────────────────┘  │
│                         │
│  This Month:            │
│  Income:    $2,500      │
│  Expenses:  $2,350      │
│                         │
│  Budgets:               │
│  🍕 Food: $300 / $400   │
│  [████████░░] 75%       │
│                         │
│  Recent Transactions:   │
│  • Groceries - $45.50   │
│  • Salary + $2,500      │
└─────────────────────────┘
```

### Web Layout

**Header Navigation:**
- Logo (left)
- Main nav: Home, Expenses, Finance, Listings
- Profile dropdown (right)

**Layout:**
- Sidebar (optional) for navigation
- Main content area (max-width: 1200px, centered)
- Responsive: Collapses to mobile layout on small screens

---

## Design Inspiration (What We Learn From)

### Good Patterns to Adopt:

**From Instagram:**
- ✅ Clean profile layout
- ✅ Inbox-style messaging
- ✅ Simple navigation
- ✅ Image-first design

**From Splitwise:**
- ✅ Clear balance displays
- ✅ Simple expense creation flow
- ✅ Group management clarity
- ❌ Avoid: Complex nested menus

**From Venmo:**
- ✅ Social feed feel (optional)
- ✅ Quick transactions
- ✅ Clear friend connections
- ❌ Avoid: Over-socialization

**From Rocket Money:**
- ✅ Clear financial overview
- ✅ Visual charts
- ✅ Category breakdown
- ✅ Progress indicators

### What Makes Us Unique:

1. **Trust Score Prominence**
   - Always visible (not buried in settings)
   - Color-coded for quick recognition
   - Breakdown available on tap/click

2. **Integrated Experience**
   - Rideshare automatically creates expense
   - Chores affect trust score visibly
   - Everything connects seamlessly

3. **Privacy-First Finance**
   - Clear visual separation (different color scheme?)
   - Lock icon on private sections
   - No social features in finance section

4. **Social But Financial**
   - Profiles show financial reliability
   - But personal finance stays private
   - Balance between trust and privacy

---

## Interaction Patterns

### Navigation

**Mobile:**
- Bottom tab bar (always visible)
- Swipe gestures for navigation (optional)
- Back button (native)

**Web:**
- Top navigation bar
- Breadcrumbs for deep pages
- Sidebar for secondary navigation

### Empty States

**Design Pattern:**
- Friendly illustration or icon
- Clear message explaining what's empty
- Call-to-action button
- Helpful hint text

**Example:**
```
┌─────────────────────────┐
│                         │
│         📊              │
│                         │
│   No expenses yet       │
│                         │
│   Start by adding your  │
│   first expense!        │
│                         │
│   [➕ Add Expense]      │
│                         │
└─────────────────────────┘
```

### Loading States

**Pattern:**
- Skeleton screens (preferred) over spinners
- Show content structure while loading
- Subtle animation
- Progress indicators for long operations

### Error States

**Pattern:**
- Clear error message
- Suggest solution
- Retry button
- Help/support link

### Success States

**Pattern:**
- Brief success message/toast
- Visual confirmation (checkmark animation)
- Auto-dismiss after 2-3 seconds
- Undo option if applicable

---

## Accessibility

### Color Contrast
- Minimum 4.5:1 for normal text
- Minimum 3:1 for large text
- Don't rely on color alone (use icons/labels)

### Touch Targets
- Minimum 44px x 44px on mobile
- Adequate spacing between interactive elements

### Text Sizing
- Support system font scaling
- Minimum 16px font for body text (prevents zoom on iOS)
- Provide text size controls (web)

### Screen Readers
- Proper semantic HTML/React Native components
- Alt text for images
- ARIA labels where needed
- Focus indicators visible

### Keyboard Navigation (Web)
- All interactive elements keyboard accessible
- Logical tab order
- Skip links for main content

---

## Responsive Design

### Breakpoints (Web)

```
Mobile: < 640px
Tablet: 640px - 1024px
Desktop: > 1024px
Large Desktop: > 1440px
```

### Mobile-First Approach
- Design for mobile first
- Progressive enhancement for larger screens
- Touch-friendly by default

---

## Animation & Transitions

### Principles
- **Subtle:** Enhance, don't distract
- **Purposeful:** Guide attention or provide feedback
- **Fast:** Keep animations under 300ms
- **Smooth:** Use easing functions

### Common Animations

**Page Transitions:**
- Slide in from right (mobile)
- Fade in (web)

**Button Press:**
- Slight scale down (0.98)
- Return to normal

**Loading:**
- Skeleton pulse animation
- Spinner rotation (smooth)

**Success:**
- Checkmark draw animation
- Brief scale bounce

---

## Brand Identity

### Logo Concept
- Modern, clean
- Incorporates trust/reliability theme
- Works at small sizes
- Monochrome version available

### Voice & Tone

**Writing Style:**
- Friendly but professional
- Clear and concise
- Helpful and encouraging
- Transparent and honest

**Example Copy:**
- ❌ "Error: Invalid input"
- ✅ "Please enter a valid email address"

- ❌ "Transaction failed"
- ✅ "We couldn't process that. Please check your connection and try again."

---

## Implementation Guidelines

### Component Library

**Mobile (React Native):**
- Use React Native Paper or NativeBase
- Customize to match design system
- Build reusable components

**Web (Next.js):**
- Use shadcn/ui or Radix UI
- Tailwind CSS for styling
- Match mobile design language

### Design Tokens

Create a shared design tokens file:
```typescript
// packages/shared/src/design-tokens.ts
export const colors = {
  primary: '#2563EB',
  success: '#10B981',
  // ... etc
}

export const spacing = {
  xs: 4,
  sm: 8,
  // ... etc
}

export const typography = {
  h1: { fontSize: 32, fontWeight: 'bold' },
  // ... etc
}
```

### Design Tools

**For Mockups (Optional):**
- Figma (free for individuals)
- Or sketch on paper first, build directly

**For Icons:**
- Heroicons (free, MIT license)
- React Native Vector Icons

**For Illustrations:**
- Custom simple illustrations
- Or use icon-based empty states

---

## User Testing Checklist

Before launch, test:
- [ ] Can users find expense creation?
- [ ] Is trust score clear and understandable?
- [ ] Is personal finance clearly private?
- [ ] Can users navigate without confusion?
- [ ] Are all touch targets adequate?
- [ ] Do colors have sufficient contrast?
- [ ] Is text readable at all sizes?
- [ ] Do animations feel smooth?
- [ ] Are error messages helpful?
- [ ] Is the design consistent?

---

## Design System Checklist

When building components, ensure:
- [ ] Matches color palette
- [ ] Uses correct typography
- [ ] Follows spacing system
- [ ] Includes hover/active states
- [ ] Works in light mode (dark mode future)
- [ ] Accessible (contrast, labels)
- [ ] Responsive (mobile & web)
- [ ] Consistent with other components

---

**This design system will evolve as we build. Start with these guidelines and refine based on user feedback!**

*Last Updated: January 2025*

