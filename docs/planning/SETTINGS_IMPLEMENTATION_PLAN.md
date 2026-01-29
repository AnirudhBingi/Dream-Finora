# Settings UI Implementation Plan

**Date:** 2026-01-20
**Status:** Implementation Starting
**Target:** 80% → 100% complete

---

## 🎯 Implementation Overview

### Phase 1: UI Restructuring & Organization (Week 1-2)
**Goal:** Consolidate 3 screens into 1 hierarchical screen

**Current State:**
- SettingsScreen.tsx - General preferences
- AccountSettingsScreen.tsx - Account/security  
- NotificationsScreen.tsx - Notifications list

**Target State:**
- Single unified SettingsScreen with expandable sections
- Clear hierarchy: Main Settings → Sections → Options
- Theme system already integrated ✅

### Phase 2: Feature-Specific Settings (Week 3-4)
**Goal:** Add settings for Finance, Chores, Groups, SpaceV, Rides

### Phase 3: Advanced Features (Week 5-6+)
**Goal:** Accessibility, performance, integrations

---

## ✅ Phase 1: UI Restructuring (STARTING NOW)

### 1.1 Create Settings Component Library
**New Components to Create:**

```
src/components/
├── SettingsSection.tsx       # Header + expandable section
├── SettingsToggle.tsx        # Consistent toggle switch
├── SettingsPicker.tsx        # Dropdown/select picker
├── SettingsSlider.tsx        # Numeric range slider
├── SettingsButton.tsx        # Action button (Save, Delete, etc)
└── SettingsDivider.tsx       # Visual separator
```

### 1.2 Restructured Settings Screen Architecture

```typescript
// SettingsScreen.tsx - Single screen with sections
<ScrollView>
  {/* Account & Profile Section */}
  <SettingsSection title="Account & Profile" expanded={true}>
    <ProfileInfo />
    <AccountSecurity />
    <PrivacySettings />
  </SettingsSection>

  {/* Preferences Section */}
  <SettingsSection title="Preferences">
    <AppearanceSettings />
    <NotificationSettings />
    <LocalizationSettings />
  </SettingsSection>

  {/* Feature Settings Section */}
  <SettingsSection title="Feature Settings">
    <FinanceSettings />
    <ChoreSettings />
    <GroupSettings />
    <SpaceVSettings />
    <RideSettings />
  </SettingsSection>

  {/* Data & Privacy Section */}
  <SettingsSection title="Data & Privacy">
    <DataExport />
    <DataManagement />
    <PrivacyControls />
  </SettingsSection>

  {/* Support & About Section */}
  <SettingsSection title="Support & About">
    <HelpSupport />
    <AppInfo />
    <Legal />
  </SettingsSection>
</ScrollView>
```

### 1.3 Implementation Tasks (In Order)

#### Task 1.3.1: Create Settings Components
**Files to Create:**
- `src/components/SettingsSection.tsx`
- `src/components/SettingsToggle.tsx`
- `src/components/SettingsPicker.tsx`
- `src/components/SettingsSlider.tsx`
- `src/components/SettingsButton.tsx`

**Acceptance Criteria:**
- ✅ All components use theme system
- ✅ Consistent styling across components
- ✅ Props properly typed with TypeScript
- ✅ Components render correctly in isolation
- ✅ Linting passes

**Time Estimate:** 2-3 days

---

#### Task 1.3.2: Update UserProfile DTO (Backend)
**File to Modify:**
- `apps/backend/src/profile/dto/update-profile.dto.ts`

**Changes:**
```typescript
export class UpdateProfileDto {
  // Existing fields...
  
  // NEW: Appearance settings
  @IsOptional()
  @IsString()
  @IsIn(['light', 'dark', 'system'])
  theme?: string;

  @IsOptional()
  @IsString()
  language?: string;

  @IsOptional()
  @IsString()
  @IsIn(['small', 'medium', 'large'])
  fontSize?: string;

  @IsOptional()
  @IsBoolean()
  highContrast?: boolean;
}
```

**Database Migration:**
- Add 4 new columns to `UserProfile` table
- Run: `npx prisma migrate dev --name add_theme_settings`

**Acceptance Criteria:**
- ✅ DTO updated with new fields
- ✅ Prisma migration created and tested
- ✅ Backend API accepts new fields
- ✅ TypeScript compiles without errors

**Time Estimate:** 1 day

---

#### Task 1.3.3: Create Unified SettingsScreen
**File to Create/Modify:**
- `apps/mobile/src/screens/SettingsScreen.tsx` (complete rewrite)

**Implementation Steps:**
1. Remove old implementation
2. Create new structure with sections
3. Import and use new component library
4. Maintain all existing functionality
5. Add new fields for theme/appearance
6. Test all sections

**Acceptance Criteria:**
- ✅ All existing settings still work
- ✅ Theme settings can be saved/loaded
- ✅ Settings persist across app restarts
- ✅ New appearance options functional
- ✅ Linting passes
- ✅ No TypeScript errors

**Time Estimate:** 3-4 days

---

#### Task 1.3.4: Polish Navigation + Keep Dedicated Screens
**Decision (post-implementation):**
- ✅ Keep `AccountSettingsScreen.tsx` for **security-sensitive** actions (update email, change password, delete account)
- ✅ Keep `NotificationsScreen.tsx` as the **Notification Center** (history, mark read, delete)
- ✅ Unified `SettingsScreen.tsx` focuses on **preferences + privacy + data export**, and links into these dedicated screens

