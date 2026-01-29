# Settings UI Implementation - START HERE

**Status:** Phase 1 Implemented (Polish Ongoing)
**Phase:** 1 of 3 (UI Restructuring)
**Timeline:** 2 weeks (10-12 days)
**Goal:** 80% → 90% completion

---

## 📚 Documentation Structure

Before starting, understand the three documents:

### 1. **SETTINGS_UI_ANALYSIS.md** (Analysis)
- Current state: What exists (80% complete)
- What's missing and why
- Proposed new structure
- Risk assessment
- **Use When:** Need to understand big picture

### 2. **SETTINGS_IMPLEMENTATION_PLAN.md** (Detailed Plan)
- Complete Phase 1 breakdown
- Tasks with acceptance criteria
- Technical notes and patterns
- Dependencies and timeline
- **Use When:** Planning implementation details

### 3. **SETTINGS_PHASE1_CHECKLIST.md** (Execution)
- Step-by-step checklist
- Exact sub-tasks with time estimates
- Safety gates and verification steps
- **Use When:** Actually implementing

### 4. **This Document (Overview)**
- Quick start guide
- High-level summary
- Next steps
- **Use When:** Orienting yourself

---

## 🎯 What We're Doing

## ✅ Status Update (2026-01-21)

- ✅ **Unified `SettingsScreen`** with expandable sections and cleaner visuals (cards + row separators)
- ✅ **Edit Profile** from Settings now routes to **`EditProfileScreen`**
- ✅ **Account & Security** (email/password/delete) is accessible from Settings via **`AccountSettingsScreen`**
- ✅ **Theme is implemented**: `ThemeProvider` supports **light/dark/system** and applies immediately in Settings UI (and any component migrated to `useTheme`)

### Current Problem
Settings are spread across 3 different screens:
- SettingsScreen.tsx (preferences)
- AccountSettingsScreen.tsx (account/security)
- NotificationsScreen.tsx (notifications)

Users have to navigate through multiple screens to find settings. The UX is confusing.

### Solution
Create ONE unified settings screen with clear hierarchical sections:

```
Settings
├── Account & Profile (profile info, security, privacy)
├── Preferences (theme, notifications, localization)
├── Feature Settings (finance, chores, groups, etc - Phase 2)
├── Data & Privacy (export, management)
└── Support & About (help, legal, info)
```

### Timeline
- **Phase 1 (2 weeks):** UI Restructuring - START NOW
- **Phase 2 (2-3 weeks):** Feature-Specific Settings
- **Phase 3 (1-2 weeks):** Advanced Features

---

## 🚀 Quick Start

### Prerequisites
```bash
# 1. Update workspace
git pull origin main

# 2. Install dependencies  
npm install

# 3. Create branch
git checkout -b feature/settings-ui-restructure

# 4. Verify setup
npm run build
npx tsc --noEmit
npm run lint
```

### Phase 1: 6 Tasks

**Task 1.3.1: Settings Components (2-3 days)**
- Create 6 reusable UI components
- SettingsSection, SettingsToggle, SettingsPicker, SettingsSlider, SettingsButton, SettingsDivider
- Use theme system

**Task 1.3.2: Backend DTO (1 day)**
- Add theme/appearance fields to UserProfile
- Create Prisma migration
- Update backend service

**Task 1.3.3: Unified Screen (3-4 days)**
- Rewrite SettingsScreen.tsx from scratch
- Implement all sections
- Integrate new components

**Task 1.3.4: Remove Old Screens (1 day)**
- Delete AccountSettingsScreen.tsx
- Delete old NotificationsScreen.tsx
- Update navigation

**Task 1.3.5: Navigation (1 day)**
- Verify routing structure
- Test all navigation paths
- Verify callbacks

**Task 1.3.6: Testing (2 days)**
- Comprehensive testing
- Manual smoke tests
- Performance checks

---

## 📋 Before You Start

### Read These Files (In Order)
1. ✅ SETTINGS_UI_ANALYSIS.md (10 min read)
2. ✅ SETTINGS_IMPLEMENTATION_PLAN.md (20 min read)
3. ✅ This file (5 min read)

### Review Current Code
1. Read `apps/mobile/src/screens/SettingsScreen.tsx`
2. Read `apps/mobile/src/screens/AccountSettingsScreen.tsx`
3. Read `apps/mobile/src/screens/NotificationsScreen.tsx`
4. Understand what each does
5. Note what functionality must be preserved

### Verify Your Setup
```bash
# From project root
npm run build         # Should succeed
npx tsc --noEmit     # Should have 0 errors
npm run lint         # Should have 0 errors

# From apps/mobile
npm run build        # Should succeed

# From apps/backend
npm run build        # Should succeed
```

---

## ✅ Checklist to Start

Before beginning Task 1.3.1, verify:

