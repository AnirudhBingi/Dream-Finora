# Comprehensive Enhancement Roadmap

**Date:** 2025-01-XX  
**Status:** Planning Complete - Ready for Implementation

---

## Executive Summary

This roadmap consolidates ALL enhancement plans across Friends, Groups, Messages, SpaceV, User Profiles, and Camera Capture features. It provides a prioritized, phased approach to implementation.

---

## Roadmap Overview

### Total Features Identified: 100+
### Critical Gaps: 7
### High Priority: 15
### Medium Priority: 12
### Low Priority: 8

**Estimated Total Effort:** 25-35 days

---

## Phase 0: Foundation & Blockers (IMMEDIATE)

### Priority: ⚠️ BLOCKING
### Duration: 1 day

#### 0.1 Database Migration
- [x] Run Prisma migration for mobile number field
- **Effort:** 5 minutes
- **Dependencies:** None
- **Blocking:** Yes - Required before testing mobile number features
- **Status:** ✅ COMPLETED

**Command:**
```bash
cd apps/backend
npx prisma migrate dev --name add_mobile_number_to_user
```

---

## Phase 1: Critical Gaps - User Blocking Issues (WEEK 1)

### Priority: 🚨 CRITICAL
### Duration: 3-4 days

These are features that leave users in a bad state if missing.

### 1.1 Friends - Unblock User & Blocked Users List
**Effort:** 4-6 hours  
**Status:** ✅ COMPLETED

**Backend:**
- [x] Add `POST /friends/unblock/:friendId` endpoint
- [x] Add `GET /friends/blocked` endpoint
- [x] Update FriendService with `unblockUser()` and `getBlockedUsers()` methods

**Mobile:**
- [x] Add "Block" button to user profile/friend list
- [x] Create "Blocked Users" section in FriendsListScreen
- [x] Add "Unblock" action in blocked users list
- [x] Update FriendsListScreen UI (add blocked tab/section)

**Files:**
- `apps/backend/src/friend/friend.controller.ts`
- `apps/backend/src/friend/friend.service.ts`
- `apps/mobile/src/screens/FriendsListScreen.tsx`
- `apps/mobile/src/api/friendApi.ts`
- `apps/mobile/src/screens/UserProfileScreen.tsx` (when created)

---

### 1.2 SpaceV - Edit Listing Comments
**Effort:** 3-4 hours  
**Status:** ✅ COMPLETED

**Backend:**
- [x] Add `PUT /listings/:id/comments/:commentId` endpoint
- [x] Add `editComment()` method in ListingService
- [x] Validate user can only edit own comments

**Mobile:**
- [x] Add edit button to own comments in SpaceVDetailScreen
- [x] Add edit comment UI (modal or inline)
- [x] Show "edited" indicator if comment was edited
- [x] Update listingApi with editComment function

**Files:**
- `apps/backend/src/listing/listing.controller.ts`
- `apps/backend/src/listing/listing.service.ts`
- `apps/mobile/src/screens/SpaceVDetailScreen.tsx`
- `apps/mobile/src/api/listingApi.ts`

---

### 1.3 Camera Capture Integration
**Effort:** 4-5 hours  
**Status:** ✅ COMPLETED

**Implementation:**
- [x] Create `apps/mobile/src/utils/imagePicker.ts` utility
- [x] Implement `pickImageFromCamera()` function
- [x] Implement `pickImage()` function (action sheet)
- [x] Implement `pickMultipleImages()` function
- [x] Update EditProfileScreen to use new utility
- [x] Update CreateSpaceVScreen to use new utility
- [x] Update EditSpaceVScreen to use new utility
- [x] Update CreateExpenseScreen to use new utility
- [x] Update EditExpenseScreen to use new utility
- [x] Verify permissions in app.json

**Files:**
- `apps/mobile/src/utils/imagePicker.ts` (new)
- `apps/mobile/src/screens/EditProfileScreen.tsx`
- `apps/mobile/src/screens/CreateSpaceVScreen.tsx`
- `apps/mobile/src/screens/EditSpaceVScreen.tsx`
- `apps/mobile/src/screens/CreateExpenseScreen.tsx`
- `apps/mobile/src/screens/EditExpenseScreen.tsx`
- `apps/mobile/app.json` (verify)

**See:** `docs/CAMERA_CAPTURE_PLAN.md` for complete details

