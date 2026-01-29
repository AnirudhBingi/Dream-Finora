# Settings Phase 1 Implementation Checklist

**Phase 1 Goal:** Restructure Settings UI from 3 scattered screens → 1 unified hierarchical screen

**Timeline:** 2 weeks (10-12 days)

---

## 📋 Pre-Implementation Checklist

**Before starting, verify:**
- [ ] Node.js >= 18.0.0 installed
- [ ] PostgreSQL running (docker-compose up postgres)
- [ ] All npm dependencies installed
- [ ] Git repo ready (no uncommitted changes)
- [ ] Can run `npm run build` successfully
- [ ] TypeScript strict mode working
- [ ] Current SettingsScreen.tsx, AccountSettingsScreen.tsx, NotificationsScreen.tsx reviewed

---

## 🎯 Task 1.3.1: Create Settings Components (2-3 days)

**Goal:** Create reusable settings UI component library

### Sub-tasks:

#### 1.3.1.1: Create SettingsSection.tsx
- [ ] Create file: `apps/mobile/src/components/SettingsSection.tsx`
- [ ] Props: title, expanded, children, onToggle
- [ ] Features:
  - [ ] Expandable/collapsible header
  - [ ] Smooth animation on expand/collapse
  - [ ] Uses theme.colors and theme.spacing
  - [ ] Visual separator above/below
- [ ] TypeScript: Strict typing, no `any`
- [ ] Styling: Use theme system only
- [ ] Test: Renders and toggles correctly

**Acceptance Criteria:**
- [ ] File created and compiles
- [ ] Component renders in isolation
- [ ] Toggle animation works smoothly
- [ ] Uses theme tokens (no hardcoded colors)
- [ ] No TypeScript errors
- [ ] No linting errors

**Estimated Time:** 4-6 hours

---

#### 1.3.1.2: Create SettingsToggle.tsx
- [ ] Create file: `apps/mobile/src/components/SettingsToggle.tsx`
- [ ] Props: label, value, onChange, description (optional)
- [ ] Features:
  - [ ] React Native Switch component
  - [ ] Label on left, switch on right
  - [ ] Optional description below
  - [ ] Disabled state support
  - [ ] Loading state support
- [ ] Uses theme.colors and theme.spacing

**Acceptance Criteria:**
- [ ] File created and compiles
- [ ] Toggle works (value changes)
- [ ] Callback fires correctly
- [ ] Uses theme tokens only
- [ ] No TypeScript errors
- [ ] No linting errors

**Estimated Time:** 3-4 hours

---

#### 1.3.1.3: Create SettingsPicker.tsx
- [ ] Create file: `apps/mobile/src/components/SettingsPicker.tsx`
- [ ] Props: label, value, onChange, options, description (optional)
- [ ] Features:
  - [ ] Dropdown/picker UI
  - [ ] Label on left, value on right
  - [ ] Modal popup for selection
  - [ ] Optional description
  - [ ] Disabled state support
- [ ] Uses theme.colors and theme.spacing

**Acceptance Criteria:**
- [ ] File created and compiles
- [ ] Picker opens/closes correctly
- [ ] Selection changes value
- [ ] Callback fires correctly
- [ ] Uses theme tokens only
- [ ] No TypeScript errors
- [ ] No linting errors

**Estimated Time:** 4-5 hours

---

#### 1.3.1.4: Create SettingsSlider.tsx
- [ ] Create file: `apps/mobile/src/components/SettingsSlider.tsx`
- [ ] Props: label, value, onChange, min, max, step, unit (optional)
- [ ] Features:
  - [ ] Slider input
  - [ ] Label and value display
  - [ ] Min/max validation
  - [ ] Step support
  - [ ] Optional unit display (e.g., "px", "seconds")
- [ ] Uses theme.colors and theme.spacing

