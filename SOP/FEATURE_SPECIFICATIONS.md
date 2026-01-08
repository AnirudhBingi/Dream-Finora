# Feature Specifications

## Overview

This document provides detailed specifications for all features in Dream Finora. Each feature includes user stories, technical requirements, and design considerations.

---

## Implementation Philosophy

### Proactive Feature Development

**Core Principle:** While following the roadmap, always think critically about logical features that enhance UX and align with the vision. Don't just implement what's explicitly listed—implement what makes sense.

**Key Guidelines:**

1. **Detail Screen Pattern:**
   - Every list should have tappable items that navigate to a dedicated detail screen
   - Detail screens show full information and contain all action buttons (edit, delete, history, etc.)
   - List screens remain clean with minimal actions (maybe a quick view indicator)
   - **Example:** Expense List → Tap expense → Expense Detail → Edit/Delete/History buttons

2. **Action Placement Logic:**
   - Edit/Delete actions belong on detail screens, not list screens
   - This keeps lists uncluttered and provides better context for actions
   - Users can see full information before making changes

3. **Navigation Flow:**
   - Logical flow: List → Detail → Edit/History
   - Proper back navigation maintains context
   - Edit screen returns to detail screen (not list) after save

4. **Fundamental Features:**
   - Implement basic logical features even if not explicitly in roadmap:
     - Detail views for all entities
     - Proper navigation between screens
     - Action buttons in appropriate locations
     - Empty states, loading states, error handling

5. **Consistency Across Features:**
   - Apply the same patterns to all features:
     - Expenses: List → Detail → Edit/Delete/History
     - Chores: List → Detail → Edit/Delete/History
     - Groups: List → Detail → Edit/Delete/Manage
     - Listings: List → Detail → Edit/Delete/Interactions
     - Messages: List → Thread → Edit/Delete

6. **UX Enhancements:**
   - Add features that align with the vision and improve user experience
   - Think about what users would logically expect
   - Don't wait for roadmap to include obvious improvements

**When to Implement:**
- ✅ If it's a fundamental feature (detail view, navigation)
- ✅ If it improves UX significantly (cleaner lists, better organization)
- ✅ If it aligns with the vision (social, trustworthy, seamless)
- ✅ If it's a logical next step (can't edit without seeing details first)
- ✅ If it maintains consistency with other features

**When to Defer:**
- ❌ If it's a major feature that requires significant planning
- ❌ If it conflicts with roadmap priorities
- ❌ If it adds unnecessary complexity

---

## 0. Reusable UI Components

### 0.1 Avatar Component

**Description:** Standardized user profile picture rendering component used across the entire application. Ensures consistency, reliability, and professional appearance inspired by Facebook and Instagram patterns.

**Location:** `apps/mobile/src/components/Avatar.tsx`

**Features:**
- Automatic URL processing (handles relative and absolute URLs)
- Graceful fallback to colored initials circle when image unavailable
- Consistent color generation per user (hash-based, same user = same color)
- Configurable size, borders, and custom styling
- Error handling with automatic fallback to initials
- Image loading with onError fallback

**Technical Requirements:**
- Uses centralized `getAvatarUrl` utility (`apps/mobile/src/utils/avatar.ts`)
- Handles null/undefined avatar URLs gracefully
- Supports standard sizes: 32px (small/chips), 48px (default), 64px (large/profile)
- Generates consistent background colors from display name hash
- Extracts initials from display name (first letter of each word, max 2)

**Component Props:**
```typescript
interface AvatarProps {
  avatarUrl: string | null | undefined;
  displayName: string;
  size?: number; // default: 48
  style?: ViewStyle;
  textStyle?: TextStyle;
  borderColor?: string; // default: 'transparent'
  borderWidth?: number; // default: 0
}
```

**Usage Pattern:**
```tsx
import { Avatar } from '../components/Avatar';

<Avatar
  avatarUrl={user?.profile?.avatarUrl}
  displayName={user?.profile?.displayName || user?.email || 'Unknown'}
  size={48}
/>
```

**Best Practices:**
1. Always use Avatar component for user profile pictures
2. Never create custom avatar rendering logic
3. Always provide displayName fallback (email if displayName missing)
4. Use standard sizes for consistency
5. Component handles null/undefined gracefully

**Screens Using Avatar Component:**
- FriendsListScreen
- BalanceSummaryScreen
- BillchopFriendsScreen
- ParticipantPicker (friends and group members)
- All future screens displaying user avatars

**Utility Function:**
- `getAvatarUrl` (`apps/mobile/src/utils/avatar.ts`) - Centralized URL processing
  - Handles relative paths (prepends API base URL)
  - Handles absolute URLs (returns as-is)
  - Returns null for invalid/missing URLs

**Design Considerations:**
- Consistent appearance across all screens
- Professional fallback (colored initials, not broken images)
- Fast loading with proper error handling
- Visual consistency (same styling everywhere)
- Accessibility (proper sizing, clear visuals)

**See:** `docs/AVATAR_RENDERING_PATTERN.md` for complete documentation

---

## 1. User Profile & Account System

### 1.1 User Profile

**Description:** Social media-style profile showing user reliability score, activity, and connections.

**Features:**
- Display name, profile picture, bio
- Verified badge (for identity verification)
- Trust score (prominently displayed)
- Mutual friends count
- Friend list (with privacy controls)
- Listings created count
- Activity feed/achievements

**User Stories:**
- As a user, I want to see my trust score so I understand how reliable I appear to others
- As a user, I want to see mutual friends so I can find connections
- As a user, I want to verify my identity so others trust me more
- As a potential roommate, I want to see someone's trust score before adding them

**Technical Requirements:**
- Profile data in `UserProfile` table
- Image upload to S3/Cloudinary
- Privacy settings (who can see profile, trust score visibility)
- Backend endpoint: `GET /profile/:userId` for other user's profile
- Privacy enforcement (profile visibility, trust score visibility)
- Mutual friends calculation
- Listings count (public only)
- Shared groups count
- Real-time score updates
- Navigation from all user name locations throughout app
- **Avatar rendering:** Use standardized `Avatar` component (see Section 0.1)

