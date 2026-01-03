# Friends, Groups, and Messages Enhancement Plan

**Date:** 2025-01-XX  
**Status:** Planning Phase

---

## Executive Summary

This document provides a comprehensive analysis of the current state of Friends, Groups, and Messages features, compares them against SOP requirements, identifies gaps, and provides a prioritized roadmap for enhancement.

---

## 1. Current State Analysis

### 1.1 User Account - Mobile Number Support

**Status:** ✅ COMPLETED

**Implemented:**
- ✅ Mobile number field added to User model (optional, unique)
- ✅ Registration accepts optional mobile number
- ✅ Login supports email OR mobile number
- ✅ Mobile screens updated (registration, login)

**Action Required:**
- ⚠️ **Database migration needed** - Must run before testing

---

### 1.2 Friends Feature - Current Implementation

#### Backend Endpoints (✅ Implemented)
- `POST /friends/request` - Send friend request (supports email or mobile)
- `GET /friends` - Get friends list (accepted only)
- `GET /friends/requests` - Get pending requests (incoming/outgoing)
- `POST /friends/:id/accept` - Accept friend request
- `POST /friends/:id/reject` - Reject friend request
- `DELETE /friends/:id` - Remove/unfriend
- `POST /friends/block/:friendId` - Block user
- `GET /friends/mutual/:userId` - Get mutual friends
- `GET /friends/search?q=...` - Search users (by email, mobile, display name)

#### Mobile Screens (✅ Implemented)
- `FriendsListScreen` - Friends list and pending requests
- `FriendSearchScreen` - Search and send friend requests

#### Features (✅ Implemented)
- ✅ Send friend request by email or mobile number
- ✅ Accept/reject friend requests
- ✅ Remove/unfriend
- ✅ Block user
- ✅ Friend search (email, mobile, display name)
- ✅ Mutual friends calculation
- ✅ Friend notifications (request received, accepted, removed)
- ✅ Friend selection in expense/chore creation (via ParticipantPicker)

#### Features (❌ Missing or Incomplete)
- ❌ **Contact import functionality** - Import contacts and match with app users
- ❌ **Privacy controls** - "Who can find me", "Who can send friend requests"
- ❌ **Friend profiles view** - View friend's trust score, mutual friends, listings count
- ❌ **Batch friend lookup by mobile numbers** - Backend endpoint for contact import
- ❌ **Unblock user** - No endpoint to unblock a blocked user (CRITICAL GAP)
- ❌ **View blocked users list** - No endpoint/screen to view blocked users (CRITICAL GAP)
- ⚠️ **Block user UI** - API exists but no UI button/action to trigger block

---

### 1.3 Groups Feature - Current Implementation

#### Backend Endpoints (✅ Implemented)
- `POST /groups` - Create group
- `GET /groups` - Get user's groups
- `GET /groups/:id` - Get group by ID
- `GET /groups/:id/balances` - Get group balance summary
- `POST /groups/:id/members` - Add member (by userId)
- `DELETE /groups/:id/members/:memberId` - Remove member
- `PUT /groups/:id` - Update group (name, description)
- `DELETE /groups/:id` - Delete group
- `PUT /groups/:id/members/:memberId/role` - Change member role
- `POST /groups/:id/transfer-ownership` - Transfer ownership
- `POST /groups/:id/leave` - Leave group
- `GET /groups/:id/history` - Get group history

#### Mobile Screens (✅ Implemented)
- `GroupListScreen` - List of user's groups
- `GroupDetailScreen` - Group details, expenses, chores
- `GroupSettingsScreen` - Group settings and member management
- `AddGroupMemberScreen` - Add members to group

#### Features (✅ Implemented)
- ✅ Create group with name, description
- ✅ Edit group (name, description)
- ✅ Delete group
- ✅ Add/remove members (by userId)
- ✅ Change member roles (ADMIN/MEMBER)
- ✅ Transfer ownership
- ✅ Leave group
- ✅ Group balance summary
- ✅ Group history tracking
- ✅ Member management UI

#### Features (❌ Missing or Incomplete)
- ❌ **Group avatar/icon management** - No avatar field in Group model
- ❌ **Add members by email/mobile** - Currently only by userId (CRITICAL GAP)
- ❌ **Group invitations** - Invite users who aren't friends (by email/mobile) (CRITICAL GAP)
- ✅ **Group description editing** - ✅ EXISTS (via PUT /groups/:id)
- ✅ **Group name editing** - ✅ EXISTS (via PUT /groups/:id)
- ✅ **Remove/add group members** - ✅ EXISTS (DELETE /groups/:id/members/:memberId, POST /groups/:id/members)

