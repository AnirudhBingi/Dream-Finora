# Screen Templates Guide

**Dream Finora Mobile App**  
**Updated:** January 28, 2026

## Overview

8 standardized screen templates extracted from existing patterns across 78 screens. Use these templates to ensure consistency and reduce implementation time.

---

## Template 1: List Screen

**Use for:** Expense lists, chore lists, group lists, friend lists, ride lists

### Structure

```typescript
import { ScreenWrapper } from '../components/ScreenWrapper';
import { Header } from '../components/Header';
import { Card } from '../components/Card';
import { EmptyState } from '../components/EmptyState';
import { ErrorState } from '../components/ErrorState';

export function ListScreen({ onCreate, onBack }) {
  const { theme } = useTheme();
  const { data, loading, refreshing, error, refresh, refetch } = useDataFetch(...);
  
  if (loading && !data) {
    return (
      <>
        <Header title="Title" onBack={onBack} />
        <SkeletonLoader />
      </>
    );
  }
  
  return (
    <>
      <Header 
        title="Title"
        onBack={onBack}
        rightActions={onCreate ? <IconButton icon="add" onPress={onCreate} /> : undefined}
      />
      <ScreenWrapper
        scroll
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
      >
        {error ? (
          <ErrorState message={error} onRetry={refetch} />
        ) : items.length === 0 ? (
          <EmptyState 
            icon="inbox"
            title="No items"
            subtitle="Get started by creating one"
            actionLabel="Create"
            onAction={onCreate}
          />
        ) : (
          <>
            {/* Optional: Summary Stats Card */}
            <Card padding="lg" style={{ marginBottom: theme.spacing.base }}>
              {/* Stats */}
            </Card>
            
            {/* List Items */}
            {items.map(item => (
              <Card 
                key={item.id}
                padding="md"
                style={{ marginBottom: theme.spacing.sm }}
              >
                {/* Item content */}
              </Card>
            ))}
          </>
        )}
      </ScreenWrapper>
    </>
  );
}
```

### CTA Placement
- **Primary:** Header right action (create button)
- **Alternative:** FAB (if no header space)

### Spacing
- Content padding: Automatic via `<ScreenWrapper gutter>`
- Card spacing: `marginBottom: theme.spacing.sm` (8px)
- Section spacing: `marginBottom: theme.spacing.base` (16px)

---

## Template 2: Detail Screen

**Use for:** Expense details, chore details, group details, ride details

### Structure

```typescript
export function DetailScreen({ itemId, onBack, onEdit, onDelete }) {
  const { theme } = useTheme();
  const { data: item, loading, error, refetch } = useDataFetch(...);
  
  const headerOptions: HeaderOption[] = [
    { label: "Edit", icon: "edit", onPress: () => onEdit(itemId) },
    { label: "Delete", icon: "delete", onPress: onDelete, danger: true },
  ];
  
  if (loading) {
    return (
      <>
        <Header title="Details" onBack={onBack} useOptionsMenu options={[]} />
        <SkeletonDetailScreen />
      </>
    );
  }
  
  if (error || !item) {
    return (
      <>
        <Header title="Details" onBack={onBack} useOptionsMenu options={headerOptions} />
        <ErrorState message={error || "Not found"} onRetry={refetch} />
      </>
    );
  }
  
  return (
    <>
      <Header 
        title="Details"
        onBack={onBack}
        useOptionsMenu
        options={headerOptions}
      />
      <ScreenWrapper scroll>
        {/* Hero Card - Primary info */}
        <Card padding="lg" style={{ marginBottom: theme.spacing.base }}>
          <Text variant="h2">{item.title}</Text>
          <Text variant="h1" color="primary">${item.amount}</Text>
        </Card>
        
        {/* Details Card */}
        <Card padding="lg" style={{ marginBottom: theme.spacing.base }}>
          <Text variant="label" color="secondary">DETAILS</Text>
          {/* Key-value rows */}
        </Card>
        
        {/* Optional: Related Items */}
        <Card padding="lg">
          <Text variant="label" color="secondary">HISTORY</Text>
          {/* History items */}
        </Card>
        
        {/* Space for sticky buttons */}
        <View style={{ height: 100 }} />
      </ScreenWrapper>
      
      {/* Sticky Action Buttons */}
      <View style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: theme.spacing.base,
        backgroundColor: theme.colors.background,
        borderTopWidth: 1,
        borderTopColor: theme.colors.border,
      }}>
        <Button variant="primary" onPress={handleAction}>
          Primary Action
        </Button>
      </View>
    </>
  );
}
```

