# Chores Feature - Complete Screen Redesign Plan

## 🎯 Design Principles

1. **Clean & Minimal**: Remove clutter, focus on essentials
2. **Consistent**: Unified design language across all screens
3. **Organized**: Clear hierarchy, logical grouping
4. **Accessible**: Easy navigation, clear actions
5. **User-Focused**: Show what users need, when they need it

---

## 📱 Screens to Redesign

### 1. ChoreListScreen (Main List)
**Purpose**: Browse and filter chores
**Key Sections**:
- Header: Title, Filter toggle (All/My/Group), Create button
- Quick Stats Banner: Points, Completed, Streak (always visible)
- Filter Tabs: Pending | Assigned | Completed
- Chore Cards: Clear, actionable, grouped by status
- Empty States: Helpful, actionable

**Header Actions**:
- Left: Back (if not main tab)
- Center: "Tasks" + Filter badge
- Right: Create button (prominent)

### 2. ChoreDetailScreen (Detail View)
**Purpose**: View details and take actions
**Key Sections**:
- Hero: Title, Status badge, Category icon
- Quick Info: Points, Due date, Assigned to
- Description (if exists)
- Rotation Info (if enabled)
- Assignments (if multiple)
- Action Buttons: Clear, contextual, at bottom

**Header Actions**:
- Left: Back
- Center: "Task Details"
- Right: More menu (History, Edit, Delete)

### 3. CreateChoreScreen (Creation Form)
**Purpose**: Create new chore
**Key Sections**:
- Header: "Create Task" + Cancel/Save
- Form Sections:
  1. Basic Info (Title, Description, Category)
  2. Points (Auto-calc or manual)
  3. Assignment (Type + Select users)
  4. Schedule (Due date, Recurring, Rotation)
  5. Reminders

**Header Actions**:
- Left: Cancel/Back
- Center: "Create Task"
- Right: Save button

### 4. EditChoreScreen (Edit Form)
**Purpose**: Edit existing chore
**Same structure as Create but pre-filled**