---

### 1.4 Messages Feature - Current Implementation

#### Backend Endpoints (✅ Implemented)
- `GET /messaging/conversations` - Get conversations list
- `GET /messaging/conversations/:chatId/messages` - Get messages
- `POST /messaging/conversations/:chatId/messages` - Send message
- `POST /messaging/conversations/start` - Start conversation
- `PUT /messaging/conversations/:chatId/messages/:messageId` - Edit message (within time limit)
- `DELETE /messaging/conversations/:chatId/messages/:messageId` - Delete message
- `PUT /messaging/conversations/:chatId/messages/:messageId/read` - Mark as read

#### Mobile Screens (✅ Implemented)
- `ConversationListScreen` - List of conversations (inbox-style)
- `MessageThreadScreen` - Message thread with edit/delete functionality

#### Features (✅ Implemented)
- ✅ 1-on-1 direct messages
- ✅ Send message
- ✅ Edit message (within time limit, shows "edited" indicator)
- ✅ Delete message (soft delete)
- ✅ Read receipts (sent, delivered, read)
- ✅ Conversation list (inbox-style)
- ✅ Last message preview
- ✅ Message notifications

#### Features (❌ Missing or Incomplete)
- ❌ **Message search** - Search within messages/conversations
- ❌ **Conversation search** - Search conversations by user name
- ❌ **Unread count badges** - Need to verify if implemented in UI
- ❌ **Chat from listings** - Contact creator from listing screen
- ❌ **Typing indicators** - Future (Phase 2)
- ❌ **Media sharing (images)** - Future (Phase 2)
- ❌ **Message reactions** - Future (Phase 2)
- ❌ **Group chats** - Future (Phase 2)

---

## 2. Gap Analysis - Comparison with SOP Requirements

### 2.1 Friends Feature Gaps

| SOP Requirement | Current Status | Priority | Effort |
|----------------|----------------|----------|--------|
| Add friend from contacts | ❌ Missing | **HIGH** | Medium |
| Privacy controls (who can find me) | ❌ Missing | Medium | Low |
| Privacy controls (who can send requests) | ❌ Missing | Medium | Low |
| Friend profiles (trust score, mutual friends) | ⚠️ Partial | Medium | Low |
| Friend search with privacy respect | ✅ Implemented | - | - |
| Chat from listings | ❌ Missing | Low | Medium |

### 2.2 Groups Feature Gaps

| SOP Requirement | Current Status | Priority | Effort |
|----------------|----------------|----------|--------|
| Group avatar/icon | ❌ Missing | Low | Low |
| Add members by email/mobile | ❌ Missing | **HIGH** | Medium |
| Group invitations (non-friends) | ❌ Missing | **HIGH** | Medium |
| Group description editing | ✅ Implemented | - | - |
| All other features | ✅ Implemented | - | - |

### 2.3 Messages Feature Gaps

| SOP Requirement | Current Status | Priority | Effort |
|----------------|----------------|----------|--------|
| Message search | ❌ Missing | Medium | Medium |
| Conversation search | ❌ Missing | Medium | Low |
| Unread count badges | ⚠️ Need verification | Medium | Low |
| Chat from listings | ❌ Missing | Low | Medium |
| Typing indicators | ❌ Future (Phase 2) | Low | High |
| Media sharing | ❌ Future (Phase 2) | Low | High |
| Group chats | ❌ Future (Phase 2) | Low | High |

---

## 3. Prioritized Roadmap

### Phase 1: Critical Enhancements (HIGH Priority)

#### 1.1 Database Migration for Mobile Number
**Status:** ⚠️ Blocking  
**Effort:** 5 minutes  
**Dependencies:** None

**Tasks:**
- Run Prisma migration for mobile number field
- Verify migration success

**Command:**
```bash
cd apps/backend
npx prisma migrate dev --name add_mobile_number_to_user
```

---

#### 1.2 Friends - Contact Import Functionality
**Status:** ❌ Missing  
**Effort:** Medium (4-6 hours)  
**Dependencies:** Mobile number support (✅ completed)