### CTA Placement
- **Primary:** Sticky bottom buttons (contextual actions)
- **Secondary:** Options menu (Edit/Delete)

### Spacing
- Card spacing: `marginBottom: theme.spacing.base` (16px)
- Hero card padding: `padding: lg` (24px)
- Bottom padding: 100px for sticky button space

---

## Template 3: Form/Create Screen

**Use for:** Create expense, create chore, create group, edit screens

### Structure

```typescript
export function CreateScreen({ onBack, onSuccess }) {
  const { theme } = useTheme();
  const [formData, setFormData] = useState({});
  const { execute: handleSubmit, loading } = useAsyncOperation(...);
  
  const canSubmit = /* validation logic */;
  
  return (
    <>
      <Header title="Create" onBack={onBack} />
      <ScreenWrapper scroll keyboardShouldPersistTaps="handled">
        {/* Hero Input Section */}
        <View style={{ marginBottom: theme.spacing["2xl"] }}>
          <Text variant="caption" color="secondary" align="center">
            AMOUNT
          </Text>
          <TextInput 
            style={{
              fontSize: 48,
              fontWeight: 'bold',
              textAlign: 'center',
            }}
            placeholder="$0.00"
          />
        </View>
        
        {/* Form Cards */}
        <Card padding="lg" style={{ marginBottom: theme.spacing.base }}>
          <Text variant="label" color="secondary">BASIC INFO</Text>
          <InputField label="Title" />
          <InputField label="Description" multiline />
        </Card>
        
        <Card padding="lg" style={{ marginBottom: theme.spacing.base }}>
          <Text variant="label" color="secondary">DETAILS</Text>
          {/* More form fields */}
        </Card>
        
        {/* Space for sticky button */}
        <View style={{ height: 100 }} />
      </ScreenWrapper>
      
      {/* Sticky Bottom Button */}
      <View style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: theme.spacing.base,
        backgroundColor: theme.colors.background,
        borderTopWidth: 1,
        borderTopColor: theme.colors.border,
        ...theme.shadows.lg,
      }}>
        <Button 
          variant="primary"
          onPress={handleSubmit}
          disabled={!canSubmit || loading}
          loading={loading}
        >
          Create
        </Button>
      </View>
    </>
  );
}
```

### CTA Placement
- **Primary:** Sticky bottom button (full-width)
- **Always:** Submit/Create button at bottom

### Spacing
- Hero section margin: `marginBottom: theme.spacing["2xl"]` (32px)
- Card spacing: `marginBottom: theme.spacing.base` (16px)
- Input spacing: `marginBottom: theme.spacing.base` (16px)

---

## Template 4: Feed Screen

**Use for:** Activity feed, unified feed, notifications

### Structure

```typescript
export function FeedScreen({ onBack }) {
  const { theme } = useTheme();
  const [filter, setFilter] = useState('all');
  const { data, loading, refreshing, refresh } = useDataFetch(...);
  
  return (
    <>
      <Header title="Activity" onBack={onBack} />
      
      {/* Optional: Filter Chips */}
      <View style={{
        paddingVertical: theme.spacing.md,
        paddingHorizontal: theme.spacing.screenGutter,
        backgroundColor: theme.colors.backgroundSecondary,
      }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {filters.map(f => (
            <Chip 
              key={f}
              label={f}
              selected={filter === f}
              onPress={() => setFilter(f)}
            />
          ))}
        </ScrollView>
      </View>
      
      <ScreenWrapper 
        scroll
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
      >
        {groupedItems.map(group => (
          <View key={group.date}>
            <Text variant="label" color="secondary" style={{ marginBottom: theme.spacing.md }}>
              {group.date}
            </Text>
            {group.items.map(item => (
              <Card 
                key={item.id}
                padding="md"
                style={{ marginBottom: theme.spacing.sm }}
              >
                {/* Feed item content */}
              </Card>
            ))}
          </View>
        ))}
      </ScreenWrapper>
    </>
  );
}
```

### CTA Placement
- **Primary:** Header actions only
- **No FAB** - feeds are read-only

### Spacing
- Filter container padding: `paddingVertical: theme.spacing.md`
- Item spacing: `marginBottom: theme.spacing.sm` (8px)
- Group header margin: `marginBottom: theme.spacing.md` (12px)

---

## Template 5: Settings Screen

**Use for:** Settings, account settings, group settings

### Structure