### 5. ChoreStatsScreen (Personal Stats)
**Purpose**: View personal achievements and stats
**Key Sections**:
- Stats Overview: 4 key metrics
- Achievements: Grid with progress
- Recent Activity: List of completions
- Period Selector: All-time (personal stats don't need period)

**Header Actions**:
- Left: Back
- Center: "Your Stats"
- Right: None needed

---

## 🎨 Design System

### Header Structure (Standardized)
- **List Screens**: Title | Filter | Create Button
- **Detail Screens**: Back | Title | More Menu
- **Form Screens**: Cancel | Title | Save
- **Always**: Profile, Notifications accessible (not in header, via bottom nav)

### Card Design
- Consistent padding (16px)
- Rounded corners (12-16px)
- Clear hierarchy (title → details → actions)
- Status indicators (badges)

### Action Buttons
- Primary: Full-width, prominent color
- Secondary: Outlined, less prominent
- Icon + Text for clarity
- Grouped logically

### Empty States
- Icon + Title + Message + Action Button
- Helpful suggestions

---

## 📋 Screen-by-Screen Redesign

### Screen 1: ChoreListScreen

**Structure**:
```
Header (minimal)
├─ Back (if needed)
├─ "Tasks" title
└─ Create FAB/Button

Quick Stats Banner (collapsible)
├─ Points | Completed | Streak
└─ "View Stats" link

Filter Tabs
├─ All | Pending | Assigned | Completed

Content
├─ Grouped Chores by Status
└─ Empty States

Bottom Action
└─ Create Task (FAB or button)
```

**Improvements**:
- Remove header clutter
- Make stats always visible but collapsible
- Clear filter tabs
- Better empty states

---

### Screen 2: ChoreDetailScreen

**Structure**:
```
Header
├─ Back
├─ "Task Details"
└─ More Menu (History, Edit, Delete)

Content (ScrollView)
├─ Hero Section
│   ├─ Icon + Title
│   └─ Status Badge
├─ Quick Info Card
│   ├─ Points
│   ├─ Due Date
│   └─ Assigned To
├─ Description Card (if exists)
├─ Rotation Card (if enabled)
├─ Assignments Card (if multiple)
└─ Recurring Info (if enabled)

Action Buttons (Fixed Bottom)
├─ Primary Action (Grab/Assign/Complete)
└─ Secondary Actions (if applicable)
```

**Improvements**:
- Clean header with More menu
- Organized content cards
- Clear action hierarchy
- Better visual flow

---

### Screen 3: CreateChoreScreen / EditChoreScreen

**Structure**:
```
Header
├─ Cancel
├─ "Create/Edit Task"
└─ Save

Form (ScrollView)
├─ Section 1: Basic Info
│   ├─ Title (required)
│   ├─ Description (optional)
│   └─ Category (auto-detect + manual)
├─ Section 2: Points
│   ├─ Auto-calculated value
│   └─ Manual override toggle
├─ Section 3: Assignment
│   ├─ Type selector (Single/Multiple/Open)
│   └─ User picker (contextual)
├─ Section 4: Schedule
│   ├─ Due Date
│   ├─ Recurring toggle
│   ├─ Recurring options (if enabled)
│   └─ Rotation toggle (if group)
└─ Section 5: Reminders
    └─ Reminder settings

Bottom
└─ Save Button (sticky)
```

**Improvements**:
- Organized form sections
- Clear progress indication
- Contextual options (hide/show based on selections)
- Better validation feedback

---

## 🔄 Navigation Flow (Redesigned)

**Main Flow**:
```
ChoreListScreen (Main Hub)
    ↓
    ├─→ CreateChoreScreen → Success → ChoreListScreen
    ├─→ ChoreDetailScreen
    │       ↓
    │       ├─→ EditChoreScreen → Success → ChoreDetailScreen
    │       ├─→ ChoreHistoryScreen
    │       └─→ GroupDetailScreen (if group)
    └─→ ChoreStatsScreen
```

---

## ✅ Redesign Checklist

### Core Chore Screens
- [x] **ChoreListScreen**: Complete redesign ✅
  - Stats card (always visible, larger size)
  - Groups/Individual tabs with sub-filters (All/Assigned/Completed)
  - Rich task cards with all information (group/personal, recurring, rotation, points, due date, creator, assignment info, grab task)
  - FAB positioned above bottom nav
  - Empty states with helpful messages
  - Group avatar rendering fixed

- [x] **ChoreDetailScreen**: Complete redesign ✅
  - Hero section with larger icon and status badge
  - Quick Info Card (points, due date, assigned to)
  - Reorganized content cards (Description, Details, Schedule, Rotation Order, Assignments)
  - Assignments section with horizontal scroll for many members
  - Rotation schedule with proper date calculation
  - Header with options menu (History, Edit, Delete)
  - Group avatar rendering fixed

- [x] **CreateChoreScreen**: Complete redesign ✅
  - Header with options menu pattern
  - Organized form sections (Basic Info, Assignment, Schedule)
  - Removed progress indicator
  - Removed duplicate text and "..." prefix
  - Removed "Assign to Friend (Optional)" section
  - "Select Members" always visible
  - Due Date and Reminder in separate rows with proper alignment
  - Points section as conditional inline card
  - Rotation points explanation added

- [x] **EditChoreScreen**: Complete redesign ✅
  - Header with options menu pattern
  - Same form structure as CreateChoreScreen
  - Pre-filled with existing chore data

### Related Screens & Components
- [x] **Headers**: Standardized across all screens ✅
  - Main screens (HomeScreen, BillchopGroupsScreen, ChoreListScreen, RideListScreen, SpaceVListScreen): Profile, Notification, Settings icons
  - All other screens: Back button, Title, Options menu (with screen-specific actions, Notifications, Messages, Settings)
  - Notification badge visible on notification icon
  - Options menu rendered in Modal to fix z-index issues
  - Options menu positioned correctly below header

- [x] **Group Avatar Rendering**: Fixed across all screens ✅
  - ChoreListScreen: Group picture in task cards
  - ChoreDetailScreen: Group picture in detail card
  - BillchopGroupsScreen: Group picture in group list
  - Avatar component used consistently for both user and group avatars

### Backend & Logic Fixes
- [x] **Rotation Schedule Date Calculation**: Fixed ✅
  - Now uses RecurringChoreService to properly calculate dates
  - Respects daysOfWeek configuration (Sunday, Wednesday, Friday)
  - Dates no longer jump by weeks incorrectly

- [x] **Points System for Rotation**: Fixed ✅
  - Rotation tasks give full points per person (not divided)
  - UI explanations added in CreateChoreScreen and ChoreDetailScreen

- [x] **Rotation Validation**: Fixed ✅
  - Rotation only enabled for recurring tasks
  - UI messaging updated to reflect this

- [x] **API Route Ordering**: Fixed ✅
  - Specific routes (/:id/rotation/schedule) come before general routes (/:id)
  - Duplicate routes removed

### Polish & Quality
- [x] **Navigation**: Clean flow ✅
- [x] **Empty States**: All improved ✅
- [x] **Loading States**: Consistent ✅
- [x] **Error States**: Helpful ✅
- [x] **Date Formatting**: Fixed RangeError issues ✅
- [x] **Optional Chaining**: Fixed across all screens ✅

### Remaining (Optional Polish)
- [ ] ChoreStatsScreen: Polish (already functional, optional enhancement)
- [ ] ChoreHistoryScreen: Polish (already functional, optional enhancement)

---

## 🎨 Visual Hierarchy

1. **Primary**: Main action (Create, Complete, Save)
2. **Secondary**: Supporting actions (Edit, Assign)
3. **Tertiary**: Additional info (History, Stats)
4. **Information**: Display only (Details, Stats)

---

## 📐 Layout Guidelines

- **Padding**: 16px standard, 8px tight, 24px loose
- **Gap**: 12px between cards, 8px between items
- **Card Radius**: 12px standard, 16px for hero sections
- **Button Height**: 44px minimum (iOS), 48px preferred
- **Header Height**: 56px standard

---

## 📊 Implementation Status

### ✅ Completed Screens (100%)
1. **ChoreListScreen** - Fully redesigned with all improvements
2. **ChoreDetailScreen** - Fully redesigned with all improvements
3. **CreateChoreScreen** - Fully redesigned with all improvements
4. **EditChoreScreen** - Fully redesigned with all improvements

### ✅ Completed Components
1. **Header Component** - Standardized with options menu pattern
2. **Avatar Component** - Used consistently for user and group avatars

### ✅ Completed Backend Fixes
1. **Rotation Schedule Date Calculation** - Fixed to use RecurringChoreService
2. **Points System for Rotation** - Fixed to give full points per person
3. **Rotation Validation** - Fixed to only allow for recurring tasks
4. **API Route Ordering** - Fixed to prevent route conflicts

### ✅ Completed Quality Improvements
1. **Date Formatting** - Fixed RangeError issues
2. **Optional Chaining** - Fixed across all screens
3. **Group Avatar Rendering** - Fixed across all screens
4. **Empty States** - Improved with helpful messages
5. **Loading States** - Consistent across all screens
6. **Error States** - Helpful error messages

---

## 🎉 Redesign Complete!

All core screens have been successfully redesigned with:
- Clean, minimal UI
- Consistent design language
- Organized content hierarchy
- Improved user experience
- Fixed all critical bugs
- Proper date calculations
- Correct points system

The chores feature is now production-ready with a polished, user-friendly interface!