**Design Considerations:**
- Score displayed prominently but not intimidating
- Instagram/Facebook-inspired layout (familiar UX)
- Trust score breakdown visible (expenses, chores, listings)

---

### 1.2 Trust Score System

**Description:** Comprehensive reliability score based on multiple factors.

**Score Components:**

1. **Expense Score (40% weight)**
   - On-time settlement rate
   - Average days to settle
   - Number of settled expenses
   - Recent activity (more weight on recent)
   - Formula: `(onTimeRate * 0.5 + recencyBonus * 0.3 + volumeBonus * 0.2) * 40`

2. **Chore Score (30% weight)**
   - Completion rate (35%): Percentage of assigned chores completed
   - On-time completion rate (25%): Percentage of chores completed before deadline
   - Points earned (20%): Normalized total points (1000+ points = 1.0)
   - Streak bonus (10%): Current consecutive day streak (30+ days = 1.0)
   - Achievements bonus (10%): Percentage of achievements unlocked (12 total achievements)
   - Formula: `(completionRate * 0.35 + onTimeRate * 0.25 + pointsBonus * 0.20 + streakBonus * 0.10 + achievementsBonus * 0.10) * 30`

3. **Community Score (30% weight)**
   - Listings created
   - Listings completed/successful
   - Community engagement (messages, interactions)
   - Response rate to messages
   - Formula: `(listingSuccessRate * 0.5 + engagementRate * 0.3 + responseRate * 0.2) * 30`

**Total Score:** 0-100 (displayed as 0-5 stars for simplicity)

**Score Updates:**
- Real-time calculation (cached, updated daily)
- Score history visible to user
- Transparent breakdown available
- Can improve by completing actions

**Technical Requirements:**
- Background job to recalculate scores daily
- Caching for performance
- Score history table
- API endpoint to get score breakdown

**User Stories:**
- As a user, I want to see my score breakdown so I know how to improve
- As a user, I want my score to improve when I settle expenses on time
- As a potential friend, I want to see someone's score before adding them

---

## 2. Expense Splitting (Billchop)

### 2.1 Basic Expense Splitting

**Description:** Create, split, and settle expenses within groups or between friends.

**Features:**
- Create expense (amount, description, date, category, currency)
- Split equally or custom amounts
- Split by percentage
- Add participants (from group or friends)
- Receipt attachment (image upload)
- Mark individual splits as paid
- Edit expense (amount, description, date, category, participants)
- Delete expense (with confirmation, notifies participants)
- View expense history (creation, edits, settlements)
- Currency support (multi-currency expenses)

**User Stories:**
- As a user, I want to split a $100 dinner 3 ways equally
- As a user, I want to create custom splits (user A pays $40, B pays $60)
- As a user, I want to see who owes me money
- As a user, I want to settle up with someone
- As a user, I want to edit an expense if I made a mistake
- As a user, I want to delete an expense if it was created incorrectly
- As a user, I want to see the history of changes to an expense
- As a user, I want to attach a receipt to an expense

**Technical Requirements:**
- `Expense` and `ExpenseSplit` tables
- `Settlement` table for tracking settlements
- Real-time updates via WebSocket (optional)
- Currency support with conversion
- Notification on new expense, edit, deletion
- Edit/delete permissions (creator or group admin)
- Expense history tracking

**Settlement Flow:**
1. User views balance summary (owed to you, you owe, net)
2. User selects person to settle with
3. System shows simplified debts (if applicable)
4. User enters payment method (Cash, Venmo, PayPal, Bank Transfer, Other)
5. User enters amount (pre-filled with balance)
6. User confirms settlement
7. Create settlement record
8. Mark related expense splits as paid
9. Update user trust scores
10. Send notifications to all participants

**Debt Simplification:**
- Algorithm to minimize number of transactions
- Shows simplified debt graph
- Reduces complex debt webs to minimal transactions
- Visual before/after comparison

---

### 2.2 Groups

**Description:** Create groups for shared expenses (roommates, friends, trips).

**Features:**
- Create group with name, description, icon (12 predefined icons)
- Edit group (name, description, icon) - admin only
- Delete group - admin only, with confirmation
- Add/remove members (from friends list, by email, or by mobile number)
- Invite members by email or mobile number (even if not registered users)
- Group invitation system (invite, accept, decline)
- Set roles (admin, member)
- Change member roles (admin can promote/demote)
- Transfer group ownership
- Leave group (member option)
- Group expenses list (filterable, sortable)
- Group chores list
- Group rideshare list
- Group balance summary (total owed/owed to group, by member)
- Group history (member additions/removals, role changes, expenses/chores)
- View group detail screen
- Group settings screen
- Add group member screen (with tabs for friends and email/phone invitation)

**User Stories:**
- As a user, I want to create a "Roommates" group
- As a user, I want to add my roommates to a group
- As a user, I want to see all expenses in a group
- As a user, I want to see the group's balance summary
- As an admin, I want to edit group details
- As an admin, I want to remove members from a group
- As an admin, I want to change member roles
- As a member, I want to leave a group
- As a user, I want to see the history of group activities

**Technical Requirements:**
- `Group` and `GroupMember` tables
- `GroupInvitation` table (groupId, senderId, recipientId, email, mobileNumber, token, status, expiresAt)
- `GroupHistory` table for tracking changes
- Permission system (who can add expenses, edit group)
- Cascade handling on group deletion (expenses, chores remain but group reference removed)
- Notification on member addition/removal, role changes, invitations
- Email/SMS service integration for group invitations
- Deep linking support for group invitation acceptance
- Group chat integration (future)

---

### 2.3 AI Receipt Scanning

**Description:** Scan receipts with AI to automatically extract expense details.

**Features:**
- Take photo of receipt
- AI extracts: merchant, amount, date, items
- Auto-categorize expense
- Suggest split (based on history)
- Manual correction available
- Multi-language support

**User Stories:**
- As a user, I want to scan a grocery receipt and have it automatically split
- As a user, I want the AI to remember my usual splits
- As a user, I want to correct any mistakes the AI makes