```typescript
export function SettingsScreen({ onBack }) {
  const { theme } = useTheme();
  
  return (
    <>
      <Header title="Settings" onBack={onBack} />
      <ScreenWrapper scroll>
        <SettingsSection title="Account" defaultExpanded>
          <SettingsButton 
            label="Profile"
            icon="person"
            onPress={onNavigateToProfile}
          />
          <SettingsButton 
            label="Security"
            icon="lock"
            onPress={onNavigateToSecurity}
          />
        </SettingsSection>
        
        <SettingsSection title="Preferences">
          <SettingsToggle 
            label="Dark Mode"
            value={isDarkMode}
            onValueChange={toggleDarkMode}
          />
          <SettingsPicker 
            label="Currency"
            value={currency}
            options={currencies}
            onValueChange={setCurrency}
          />
        </SettingsSection>
        
        <SettingsSection title="About">
          <SettingsButton label="Version" value="1.0.0" />
        </SettingsSection>
      </ScreenWrapper>
    </>
  );
}
```

### CTA Placement
- **Inline:** Buttons within sections
- **No sticky buttons**

### Spacing
- Section spacing: `marginBottom: theme.spacing["2xl"]` (32px)
- Row spacing: Internal to `SettingsSection` component

---

## Template 6: Profile Screen

**Use for:** User profiles, own profile

### Structure

```typescript
export function ProfileScreen({ userId, onBack }) {
  const { theme } = useTheme();
  const [activeTab, setActiveTab] = useState('friends');
  
  return (
    <>
      <Header 
        title="Profile"
        onBack={onBack}
        useOptionsMenu
        options={menuOptions}
      />
      <ScreenWrapper scroll>
        {/* Hero Card - Avatar + Stats */}
        <Card padding="lg" style={{ marginBottom: theme.spacing.base }}>
          <Avatar size="xl" uri={user.avatarUrl} name={user.name} />
          <Text variant="h2" align="center">{user.name}</Text>
          <Text variant="body2" align="center" color="secondary">
            FinScore: {user.finScore}
          </Text>
          
          {/* Stats Row */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginTop: theme.spacing.base }}>
            <StatItem label="Friends" value={stats.friends} />
            <StatItem label="Circles" value={stats.circles} />
            <StatItem label="Posts" value={stats.posts} />
          </View>
        </Card>
        
        {/* Tab Pills */}
        <View style={{ flexDirection: 'row', marginBottom: theme.spacing.base }}>
          {tabs.map(tab => (
            <TouchableOpacity 
              key={tab}
              onPress={() => setActiveTab(tab)}
              style={{
                flex: 1,
                padding: theme.spacing.md,
                backgroundColor: activeTab === tab ? theme.colors.primary : 'transparent',
                borderRadius: theme.radii.button,
              }}
            >
              <Text align="center" color={activeTab === tab ? 'inverse' : 'primary'}>
                {tab}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        
        {/* Tab Content */}
        {activeTab === 'friends' && <FriendsList />}
        {activeTab === 'circles' && <CirclesList />}
        {activeTab === 'posts' && <PostsList />}
      </ScreenWrapper>
    </>
  );
}
```

### CTA Placement
- **Options menu:** Edit profile, settings
- **Inline actions:** Follow/Unfollow buttons

---

## Template 7: Home/Dashboard Screen

**Use for:** Main home screen, dashboard

### Structure

```typescript
export function HomeScreen() {
  const { theme } = useTheme();
  
  return (
    <>
      <Header /> {/* Profile mode, no back button */}
      <ScreenWrapper scroll>
        {/* Balance Flow Card */}
        <Card padding="lg" style={{ marginBottom: theme.spacing.base }}>
          <Text variant="h3">Balance Flow</Text>
          {/* Balance summary */}
        </Card>
        
        {/* Section: Social */}
        <Text variant="label" color="secondary" style={{ marginBottom: theme.spacing.md }}>
          SOCIAL
        </Text>
        <View style={{ flexDirection: 'row', gap: theme.spacing.sm, marginBottom: theme.spacing["2xl"] }}>
          <FeatureButton icon="people" label="Circles" onPress={onCircles} />
          <FeatureButton icon="person-add" label="Friends" onPress={onFriends} />
        </View>
        
        {/* Section: Finance & Tools */}
        <Text variant="label" color="secondary" style={{ marginBottom: theme.spacing.md }}>
          FINANCE & TOOLS
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
          {financeTools.map(tool => (
            <FeatureButton key={tool.id} {...tool} />
          ))}
        </View>
      </ScreenWrapper>
    </>
  );
}
```

### CTA Placement
- **Feature buttons:** Grid of action buttons
- **No primary CTA** - navigation only

---

## Template 8: Analytics/Stats Screen

**Use for:** Analytics, stats, insights

