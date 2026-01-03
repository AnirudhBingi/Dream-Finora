# Testing Invitation Flow - End-to-End Guide

This guide will help you test the complete invitation flow from sending to registration.

## 🎯 Test Scenarios

### Scenario 1: Invite Existing User to App (Friend Request)
**Expected Flow:**
1. User A searches for User B (who is already registered)
2. User A sends friend request
3. User B receives notification in app
4. User B can accept/reject from notifications

**Test Steps:**
1. Create two accounts (User A and User B)
2. Login as User A
3. Go to Friends → Search Friends
4. Search for User B's email
5. Click "Add Friend"
6. Login as User B
7. Check notifications - should see friend request
8. Accept/reject request

---

### Scenario 2: Invite Non-User to App (Email)
**Expected Flow:**
1. User A invites non-user by email
2. Email is sent (or logged to console)
3. Non-user clicks link → Opens app to RegisterScreen
4. Non-user registers → Auto-accepts invitation
5. User A and new user become friends automatically

**Test Steps:**
1. Login as User A
2. Go to Settings → Invite Friends
3. Enter a test email (use your own email for testing)
4. Click "Send Invitation"
5. **If SendGrid configured:** Check email inbox
6. **If not configured:** Check backend console logs for invitation link
7. Copy invitation link from email/logs
8. Open link in mobile app (or use deep link)
9. Register with the email used in invitation
10. Check that invitation was auto-accepted
11. Login as User A - should see new friend

**Deep Link Format:**
```
dreamfinora://register?invite=INVITATION_TOKEN
```

---

### Scenario 3: Invite Non-User to App (SMS)
**Expected Flow:**
1. User A invites non-user by phone number
2. SMS is sent (or logged to console)
3. Non-user clicks link → Opens app to RegisterScreen
4. Non-user registers → Auto-accepts invitation

**Test Steps:**
1. Login as User A
2. Go to Settings → Invite Friends
3. Enter a test phone number (use your own for testing)
4. Click "Send Invitation"
5. **If Twilio configured:** Check SMS inbox
6. **If not configured:** Check backend console logs for invitation link
7. Copy invitation link from SMS/logs
8. Open link in mobile app
9. Register with the phone number used in invitation
10. Check that invitation was auto-accepted

---

### Scenario 4: Invite to Group - Existing User
**Expected Flow:**
1. User A creates group and invites User B (existing user)
2. User B receives notification
3. User B accepts → Added to group

**Test Steps:**
1. Login as User A
2. Create a new group
3. In "Add Members" section, select User B from friends list
4. Create group
5. Login as User B
6. Check notifications - should see group invitation
7. Accept invitation
8. Check that User B is now in the group

---

### Scenario 5: Invite to Group - Non-User (Email)
**Expected Flow:**
1. User A creates group and invites non-user by email
2. Email is sent with registration link
3. Non-user registers → Auto-joins group + becomes friend

**Test Steps:**
1. Login as User A
2. Create a new group
3. In "Add Members" section, click "Invite"
4. Enter test email
5. Click "Send Invitation"
6. Create group
7. **If SendGrid configured:** Check email inbox
8. **If not configured:** Check backend console logs
9. Copy invitation link from email/logs
10. Open link in mobile app
11. Register with the email
12. Check that user is in the group and friends with User A

---

### Scenario 6: Invite to Group - Non-User (SMS)
**Expected Flow:**
1. User A creates group and invites non-user by phone
2. SMS is sent with registration link
3. Non-user registers → Auto-joins group + becomes friend

**Test Steps:**
1. Login as User A
2. Create a new group
3. In "Add Members" section, click "Invite"
4. Enter test phone number
5. Click "Send Invitation"
6. Create group
7. **If Twilio configured:** Check SMS inbox
8. **If not configured:** Check backend console logs
9. Copy invitation link from SMS/logs
10. Open link in mobile app
11. Register with the phone number
12. Check that user is in the group and friends with User A

---

## 🔍 Debugging Tips

### Check Backend Logs
When services are not configured, all invitations are logged to console:
```
============================================================
📧 EMAIL (SendGrid not configured - logging to console)
To: test@example.com
Subject: John invited you to join Dream Finora
HTML: You've been invited to join Dream Finora!...
============================================================
```

### Check Database
```sql
-- Check user invitations
SELECT * FROM "UserInvitation" WHERE status = 'pending';

-- Check group invitations
SELECT * FROM "GroupInvitation" WHERE status = 'pending';

-- Check friendships
SELECT * FROM "Friend" WHERE status = 'accepted';
```

### Test Deep Links Manually
1. Get invitation token from database or logs
2. Format: `dreamfinora://register?invite=TOKEN`
3. Open in mobile app or use Expo Go deep linking

---

## ✅ Success Criteria

For each scenario, verify:
- [ ] Invitation is created in database
- [ ] Email/SMS is sent (or logged to console)
- [ ] Invitation link works
- [ ] Registration screen shows invitation banner
- [ ] Registration completes successfully
- [ ] Invitation is auto-accepted after registration
- [ ] Friendship/group membership is created
- [ ] Notifications are sent to relevant users

---

## 🐛 Common Issues

### Issue: Email not received
- Check spam folder
- Verify SendGrid API key is correct
- Check SendGrid dashboard for delivery status
- Verify sender email is verified in SendGrid

### Issue: SMS not received
- Verify Twilio credentials are correct
- Check Twilio console for message status
- Ensure phone number is in E.164 format (+1234567890)
- Verify Twilio account has credit

### Issue: Deep link not working
- Ensure `expo-linking` is installed
- Check app is configured for deep links
- Verify invitation token is valid
- Check backend logs for errors

### Issue: Invitation not auto-accepted
- Check RegisterScreen useEffect is running
- Verify token is available after registration
- Check backend logs for acceptance errors
- Verify invitation hasn't expired

---

## 📝 Test Checklist

- [ ] Friend invitation (existing user)
- [ ] Friend invitation (non-user by email)
- [ ] Friend invitation (non-user by SMS)
- [ ] Group invitation (existing user)
- [ ] Group invitation (non-user by email)
- [ ] Group invitation (non-user by SMS)
- [ ] Invitation expiration (7 days)
- [ ] Duplicate invitation prevention
- [ ] Email/SMS fallback to console logging
- [ ] Deep link handling in RegisterScreen
- [ ] Auto-acceptance after registration