**Requirements:**
- Backend: Batch lookup endpoint to find users by mobile numbers
- Mobile: Install `expo-contacts` package
- Mobile: Request contacts permission
- Mobile: Contact import screen
- Mobile: Match contacts with app users
- Mobile: Send friend requests to matched contacts

**Backend Tasks:**
- [ ] Create DTO for batch mobile number lookup
- [ ] Add endpoint `POST /friends/find-by-mobile-numbers`
- [ ] Service method to find users by array of mobile numbers
- [ ] Return matched users with friend status

**Mobile Tasks:**
- [ ] Install `expo-contacts` package
- [ ] Create contact import service/utility
- [ ] Create `ContactImportScreen.tsx`
- [ ] Request contacts permission
- [ ] Parse and normalize phone numbers
- [ ] Match contacts with app users
- [ ] Display matched contacts with friend status
- [ ] Allow sending friend requests to matched contacts
- [ ] Add navigation from FriendsListScreen to ContactImportScreen

**Files to Create/Modify:**
- `apps/backend/src/friend/dto/find-by-mobile-numbers.dto.ts` (new)
- `apps/backend/src/friend/friend.controller.ts` (add endpoint)
- `apps/backend/src/friend/friend.service.ts` (add method)
- `apps/mobile/src/screens/ContactImportScreen.tsx` (new)
- `apps/mobile/src/utils/contactImport.ts` (new)
- `apps/mobile/src/api/friendApi.ts` (add function)
- `apps/mobile/src/screens/FriendsListScreen.tsx` (add import button)
- `apps/mobile/package.json` (add expo-contacts dependency)

---

#### 1.3 Groups - Add Members by Email/Mobile
**Status:** ✅ COMPLETED (via Group Invitation System)  
**Effort:** Medium (3-4 hours)  
**Dependencies:** Mobile number support (✅ completed)

**Implementation:**
- ✅ Group invitation system with email/mobile support
- ✅ Allow adding group members by email or mobile number
- ✅ Support inviting non-registered users (creates app invitation)
- ✅ Send invitation notification and email/SMS

**Backend Tasks:**
- [x] Group invitation endpoints (invite, get by token, accept, decline)
- [x] Invite by email or mobile number
- [x] Handle case where user is not registered (creates UserInvitation)
- [x] Send notification and email/SMS when invitation sent

**Mobile Tasks:**
- [x] Update `AddGroupMemberScreen` with tabs (Friends / Invite by Email/Phone)
- [x] Update API function with invitation support
- [x] Update UI to show invitation form
- [x] Add validation for email/mobile format
- [x] Show success/error messages
- [x] GroupInvitationScreen for accepting/declining invitations

**Files to Create/Modify:**
- `apps/backend/src/group/dto/add-member.dto.ts` (modify or create)
- `apps/backend/src/group/group.controller.ts` (modify addMember endpoint)
- `apps/backend/src/group/group.service.ts` (modify addMember method)
- `apps/mobile/src/screens/AddGroupMemberScreen.tsx` (modify)
- `apps/mobile/src/api/groupApi.ts` (modify addMember function)

---

### Phase 2: Important Enhancements (MEDIUM Priority)

#### 2.1 Friends - Privacy Controls
**Status:** ❌ Missing  
**Effort:** Low-Medium (2-3 hours)  
**Dependencies:** UserSettings model (verify if exists)

**Requirements:**
- "Who can find me" setting (everyone, friends of friends, friends only)
- "Who can send friend requests" setting (everyone, friends of friends, no one)
- Backend enforcement of privacy settings
- Settings UI (might be part of Settings screen)

**Backend Tasks:**
- [ ] Add privacy fields to UserSettings/UserProfile (if not exists)
- [ ] Update friend search to respect "who can find me"
- [ ] Update send friend request to respect "who can send requests"
- [ ] Add settings endpoints (if not exists)

**Mobile Tasks:**
- [ ] Add privacy settings UI to Settings screen
- [ ] Save privacy preferences
- [ ] Show appropriate errors when privacy prevents actions

**Files to Create/Modify:**
- `apps/backend/prisma/schema.prisma` (verify UserSettings model)
- `apps/backend/src/friend/friend.service.ts` (add privacy checks)
- `apps/mobile/src/screens/SettingsScreen.tsx` (add privacy section)

---