**Technical Requirements:**
- OCR service: Google Cloud Vision API or AWS Textract
- Image upload to S3
- AI categorization model (train on user data)
- Free tier: 10 scans/month, Premium: unlimited

**AI Accuracy:**
- Target: 95%+ accuracy on common receipt formats
- Fallback to manual entry if confidence low
- Learn from user corrections

**Design Considerations:**
- Show confidence score
- Easy manual override
- Progress indicator during scan
- Preview before confirming

---

## 3. Chore Management

### 3.1 Task Creation & Assignment

**Description:** Create, assign, and complete household chores.

**Features:**
- Create chore (title, description, points, deadline, category, group)
- Edit chore (title, description, points, deadline, assignment, category)
- Delete chore (with confirmation, notifies assignee if assigned)
- Assign to specific person or leave unassigned
- Unassign chore (make available for anyone)
- Points system (base points + bonus for unassigned)
- Streak tracking (consecutive completions)
- Achievements system (badges for milestones)
- Visual progress tracking (completion meters, cleanliness indicators)
- Recurring chores (daily, weekly, monthly)
- Chore categories (cleaning, maintenance, etc.)
- Chore history (creation, edits, completions, assignments)
- Chore analytics (completion rate, on-time rate, points earned, top chores)

**User Stories:**
- As a user, I want to create a "Take out trash" chore worth 10 points
- As a user, I want to assign a chore to a specific roommate
- As a user, I want to grab an unassigned chore for bonus points
- As a user, I want to see all chores in my group
- As a user, I want to edit a chore if I made a mistake
- As a user, I want to delete a chore if it's no longer needed
- As a user, I want to see my streak for completing chores
- As a user, I want to see achievements I've unlocked
- As a user, I want to see visual progress of completed chores
- As a user, I want to see chore analytics and stats

**Technical Requirements:**
- `Chore` table with status, assignment, points, category
- `ChoreCompletion` history table
- `ChoreHistory` table for tracking edits
- `ChoreStreak` table for streak tracking
- `Achievement` table for gamification
- Real-time updates (optional)
- Notification on assignment/completion/edit/deletion
- Permissions (creator or group admin can edit/delete)

**Points System:**
- Base points: Set by creator (5-50 typical)
- Bonus points: +50% for unassigned tasks
- Streak bonus: Extra points for consecutive completions (+10% per streak day, max +50%)
- Weekly leaderboard (optional, privacy-conscious, group-level only)
- Points history tracking

**Gamification:**
- Streaks: Track consecutive completions, show current streak, milestones
- Achievements: Badges for first chore, streak milestones (7-day, 30-day, etc.), completion milestones
- Visual progress: Progress bars, cleanliness meters, color-coded status
- Leaderboards: Optional, group-level only, respects privacy settings

---

### 3.2 Chore Scoring Integration

**Description:** Chore completions contribute to trust score (30% of total reliability score).

**Scoring Factors:**

1. **Completion Rate (35% of chore score)**
   - Measures reliability: Did the user complete assigned chores?
   - Formula: `completedChores / assignedChores`
   - Range: 0.0 to 1.0
   - Example: 8 out of 10 chores completed = 0.8 (80%)

2. **On-Time Rate (25% of chore score)**
   - Measures punctuality: Were chores completed before deadline?
   - Formula: `onTimeCompletions / totalCompletions`
   - Range: 0.0 to 1.0
   - Example: 7 out of 8 completions on time = 0.875 (87.5%)

3. **Points Bonus (20% of chore score)**
   - Measures activity level: Total points earned from chore completions
   - Formula: `min(totalPoints / 1000, 1.0)`
   - Range: 0.0 to 1.0
   - Example: 500 points = 0.5, 1000+ points = 1.0

4. **Streak Bonus (10% of chore score)**
   - Measures consistency: Consecutive days with at least one completion
   - Formula: `min(currentStreak / 30, 1.0)`
   - Range: 0.0 to 1.0
   - Example: 15-day streak = 0.5, 30+ day streak = 1.0
   - Encourages daily engagement and habit formation

5. **Achievements Bonus (10% of chore score)**
   - Measures progress: Percentage of achievements unlocked
   - Total achievements: 12
     - First Steps (1 completion)
     - Getting Started (10 completions)
     - Dedicated Helper (50 completions)
     - Chore Master (100 completions)
     - Point Collector (100 points)
     - Point Champion (500 points)
     - Point Legend (1000 points)
     - On a Roll (3-day streak)
     - Week Warrior (7-day streak)
     - Monthly Master (30-day streak)
     - Perfect Timing (10+ chores all on time)
   - Formula: `unlockedAchievements / 12`
   - Range: 0.0 to 1.0
   - Example: 6 achievements unlocked = 0.5 (50%)

**Chore Score Calculation:**
```
rawChoreScore = (
  completionRate * 0.35 +
  onTimeRate * 0.25 +
  pointsBonus * 0.20 +
  streakBonus * 0.10 +
  achievementsBonus * 0.10
) * 100

finalChoreScore = rawChoreScore * 0.30  // 30% weight in total trust score
```

**Score Updates:**
- Automatically recalculated when a chore is completed
- Updated via `TrustScoreService.updateChoreScore(userId)`
- Score history tracked for transparency
- Real-time updates visible in user profile

**Technical Requirements:**
- Recalculate user score on chore completion
- Cache scores for performance (recalculated daily)
- Show chore contribution breakdown in profile
- Track score history for user transparency
- Handle edge cases (no assigned chores, no completions, etc.)

**Edge Cases:**
- User with no assigned chores: Uses all completions for points/streak/achievements
- User with no completions: All factors = 0, raw score = 0
- User with only grabbed chores: Completion rate = 0, but other factors still count
- Streak calculation: Handles timezone and date boundaries correctly

---

## 4. Rideshare

### 4.1 Give Ride

**Description:** Driver charges passengers for a ride.

**Features:**
- Create ride (origin, destination, date, charge type, amount)
- Edit ride (origin, destination, date, charge type, amount, passengers)
- Delete ride (with confirmation, removes related expense)
- Set charge type: per mile or per ride
- Add passengers (from friends or group)
- Calculate total cost
- Auto-add to expense splitting (creates expense)
- Ride history (creation, edits, deletion)
- Notification on ride creation/edit/deletion