- [ ] You've read all three settings docs (ANALYSIS, PLAN, CHECKLIST)
- [ ] You understand the current problem (3 scattered screens)
- [ ] You understand the solution (1 unified screen)
- [ ] You've reviewed the current Settings code
- [ ] Your workspace builds successfully
- [ ] TypeScript strict mode works
- [ ] Linting passes
- [ ] You've created a branch: `feature/settings-ui-restructure`
- [ ] You understand the 6 tasks in Phase 1
- [ ] You understand the timeline (2 weeks)

---

## 🎯 Safety Gates

After EVERY task, run these checks:

```bash
# 1. TypeScript (most important)
cd apps/mobile && npx tsc --noEmit

# 2. Linting
npm run lint

# 3. Build
npm run build

# 4. Commit
git add .
git commit -m "task: [description]"

# 5. Visual inspection
# - Open app and test the feature manually
# - Watch for console errors
# - Check for visual issues
```

**Never skip safety gates.** They catch 90% of bugs early.

---

## 📚 Key Principles

### 1. Preserve Functionality
- Don't break existing settings
- All existing features must work
- Users shouldn't notice a difference (except better organization)

### 2. Use Theme System
- All colors from `theme.colors`
- All spacing from `theme.spacing`
- All typography from `theme.typography`
- No hardcoded hex colors or dimensions

### 3. Type Safety
- Strict TypeScript everywhere
- No `any` type
- Proper prop interfaces
- Full type coverage

### 4. Small Commits
- One task = one commit
- Clear commit messages
- Easy to revert if needed

### 5. Test As You Go
- Don't leave testing for the end
- Test each component as created
- Test each screen after wiring
- Manual smoke test frequently

---

## 🆘 If You Get Stuck

### Build Errors
1. Run `npm run build` to see full error
2. Check file paths (case sensitive)
3. Check imports
4. Check for circular dependencies
5. Try: `npm install` (dependencies might be missing)

### TypeScript Errors
1. Run `npx tsc --noEmit` to see exact errors
2. Check property names (typos)
3. Check return types
4. Check interface definitions
5. Use IDE's "Go to Definition" to verify types

### Linting Errors
1. Run `npm run lint` to see errors
2. Most are auto-fixable: `npm run lint -- --fix`
3. Follow the rules (no hardcoded colors, use theme, etc)

### Navigation Issues
1. Verify screen names in type definitions
2. Check case sensitivity
3. Verify navigation callbacks
4. Check App.tsx for broken references

### Can't Find Something
1. Use grep (in VS Code: Cmd+Shift+F)
2. Search for class names
3. Search for file names
4. Check import paths

### Runtime Errors
1. Check console logs in app
2. Look for null/undefined values
3. Verify API responses
4. Check async/await handling

---

## 🎉 Success Criteria

Phase 1 is complete when:

- ✅ All 6 tasks done
- ✅ All safety gates pass
- ✅ 0 TypeScript errors
- ✅ 0 linting errors
- ✅ Build succeeds
- ✅ App runs without crashes
- ✅ All existing settings work
- ✅ New theme settings work
- ✅ Settings persist correctly
- ✅ Navigation smooth
- ✅ Performance good (<2s load time)

---

## 📈 Progress Tracking

After each task, update your progress:

```
Phase 1: Settings UI Restructuring
├── Task 1.3.1: SettingsComponents ✅ (2-3 days)
├── Task 1.3.2: Backend DTO ✅ (1 day)
├── Task 1.3.3: Unified Screen ⏳ (3-4 days) - IN PROGRESS
├── Task 1.3.4: Remove Old Screens ⏳ (1 day)
├── Task 1.3.5: Navigation ⏳ (1 day)
└── Task 1.3.6: Testing ⏳ (2 days)

Days Completed: 3-4
Days Remaining: 7-8
On Schedule: YES ✅
```

---

## 🔗 Next Steps

1. **Now:** Read through all settings documentation
2. **Today:** Review current Settings code
3. **Tomorrow:** Start Task 1.3.1 (Create Components)
4. **Follow:** SETTINGS_PHASE1_CHECKLIST.md step-by-step
5. **After Phase 1:** Move to Phase 2 (Feature-Specific Settings)

---

## 📞 Questions?

If confused, check:
1. SETTINGS_PHASE1_CHECKLIST.md (step-by-step)
2. SETTINGS_IMPLEMENTATION_PLAN.md (detailed plan)
3. SETTINGS_UI_ANALYSIS.md (understanding)
4. Current code (reference implementation)

If stuck, start with one small thing and build from there. Don't try to do everything at once.

---

## 🚀 Ready?

**Let's make Settings UI awesome!** 💪

Start with: **SETTINGS_PHASE1_CHECKLIST.md → Task 1.3.1**

The project is at 97% completion. This Settings UI restructuring is the home stretch to 100%! 🎉

---

*You've got this! 🚀*