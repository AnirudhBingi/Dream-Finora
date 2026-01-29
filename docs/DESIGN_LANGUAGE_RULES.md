# Design Language Rules

**Dream Finora Mobile App**  
**Updated:** January 28, 2026

## Core Principles

### 1. Reuse-First Policy

**ABSOLUTE RULE: NO DUPLICATES**
- ❌ DO NOT create new components if an equivalent exists
- ✅ ALWAYS search for existing primitives first
- ✅ Extend/refactor existing components when possible
- ❌ NEVER create Button2, CardV2, etc. - fix the original or migrate with a clear plan
- ✅ If replacement is needed, create compat wrapper and migrate systematically

### 2. Token-Based Design

**ALL styling must use design tokens - NO magic numbers or hardcoded values**

```typescript
// ❌ BAD - Hardcoded values
backgroundColor: '#FFFFFF'
padding: 24
borderRadius: 12
fontSize: 16

// ✅ GOOD - Token-based
backgroundColor: theme.colors.background
padding: theme.spacing.xl
borderRadius: theme.radii.card
fontSize: theme.typography.fontSize.base
```

### 3. Progressive Work (No Rework)

- Build foundations once (tokens → primitives → templates)
- Migrate screens in batches
- Validate via Showcase screen
- No repeated audits - Showcase is the single source of truth

---

## Design Token System

### Colors (`theme.colors.*`)

**Semantic Role Tokens (NOT raw palette values)**

| Token | Usage | Light Mode | Dark Mode |
|-------|-------|----------|-----------|
| `background` | Cards, main surfaces | `#FFFFFF` | `#111827` |
| `backgroundSecondary` | Screen background | `#F9FAFB` | `#0B1020` |
| `backgroundTertiary` | Elevated surfaces | `#F3F4F6` | `#1F2937` |
| `textPrimary` | Primary text | `#111827` | `#F9FAFB` |
| `textSecondary` | Secondary text | `#6B7280` | `#D1D5DB` |
| `textTertiary` | Tertiary text | `#9CA3AF` | `#9CA3AF` |
| `textInverse` | Text on colored backgrounds | `#FFFFFF` | `#FFFFFF` |
| `border` | Default borders | `#E5E7EB` | `#374151` |
| `borderLight` | Subtle borders | `#F3F4F6` | `#1F2937` |
| `borderDark` | Strong borders | `#D1D5DB` | `#4B5563` |
| `primary` | Brand color | `#6366F1` | `#6366F1` |
| `accent` | Accent/highlight | `#6366F1` | `#6366F1` |
| `accentMuted` | Muted accent background | `#EEF2FF` | `rgba(99,102,241,0.18)` |
| `success` | Success states | `#10B981` | `#10B981` |
| `error` | Error states | `#EF4444` | `#EF4444` |
| `warning` | Warning states | `#F59E0B` | `#F59E0B` |
| `pressed` | Pressed state overlay | `rgba(0,0,0,0.08)` | `rgba(255,255,255,0.12)` |
| `selected` | Selected state | `#EEF2FF` | `rgba(99,102,241,0.18)` |
| `disabled` | Disabled background | `#F3F4F6` | `#1F2937` |
| `focusRing` | Focus indicator | `#6366F1` | `#6366F1` |

**Status Colors:**
- `success`, `successBackground` - Success states
- `error`, `errorBackground` - Error states
- `warning`, `warningBackground` - Warning states
- `info`, `infoBackground` - Info states

### Spacing (`theme.spacing.*`)

**4px base unit scale**

| Token | Value | Usage |
|-------|-------|-------|
| `xs` | 4px | Extra small spacing |
| `sm` | 8px | Small spacing, gaps |
| `md` | 12px | Medium spacing |
| `base` | 16px | Base spacing (most common) |
| `lg` | 20px | Large spacing |
| `xl` | 24px | Extra large spacing |
| `2xl` | 32px | Section spacing |
| `3xl` | 40px | Large section spacing |
| `4xl` | 48px | Hero spacing |
| `5xl` | 64px | Extra large spacing |
| `screenGutter` | 24px | **Standard horizontal screen padding** |
| `sectionSpacing` | 24px | **Standard spacing between sections** |