**User Stories:**
- As a driver, I want to charge $0.50 per mile for a ride
- As a driver, I want to charge $10 per ride for a quick trip
- As a driver, I want expenses automatically added to "owes you"
- As a driver, I want to edit a ride if I made a mistake
- As a driver, I want to delete a ride if it was created incorrectly
- As a passenger, I want to be notified when a ride is created

**Technical Requirements:**
- `Ride` table with type, location, cost, participants
- `RideHistory` table for tracking changes
- Distance calculation (Google Maps API, optional for per-mile)
- Auto-create expense in expense splitting
- Integration with expense module
- Permissions (creator can edit/delete)

---

### 4.2 Rideshare (Cost Sharing)

**Description:** Driver shares ride cost with passengers.

**Features:**
- Same as Give Ride, but driver also pays their share
- Cost split among all participants (driver included)
- Auto-add split to expense splitting

**User Stories:**
- As a user, I want to split Uber cost 3 ways (including me)
- As a user, I want this automatically tracked in my expenses

---

### 4.3 Favorite Riders & Quick Ride

**Description:** Save frequent riders with preset charges for one-tap charging.

**Features:**
- Add friend as favorite rider
- Set preset charge (e.g., $5 to college)
- Quick ride button (one tap = charge + add expense)

**User Stories:**
- As a driver, I want to save my roommate as a favorite rider
- As a driver, I want one tap to charge $5 and add it to expenses
- As a driver, I want to see my favorite riders list

**Technical Requirements:**
- `FavoriteRider` table
- Quick action UI component
- Auto-expense creation

---

## 5. Listings

### 5.1 Listing Types

**Description:** Users can create various types of listings.

**Types:**
1. **Find Roommate** - Looking for or offering roommate position
2. **Find Accommodation** - Looking for or offering room/apartment
3. **Item Listing** - Buy/sell items
4. **Event** - Create events (like MSVP)
5. **Ride Available** - Offer ride to location

**Features:**
- Create listing with title, description, images
- Location (address or city)
- Price (if applicable)
- Status (active, completed, closed)
- Contact/interaction options

**User Stories:**
- As a user, I want to create a "Looking for Roommate" listing
- As a user, I want to browse available rooms near me
- As a user, I want to create an event and invite friends
- As a user, I want to see someone's trust score on their listing

**Technical Requirements:**
- `Listing` table with type, location, status
- Image upload (multiple images)
- Search/filter functionality
- Location-based search (geocoding)

---

### 5.2 Listing Interactions

**Description:** Users can interact with listings.

**Features:**
- View listing (track views for analytics)
- Contact creator (opens chat/message)
- Favorite/bookmark listings (heart icon, toggle favorite)
- Share listing (generate shareable link, native share dialog)
- Comment on listing (add comments, edit own comments, delete own comments)
- Edit listing (title, description, price, location, images) - creator only
- Delete listing (with confirmation) - creator only, notifies favorited users
- View listing history (creation, edits, view count, favorite count)
- Filter and search listings (by type, location, price range)
- Favorites list screen (all favorited listings)

**User Stories:**
- As a user, I want to contact a listing creator
- As a user, I want to save listings I'm interested in
- As a user, I want to see how many people viewed my listing
- As a user, I want to share a listing with friends
- As a user, I want to comment on listings to ask questions
- As a user, I want to edit my listing if I made a mistake
- As a user, I want to delete my listing if it's no longer available
- As a user, I want to see all my favorited listings in one place

**Scoring:**
- Creating listings: +5 points
- Successful listing (roommate found, etc.): +20 points
- Engagement (views, contacts, favorites, comments): +2 points each
- View tracking for analytics (creator sees view count)

**Technical Requirements:**
- `ListingFavorite` table (userId, listingId)
- `ListingComment` table (listingId, userId, content, timestamps)
- `ListingView` table for tracking views (optional, can use analytics)
- `ListingHistory` table for tracking edits
- Notification on listing comment, favorite (notify creator)
- Permissions (creator can edit/delete, anyone can favorite/comment)

---

## 6. Personal Finance

### 6.1 Multi-Currency Finance

**Description:** Finance tracking with direct transaction management in multiple currencies (local + home country). Accounts are optional - users can record transactions directly or organize them using accounts.

**Features:**
- Create transactions directly (income or expense) with context (local/home)
- Create accounts (optional) to organize transactions by account type
- Edit transaction (amount, category, description, date, context, accountId)
- Delete transaction (with confirmation)
- Edit/Delete accounts (full account management)
- Transactions track context (local or home country)
- Transactions can be linked to accounts (optional) or standalone
- Currency is determined by context (primaryCurrency for local, homeCountryCurrency for home)
- Total balance view (calculated from transactions, converted to primary currency for combined view)
- Set primary currency and home country currency (in settings)
- Currency conversion service (real-time rates)
- Historical rates for past transactions
- Transaction history (creation, edits, deletions)
- Balance over time tracking (calculated from transactions)

**User Stories:**
- As an international student, I want to track USD expenses and INR income
- As a user, I want to see my total balance in my local currency
- As a user, I want real-time currency conversion for combined view
- As a user, I want to set my primary currency and home country currency preferences
- As a user, I want to edit a transaction if I made a mistake
- As a user, I want to delete a transaction if it was incorrect
- As a user, I want to track finances separately for local and home country contexts

**Technical Requirements:**
- Currency conversion API (ExchangeRate-API or fixer.io)
- Cache exchange rates (update hourly)
- `FinanceTransaction` table (direct user reference, accounts optional)
  - `userId` field (direct reference)
  - `context` field (local/home)
  - `accountId` field (optional - transactions can be linked to accounts or standalone)
- `FinanceAccount` table (optional account management)
  - Users can create accounts to organize transactions
  - Accounts support context (local/home) and account types
  - Full CRUD operations available (create, read, update, delete)
- `UserProfile` table with `primaryCurrency` and `homeCountryCurrency` fields
- Balance calculated from transactions (sum of income - sum of expenses per context)
- Combined balance with currency conversion
- Store original currency context with transactions (determined by context)
- Use historical rates for past transactions (preserve original value)