#### 2.2 Friends - Friend Profile View
**Status:** ⚠️ Partial  
**Effort:** Low (1-2 hours)  
**Dependencies:** Trust score system (✅ exists)

**Requirements:**
- View friend's trust score
- View mutual friends count/list
- View friend's listings count
- Navigate from friend list to friend profile

**Backend Tasks:**
- [ ] Verify if friend profile endpoint exists (get user by ID with full details)
- [ ] Add mutual friends to response
- [ ] Add listings count to response

**Mobile Tasks:**
- [ ] Create `FriendProfileScreen.tsx` (if not exists)
- [ ] Add navigation from FriendsListScreen
- [ ] Display trust score, mutual friends, listings count

**Files to Create/Modify:**
- `apps/backend/src/user/user.controller.ts` (verify/get endpoint)
- `apps/mobile/src/screens/FriendProfileScreen.tsx` (create or modify)
- `apps/mobile/src/screens/FriendsListScreen.tsx` (add navigation)

---

#### 2.3 Messages - Message Search
**Status:** ❌ Missing  
**Effort:** Medium (3-4 hours)  
**Dependencies:** None

**Requirements:**
- Search messages within a conversation
- Search across all conversations
- Search by content/keywords

**Backend Tasks:**
- [ ] Add search endpoint `GET /messaging/search?q=...&chatId=...`
- [ ] Service method to search messages (full-text search or LIKE query)
- [ ] Support search within conversation or all conversations
- [ ] Return matching messages with context

**Mobile Tasks:**
- [ ] Add search bar to MessageThreadScreen
- [ ] Add search functionality to ConversationListScreen (optional)
- [ ] Display search results
- [ ] Highlight search terms

**Files to Create/Modify:**
- `apps/backend/src/messaging/messaging.controller.ts` (add search endpoint)
- `apps/backend/src/messaging/messaging.service.ts` (add search method)
- `apps/mobile/src/screens/MessageThreadScreen.tsx` (add search UI)
- `apps/mobile/src/api/messagingApi.ts` (add search function)

---

#### 2.4 Messages - Conversation Search
**Status:** ❌ Missing  
**Effort:** Low (1-2 hours)  
**Dependencies:** None

**Requirements:**
- Search conversations by participant name/email
- Filter conversations

**Backend Tasks:**
- [ ] Add query parameter to conversations endpoint for search
- [ ] Filter conversations by participant name/email

**Mobile Tasks:**
- [ ] Add search bar to ConversationListScreen
- [ ] Implement search/filter functionality

**Files to Create/Modify:**
- `apps/backend/src/messaging/messaging.controller.ts` (add search query param)
- `apps/backend/src/messaging/messaging.service.ts` (add search logic)
- `apps/mobile/src/screens/ConversationListScreen.tsx` (add search UI)

---

#### 2.5 Messages - Unread Count Badges
**Status:** ⚠️ Need verification  
**Effort:** Low (1 hour)  
**Dependencies:** None

**Requirements:**
- Display unread message count on conversations
- Badge on conversation list items
- Badge on tab/navigation (if applicable)

**Tasks:**
- [ ] Verify if unread count is returned in conversations endpoint
- [ ] If missing, add unread count calculation to backend
- [ ] Display unread badges in ConversationListScreen
- [ ] Update badge when messages are read

**Files to Verify/Modify:**
- `apps/backend/src/messaging/messaging.service.ts` (verify getConversations)
- `apps/mobile/src/screens/ConversationListScreen.tsx` (add badge display)

---

### Phase 3: Nice-to-Have Enhancements (LOW Priority)

#### 3.1 Groups - Group Avatar/Icon
**Status:** ❌ Missing  
**Effort:** Low-Medium (2-3 hours)  
**Dependencies:** Image upload (✅ exists for user profiles)

**Requirements:**
- Add avatar field to Group model
- Upload group avatar
- Display group avatar in UI

**Tasks:**
- [ ] Add `avatarUrl` field to Group model
- [ ] Update create/update group endpoints to accept avatar
- [ ] Add avatar upload functionality
- [ ] Update mobile screens to display and allow uploading avatars

---

#### 3.2 Messages - Chat from Listings
**Status:** ❌ Missing  
**Effort:** Medium (2-3 hours)  
**Dependencies:** Listings feature (✅ exists)