**Acceptance Criteria:**
- [ ] File created and compiles
- [ ] Slider works (value changes smoothly)
- [ ] Validation works (respects min/max)
- [ ] Step works correctly
- [ ] Callback fires correctly
- [ ] Uses theme tokens only
- [ ] No TypeScript errors
- [ ] No linting errors

**Estimated Time:** 4-5 hours

---

#### 1.3.1.5: Create SettingsButton.tsx
- [ ] Create file: `apps/mobile/src/components/SettingsButton.tsx`
- [ ] Props: label, onPress, variant ('primary'|'danger'|'secondary'), loading
- [ ] Features:
  - [ ] Full-width button
  - [ ] Loading spinner support
  - [ ] Disabled during loading
  - [ ] Color variants (using theme)
  - [ ] Consistent spacing
- [ ] Uses theme.colors and theme.spacing

**Acceptance Criteria:**
- [ ] File created and compiles
- [ ] Button clickable
- [ ] Loading state works
- [ ] Color variants work
- [ ] Uses theme tokens only
- [ ] No TypeScript errors
- [ ] No linting errors

**Estimated Time:** 3-4 hours

---

#### 1.3.1.6: Create SettingsDivider.tsx
- [ ] Create file: `apps/mobile/src/components/SettingsDivider.tsx`
- [ ] Simple divider line component
- [ ] Features:
  - [ ] Thin line divider
  - [ ] Uses theme.colors.border
  - [ ] Consistent spacing
- [ ] Uses theme.colors and theme.spacing

**Acceptance Criteria:**
- [ ] File created and compiles
- [ ] Divider renders correctly
- [ ] Uses theme tokens
- [ ] No TypeScript errors
- [ ] No linting errors

**Estimated Time:** 1-2 hours

---

#### 1.3.1.7: Test & Polish Components
- [ ] Verify all components compile
- [ ] Run TypeScript check: `npx tsc --noEmit`
- [ ] Run linter: `npm run lint`
- [ ] Run build: `npm run build`
- [ ] Manual test: Render each component in a test screen

**Acceptance Criteria:**
- [ ] All components compile without errors
- [ ] TypeScript strict mode passes
- [ ] ESLint passes with no warnings
- [ ] Build succeeds
- [ ] All components render correctly

**Estimated Time:** 2-4 hours

---

### Task 1.3.1 Summary
- **Total Time:** 2-3 days (25-30 hours)
- **Components Created:** 6 new reusable components
- **Status:** ✅ Ready to start

**Safety Gates (After Task 1.3.1):**
```bash
# 1. TypeScript check
cd apps/mobile && npx tsc --noEmit

# 2. Lint check
npm run lint

# 3. Build check
npm run build

# 4. Git commit
git add .
git commit -m "feat: add settings component library (Toggle, Picker, Slider, etc)"
```

---

## 🎯 Task 1.3.2: Update Backend DTO (1 day)

**Goal:** Add appearance/theme settings to UserProfile

### Sub-tasks:

#### 1.3.2.1: Update UpdateProfileDto
- [ ] File: `apps/backend/src/profile/dto/update-profile.dto.ts`
- [ ] Add these fields:
  ```typescript
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
  ```
- [ ] Update ProfileService to handle new fields
- [ ] Update database type definitions

**Acceptance Criteria:**
- [ ] DTO compiles without errors
- [ ] Backend validates new fields
- [ ] TypeScript strict mode passes
- [ ] No linting errors

**Estimated Time:** 2-3 hours

---

#### 1.3.2.2: Create Prisma Migration
- [ ] Run: `npx prisma migrate dev --name add_theme_settings`
- [ ] This should:
  - [ ] Add `theme` column to UserProfile
  - [ ] Add `language` column to UserProfile
  - [ ] Add `fontSize` column to UserProfile
  - [ ] Add `highContrast` column to UserProfile
- [ ] Verify migration file created in `prisma/migrations/`
- [ ] Test migration runs successfully
- [ ] Verify schema updated in `schema.prisma`