**Currency Support:**
- All major currencies (USD, EUR, GBP, INR, etc.)
- Historical rates for past transactions (preserve original value)
- Manual rate override (if needed, for edge cases)
- Currency picker in transaction creation (determined by context)
- Currency indicators throughout UI

**Note:** Accounts are optional but fully implemented. Users can record transactions directly (without accounts) or organize them using accounts. Both approaches are supported. Account management includes full CRUD operations (create, read, update, delete accounts).

---

### 6.2 Budget Management

**Description:** Comprehensive budget management with tracking, period-based budgets, and context support.

**Features:**
- Create budgets (name, amount, period, category, context)
- Edit budgets (all fields editable)
- Delete budgets (with confirmation)
- Period-based budgets (weekly, monthly, yearly, custom)
- Category-based budgets (food, transport, entertainment, etc.)
- Budget tracking (automatic spending calculation)
- Budget performance analytics (adherence rate, budgets exceeded)
- Context support (local/home country finances)
- Budget warnings when approaching or exceeding limits
- Visual progress indicators (progress bars, color coding)

**User Stories:**
- As a user, I want to set a $500/month food budget for my local expenses
- As a user, I want to see how much I've spent vs. my budget
- As a user, I want warnings when I'm approaching my budget limit
- As a user, I want to track budgets separately for local and home country finances
- As a user, I want to edit or delete a budget if my situation changes

**Technical Requirements:**
- `Budget` model with context, period, category, amount fields
- `BudgetTracking` model for period-based tracking
- Budget CRUD endpoints (Create, Read, Update, Delete)
- Budget tracking service (automatic spending calculation)
- Budget performance analytics (adherence rate calculation)
- Real-time budget tracking (updates on transaction creation/edit/deletion)
- Budget linking to transactions (optional budgetId field)
- Currency support (budgets use context currency - primaryCurrency for local, homeCountryCurrency for home)
- API Endpoints:
  - `POST /finance/budgets` - Create budget
  - `GET /finance/budgets` - List budgets (filter by context)
  - `GET /finance/budgets/:id` - Get budget details
  - `PUT /finance/budgets/:id` - Update budget
  - `DELETE /finance/budgets/:id` - Delete budget
  - `GET /finance/budgets/:id/tracking` - Get budget tracking

---

### 6.3 Financial Goals

**Description:** Set and track financial goals with progress monitoring and contributions.

**Features:**
- Create goals (name, target amount, category, priority, deadline, context)
- Edit goals (all fields editable)
- Delete goals (with confirmation)
- Goal categories (savings, debt, purchase, investment)
- Priority levels (low, medium, high)
- Track progress with contributions
- Goal progress calculation (percentage complete)
- Goal progress analytics (completion rate)
- Context support (local/home country finances)
- Visual progress indicators (progress bars)
- Pre-fill support (from advisor recommendations)

**User Stories:**
- As a user, I want to save $5000 for a trip (savings goal)
- As a user, I want to track my progress toward my goal
- As a user, I want to add contributions to my goal
- As a user, I want to see how close I am to completing my goal
- As a user, I want to set goals for both my local and home country finances

**Technical Requirements:**
- `FinancialGoal` model with context, category, priority, targetAmount, currentAmount fields
- `GoalContribution` model for tracking contributions
- Goal CRUD endpoints (Create, Read, Update, Delete)
- Goal contribution endpoint (`POST /finance/goals/:id/contribute`)
- Goal progress calculation (currentAmount / targetAmount)
- Goal analytics (completion rate, progress percentage)
- Goal linking to transactions (optional goalId field)
- Currency support (goals use context currency - primaryCurrency for local, homeCountryCurrency for home)
- API Endpoints:
  - `POST /finance/goals` - Create goal
  - `GET /finance/goals` - List goals (filter by context)
  - `GET /finance/goals/:id` - Get goal details
  - `PUT /finance/goals/:id` - Update goal
  - `DELETE /finance/goals/:id` - Delete goal
  - `POST /finance/goals/:id/contribute` - Add contribution

---

### 6.4 Loans Management

**Description:** Track and manage loans with payment tracking and progress monitoring.

**Features:**
- Create loans (name, principal amount, interest rate, term, start date, context)
- Edit loans (all fields editable)
- Delete loans (with confirmation)
- Track loan payments
- EMI calculation
- Remaining amount tracking
- Loan summary analytics (total loans, remaining, progress)
- Context support (local/home country finances)
- Visual progress indicators (progress bars)
- Suggested payment amount support (from advisor recommendations)

**User Stories:**
- As a user, I want to track my student loan with payments
- As a user, I want to see my remaining loan balance
- As a user, I want to record loan payments
- As a user, I want to see how much I've paid off
- As a user, I want to track loans for both local and home country finances

**Technical Requirements:**
- `Loan` model with context, principalAmount, interestRate, term, remainingAmount fields
- `LoanPayment` model for tracking payments
- Loan CRUD endpoints (Create, Read, Update, Delete)
- Loan payment recording endpoint (`POST /finance/loans/:id/payments`)
- EMI calculation (principal * (interestRate / 12) / (1 - (1 + interestRate / 12)^(-term)))
- Remaining amount tracking (principal - sum of payments)
- Loan summary analytics (total loans, total remaining, progress)
- Loan linking to transactions (optional loanId field)
- Currency support (loans use context currency - primaryCurrency for local, homeCountryCurrency for home)
- API Endpoints:
  - `POST /finance/loans` - Create loan
  - `GET /finance/loans` - List loans (filter by context)
  - `GET /finance/loans/:id` - Get loan details
  - `PUT /finance/loans/:id` - Update loan
  - `DELETE /finance/loans/:id` - Delete loan
  - `POST /finance/loans/:id/payments` - Record payment

---

### 6.5 Privacy

**Description:** Personal finance section is completely private.

**Features:**
- No sharing of finance data
- Not visible in profile
- Not included in trust score (expense splitting score is separate)
- Optional: Share anonymous insights ("I save 20% of income")

