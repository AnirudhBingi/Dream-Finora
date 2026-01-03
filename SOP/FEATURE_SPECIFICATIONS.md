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
- Privacy settings (who can see profile)
- Real-time score updates

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
   - Completion rate
   - On-time completion rate
   - Points earned
   - Voluntarily taken tasks (bonus)
   - Formula: `(completionRate * 0.4 + onTimeRate * 0.3 + pointsBonus * 0.3) * 30`

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
- Create group with name, description, avatar
- Edit group (name, description, avatar) - admin only
- Delete group - admin only, with confirmation
- Add/remove members (from friends list or by email)
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
- `GroupHistory` table for tracking changes
- Permission system (who can add expenses, edit group)
- Cascade handling on group deletion (expenses, chores remain but group reference removed)
- Notification on member addition/removal, role changes
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

**Description:** Chore completions contribute to trust score.

**Scoring Factors:**
- Completion rate (did they do assigned chores?)
- On-time completion (before deadline)
- Voluntary grabs (taking unassigned tasks)
- Points earned (activity level)

**Technical Requirements:**
- Recalculate user score on chore completion
- Cache scores for performance
- Show chore contribution to total score

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

**Description:** Manage finances in multiple currencies (local + home country).

**Features:**
- Create accounts (local and home) with currency
- Edit account (name, currency) - currency change triggers balance conversion
- Delete account (validation: cannot delete if has transactions)
- Each account has its own currency
- Transactions in account's currency
- Edit transaction (amount, category, description, date)
- Delete transaction (with confirmation, recalculates account balance)
- Total balance view (converted to primary currency)
- Set primary currency (in settings)
- Currency conversion service (real-time rates)
- Historical rates for past transactions
- Account balance history tracking
- Transaction history (creation, edits, deletions)

**User Stories:**
- As an international student, I want to track USD expenses and INR income
- As a user, I want to see my total balance in my local currency
- As a user, I want real-time currency conversion
- As a user, I want to set my primary currency preference
- As a user, I want to edit a transaction if I made a mistake
- As a user, I want to delete a transaction if it was incorrect
- As a user, I want to see my account balance history over time

**Technical Requirements:**
- Currency conversion API (ExchangeRate-API or fixer.io)
- Cache exchange rates (update hourly)
- `FinanceAccount` and `FinanceTransaction` tables
- `UserSettings` table with primaryCurrency field
- `TransactionHistory` table for tracking changes
- Calculation: Convert all balances to primary currency for display
- Store original currency with transactions
- Use historical rates for past transactions (preserve original value)

**Currency Support:**
- All major currencies (USD, EUR, GBP, INR, etc.)
- Historical rates for past transactions (preserve original value)
- Manual rate override (if needed, for edge cases)
- Currency picker in expense creation and account creation
- Currency indicators throughout UI

---

### 6.2 Budgets & Goals

**Description:** Set budgets, financial goals, and reminders.

**Features:**
- Create budgets by category (food, transport, etc.)
- Set monthly/yearly budgets
- Track spending vs. budget
- Create savings goals
- Set reminders for bills/recurring expenses

**User Stories:**
- As a user, I want to set a $500/month food budget
- As a user, I want to save $5000 for a trip
- As a user, I want reminders for my rent payment

**Technical Requirements:**
- `Budget` and `Goal` tables
- Real-time budget tracking
- Notification system for reminders
- Separate budgets for local and home finances

---

### 6.3 Privacy

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

**Description:** Insights for personal finance (private).

**Features:**
- Spending patterns
- Income vs. expenses
- Budget progress
- Savings rate
- Financial health score (0-100)

**Financial Health Score:**
- Based on: savings rate, budget adherence, debt-to-income, emergency fund
- Updated monthly
- Suggestions for improvement

**User Stories:**
- As a user, I want to see my financial health score
- As a user, I want to understand my spending patterns
- As a user, I want predictions about future spending

---

## 8. AI Financial Coach

### 8.1 Personalized Coaching

**Description:** AI-powered financial coaching based on user data.

**Features:**
- Analyze spending patterns
- Identify problem areas
- Suggest improvements
- Provide educational content
- Answer financial questions

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
- Add friend (search by email or display name)
- Send friend request
- Accept/reject friend request
- Remove/unfriend
- Block user (prevents friend requests, messages)
- Friends list screen
- Friend requests screen (incoming/outgoing)
- Mutual friends calculation
- Friend search (with privacy controls)
- Friend selection in expense/chore creation
- Friend profiles (view trust score, mutual friends, listings count)

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
- Friend endpoints (request, accept, reject, remove, block, list, search)
- Mutual friends calculation (SQL query or algorithm)
- Privacy controls (who can find me, who can send friend requests)
- Friend notifications (request received, accepted, removed)
- Friend search with privacy respect

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
- Account balance history (over time)
- Account creation/edit/deletion

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
2. ✅ Trust score system (complete)
3. ✅ Basic expense splitting + Complete settlement flow
4. ✅ Groups (complete with management)
5. ✅ Friends system (complete)
6. ✅ Settings screen (complete)
7. ✅ Chore management (complete with gamification)
8. ✅ Listings (complete with interactions)
9. ✅ Messaging (1-on-1, complete with edit/delete)
10. ✅ Personal finance (multi-currency support)
11. ✅ Notifications (complete system)
12. ✅ History tracking (all features)
13. ✅ Analytics (basic)

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

*Last Updated: December 2025*  
*Aligned with DEVELOPMENT_ROADMAP_COMPREHENSIVE.md*