---

## Phase 2: High Priority - Core Feature Enhancements (WEEK 2)

### Priority: 🔥 HIGH
### Duration: 5-6 days

### 2.1 Friends - Contact Import
**Effort:** 4-6 hours  
**Status:** ❌ Missing

**Backend:**
- [ ] Create DTO for batch mobile number lookup
- [ ] Add `POST /friends/find-by-mobile-numbers` endpoint
- [ ] Service method to find users by array of mobile numbers
- [ ] Return matched users with friend status

**Mobile:**
- [ ] Install `expo-contacts` package
- [ ] Create contact import service/utility
- [ ] Create `ContactImportScreen.tsx`
- [ ] Request contacts permission
- [ ] Parse and normalize phone numbers
- [ ] Match contacts with app users
- [ ] Display matched contacts with friend status
- [ ] Allow sending friend requests to matched contacts
- [ ] Add navigation from FriendsListScreen

**Files:**
- `apps/backend/src/friend/dto/find-by-mobile-numbers.dto.ts` (new)
- `apps/backend/src/friend/friend.controller.ts`
- `apps/backend/src/friend/friend.service.ts`
- `apps/mobile/src/screens/ContactImportScreen.tsx` (new)
- `apps/mobile/src/utils/contactImport.ts` (new)
- `apps/mobile/src/api/friendApi.ts`
- `apps/mobile/src/screens/FriendsListScreen.tsx`
- `apps/mobile/package.json` (add expo-contacts)

---

### 2.2 Groups - Add Members by Email/Mobile
**Effort:** 3-4 hours  
**Status:** ✅ COMPLETED (via Group Invitation System)

**Backend:**
- [x] Group invitation system with email/mobile support
- [x] Invite members by email or mobile number (even non-users)
- [x] Handle case where user is not registered (creates app invitation)
- [x] Send notification when member invited/added

**Mobile:**
- [x] Update `AddGroupMemberScreen` with tabs (Friends / Invite by Email/Phone)
- [x] Update API function with invitation support
- [x] Update UI to show invitation form
- [x] Add validation for email/mobile format
- [x] Show success/error messages
- [x] Group invitation acceptance screen

**Files:**
- `apps/backend/src/group/dto/add-member.dto.ts` (modify or create)
- `apps/backend/src/group/group.controller.ts`
- `apps/backend/src/group/group.service.ts`
- `apps/mobile/src/screens/AddGroupMemberScreen.tsx`
- `apps/mobile/src/api/groupApi.ts`

---

### 2.3 User Profile Navigation System
**Effort:** 2.5-4 days  
**Status:** ✅ COMPLETED

**See:** `docs/USER_PROFILE_NAVIGATION_PLAN.md` for complete details

**Backend:**
- [x] Create `GET /profile/:userId` endpoint
- [x] Implement `getUserProfile()` service method with privacy logic
- [x] Create UserProfileResponseDto
- [x] Calculate mutual friends, listings count, shared groups
- [x] Implement privacy enforcement

**Mobile:**
- [x] Create `UserProfileScreen.tsx`
- [x] Add API function `getUserProfile()`
- [x] Add navigation route in App.tsx
- [x] Add navigation from all user name locations (12+ screens)
- [x] Display mutual friends section
- [x] Add friend action buttons
- [x] Implement privacy-controlled content display

**Files:**
- `apps/backend/src/profile/profile.controller.ts`
- `apps/backend/src/profile/profile.service.ts`
- `apps/backend/src/profile/dto/user-profile-response.dto.ts` (new)
- `apps/mobile/src/screens/UserProfileScreen.tsx` (new)
- `apps/mobile/src/api/profileApi.ts`
- `apps/mobile/App.tsx`
- All screens with user names (12+ files)

---

### 2.4 Groups - Group Invitations
**Effort:** 4-6 hours  
**Status:** ❌ Missing

**Backend:**
- [ ] Create GroupInvitation model (optional, or use existing system)
- [ ] Add invitation endpoints (invite by email/mobile)
- [ ] Create invitation service
- [ ] Handle invitation acceptance/decline
- [ ] Send invitation notifications

**Mobile:**
- [ ] Create invitation UI in AddGroupMemberScreen
- [ ] Create invitation acceptance screen/flow
- [ ] Update navigation and notifications