**Technical Requirements:**
- Strict authorization checks
- No finance data in public APIs
- Separate from expense splitting data

---

## 7. Analytics & Insights

### 7.1 Expense Analytics

**Description:** Visualize spending patterns for split expenses.

**Features:**
- Pie charts by category
- Spending trends over time
- Top spenders in group
- Comparison with previous periods

**User Stories:**
- As a user, I want to see my spending by category
- As a user, I want to see if I'm spending more this month
- As a user, I want to compare my spending with my group

**Technical Requirements:**
- Pre-computed analytics (updated daily)
- Chart library (recharts or Victory)
- Date range filters
- Export to PDF/CSV (premium)

---

### 7.2 Personal Finance Analytics

**Description:** Comprehensive analytics and insights for personal finance (private).

**Features:**
- Context-based analytics (local/home/combined views)
- Income vs. expenses analysis (with savings rate calculation)
- Spending by category (pie chart data)
- Monthly trends (spending over time, line charts)
- Balance over time (calculated from transactions, shows balance trends)
- Budget performance summary (adherence rate, budgets exceeded)
- Goals progress summary (completion rate, progress percentage)
- Loan summary (total loans, remaining, progress)
- Currency conversion for combined view
- Date range filtering
- Visual charts and graphs

**User Stories:**
- As a user, I want to see my spending patterns by category
- As a user, I want to see if I'm spending more this month
- As a user, I want to see my income vs. expenses with savings rate
- As a user, I want to see my budget performance
- As a user, I want to see my goals progress
- As a user, I want to see my loan summary
- As a user, I want to view analytics separately for local and home finances
- As a user, I want a combined view with currency conversion

**Technical Requirements:**
- Context-based analytics endpoints:
  - `GET /finance/analytics/local` - Local finance analytics
  - `GET /finance/analytics/home` - Home country finance analytics
  - `GET /finance/analytics/combined` - Combined analytics with currency conversion
- Analytics include:
  - Income vs expenses with savings rate
  - Spending by category (pie chart data)
  - Monthly trends (spending over time)
  - Balance over time
  - Budget performance summary
  - Goals progress summary
  - Loan summary
- Chart library (recharts or Victory)
- Currency conversion for combined view
- Date range filtering support

---

## 8. AI-Powered Financial Advisor

### 8.1 Personalized Recommendations

**Description:** AI-powered financial advisor providing personalized recommendations, health score, and actionable insights.

**Features:**
- Financial health score (0-100) with detailed breakdown:
  - Budget adherence score
  - Goal progress score
  - Savings rate score
  - Debt-to-income ratio
  - Emergency fund score
- Personalized recommendations based on:
  - Budget adherence analysis
  - Goal progress analysis
  - Spending patterns
  - Savings rate
  - Debt analysis
  - Emergency fund status
- Trends analysis (spending, income, savings over time)
- Projections (budget burn rate, goal completion timeline, emergency fund target)
- Actionable insights with navigation to relevant screens
- Context support (local/home/combined)
- Deep linking from recommendations to relevant screens
- Pre-filled data support for goal creation and loan payments

**User Stories:**
- As a user, I want to see my financial health score with breakdown
- As a user, I want personalized recommendations to improve my finances
- As a user, I want to see trends in my spending and savings
- As a user, I want projections for my goals and budgets
- As a user, I want actionable insights I can act on immediately
- As a user, I want to navigate directly to relevant screens from recommendations

**Technical Requirements:**
- `FinancialAdvisorService` with recommendation engine
- Financial health score calculation (0-100) with breakdown
- Recommendation engine analyzing user financial data
- Trends calculation (spending, income, savings over time)
- Projections calculation (budget burn rate, goal completion, emergency fund target)
- API Endpoints:
  - `GET /finance/advisor/recommendations` - Get personalized recommendations
  - `GET /finance/advisor/health-score` - Get financial health score
- Context support (local/home/combined)
- Deep linking support for navigation

**User Stories:**
- As a user, I want to know if I'm spending too much on food
- As a user, I want suggestions on how to save more
- As a user, I want to learn about budgeting

**Technical Requirements:**
- AI service: OpenAI GPT-4 or Anthropic Claude
- Context: User's finance data (anonymized)
- Prompt engineering for financial advice
- Rate limiting (premium feature)

**Coaching Topics:**
- Budget optimization
- Savings strategies
- Debt management
- Investment basics
- Emergency fund planning

---

## 9. Messaging & Communication

### 9.1 Chat System

**Description:** Direct messaging and group chats.

**Features:**
- Direct messages (1-on-1)
- Group chats (future - Phase 2)
- Chat from listings (contact creator)
- Send message
- Edit message (within time limit, e.g., 5 minutes, shows "edited" indicator)
- Delete message (soft delete shows "Message deleted" or hard delete)
- Read receipts (sent, delivered, read timestamps)
- Typing indicators (future)
- Media sharing (images - future)
- Message history (view all messages, edit history, deletion tracking)
- Conversation list (inbox-style)
- Unread message count badges

**User Stories:**
- As a user, I want to message a friend
- As a user, I want to chat about a listing
- As a user, I want to edit a message if I made a typo (within time limit)
- As a user, I want to delete a message I sent
- As a user, I want to see if my message was read
- As a user, I want to see all my conversations in one place

**Technical Requirements:**
- WebSocket for real-time messages (optional, can use polling)
- `Chat` and `Message` tables
- `MessageHistory` table for tracking edits/deletions
- Message edit time limit (5 minutes default)
- Read receipt tracking (readAt timestamp)
- Image upload for media (future)
- Push notifications for new messages
- Notification on message received, read receipt

---

### 9.2 Inbox

**Description:** Instagram-style inbox for all communications.

**Features:**
- List of conversations
- Unread count
- Last message preview
- Search conversations
- Filter by type (messages, listing contacts)

**Design:**
- Similar to Instagram inbox (familiar UX)
- Easy navigation
- Quick actions (mark as read, delete)

---

## 10. Notifications

### 10.1 Notification System

**Description:** Comprehensive notification system for all app events.

**Notification Types:**

