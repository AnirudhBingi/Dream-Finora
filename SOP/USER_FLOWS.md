# User Flows - Dream Finora

## Overview

This document outlines the key user flows in Dream Finora. Each flow describes the steps a user takes to complete a task, including screens, actions, and decision points.

---

## 1. Onboarding & Authentication

### New User Registration

```
1. Landing Screen
   ↓
2. "Get Started" button
   ↓
3. Register Screen
   - Email input
   - Password input
   - Confirm password
   - Terms & Privacy checkbox
   ↓
4. Verification Email Sent
   - Show message
   - "Resend email" option
   ↓
5. Email Verification
   - User clicks link in email
   - Auto-redirect to app
   ↓
6. Profile Setup
   - Name input
   - Profile picture (optional)
   - Bio (optional)
   - "Complete Setup" button
   ↓
7. Home Screen (First Time)
   - Welcome message
   - Quick tour (optional)
   - "Skip" or "Next" buttons
   ↓
8. Main App
```

### Returning User Login

```
1. Login Screen
   - Email input
   - Password input
   - "Forgot Password?" link
   ↓
2. Authentication
   - Verify credentials
   ↓
3a. Success → Home Screen
3b. Error → Show error message
   - "Try Again" or "Reset Password"
```

---

## 2. Expense Splitting Flow

### Create New Expense

```
1. Expense Screen
   ↓
2. Tap "➕ Add Expense"
   ↓
3. Enter Amount Screen
   - Amount input ($)
   - Description input
   - Date picker (default: today)
   - Category selector (optional)
   - Receipt upload (optional)
   - "Next" button
   ↓
4. Choose Split Method
   - Equal split
   - Custom split
   - Percentage split
   ↓
5. Select Participants
   - Choose group OR
   - Select individual friends
   - See preview of split amounts
   - "Create Expense" button
   ↓
6. Success
   - Show confirmation
   - Auto-navigate to expense detail
   - Send notifications to participants
```

### Settle an Expense

```
1. Expense Detail Screen
   - Shows who owes what
   - "Settle Up" button
   ↓
2. Settlement Options
   - Select payment method (future: Stripe/Venmo)
   - Or mark as "Paid in Cash"
   ↓
3. Confirm Settlement
   - Review amount
   - "Confirm" button
   ↓
4. Success
   - Expense marked as settled
   - Trust score updates
   - Notification to other party
   - Redirect to expense list
```

### View Balances

```
1. Expense Screen
   ↓
2. View Balance Summary
   - Total owed to you
   - Total you owe
   - Net balance
   ↓
3. Tap "View Details"
   ↓
4. Balance Breakdown
   - List of people who owe you
   - List of people you owe
   - "Settle All" option (if available)
```

---

## 3. Group Management Flow

### Create a Group

```
1. Expense Screen → Groups Tab
   ↓
2. Tap "➕ New Group"
   ↓
3. Group Details
   - Name input
   - Description (optional)
   - Avatar/icon selection
   - "Create" button
   ↓
4. Add Members
   - Search friends
   - Select members
   - "Add to Group" button
   ↓
5. Group Created
   - Redirect to group detail
   - Show group members
   - Quick actions available
```

### Add Expense to Group

```
1. Group Detail Screen
   ↓
2. Tap "➕ Add Expense"
   ↓
3. Create Expense Flow
   - (Same as regular expense, but group pre-selected)
   - Participants auto-populated from group
   ↓
4. Expense Added
   - Shows in group expenses list
   - All members notified
```

---

## 4. Chore Management Flow

### Create a Chore

```
1. Home Screen or Chore Screen
   ↓
2. Tap "➕ New Chore"
   ↓
3. Chore Details
   - Title input
   - Description (optional)
   - Points (slider or input)
   - Due date (optional)
   - Assign to someone OR leave unassigned
   - Group selection (if applicable)
   - "Create" button
   ↓
4. Chore Created
   - Shows in chore list
   - If unassigned, shows as "Available"
   - If assigned, person notified
```

### Complete a Chore

```
1. Chore Detail Screen
   ↓
2. Tap "Complete" button
   ↓
3. Confirmation
   - "Mark as Complete?" dialog
   - Show points to be earned
   ↓
4. Confirmed
   - Chore marked complete
   - Points added to user
   - Trust score updates
   - If in group, other members see completion
   ↓
5. Success Animation
   - Points earned display
   - Trust score increase (if applicable)
```

### Grab Unassigned Chore

```
1. Chore List Screen
   - Shows available (unassigned) chores
   - "Bonus Points" badge on unassigned
   ↓
2. Tap on unassigned chore
   ↓
3. Chore Detail
   - Shows base points + bonus points
   - "Take This Chore" button
   ↓
4. Confirmed
   - Chore assigned to you
   - Bonus points applied
   - Shows in "My Chores"
```

---

## 5. Rideshare Flow

### Give a Ride

```
1. Home Screen or Rideshare Section
   ↓
2. Tap "➕ Give Ride"
   ↓
3. Ride Details
   - Origin (current location or input)
   - Destination
   - Date/time
   - Charge type: Per mile OR Per ride
   - Amount input
   - Add passengers (from friends/favorites)
   - "Create Ride" button
   ↓
4. Ride Created
   - Auto-creates expense for passengers
   - Shows in expense list
   - Passengers notified
   - Appears in rideshare history
```

### Quick Ride (Favorite Rider)

```
1. Home Screen
   ↓
2. Tap "Quick Ride" button (or favorite rider card)
   ↓
3. Quick Ride Dialog
   - Shows preset amount
   - Passenger already selected
   - "Charge Now" button
   ↓
4. Instant Charge
   - Expense created immediately
   - Notification sent
   - Success confirmation
```

