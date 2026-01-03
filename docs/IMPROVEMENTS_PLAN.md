# UI/UX Improvements Plan

## 1. Date Picker Implementation

### Current State
- Manual date entry using TextInput with YYYY-MM-DD format
- Used in: AddTransactionScreen, CreateBudgetScreen, EditBudgetScreen, CreateGoalScreen, EditGoalScreen, CreateChoreScreen, EditChoreScreen, CreateListingScreen

### Solution
**Library**: `@react-native-community/datetimepicker` (industry standard, works with Expo)

### Implementation Plan
1. Create reusable `DatePicker` component in `apps/mobile/src/components/DatePicker.tsx`
2. Replace all manual date inputs across:
   - Finance transactions (AddTransactionScreen)
   - Budgets (CreateBudgetScreen, EditBudgetScreen)
   - Goals (CreateGoalScreen, EditGoalScreen)
   - Chores (CreateChoreScreen, EditChoreScreen)
   - Listings (CreateListingScreen - multiple dates)
3. Features:
   - Native iOS/Android date picker UI
   - Date formatting in user's locale
   - Today button for quick selection
   - Maximum/minimum date constraints where needed

---

## 2. Enhanced Auto-Categorization

### Current State
- Basic keyword matching in `categorization.service.ts`
- Limited categories
- No visual indication when auto-selected
- Only for expenses, not chores or marketplace

### Solution
**Enhanced keyword-based categorization** with comprehensive category expansion

### Implementation Plan

#### 2.1 Expanded Expense Categories

**Food & Dining**
- Restaurants
- Fast Food
- Groceries
- Coffee Shops
- Bars & Nightlife
- Food Delivery
- Catering

**Shopping**
- Clothing & Apparel
- Electronics
- Home & Garden
- Books & Media
- Sports & Outdoors
- Pet Supplies
- General Retail

**Bills & Utilities**
- Gas & Electric (Nicor, ComEd, etc.)
- Internet & Cable (Xfinity, Comcast, AT&T, etc.)
- Phone & Mobile
- Water & Sewer
- Trash & Recycling
- Home Security

**Transportation**
- Gas & Fuel
- Public Transit
- Rideshare (Uber, Lyft)
- Parking
- Tolls
- Car Maintenance
- Auto Insurance

**Entertainment**
- Movies & Theaters
- Concerts & Events
- Streaming Services (Netflix, Spotify, etc.)
- Sports & Recreation
- Games & Hobbies

**Health & Fitness**
- Pharmacy & Medications
- Doctor & Medical
- Gym & Fitness
- Health Insurance
- Personal Care

**Education**
- Tuition
- Books & Supplies
- Courses & Training
- Software & Tools

**Travel**
- Flights
- Hotels
- Car Rentals
- Travel Insurance

**Personal**
- Gifts & Donations
- Pets
- Childcare
- Subscriptions

**Business**
- Office Supplies
- Professional Services
- Marketing & Advertising

**Other**
- Bank Fees
- Cash Withdrawal
- Transfer
- Other

#### 2.2 Enhanced Keyword Matching

**Service Providers Mapping**:
```typescript
{
  // Utilities
  'nicor': 'Gas & Electric',
  'comed': 'Gas & Electric',
  'comcast': 'Internet & Cable',
  'xfinity': 'Internet & Cable',
  'at&t': 'Internet & Cable',
  'verizon': 'Phone & Mobile',
  'tmobile': 'Phone & Mobile',
  'sprint': 'Phone & Mobile',
  
  // Services
  'netflix': 'Streaming Services',
  'spotify': 'Streaming Services',
  'disney': 'Streaming Services',
  'hulu': 'Streaming Services',
  
  // Transportation
  'uber': 'Rideshare',
  'lyft': 'Rideshare',
  
  // Retail
  'amazon': 'General Retail',
  'walmart': 'General Retail',
  'target': 'General Retail',
  
  // Food
  'doordash': 'Food Delivery',
  'ubereats': 'Food Delivery',
  'grubhub': 'Food Delivery',
  'starbucks': 'Coffee Shops',
  'mcdonalds': 'Fast Food',
}
```

**Pattern Matching**:
- Check merchant names, descriptions
- Case-insensitive matching
- Partial word matching for common terms
- Priority-based matching (specific > general)