**Acceptance Criteria:**
- [ ] Migration file created
- [ ] Migration runs without errors
- [ ] Database schema updated
- [ ] Rollback works (just verify it doesn't error)
- [ ] Data preserved for existing users

**Estimated Time:** 1-2 hours

---

#### 1.3.2.3: Update ProfileService
- [ ] File: `apps/backend/src/profile/profile.service.ts`
- [ ] Update `updateProfile()` to save new fields
- [ ] Ensure defaults are set:
  - [ ] theme defaults to 'system'
  - [ ] language defaults to 'en'
  - [ ] fontSize defaults to 'medium'
  - [ ] highContrast defaults to false

**Acceptance Criteria:**
- [ ] Service compiles without errors
- [ ] New fields are saved correctly
- [ ] Defaults are applied
- [ ] TypeScript strict mode passes
- [ ] No linting errors

**Estimated Time:** 1-2 hours

---

#### 1.3.2.4: Test Backend Changes
- [ ] Build backend: `cd apps/backend && npm run build`
- [ ] Run tests: `npm run test`
- [ ] Manual API test:
  - [ ] Create user
  - [ ] Update profile with new theme settings
  - [ ] Fetch profile and verify settings saved
  - [ ] Verify defaults applied for existing users

**Acceptance Criteria:**
- [ ] Build succeeds
- [ ] All tests pass
- [ ] API correctly saves/retrieves new fields
- [ ] Defaults work correctly

**Estimated Time:** 1-2 hours

---

### Task 1.3.2 Summary
- **Total Time:** 1 day (6-9 hours)
- **Files Modified:** 2 (DTO, Service)
- **Database Changes:** 1 migration
- **Status:** ⏳ Ready after Task 1.3.1

**Safety Gates (After Task 1.3.2):**
```bash
# 1. Backend build check
cd apps/backend && npm run build

# 2. TypeScript check
npx tsc --noEmit

# 3. Run tests
npm run test

# 4. Git commit
git add .
git commit -m "feat: add theme settings to UserProfile backend"
```

---

## 🎯 Task 1.3.3: Create Unified SettingsScreen (3-4 days)

**Goal:** Complete rewrite of SettingsScreen with new components

### Sub-tasks:

#### 1.3.3.1: Create New SettingsScreen Structure
- [ ] File: `apps/mobile/src/screens/SettingsScreen.tsx` (complete rewrite)
- [ ] Implement these sections:
  - [ ] Account & Profile section
  - [ ] Preferences section
  - [ ] Feature Settings section (stubs for Phase 2)
  - [ ] Data & Privacy section
  - [ ] Support & About section (stubs for Phase 2)

**Acceptance Criteria:**
- [ ] File compiles without errors
- [ ] All sections render
- [ ] Each section uses SettingsSection component
- [ ] Proper spacing and hierarchy
- [ ] Uses theme system
- [ ] TypeScript strict mode passes
- [ ] No linting errors

**Estimated Time:** 1-2 days

---

#### 1.3.3.2: Implement Account & Profile Section
- [ ] Display name (TextInput)
- [ ] Bio (TextInput, multiline)
- [ ] Avatar (Image + upload button)
- [ ] Use SettingsButton for save

**Acceptance Criteria:**
- [ ] All fields render
- [ ] Data loads from API
- [ ] Data saves to API
- [ ] Avatar upload works
- [ ] Validation works

**Estimated Time:** 4-6 hours

---

#### 1.3.3.3: Implement Preferences Section
- [ ] Theme toggle (SettingsPicker: light/dark/system)
- [ ] Notifications toggle (SettingsToggle)
- [ ] Notification preferences (SettingsToggle for each type)
- [ ] Currency settings (SettingsPicker)
- [ ] Font size (SettingsPicker: small/medium/large)
- [ ] High contrast (SettingsToggle)

**Acceptance Criteria:**
- [ ] All settings render
- [ ] All settings save/load correctly
- [ ] Theme change applies immediately
- [ ] Font size change applies immediately
- [ ] Validation works

**Estimated Time:** 1 day

---

#### 1.3.3.4: Implement Data & Privacy Section
- [ ] Privacy settings (SettingsPicker for visibility)
- [ ] Data export buttons (SettingsButton)
- [ ] Invite user (SettingsButton + TextInput)

**Acceptance Criteria:**
- [ ] All options render
- [ ] Privacy settings save/load
- [ ] Export buttons work
- [ ] Invite functionality works

**Estimated Time:** 4-6 hours

---

#### 1.3.3.5: Implement Notification History
- [ ] Move notification list from NotificationsScreen
- [ ] Show recent notifications in expandable section
- [ ] Mark as read/unread
- [ ] Delete notification
- [ ] Clear all notifications

**Acceptance Criteria:**
- [ ] Notifications display correctly
- [ ] Mark as read works
- [ ] Delete works
- [ ] Clear all works
- [ ] List updates correctly

**Estimated Time:** 4-6 hours

---

#### 1.3.3.6: Add Feature Settings Stubs
- [ ] Create expandable sections for:
  - [ ] Finance Settings (collapsed, stub)
  - [ ] Chore Settings (collapsed, stub)
  - [ ] Group Settings (collapsed, stub)
  - [ ] SpaceV Settings (collapsed, stub)
  - [ ] Ride Settings (collapsed, stub)
- [ ] Each has placeholder text: "Coming soon in Phase 2"

**Acceptance Criteria:**
- [ ] Sections appear in UI
- [ ] Can expand/collapse
- [ ] Placeholder text displays

**Estimated Time:** 2-3 hours

---

#### 1.3.3.7: Testing & Polish
- [ ] TypeScript check
- [ ] Lint check
- [ ] Build check
- [ ] Manual testing:
  - [ ] All sections load
  - [ ] All toggles work
  - [ ] All pickers work
  - [ ] All buttons work
  - [ ] Settings persist after restart
  - [ ] Theme changes apply immediately
  - [ ] No performance issues
  - [ ] No crashes

**Acceptance Criteria:**
- [ ] All checks pass
- [ ] No errors or warnings
- [ ] All functionality works
- [ ] Performance is good

**Estimated Time:** 1-2 days

---

### Task 1.3.3 Summary
- **Total Time:** 3-4 days (24-32 hours)
- **File Modified:** SettingsScreen.tsx (complete rewrite)
- **Functionality:** All existing + new theme settings
- **Status:** ⏳ Ready after Task 1.3.2

**Safety Gates (After Task 1.3.3):**
```bash
# 1. TypeScript check
cd apps/mobile && npx tsc --noEmit

# 2. Lint check
npm run lint

# 3. Build check
npm run build

# 4. Git commit
git add .
git commit -m "feat: create unified settings screen with theme settings"
```

---

## 🎯 Task 1.3.4: Navigation + Dedicated Screens (0.5 day)

**Goal:** Keep dedicated screens, but make Settings the single entry point

### Sub-tasks:

#### 1.3.4.1: Keep AccountSettingsScreen (Security)
- [ ] Confirm `apps/mobile/src/screens/AccountSettingsScreen.tsx` still exists
- [ ] Ensure Settings links to it via **Account & Security**
- [ ] Verify update email / change password / delete account still work

**Acceptance Criteria:**
- [ ] Account settings accessible from Settings
- [ ] No navigation loops
- [ ] No TypeScript errors

**Estimated Time:** 1-2 hours

---

#### 1.3.4.2: Keep NotificationsScreen (Notification Center)
- [ ] Confirm `apps/mobile/src/screens/NotificationsScreen.tsx` still exists
- [ ] Verify notification list, mark-read, delete, and clear-all still work
- [ ] Ensure it remains reachable via Header notifications button

**Acceptance Criteria:**
- [ ] Notifications center works
- [ ] No broken imports
- [ ] No TypeScript errors

**Estimated Time:** 1-2 hours

---

#### 1.3.4.3: Update App.tsx Navigation
- [ ] File: `apps/mobile/App.tsx`
- [ ] Ensure Settings links to:
  - [ ] `editProfile` (EditProfileScreen)
  - [ ] `accountSettings` (AccountSettingsScreen)
- [ ] Keep:
  - [ ] `notifications` (Notification Center)

**Acceptance Criteria:**
- [ ] Navigation updated
- [ ] No broken references
- [ ] App compiles
- [ ] Navigation works

**Estimated Time:** 1 hour

---

#### 1.3.4.4: Verify No Broken Links
- [ ] Build check: `npm run build`
- [ ] TypeScript check: `npx tsc --noEmit`
- [ ] Manual test: Navigate to settings, verify no crashes
- [ ] Check all setting navigation paths

**Acceptance Criteria:**
- [ ] Build succeeds
- [ ] TypeScript passes
- [ ] No runtime errors
- [ ] Navigation works

**Estimated Time:** 30 minutes

---

### Task 1.3.4 Summary
- **Total Time:** 0.5 day (3-4 hours)
- **Files Deleted:** 0
- **Files Modified:** 1 (App.tsx + SettingsScreen)
- **Status:** ⏳ Ready after Task 1.3.3

**Safety Gates (After Task 1.3.4):**
```bash
# 1. TypeScript check
cd apps/mobile && npx tsc --noEmit

# 2. Lint check
npm run lint

# 3. Build check
npm run build

# 4. Git commit
git add .
git commit -m "refactor: settings navigation to edit profile + account security"
```

---

## 🎯 Task 1.3.5: Update Navigation (1 day)

**Goal:** Verify navigation structure and routing

### Sub-tasks:

#### 1.3.5.1: Verify Type Definitions
- [ ] File: `apps/mobile/App.tsx`
- [ ] ScreenName type should NOT include 'accountSettings' or old 'notifications'
- [ ] Should include 'settings' for unified screen
- [ ] Verify all screen names are valid

**Acceptance Criteria:**
- [ ] Type definitions correct
- [ ] No unused screen names
- [ ] All valid screens referenced

**Estimated Time:** 1 hour

---

#### 1.3.5.2: Test Navigation Paths
- [ ] Manual test: Navigate from home → settings
- [ ] Manual test: Navigate from settings → other screens → back to settings
- [ ] Manual test: Settings → Account → Theme change → verify change
- [ ] Manual test: Deep link to settings (if applicable)
- [ ] Verify back button works correctly

**Acceptance Criteria:**
- [ ] All navigation paths work
- [ ] No loops or stuck states
- [ ] Back button works
- [ ] Deep linking works (if used)

**Estimated Time:** 2-3 hours

---

#### 1.3.5.3: Verify All Callbacks
- [ ] Settings save callbacks work
- [ ] Theme change callbacks apply immediately
- [ ] Notification callbacks work
- [ ] Error handling works
- [ ] Loading states work

**Acceptance Criteria:**
- [ ] All callbacks fire correctly
- [ ] State updates immediately
- [ ] Errors handled gracefully

**Estimated Time:** 2-3 hours

---

### Task 1.3.5 Summary
- **Total Time:** 1 day (5-7 hours)
- **Files Modified:** App.tsx (verify only)
- **Testing:** Full navigation flow
- **Status:** ⏳ Ready after Task 1.3.4

**Safety Gates (After Task 1.3.5):**
```bash
# 1. TypeScript check
cd apps/mobile && npx tsc --noEmit

# 2. Lint check
npm run lint

# 3. Build check
npm run build

# 4. Git commit (if any changes)
git add .
git commit -m "refactor: verify navigation structure and routing"
```

---

## 🎯 Task 1.3.6: Comprehensive Testing (2 days)

**Goal:** Full testing of Phase 1 implementation

### Test Categories:

#### Unit Testing
- [ ] Test each settings component in isolation
- [ ] Test settings save/load logic
- [ ] Test validation logic
- [ ] Test error handling

#### Integration Testing
- [ ] Test full settings flow
- [ ] Test cross-screen navigation
- [ ] Test data persistence
- [ ] Test API integration

#### Manual Testing Checklist
- [ ] **Theme Settings**
  - [ ] Change theme to light/dark/system
  - [ ] Verify theme applies immediately
  - [ ] Verify theme persists after restart
  - [ ] Verify all UI elements respect theme

- [ ] **Appearance Settings**
  - [ ] Change font size
  - [ ] Verify font size applies
  - [ ] Verify font size persists
  - [ ] Test all font sizes (small/medium/large)

- [ ] **Notification Settings**
  - [ ] Toggle notifications on/off
  - [ ] Toggle feature-specific notifications
  - [ ] Verify settings save/load
  - [ ] Verify notification behavior changes

- [ ] **Privacy Settings**
  - [ ] Change profile visibility
  - [ ] Change trust score visibility
  - [ ] Verify settings save/load
  - [ ] Verify privacy actually applies

- [ ] **Account Settings**
  - [ ] Display name change
  - [ ] Bio change
  - [ ] Avatar upload
  - [ ] Email change
  - [ ] Password change
  - [ ] Account deletion

- [ ] **Data Export**
  - [ ] Export expenses CSV
  - [ ] Export transactions CSV
  - [ ] Export all data JSON
  - [ ] Files save correctly
  - [ ] Files have correct data

- [ ] **Performance**
  - [ ] Settings load in <2 seconds
  - [ ] No lag when toggling
  - [ ] No lag when picking options
  - [ ] Scrolling is smooth
  - [ ] No memory leaks

- [ ] **Edge Cases**
  - [ ] Test with slow network
  - [ ] Test with no network
  - [ ] Test rapid toggles
  - [ ] Test concurrent changes
  - [ ] Test after app restart

### Acceptance Criteria:
- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] All manual tests pass
- [ ] No crashes or errors
- [ ] No performance issues
- [ ] Linting passes
- [ ] TypeScript strict mode passes
- [ ] Build succeeds