**Expense Notifications:**
- New expense added (notify participants)
- Expense edited (notify participants)
- Expense deleted (notify participants)
- Settlement request/received
- Settlement completed
- Balance reminder (optional, weekly)

**Chore Notifications:**
- Chore assigned
- Chore completed (notify creator/group)
- Chore edited
- Chore deleted (notify assignee if assigned)
- Chore due soon (reminder)
- Chore overdue

**Friend Notifications:**
- Friend request received
- Friend request accepted
- Friend removed you
- Friend request rejected

**Group Notifications:**
- Added to group
- Removed from group
- Group role changed
- Group settings changed

**Listing Notifications:**
- Listing commented (notify creator)
- Listing favorited (notify creator)
- Listing view milestone (optional)
- New listing in area (optional, future)

**Message Notifications:**
- New message received
- Message read receipt (optional)

**Trust Score Notifications:**
- Trust score milestone (optional, e.g., reached 4 stars)

**Features:**
- Notification model in database
- Notification endpoints (list, mark as read, mark all as read, unread count)
- Push notifications (Expo push notifications)
- In-app notification center
- Notification preferences (per-event toggles)
- Quiet hours (optional)
- Notification grouping (by type, by date)
- Notification actions (tap to view related item)
- Badge counts throughout app

**User Stories:**
- As a user, I want to be notified when someone adds an expense
- As a user, I want to control what notifications I receive
- As a user, I want to see all my notifications in one place
- As a user, I want to mark notifications as read
- As a user, I want push notifications on my device
- As a user, I want to set quiet hours for notifications

**Technical Requirements:**
- `Notification` table (userId, type, title, message, data, read, timestamps)
- Notification service (create, list, mark as read)
- Push notification service (Expo Push Notifications)
- Notification preferences in `UserSettings`
- Badge count calculation (cached)
- Notification cleanup (delete old read notifications after 30 days)

---

## 11. Friends System

### 11.1 Friend Management

**Description:** Social connections system for building trusted networks.

**Features:**
- Add friend (search by email, mobile number, or display name)
- Send friend request (by email or mobile number)
- Accept/reject friend request
- Remove/unfriend
- Block user (prevents friend requests, messages)
- Unblock user (restore ability to interact)
- View blocked users list
- Friends list screen
- Friend requests screen (incoming/outgoing)
- Blocked users screen
- Mutual friends calculation
- Friend search (with privacy controls)
- Friend selection in expense/chore creation
- Friend profiles (view trust score, mutual friends, listings count)
- Invite non-users to app (by email or mobile number)
- User invitation system with deep linking

**User Stories:**
- As a user, I want to add friends from my contacts or by searching
- As a user, I want to accept or reject friend requests
- As a user, I want to see all my friends in one place
- As a user, I want to see mutual friends with someone
- As a user, I want to select friends when creating expenses or chores
- As a user, I want to block someone if needed
- As a user, I want to see a friend's trust score before adding them

**Technical Requirements:**
- `Friend` table (userId, friendId, status, timestamps)
- `UserInvitation` table (invitedBy, email, mobileNumber, token, status, expiresAt)
- Friend endpoints (request, accept, reject, remove, block, unblock, list, search, invite)
- User invitation endpoints (invite, get by token, accept)
- Mutual friends calculation (SQL query or algorithm)
- Privacy controls (who can find me, who can send friend requests)
- Friend notifications (request received, accepted, removed)
- Friend search with privacy respect
- Email/SMS service integration (SendGrid, Twilio) for app invitations
- Deep linking support for invitation acceptance

---

## 12. Settings & Preferences

### 12.1 User Settings

**Description:** Comprehensive settings and preferences management.

**Features:**

**Currency Settings:**
- Primary currency selection
- Supported currencies list
- Currency conversion toggle (show/hide converted amounts)

**Notification Settings:**
- Enable/disable all notifications toggle
- Email notifications toggle
- Push notifications toggle
- Per-event notification toggles:
  - Expense notifications
  - Chore notifications
  - Friend request notifications
  - Message notifications
  - Listing notifications
  - Group notifications
- Quiet hours (start time, end time)

**Privacy Settings:**
- Profile visibility (public, friends only, private)
- Trust score visibility (public, friends only, private)
- Finance visibility (always private, not included)
- Who can find me (everyone, friends of friends, friends only)
- Who can send friend requests (everyone, friends of friends, no one)

**Account Settings:**
- Edit profile (name, bio, avatar) - links to profile screen
- Change password
- Change email (with verification)
- Delete account (with confirmation, data deletion)
- Logout

**App Preferences:**
- Language (preparation for i18n)
- Theme (light/dark - future)
- Date format
- Time format (12/24 hour)

**About Section:**
- App version
- Terms of Service link
- Privacy Policy link
- Contact Support
- Data export (export all data as JSON/CSV)

**User Stories:**
- As a user, I want to set my primary currency
- As a user, I want to control which notifications I receive
- As a user, I want to control my privacy settings
- As a user, I want to change my password
- As a user, I want to delete my account if needed
- As a user, I want to export my data

**Technical Requirements:**
- `UserSettings` table (userId, preferences as JSON or separate fields)
- Settings endpoints (get, update)
- Settings validation
- Privacy enforcement (backend checks)
- Data export service (generate JSON/CSV)
- Account deletion cascade (handle all user data)
- User invitation endpoints (invite, get by token, accept)
- Email/SMS service integration for invitations
- Deep linking support for registration with invitation tokens

---

## 13. History & Audit Logs

### 13.1 Activity History

**Description:** Track and display history for all features.

**Features:**

**Expense History:**
- Creation timestamp
- Edit history (who edited, when, what changed)
- Settlement history (who paid whom, when)
- Deletion tracking

**Chore History:**
- Creation timestamp
- Edit history
- Assignment history
- Completion history (who completed, when, on-time status)
- Deletion tracking

**Group History:**
- Member additions/removals
- Role changes
- Group setting changes
- Creation/deletion

**Listing History:**
- Creation timestamp
- Edit history
- View count
- Favorite count
- Comment history

**Finance History:**
- Transaction history (creation, edits, deletions)
- Balance over time (calculated from transactions per context)