### Structure

```typescript
export function AnalyticsScreen({ onBack }) {
  const { theme } = useTheme();
  const [period, setPeriod] = useState('month');
  
  return (
    <>
      <Header title="Analytics" onBack={onBack} />
      <ScreenWrapper scroll>
        {/* Period Selector */}
        <SegmentedControl 
          options={['week', 'month', 'year']}
          selected={period}
          onSelect={setPeriod}
          style={{ marginBottom: theme.spacing.base }}
        />
        
        {/* Stats Grid */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm, marginBottom: theme.spacing.base }}>
          <Card padding="md" style={{ flex: 1, minWidth: '47%' }}>
            <Text variant="h1">{stats.total}</Text>
            <Text variant="caption" color="secondary">Total</Text>
          </Card>
          <Card padding="md" style={{ flex: 1, minWidth: '47%' }}>
            <Text variant="h1">{stats.average}</Text>
            <Text variant="caption" color="secondary">Average</Text>
          </Card>
        </View>
        
        {/* Charts */}
        <Card padding="lg" style={{ marginBottom: theme.spacing.base }}>
          <Text variant="label" color="secondary">TREND</Text>
          {/* Chart component */}
        </Card>
        
        {/* Breakdown */}
        <Card padding="lg">
          <Text variant="label" color="secondary">BREAKDOWN</Text>
          {/* Breakdown items */}
        </Card>
      </ScreenWrapper>
    </>
  );
}
```

### CTA Placement
- **Header actions:** Export, share
- **No primary CTA**

---

## CTA Placement Rules

| Screen Type | Primary CTA | Secondary CTA | Notes |
|-------------|-------------|---------------|-------|
| **List** | Header action (create) | FAB (alternative) | Use header action if space available |
| **Detail** | Sticky bottom buttons | Options menu (edit/delete) | Contextual actions only |
| **Form** | Sticky bottom button | Cancel (back button) | Always full-width submit button |
| **Feed** | Header actions | None | Read-only, no primary CTA |
| **Settings** | Inline buttons | None | Actions within sections |
| **Profile** | Options menu | Inline actions | Edit profile in menu |
| **Home** | Feature buttons | None | Navigation grid |
| **Analytics** | Header actions | None | Export/share only |

---

## Section Grouping Rules

### 1. Use `<Card>` for Sections
- All sections should be wrapped in `<Card>` component
- Section title: `<Text variant="label" color="secondary">SECTION TITLE</Text>`
- Card padding: `padding="lg"` for forms, `padding="md"` for lists

### 2. Consistent Spacing
- Between cards: `marginBottom: theme.spacing.base` (16px)
- Between sections: `marginBottom: theme.spacing["2xl"]` (32px)
- Between items in section: `marginBottom: theme.spacing.md` (12px)

### 3. NO Random Dividers
- Use spacing and surface hierarchy instead
- If dividers needed, use `<View style={{ height: 1, backgroundColor: theme.colors.border }} />`

---

## Best Practices

### 1. Always Use ScreenWrapper
```typescript
// ❌ DON'T
<SafeAreaView>
  <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 100 }}>
    {children}
  </ScrollView>
</SafeAreaView>

// ✅ DO
<ScreenWrapper scroll>
  {children}
</ScreenWrapper>
```

### 2. Always Use Theme Tokens
```typescript
// ❌ DON'T
marginBottom: 16
padding: 24
borderRadius: 12

// ✅ DO
marginBottom: theme.spacing.base
padding: theme.spacing.screenGutter
borderRadius: theme.radii.card
```

### 3. Consistent Empty/Error States
```typescript
// ✅ ALWAYS USE
<EmptyState icon="inbox" title="No items" onAction={onCreate} />
<ErrorState message={error} onRetry={refetch} />
```

### 4. Loading States
- **List screens:** Skeleton loaders
- **Detail screens:** Skeleton detail screens  
- **Forms:** ActivityIndicator in submit button
- **Inline loading:** ActivityIndicator

---

## Migration Checklist

When converting a screen to use templates:

- [ ] Replace SafeAreaView + ScrollView with `<ScreenWrapper>`
- [ ] Use appropriate template structure
- [ ] Replace custom cards with `<Card>` component
- [ ] Replace raw text with `<Text>` component
- [ ] Use theme tokens for all spacing/sizing
- [ ] Follow CTA placement rules
- [ ] Use standard empty/error/loading states
- [ ] Remove hardcoded values
- [ ] Test in light and dark mode

---

**Last Updated:** January 28, 2026  
**See Also:** DESIGN_LANGUAGE_RULES.md