#### 2.3 Visual Indication
- Badge/icon showing "Auto-detected" when category is auto-selected
- Highlight selected category chip differently when auto-detected
- Allow manual override (user can change)

#### 2.4 Chore Categories

- Cleaning (Kitchen, Bathroom, Living Room, etc.)
- Maintenance (Plumbing, Electrical, Appliance)
- Outdoor (Yard Work, Trash, Snow Removal)
- Shopping & Errands
- Cooking & Meal Prep
- Laundry
- Organization
- Pet Care
- Other

#### 2.5 Marketplace Listing Categories

**Roommate Listings**:
- Apartment
- House
- Room
- Studio

**Accommodation Listings**:
- Short-term Rental
- Sublet
- Vacation Rental

**Item Listings**:
- Furniture
- Electronics
- Appliances
- Clothing & Accessories
- Books & Media
- Sports & Outdoors
- Home & Garden
- Vehicles
- Other

**Event Listings**:
- Social
- Professional
- Educational
- Sports & Fitness
- Entertainment
- Community

**Ride Listings**:
- Commute
- Long Distance
- Airport
- Event

---

## 3. Custom Icon System

### Strategy
Create a comprehensive icon library that:
1. Provides consistent visual language across the app
2. Supports categories, actions, and feature areas
3. Is scalable and maintainable
4. Uses SVG for crisp display at any size

### Implementation Plan

#### Phase 1: Category Icons (Priority)
Create custom SVG icons for all expense, chore, and marketplace categories.

**Design Principles**:
- Minimal, modern style
- Consistent stroke width
- Recognizable at small sizes (24px)
- Support for light/dark themes

**Icon Library Structure**:
```
apps/mobile/src/assets/icons/
  categories/
    expense/
      restaurants.svg
      groceries.svg
      utilities.svg
      ...
    chore/
      cleaning.svg
      maintenance.svg
      ...
    marketplace/
      furniture.svg
      electronics.svg
      ...
  actions/
    add.svg
    edit.svg
    delete.svg
    ...
  features/
    finance.svg
    expenses.svg
    budgets.svg
    ...
```

#### Phase 2: Component Implementation
Create `Icon` component that:
- Loads SVG icons dynamically
- Supports sizing (xs, sm, md, lg, xl)
- Supports color theming
- Caches icons for performance

#### Phase 3: Integration
- Replace MaterialIcons for categories with custom icons
- Add icons to category chips/selectors
- Add icons to navigation
- Add icons to empty states

#### Phase 4: Expansion
- Feature icons (finance, chores, etc.)
- Action icons (add, edit, delete, etc.)
- Status icons (completed, pending, etc.)

### Icon Design Tools
- Figma/Sketch for design
- Export as SVG
- Optimize SVGs (svgo)
- Consider using react-native-svg for rendering

### Future Considerations
- Icon animation support
- Themed icon sets (outline, filled, rounded)
- Custom icon upload for user-created categories

---

## Implementation Priority

1. **Date Picker** (High Priority - UX Critical)
   - Week 1: Component creation and testing
   - Week 1: Replace in all forms

2. **Auto-Categorization** (High Priority - User Value)
   - Week 1: Expand categories and keyword matching
   - Week 1: Visual indication
   - Week 2: Apply to chores and marketplace

3. **Icon System** (Medium Priority - Polish)
   - Week 2-3: Design and create category icons
   - Week 3: Component implementation
   - Week 4: Integration across app

---

## Files to Update

### Date Picker
- `apps/mobile/src/components/DatePicker.tsx` (new)
- All Create/Edit screens with date inputs

### Auto-Categorization
- `apps/backend/src/shared/categorization.service.ts`
- `apps/mobile/src/screens/AddTransactionScreen.tsx`
- `apps/mobile/src/screens/CreateExpenseScreen.tsx`
- `apps/mobile/src/screens/EditExpenseScreen.tsx`
- `apps/mobile/src/screens/CreateChoreScreen.tsx`
- `apps/mobile/src/screens/CreateListingScreen.tsx`

### Icons
- `apps/mobile/src/components/Icon.tsx` (new)
- `apps/mobile/src/assets/icons/` (new directory)
- All screens with category selection
- Navigation components