**Message History:**
- Edit history (message edits within time limit)
- Deletion tracking

**Activity Feed:**
- Combined feed of user activities
- Filterable by type (expenses, chores, listings, etc.)
- Timeline view
- Paginated

**User Stories:**
- As a user, I want to see when an expense was created and edited
- As a user, I want to see the history of a chore (who did it, when)
- As a user, I want to see my activity feed
- As a user, I want to see changes to group membership

**Technical Requirements:**
- History tables for each feature (or unified audit log)
- History endpoints for each feature
- Activity feed aggregation service
- History cleanup (optional, keep last 1-2 years)

---

## Feature Prioritization

### MVP (Minimum Viable Product) - Days 1-70

**Phase 1: Complete Core Features**
1. ✅ User authentication & profiles
   - ✅ Own profile screen (ProfileScreen)
   - ✅ Other user's profile screen (UserProfileScreen) with privacy controls
   - ✅ Navigation from all user name locations throughout app
   - ✅ Mutual friends calculation and display
2. ✅ Trust score system (complete)
   - ✅ Chore score includes streak and achievements (Day 67)
   - ✅ Enhanced calculation with 5 factors (Day 67)
   - ✅ Trust score breakdown with privacy controls
3. ✅ Basic expense splitting + Complete settlement flow
4. ✅ Groups (complete with management)
   - ✅ Group creation with icon picker (12 predefined icons)
   - ✅ Group member management (add, remove, change role, transfer ownership)
   - ✅ Group invitation system (invite by email/mobile, accept/decline)
   - ✅ Add members by email or mobile number
   - ✅ Invite non-registered users to groups
5. ✅ Friends system (complete)
   - ✅ Friend requests by email or mobile number
   - ✅ Block/unblock users
   - ✅ View blocked users list
   - ✅ Invite non-users to app (by email/mobile)
   - ✅ User invitation system with deep linking
   - ✅ Auto-accept invitations after registration
6. ✅ Settings screen (complete)
   - ✅ Invite friends to app functionality
7. ✅ Chore management (complete with gamification)
   - ✅ Gamification UI (stats, achievements, streaks) - Day 67
   - ✅ Notification preferences - Day 67
   - ✅ Trust score integration - Day 67
8. ✅ Listings (complete with interactions)
   - ✅ Edit listing comments
9. ✅ Messaging (1-on-1, complete with edit/delete)
10. ✅ Personal finance (multi-currency support)
11. ✅ Notifications (complete system)
    - ✅ Group invitation notifications
    - ✅ User invitation notifications
12. ✅ History tracking (all features)
13. ✅ Analytics (basic)
14. ✅ Camera capture integration
    - ✅ Image picker utility with camera support
    - ✅ Integrated in all image upload screens
15. ✅ Email/SMS service integration
    - ✅ SendGrid for email invitations
    - ✅ Twilio for SMS invitations
    - ✅ Deep linking for invitation acceptance

**Phase 2: Enhancements & Polish - Days 71-85**
14. Complete notification system (push, email)
15. Advanced analytics
16. UI/UX polish
17. Performance optimization
18. Accessibility improvements

**Phase 3: Testing & QA - Days 86-95**
19. Comprehensive testing
20. Bug fixes
21. Security review
22. Performance testing

**Phase 4: Deployment - Days 96-110**
23. Production setup
24. App store preparation
25. Launch preparation

### Coming Soon (Post-MVP)

**Future Enhancements:**
- Payment integrations (Stripe, Venmo, PayPal, Bank Transfer)
- Banking integration (account connections, auto-import)
- AI receipt scanning (OCR)
- Offline mode (full offline functionality)
- Group chats (multi-person messaging)
- Media sharing in messages (images, files)
- Advanced analytics (predictive, financial health)
- Budgets & Goals (budget tracking, savings goals)
- Activity Feed (social feed, achievements showcase)
- AI Financial Coach (personalized financial advice)

---

### UI Component Standardization (2025-01-28)
- ✅ Avatar component created for consistent profile picture rendering
- ✅ Centralized `getAvatarUrl` utility function
- ✅ Removed duplicate avatar URL processing functions
- ✅ Standardized avatar rendering across FriendsListScreen, BalanceSummaryScreen, BillchopFriendsScreen, ParticipantPicker
- ✅ Removed unused avatar-related styles
- ✅ Documentation created (`docs/AVATAR_RENDERING_PATTERN.md`)

---

*Last Updated: January 2025*  
*Aligned with DEVELOPMENT_ROADMAP_COMPREHENSIVE.md*

## Recent Implementations (January 2025)

### User Profile Navigation
- ✅ UserProfileScreen for viewing other users' profiles
- ✅ Navigation from all user name locations (12+ screens)
- ✅ Privacy-controlled profile visibility
- ✅ Mutual friends calculation and display
- ✅ Friend action buttons (Add/Remove/Accept/Reject/Block)

### Group Invitation System
- ✅ Invite members by email or mobile number
- ✅ Invite non-registered users (creates app invitation)
- ✅ Group invitation acceptance/decline flow
- ✅ GroupInvitationScreen for handling invitations
- ✅ Email/SMS integration for sending invitations

### User Invitation System
- ✅ Invite non-users to app by email or mobile number
- ✅ UserInvitationScreen for handling app invitations
- ✅ Deep linking support for registration with invitation tokens
- ✅ Auto-accept invitations after registration
- ✅ Pre-fill email/mobile in registration form

### Email/SMS Service Integration
- ✅ SendGrid integration for email invitations
- ✅ Twilio integration for SMS invitations
- ✅ HTML email templates for invitations
- ✅ Fallback to console logging if services not configured
- ✅ Free tier support (100 emails/day, $15.50 SMS credit)

### Group Management Enhancements
- ✅ Group icon picker (12 predefined icons)
- ✅ Member selection during group creation
- ✅ Enhanced AddGroupMemberScreen with invitation tabs
- ✅ Group settings screen with member management

### Friend Management Enhancements
- ✅ Block/unblock users functionality
- ✅ View blocked users list
- ✅ Invite non-users to app from Settings and FriendSearchScreen