### Border Radius (`theme.radii.*`)

| Token | Value | Usage |
|-------|-------|-------|
| `none` | 0px | No rounding |
| `xs` | 4px | Very subtle |
| `sm` | 8px | Buttons, inputs |
| `md` | 12px | Small cards |
| `lg` | 16px | Large cards |
| `xl` | 20px | Extra large |
| `2xl` | 24px | Very large |
| `3xl` | 32px | Rounded containers |
| `full` | 9999px | Circles, pills |
| `button` | 8px | **Standard button radius** |
| `input` | 8px | **Standard input radius** |
| `card` | 16px | **Standard card radius** |
| `modal` | 20px | **Standard modal/sheet radius** |

### Sizes (`theme.sizes.*`)

**Button Heights:**
- `button.sm` - 36px (compact actions)
- `button.md` - 44px (default, iOS standard)
- `button.lg` - 52px (primary CTAs)

**Input Heights:**
- `input.sm` - 40px
- `input.md` - 48px (default)
- `input.lg` - 56px

**Icon Sizes:**
- `icon.xs` - 16px
- `icon.sm` - 20px
- `icon.md` - 24px (default)
- `icon.lg` - 28px
- `icon.xl` - 32px

**Avatar Sizes:**
- `avatar.xs` - 24px (inline)
- `avatar.sm` - 32px (list items)
- `avatar.md` - 40px (default)
- `avatar.lg` - 48px (cards)
- `avatar.xl` - 64px (profile headers)

**Layout:**
- `screenGutter` - 24px (horizontal screen padding)
- `headerHeight` - 56px
- `bottomNavHeight` - 64px
- `touchTarget` - 44px (minimum accessible tap area)

### Typography (`theme.typography.*`)

**Font Sizes:** `xs`, `sm`, `base`, `lg`, `xl`, `2xl`, `3xl`  
**Font Weights:** `normal`, `medium`, `semibold`, `bold`  
**Line Heights:** Corresponding to each font size

---

## Component Library

### Primitives

| Component | Usage | Props |
|-----------|-------|-------|
| `<Button>` | All buttons | `variant`, `size`, `disabled`, `loading` |
| `<Card>` | Cards/surfaces | `surface`, `padding`, `border`, `radius` |
| `<Text>` | All typography | `variant`, `color`, `weight`, `align` |
| `<InputField>` | Text inputs | `label`, `error`, `leftIcon`, `rightIcon` |
| `<Icon>` | Icons | `name`, `size`, `color` |
| `<Avatar>` | User avatars | `uri`, `name`, `size`, `border` |
| `<ScreenWrapper>` | Screen layout | `scroll`, `gutter`, `backgroundColor` |
| `<Header>` | Screen headers | `title`, `onBack`, `options` |

### Button Component

```typescript
import { Button } from '../components/Button';

// Variants
<Button variant="primary" />   // Default, solid primary color
<Button variant="secondary" /> // Outlined
<Button variant="text" />      // Text-only
<Button variant="danger" />    // Destructive actions

// Sizes
<Button size="small" />   // 36px height
<Button size="medium" />  // 44px height (default)
<Button size="large" />   // 52px height

// States
<Button disabled />
<Button loading />
```

### Card Component

```typescript
import { Card } from '../components/Card';

// Surface levels (visual hierarchy)
<Card surface={0} />  // Screen background level
<Card surface={1} />  // Card level (default)
<Card surface={2} />  // Elevated/modal level

// Padding variants
<Card padding="none" />  // No padding
<Card padding="sm" />    // 12px
<Card padding="md" />    // 16px (default)
<Card padding="lg" />    // 24px

// Border
<Card border />

// Custom radius
<Card radius="lg" />
```

### Text Component

```typescript
import { Text } from '../components/Text';

// Variants
<Text variant="h1" />      // Large heading
<Text variant="h2" />      // Medium heading
<Text variant="h3" />      // Small heading
<Text variant="body" />    // Default body text
<Text variant="body2" />   // Secondary body text
<Text variant="caption" /> // Small text
<Text variant="label" />   // Form labels

// Colors
<Text color="primary" />    // Primary text color
<Text color="secondary" />  // Secondary text color
<Text color="inverse" />    // White text (for colored backgrounds)
<Text color="error" />      // Error color
<Text color="success" />    // Success color

// Weight
<Text weight="bold" />
```