**Requirements:**
- "Contact Creator" button on listing detail screen
- Start conversation from listing
- Pre-fill message with listing reference

**Tasks:**
- [ ] Add "Contact Creator" button to listing detail screen
- [ ] Navigate to message thread or start conversation
- [ ] Optional: Pre-fill message with listing link/reference

---

#### 3.3 Future Features (Phase 2 - Not in Scope)
- Typing indicators
- Media sharing (images)
- Message reactions
- Group chats

---

## 4. Implementation Priority Summary

### Immediate (Before Testing)
1. ⚠️ **Database Migration** - Run migration for mobile number field

### High Priority (Next Sprint)
1. **Friends - Contact Import** - Essential for user onboarding
2. **Groups - Add Members by Email/Mobile** - Essential UX improvement

### Medium Priority (Following Sprint)
1. Friends - Privacy Controls
2. Friends - Friend Profile View
3. Messages - Message Search
4. Messages - Conversation Search
5. Messages - Unread Count Badges (verify first)

### Low Priority (Backlog)
1. Groups - Group Avatar/Icon
2. Messages - Chat from Listings
3. Future features (Phase 2)

---

## 5. Estimated Timeline

**Phase 1 (Critical):** 1-2 days
- Database migration: 5 minutes
- Contact import: 4-6 hours
- Groups add by email/mobile: 3-4 hours

**Phase 2 (Important):** 2-3 days
- Privacy controls: 2-3 hours
- Friend profile: 1-2 hours
- Message search: 3-4 hours
- Conversation search: 1-2 hours
- Unread badges: 1 hour

**Phase 3 (Nice-to-Have):** 1-2 days
- Group avatar: 2-3 hours
- Chat from listings: 2-3 hours

**Total Estimated Effort:** 4-7 days

---

## 6. Dependencies and Blockers

### Blockers
- ⚠️ Database migration must be run before testing mobile number features

### Dependencies
- ✅ Mobile number support (completed)
- ✅ Trust score system (exists)
- ✅ Image upload (exists for user profiles)
- ✅ Listings feature (exists)
- ⚠️ UserSettings model (need to verify)

---

## 7. Testing Checklist

### Friends Feature
- [ ] Search users by email
- [ ] Search users by mobile number
- [ ] Search users by display name
- [ ] Send friend request by email
- [ ] Send friend request by mobile number
- [ ] Accept/reject friend request
- [ ] Remove friend
- [ ] Block user
- [ ] View mutual friends
- [ ] Contact import (when implemented)
- [ ] Privacy controls (when implemented)

### Groups Feature
- [ ] Create group
- [ ] Edit group details
- [ ] Delete group
- [ ] Add member by userId
- [ ] Add member by email/mobile (when implemented)
- [ ] Remove member
- [ ] Change member role
- [ ] Transfer ownership
- [ ] Leave group
- [ ] View group balances
- [ ] View group history

### Messages Feature
- [ ] Send message
- [ ] Edit message (within time limit)
- [ ] Delete message
- [ ] Read receipts
- [ ] Conversation list
- [ ] Message search (when implemented)
- [ ] Conversation search (when implemented)

---

## 8. Notes and Considerations

1. **Mobile Number Format:** Using E.164 format validation (`/^\+?[1-9]\d{1,14}$/`)
2. **Contact Import:** Requires `expo-contacts` package and contacts permission
3. **Privacy Controls:** May need UserSettings model or add to UserProfile
4. **Message Search:** Consider using full-text search if supported by database, or LIKE queries
5. **Backward Compatibility:** All changes should maintain backward compatibility
6. **Error Handling:** Ensure proper error messages for all new features
7. **UI/UX:** Follow existing design patterns and use MaterialIcons

---

## 9. User Profile Navigation (NEW - High Priority)

**Status:** ✅ COMPLETED  
**Effort:** Medium-High (2.5-4 days)  
**Dependencies:** Profile system (✅ exists)

**Implementation:**
- ✅ Navigate to user profiles from anywhere user names appear
- ✅ Separate screens for own profile vs. other user's profile
- ✅ Show mutual friends on other user's profile
- ✅ Privacy-controlled profile visibility
- ✅ Navigation from all 12+ screens with user names

**See:** `docs/USER_PROFILE_NAVIGATION_PLAN.md` for complete details

---

**Last Updated:** 2025-01-XX  
**Next Review:** After Phase 1 completion