**Updates to Make:**
- `apps/mobile/App.tsx` - Ensure unified Settings links to:
  - `editProfile`
  - `accountSettings`
  - `notifications` (already available via Header)

**Acceptance Criteria:**
- ✅ Users can access Account & Security from Settings
- ✅ Users can access Edit Profile from Settings (goes to EditProfileScreen)
- ✅ Notifications center remains accessible and functional
- ✅ App compiles and runs

**Time Estimate:** 0.5 day

---

#### Task 1.3.5: Update Navigation & Routing
**File to Modify:**
- `apps/mobile/App.tsx`

**Changes:**
```typescript
// Keep dedicated screens:
// - 'accountSettings' (security)
// - 'notifications' (notification center)

// Unified settings links into:
// - 'editProfile'
// - 'accountSettings'
```

**Acceptance Criteria:**
- ✅ Navigation structure updated
- ✅ Deep linking still works
- ✅ Back button works correctly
- ✅ No navigation loops
- ✅ All tests pass

**Time Estimate:** 1 day

---

#### Task 1.3.6: Comprehensive Testing
**Test Coverage:**
- ✅ All settings sections load
- ✅ All toggles work
- ✅ All pickers work
- ✅ All settings save correctly
- ✅ Settings persist after restart
- ✅ Theme changes apply immediately
- ✅ Appearance settings update UI
- ✅ No performance issues
- ✅ Linting passes
- ✅ TypeScript strict mode passes

**Time Estimate:** 2 days

---

## 📋 Phase 1 Work Breakdown

| Task | Duration | Dependencies | Status |
|------|----------|--------------|--------|
| 1.3.1: Settings Components | 2-3 days | None | 🔄 Ready to start |
| 1.3.2: Update Backend DTO | 1 day | None | ⏳ After 1.3.1 |
| 1.3.3: Unified SettingsScreen | 3-4 days | 1.3.1, 1.3.2 | ⏳ After 1.3.2 |
| 1.3.4: Remove Old Screens | 1 day | 1.3.3 | ⏳ After 1.3.3 |
| 1.3.5: Update Navigation | 1 day | 1.3.4 | ⏳ After 1.3.4 |
| 1.3.6: Testing & Polish | 2 days | All above | ⏳ After 1.3.5 |
| **Phase 1 Total** | **10-12 days (2 weeks)** | | |

---

## 🚀 Getting Started

### Prerequisites Checklist
- ✅ Node.js >= 18.0.0
- ✅ PostgreSQL running (or Docker Compose)
- ✅ Git repository ready
- ✅ All dependencies installed (`npm install`)
- ✅ TypeScript strict mode enabled

### Before Starting
1. Create a new git branch: `git checkout -b feature/settings-ui-restructure`
2. Verify build works: `npm run build --workspaces`
3. Run existing tests: `npm run test --workspaces`
4. Review current code: Read SettingsScreen.tsx, AccountSettingsScreen.tsx, NotificationsScreen.tsx

### Safety Gates (After Each Task)
1. ✅ **TypeScript Check:** `cd apps/mobile && npx tsc --noEmit`
2. ✅ **Lint Check:** `npm run lint`
3. ✅ **Build Check:** `npm run build`
4. ✅ **Manual Testing:** Quick smoke test of feature

---

## 📊 Success Criteria

### After Phase 1 Complete:
- ✅ All existing settings functionality preserved
- ✅ Single unified settings screen
- ✅ Clear hierarchical organization
- ✅ Theme/appearance settings working
- ✅ 0 TypeScript errors
- ✅ All linting passes
- ✅ No performance regressions
- ✅ Settings persist correctly
- ✅ Navigation works smoothly

### Completion Metrics:
- Settings UI: **80% → 90%** (before Phase 2)
- Overall Project: **97% → 98%** (before Phase 2)

---

## 📝 Notes

### Key Principles
- **Preserve Existing Functionality** - Don't break what works
- **Use Theme System** - All new components use theme tokens
- **Type Safety** - Strict TypeScript everywhere
- **Test as You Go** - Run safety gates after each task
- **Commit Frequently** - Small commits with clear messages

### Common Pitfalls to Avoid
- ❌ Don't modify multiple screens in one commit
- ❌ Don't skip TypeScript checks
- ❌ Don't hardcode colors/spacing (use theme)
- ❌ Don't forget to update navigation structure
- ❌ Don't leave console.log() in production code

### If You Get Stuck
1. Run `npm run build` to check for compilation errors
2. Run `npx tsc --noEmit` to see TypeScript errors
3. Check git diff to see what changed
4. Revert and start smaller (separate concerns)
5. Create a separate test file to isolate issues

---

## 🎉 Phase 1 Complete → Phase 2

Once Phase 1 is complete, we'll move to Phase 2: Feature-Specific Settings
- Finance settings (budget alerts, etc)
- Chore settings (assignment preferences, etc)
- Group settings (default visibility, etc)
- SpaceV settings (listing preferences, etc)
- Ride settings (auto-expense, etc)

---

*Ready to implement! Start with Task 1.3.1: Create Settings Components*