### ScreenWrapper Component

```typescript
import { ScreenWrapper } from '../components/ScreenWrapper';

// Standard screen layout
<ScreenWrapper>
  {/* Content */}
</ScreenWrapper>

// No scrolling
<ScreenWrapper scroll={false}>
  {/* Content */}
</ScreenWrapper>

// No gutter/padding
<ScreenWrapper gutter={false}>
  {/* Content */}
</ScreenWrapper>

// Custom background
<ScreenWrapper backgroundColor={theme.colors.primary}>
  {/* Content */}
</ScreenWrapper>
```

---

## Screen Templates

### Standard Screen Structure

```typescript
import { ScreenWrapper } from '../components/ScreenWrapper';
import { Header } from '../components/Header';
import { Card } from '../components/Card';
import { Text } from '../components/Text';
import { Button } from '../components/Button';

export function ExampleScreen() {
  const { theme } = useTheme();
  
  return (
    <>
      <Header title="Example" onBack={onBack} />
      <ScreenWrapper>
        <Card padding="lg">
          <Text variant="h2">Section Title</Text>
          <Text variant="body" color="secondary">
            Description text
          </Text>
        </Card>
        
        <Card padding="lg">
          {/* More content */}
        </Card>
        
        <Button variant="primary" onPress={onSubmit}>
          Submit
        </Button>
      </ScreenWrapper>
    </>
  );
}
```

### CTA Placement Rules

1. **Forms:** Sticky bottom CTA button
2. **Detail Screens:** Header actions OR inline buttons
3. **List Screens:** Header action OR FAB
4. **ONE SYSTEM:** Choose sticky-bottom CTA for global create actions

### Section Grouping Rules

1. Use `<Card>` for sections
2. Consistent spacing between sections: `theme.spacing.xl` (24px)
3. NO random dividers - use spacing and surface hierarchy

### Header Rules

1. **Profile Mode:** Profile button (left) + notifications/settings (right)
2. **Back Mode:** Back button (left) + title (center) + actions (right)
3. Always use `<Header>` component - NO custom implementations

---

## Forbidden Patterns

### ❌ Hardcoded Values

```typescript
// ❌ FORBIDDEN
backgroundColor: '#FFF'
padding: 20
borderRadius: 12
fontSize: 16
color: 'rgba(0,0,0,0.5)'

// ✅ REQUIRED
backgroundColor: theme.colors.background
padding: theme.spacing.lg
borderRadius: theme.radii.card
fontSize: theme.typography.fontSize.base
color: theme.colors.textSecondary
```

### ❌ Raw Text Components

```typescript
// ❌ FORBIDDEN - Using raw RN Text with inline styles
<RNText style={{ fontSize: 18, fontWeight: 'bold', color: '#000' }}>
  Title
</RNText>

// ✅ REQUIRED - Using Text component
<Text variant="h3">Title</Text>
```

### ❌ Custom Card Implementations

```typescript
// ❌ FORBIDDEN - Custom View with hardcoded styles
<View style={{
  backgroundColor: '#FFF',
  borderRadius: 16,
  padding: 20,
  shadowColor: '#000',
  shadowOpacity: 0.1
}}>
  {content}
</View>

// ✅ REQUIRED - Card component
<Card padding="lg">
  {content}
</Card>
```

### ❌ Manual SafeAreaView Setup

```typescript
// ❌ FORBIDDEN - Manual setup
<SafeAreaView style={{ flex: 1 }}>
  <ScrollView contentContainerStyle={{ padding: 24 }}>
    {content}
  </ScrollView>
</SafeAreaView>

// ✅ REQUIRED - ScreenWrapper
<ScreenWrapper>
  {content}
</ScreenWrapper>
```

---

## Adding New Tokens

### When to Add a Token

- ✅ Value is used 3+ times across different files
- ✅ Value has semantic meaning (e.g., "screenGutter", not "spacing24")
- ✅ Value is part of a scale/system
- ❌ One-off custom values (keep inline with comment explaining why)