---

## 6. Personal Finance Flow

### Add Transaction

```
1. Finance Screen
   ↓
2. Tap "➕ Add Transaction"
   ↓
3. Transaction Type
   - Income OR Expense
   ↓
4. Transaction Details
   - Amount
   - Category
   - Description
   - Date
   - Account (local/home)
   - "Save" button
   ↓
5. Transaction Added
   - Balance updates
   - Shows in transaction list
   - Budget progress updates (if applicable)
```

### View Budget Progress

```
1. Finance Screen
   ↓
2. Tap on Budget Card
   ↓
3. Budget Detail
   - Total budget amount
   - Current spending
   - Remaining amount
   - Progress bar
   - Transactions in this category
   - "Edit Budget" button
```

---

## 7. Listings Flow

### Create a Listing

```
1. Listings Screen
   ↓
2. Tap "➕ Create Listing"
   ↓
3. Listing Type
   - Roommate
   - Accommodation
   - Item
   - Event
   - Ride Available
   ↓
4. Listing Details
   - Title
   - Description
   - Photos (up to 5)
   - Location
   - Price (if applicable)
   - Additional fields (type-specific)
   - "Publish" button
   ↓
5. Listing Published
   - Shows in listings feed
   - Users can contact you
   - You earn listing points
   - Trust score component updated
```

### Browse & Contact Listing

```
1. Listings Screen
   ↓
2. Browse Feed
   - Filter by type
   - Search by location/keyword
   ↓
3. Tap on Listing
   ↓
4. Listing Detail
   - Full description
   - Photos
   - Creator profile (with trust score)
   - "Contact" button
   ↓
5. Contact Creator
   - Opens chat/message
   - Send message
   ↓
6. Creator Receives
   - Notification
   - Can reply in inbox
```

---

## 8. Profile & Trust Score Flow

### View Own Profile

```
1. Profile Tab
   ↓
2. Profile Overview
   - Avatar, name, bio
   - Trust score (prominent)
   ↓
3. Trust Score Details (tap on score)
   ↓
4. Score Breakdown
   - Expense score (40%)
   - Chore score (30%)
   - Community score (30%)
   - Historical graph
   - Tips to improve
```

### View Friend's Profile

```
1. Friend List OR
2. Expense/Chore participant
   ↓
3. Tap on user avatar/name
   ↓
4. Profile View
   - Public info only
   - Trust score visible
   - Mutual friends
   - Listings created
   - "Add Friend" or "Message" button
```

---

## 9. Messaging Flow

### Send a Message

```
1. Inbox Screen
   ↓
2. Tap "➕ New Message" OR
   Tap on existing conversation
   ↓
3. Select Recipient
   - Search users
   - Recent contacts
   - Friends list
   ↓
4. Message Composer
   - Type message
   - Attach image (optional)
   - "Send" button
   ↓
5. Message Sent
   - Appears in conversation
   - Recipient notified
   - Real-time update (if online)
```

### Reply to Listing Contact

```
1. Notification: "New message about your listing"
   ↓
2. Tap notification
   ↓
3. Open Conversation
   - Shows listing context
   - Previous messages
   - Reply input
   ↓
4. Send Reply
   ↓
5. Conversation Continues
```

---

## 10. Analytics & Insights Flow

### View Personal Finance Analytics

```
1. Finance Screen
   ↓
2. Scroll to "Analytics" section
   ↓
3. Analytics Overview
   - Spending by category (pie chart)
   - Monthly trend (line graph)
   - Top expenses
   ↓
4. Tap "View Full Report"
   ↓
5. Detailed Analytics
   - Multiple charts
   - Time period selector
   - Category breakdown
   - Export option (future)
```

### View Expense Analytics

```
1. Expense Screen
   ↓
2. Tap "Analytics" tab
   ↓
3. Expense Analytics
   - Spending patterns
   - Group comparisons
   - Settlement trends
   - Most active groups
```

---

## Error & Edge Case Flows

### Network Error

```
Any Action
   ↓
Network Request Fails
   ↓
Show Error Message
   - "Connection lost. Please check your internet."
   - Retry button
   - Offline indicator (top bar)
   ↓
User Taps Retry
   ↓
Request Again
   ↓
Success OR Show Error Again
```

### Insufficient Permissions

```
User Action Requiring Permission
   ↓
Permission Request
   - Camera (for receipt scan)
   - Location (for rideshare)
   - Notifications
   ↓
User Denies
   ↓
Show Explanation
   - Why permission needed
   - How to enable in settings
   - "Go to Settings" button
```

### Empty States

```
User Opens Screen with No Data
   ↓
Show Empty State
   - Friendly illustration
   - Clear message
   - Call-to-action button
   ↓
User Taps Action
   ↓
Navigate to Create Flow
```

---

## Navigation Patterns

### Bottom Tab Navigation (Mobile)
- Always visible
- Badge indicators for unread/unsettled
- Active state clearly shown

### Back Navigation
- Native back button (mobile)
- Breadcrumbs (web)
- Swipe gesture (optional, mobile)

### Deep Linking
- Expense detail: `/expense/:id`
- Profile: `/profile/:userId`
- Listing: `/listing/:id`
- Chat: `/chat/:chatId`

---

## Notification Flow

### Push Notification Received

```
Notification Appears
   ↓
User Taps Notification
   ↓
App Opens (if closed)
   ↓
Navigate to Relevant Screen
   - Expense: Expense detail
   - Message: Chat screen
   - Chore: Chore detail
   - Listing: Listing detail
```

---

*These flows will be refined as we build and test. Start with the MVP flows (expenses, groups, basic profile) and expand from there!*