**Files:**
- `apps/backend/src/group/group.controller.ts`
- `apps/backend/src/group/group.service.ts`
- `apps/mobile/src/screens/AddGroupMemberScreen.tsx`
- (Additional files TBD based on implementation approach)

---

## Phase 3: Medium Priority - Important Enhancements (WEEK 3)

### Priority: ⚡ MEDIUM
### Duration: 4-5 days

### 3.1 Groups - Group Avatar Upload
**Effort:** 2-3 hours  
**Status:** ❌ Missing

**Backend:**
- [ ] Add `avatarUrl` field to Group model (Prisma schema)
- [ ] Run migration
- [ ] Add avatar upload endpoint (similar to profile)
- [ ] Update create/update group endpoints to accept avatar

**Mobile:**
- [ ] Add avatar upload UI in CreateGroupScreen
- [ ] Add avatar upload UI in GroupSettingsScreen
- [ ] Display group avatar in GroupListScreen
- [ ] Display group avatar in GroupDetailScreen
- [ ] Use camera capture utility (from Phase 1.3)

**Files:**
- `apps/backend/prisma/schema.prisma`
- `apps/backend/src/group/group.controller.ts`
- `apps/backend/src/group/group.service.ts`
- `apps/mobile/src/screens/CreateGroupScreen.tsx`
- `apps/mobile/src/screens/GroupSettingsScreen.tsx`
- `apps/mobile/src/screens/GroupListScreen.tsx`
- `apps/mobile/src/screens/GroupDetailScreen.tsx`

---

### 3.2 Friends - Privacy Controls
**Effort:** 2-3 hours  
**Status:** ❌ Missing

**Backend:**
- [ ] Add privacy fields to UserProfile (if not exists)
- [ ] Update friend search to respect "who can find me"
- [ ] Update send friend request to respect "who can send requests"
- [ ] Add settings endpoints (if not exists)

**Mobile:**
- [ ] Add privacy settings UI to SettingsScreen
- [ ] Save privacy preferences
- [ ] Show appropriate errors when privacy prevents actions

**Files:**
- `apps/backend/prisma/schema.prisma` (verify UserProfile)
- `apps/backend/src/friend/friend.service.ts`
- `apps/mobile/src/screens/SettingsScreen.tsx`

---

### 3.3 Messages - Message Search
**Effort:** 3-4 hours  
**Status:** ❌ Missing

**Backend:**
- [ ] Add `GET /messaging/search?q=...&chatId=...` endpoint
- [ ] Service method to search messages
- [ ] Support search within conversation or all conversations
- [ ] Return matching messages with context

**Mobile:**
- [ ] Add search bar to MessageThreadScreen
- [ ] Add search functionality to ConversationListScreen (optional)
- [ ] Display search results
- [ ] Highlight search terms

**Files:**
- `apps/backend/src/messaging/messaging.controller.ts`
- `apps/backend/src/messaging/messaging.service.ts`
- `apps/mobile/src/screens/MessageThreadScreen.tsx`
- `apps/mobile/src/api/messagingApi.ts`

---

### 3.4 Messages - Conversation Search
**Effort:** 1-2 hours  
**Status:** ❌ Missing

**Backend:**
- [ ] Add query parameter to conversations endpoint for search
- [ ] Filter conversations by participant name/email

**Mobile:**
- [ ] Add search bar to ConversationListScreen
- [ ] Implement search/filter functionality

**Files:**
- `apps/backend/src/messaging/messaging.controller.ts`
- `apps/backend/src/messaging/messaging.service.ts`
- `apps/mobile/src/screens/ConversationListScreen.tsx`

---

### 3.5 Messages - Unread Count Badges
**Effort:** 1 hour  
**Status:** ⚠️ Need Verification

**Tasks:**
- [ ] Verify if unread count is returned in conversations endpoint
- [ ] If missing, add unread count calculation to backend
- [ ] Display unread badges in ConversationListScreen
- [ ] Update badge when messages are read

**Files:**
- `apps/backend/src/messaging/messaging.service.ts` (verify)
- `apps/mobile/src/screens/ConversationListScreen.tsx`

---

### 3.6 Friends - Friend Profile View Enhancement
**Effort:** 1-2 hours  
**Status:** ⚠️ Partial