### How to Add a Token

1. **Edit the appropriate token file:**
   - Colors: `src/theme/colors.ts`
   - Spacing: `src/theme/spacing.ts`
   - Radii: `src/theme/radii.ts`
   - Sizes: `src/theme/sizes.ts`
   - Typography: `src/theme/typography.ts`

2. **Add dark mode equivalent** (if color):
   - Update `src/theme/colorSchemes.ts`

3. **Update TypeScript types** (automatic with `as const`)

4. **Use immediately** - replace existing hardcoded values

---

## Migration Checklist

When migrating a screen:

- [ ] Replace `SafeAreaView` + `ScrollView` with `<ScreenWrapper>`
- [ ] Replace raw `<Text>` with `<Text>` component
- [ ] Replace custom cards/containers with `<Card>`
- [ ] Replace hardcoded colors with `theme.colors.*`
- [ ] Replace hardcoded spacing with `theme.spacing.*`
- [ ] Replace hardcoded borderRadius with `theme.radii.*`
- [ ] Replace hardcoded sizes with `theme.sizes.*`
- [ ] Use `<Button>` component (no custom buttons)
- [ ] Follow CTA placement rules
- [ ] Use section grouping with Cards
- [ ] Test in both light and dark mode

---

## Deprecation Policy

### When a Component Needs Replacement

1. **Create new version** with clear rationale
2. **Add deprecation notice** to old component
3. **Create migration guide** with examples
4. **Set timeline** for migration (e.g., 2 sprints)
5. **Track usage** of old component
6. **Migrate systematically** in batches
7. **Remove old component** after full migration
8. **NO permanent parallel systems** (e.g., Button + ButtonV2 forever)

---

## Validation

### Design System Showcase

- **Location:** `src/screens/ShowcaseScreen.tsx` (to be created)
- **Purpose:** Visual regression testing, component gallery
- **Updates:** Add new components/variants immediately
- **Usage:** Primary validation tool (no repeated audits)

### Lint Checks

- Warn on hardcoded hex colors (except in theme files)
- Warn on magic numbers for spacing/sizing
- Enforce theme token usage

---

## Role-Based Workflow

| Role | Responsibilities | Can Modify |
|------|-----------------|------------|
| **Product Designer** | Design tokens, component specs | Token files, component props/behavior |
| **Mobile UI Engineer** | Primitives, layout, animations | Components, ScreenWrapper, styles |
| **Feature Engineer** | Screens, business logic | Screens, hooks, API calls |
| **Backend Engineer** | APIs, data models | Backend code only |
| **QA/Automation** | Testing, validation | Test files, Showcase |
| **DevOps** | Build, deploy, CI/CD | Build configs, deployment |

**Key Rule:** No cross-role changes without discussion. Designers change tokens, UI engineers change components, feature engineers use them.

---

## Quick Reference

### Most Common Tokens

```typescript
// Backgrounds
theme.colors.backgroundSecondary  // Screen background
theme.colors.background           // Cards/surfaces

// Text
theme.colors.textPrimary         // Primary text
theme.colors.textSecondary       // Secondary text

// Spacing
theme.spacing.screenGutter       // Screen padding (24px)
theme.spacing.xl                 // Section spacing (24px)
theme.spacing.base               // Common padding (16px)

// Radius
theme.radii.card                 // Card radius (16px)
theme.radii.button               // Button radius (8px)

// Sizes
theme.sizes.button.md            // Button height (44px)
theme.sizes.icon.md              // Icon size (24px)
```

### Theme Access Pattern

```typescript
import { useTheme } from '../theme';

export function MyComponent() {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  
  return <View style={styles.container}>{/* ... */}</View>;
}

const createStyles = (theme: ReturnType<typeof useTheme>["theme"]) =>
  StyleSheet.create({
    container: {
      backgroundColor: theme.colors.background,
      padding: theme.spacing.base,
      borderRadius: theme.radii.card,
    },
  });
```

---

**Last Updated:** January 28, 2026  
**Maintained By:** Design System Team  
**Questions:** See agent transcript or ask in #design-system channel