**Estimated Time:** 2 days

---

### Task 1.3.6 Summary
- **Total Time:** 2 days (16 hours)
- **Test Coverage:** Comprehensive
- **Status:** ⏳ Ready after Task 1.3.5

**Safety Gates (After Task 1.3.6):**
```bash
# 1. Final TypeScript check
cd apps/mobile && npx tsc --noEmit

# 2. Final Lint check
npm run lint

# 3. Final Build check
npm run build

# 4. Run all tests
npm run test

# 5. Git commit
git add .
git commit -m "test: comprehensive testing of Phase 1 settings UI"

# 6. Git log - verify commits
git log --oneline | head -10
```

---

## 📊 Phase 1 Timeline

| Task | Days | Status |
|------|------|--------|
| 1.3.1: Settings Components | 2-3 | ⏳ Ready to start |
| 1.3.2: Backend DTO | 1 | ⏳ After 1.3.1 |
| 1.3.3: Unified Screen | 3-4 | ⏳ After 1.3.2 |
| 1.3.4: Remove Old Screens | 1 | ⏳ After 1.3.3 |
| 1.3.5: Navigation | 1 | ⏳ After 1.3.4 |
| 1.3.6: Testing | 2 | ⏳ After 1.3.5 |
| **Total** | **10-12 days** | |

---

## 🎉 Phase 1 Complete!

After all tasks done:
- ✅ Settings UI: **80% → 90%**
- ✅ Overall Project: **97% → 98%**
- ✅ Ready for Phase 2

---

*Checklist ready! Start with Task 1.3.1: Create Settings Components*