# Feature Specifications

## Overview

This document provides detailed specifications for all features in Dream Finora. Each feature includes user stories, technical requirements, and design considerations.

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

## 2. Expense Splitting

### 2.1 Basic Expense Splitting

**Description:** Create, split, and settle expenses within groups or between friends.

**Features:**
- Create expense (amount, description, date, category)
- Split equally or custom amounts
- Add participants (from group or friends)
- Mark as paid
- Settlement tracking

**User Stories:**
- As a user, I want to split a $100 dinner 3 ways equally
- As a user, I want to create custom splits (user A pays $40, B pays $60)
- As a user, I want to see who owes me money
- As a user, I want to settle up with someone

**Technical Requirements:**
- `Expense` and `ExpenseSplit` tables
- Real-time updates via WebSocket
- Currency support
- Notification on new expense

**Settlement Flow:**
1. User A pays User B
2. Create settlement record
3. Mark related expense splits as paid
4. Update user scores
5. Send notifications

---

### 2.2 Groups

**Description:** Create groups for shared expenses (roommates, friends, trips).

**Features:**
- Create group with name, description, avatar
- Add/remove members
- Set roles (admin, member)
- Group expenses list
- Group balance summary
- Use group for expenses, chores, rideshare

**User Stories:**
- As a user, I want to create a "Roommates" group
- As a user, I want to add my roommates to a group
- As a user, I want to see all expenses in a group
- As a user, I want to see the group's balance summary

**Technical Requirements:**
- `Group` and `GroupMember` tables
- Permission system (who can add expenses)
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
- Create chore (title, description, points, deadline)
- Assign to specific person or leave unassigned
- Points system (base points + bonus for unassigned)
- Recurring chores (daily, weekly, monthly)
- Chore categories (cleaning, maintenance, etc.)

**User Stories:**
- As a user, I want to create a "Take out trash" chore worth 10 points
- As a user, I want to assign a chore to a specific roommate
- As a user, I want to grab an unassigned chore for bonus points
- As a user, I want to see all chores in my group

**Technical Requirements:**
- `Chore` table with status, assignment, points
- `ChoreCompletion` history
- Real-time updates
- Notification on assignment/completion

**Points System:**
- Base points: Set by creator (5-50 typical)
- Bonus points: +50% for unassigned tasks
- Streak bonus: Extra points for consecutive completions
- Weekly leaderboard (optional, gamification)

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
- Create ride (origin, destination, date)
- Set charge type: per mile or per ride
- Add passengers (from friends or group)
- Calculate total cost
- Auto-add to expense splitting

**User Stories:**
- As a driver, I want to charge $0.50 per mile for a ride
- As a driver, I want to charge $10 per ride for a quick trip
- As a driver, I want expenses automatically added to "owes you"

**Technical Requirements:**
- `Ride` table with type, location, cost
- Distance calculation (Google Maps API)
- Auto-create expense in expense splitting
- Integration with expense module

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
- View listing (track views)
- Contact creator (opens chat)
- Favorite/bookmark listings
- Report inappropriate content

**User Stories:**
- As a user, I want to contact a listing creator
- As a user, I want to save listings I'm interested in
- As a user, I want to see how many people viewed my listing

**Scoring:**
- Creating listings: +5 points
- Successful listing (roommate found, etc.): +20 points
- Engagement (views, contacts): +2 points

---

## 6. Personal Finance

### 6.1 Multi-Currency Finance

**Description:** Manage finances in multiple currencies (local + home country).

**Features:**
- Create accounts (local and home)
- Each account has its own currency
- Transactions in account's currency
- Total balance view (converted to local currency)

**User Stories:**
- As an international student, I want to track USD expenses and INR income
- As a user, I want to see my total balance in my local currency
- As a user, I want real-time currency conversion

**Technical Requirements:**
- Currency conversion API (ExchangeRate-API or fixer.io)
- Cache exchange rates (update hourly)
- `FinanceAccount` and `FinanceTransaction` tables
- Calculation: `localBalance + (homeBalance * exchangeRate)`

**Currency Support:**
- All major currencies
- Historical rates for past transactions
- Manual rate override (if needed)

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
- Group chats
- Chat from listings (contact creator)
- Media sharing (images)
- Read receipts
- Typing indicators

**User Stories:**
- As a user, I want to message a friend
- As a user, I want to chat about a listing
- As a user, I want to create a group chat for my roommates

**Technical Requirements:**
- WebSocket for real-time messages
- `Chat` and `Message` tables
- Image upload for media
- Push notifications

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

### 10.1 Notification Types

**Push Notifications:**
- New expense added
- Settlement request
- Chore assigned
- Chat message
- Listing contact
- Budget alerts

**In-App Notifications:**
- Activity feed
- Notifications tab
- Badge counts

**Email Notifications:**
- Account verification
- Weekly summary (optional)
- Important alerts (settlement reminders)

**User Stories:**
- As a user, I want to be notified when someone adds an expense
- As a user, I want to control what notifications I receive
- As a user, I want to see all my notifications in one place

---

## Feature Prioritization

### MVP (Minimum Viable Product)
1. User authentication & profiles
2. Basic expense splitting
3. Groups
4. Trust score (basic)
5. Personal finance (basic, single currency)

### Phase 2
6. Chore management
7. Rideshare tracking
8. Multi-currency support
9. Receipt scanning (manual upload first)

### Phase 3
10. AI receipt scanning
11. Listings
12. Messaging
13. Analytics

### Phase 4
14. AI financial coach
15. Advanced analytics
16. Advanced trust score features

---

*Last Updated: January 2025*