**Tasks:**
- [ ] Verify if friend profile endpoint exists
- [ ] Add mutual friends to response
- [ ] Add listings count to response
- [ ] Create/update FriendProfileScreen (if separate from UserProfileScreen)
- [ ] Add navigation from FriendsListScreen

**Files:**
- `apps/backend/src/user/user.controller.ts` (verify)
- `apps/mobile/src/screens/FriendProfileScreen.tsx` (or UserProfileScreen)

---

## Phase 4: Low Priority - Nice to Have (WEEK 4+)

### Priority: 💡 LOW
### Duration: 3-4 days

### 4.1 Messages - Chat from Listings
**Effort:** 2-3 hours  
**Status:** ⚠️ Partial

**Tasks:**
- [ ] Add "Contact Creator" button to listing detail screen (if missing)
- [ ] Ensure navigation to message thread works
- [ ] Optional: Pre-fill message with listing link/reference

---

### 4.2 SpaceV - Location-based Search (Geocoding)
**Effort:** 4-6 hours  
**Status:** ⚠️ Partial

**Tasks:**
- [ ] Integrate geocoding service (Google Maps API or similar)
- [ ] Add location search functionality
- [ ] Filter listings by location/radius
- [ ] Display map view (optional)

---

### 4.3 SpaceV - Price Range Filter
**Effort:** 1-2 hours  
**Status:** ❌ Missing

**Tasks:**
- [ ] Add price range filter to listings endpoint
- [ ] Add price range UI to SpaceVListScreen
- [ ] Filter listings by price range

---

## Implementation Timeline

### Week 1: Critical Gaps
- **Day 1:** Database migration + Unblock user + Blocked users list
- **Day 2:** Edit listing comments + Camera capture utility
- **Day 3:** Camera capture integration (profile, listings)
- **Day 4:** Testing and bug fixes

### Week 2: High Priority Features
- **Day 5-6:** Contact import (backend + mobile)
- **Day 7:** Groups - Add members by email/mobile
- **Day 8-10:** User profile navigation system (backend + mobile)
- **Day 11:** Groups - Group invitations

### Week 3: Medium Priority
- **Day 12:** Groups - Group avatar upload
- **Day 13:** Friends - Privacy controls
- **Day 14-15:** Messages - Message search + Conversation search
- **Day 16:** Messages - Unread badges + Friends - Profile view

### Week 4+: Low Priority
- **Day 17+:** Low priority features as time permits

---

## Dependencies Graph

```
Phase 0 (Migration)
  └─> Blocks all mobile number features

Phase 1.1 (Unblock/Blocked Users)
  └─> Blocks user experience if missing

Phase 1.3 (Camera Capture)
  └─> Used by Phase 3.1 (Group Avatar)

Phase 2.3 (User Profile Navigation)
  └─> Enhances Phase 1.1 (Block UI needs profile navigation)

Phase 2.2 (Add Members by Email/Mobile)
  └─> Enhances Phase 2.4 (Group Invitations)
```

---

## Success Criteria

### Phase 1 Complete:
- ✅ Users can unblock blocked users
- ✅ Users can view blocked users list
- ✅ Users can edit listing comments
- ✅ Users can capture photos with camera for all image uploads

### Phase 2 Complete:
- ✅ Users can import contacts and find friends
- ✅ Users can add group members by email/mobile
- ✅ Users can navigate to any user's profile from anywhere
- ✅ Groups can send invitations

### Phase 3 Complete:
- ✅ Groups have avatar upload with camera support
- ✅ Privacy controls work for friend discovery
- ✅ Messages can be searched
- ✅ Conversations can be searched
- ✅ Unread badges display correctly

---

## Risk Assessment

### High Risk:
- User Profile Navigation (large scope, many files)
- Contact Import (requires expo-contacts, permissions)

### Medium Risk:
- Group Invitations (design decisions needed)
- Message Search (performance considerations)

### Low Risk:
- Camera Capture (expo-image-picker already supports it)
- Unblock User (straightforward implementation)
- Edit Comments (similar to edit messages)

---

## Notes

1. **Database Migration:** Must be done first before any mobile number features work
2. **Camera Capture:** Should be done early as it affects multiple features
3. **User Profile Navigation:** Large feature, consider breaking into sub-phases
4. **Testing:** Allocate 20% of time for testing per phase
5. **Documentation:** Update docs as features are completed

---

**Last Updated:** 2025-01-XX  
**Next Review:** After Phase 1 completion

