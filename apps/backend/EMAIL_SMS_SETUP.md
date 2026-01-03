# Email & SMS Service Setup Guide

This guide will help you set up **free** email and SMS services for sending invitations.

## 📧 Email Service - SendGrid (Recommended)

### Free Tier
- **100 emails per day** - Free forever
- Perfect for development and testing
- No credit card required

### Setup Steps

1. **Create SendGrid Account**
   - Go to https://signup.sendgrid.com/
   - Sign up for a free account
   - Verify your email address

2. **Skip Domain Setup (For Development)**
   - On the onboarding page, click **"Skip to dashboard"** (top right)
   - OR click "Next" and skip through the domain setup steps
   - Domain setup is only needed for production - you can skip it for now

3. **Create API Key**
   - Go to https://app.sendgrid.com/settings/api_keys
   - Click "Create API Key"
   - Name it "Dream Finora Dev" (or similar)
   - Select "Full Access" or "Restricted Access" with "Mail Send" permission
   - Copy the API key (you'll only see it once!)
   - ⚠️ **IMPORTANT:** Save this key immediately - you won't see it again!

4. **Verify Sender Email (Quick Setup - Recommended)**
   - Go to https://app.sendgrid.com/settings/sender_auth/senders/new
   - Click "Create New Sender"
   - Fill in:
     - **From Email:** Your email address (e.g., yourname@gmail.com)
     - **From Name:** Dream Finora (or your name)
     - **Reply To:** Same as from email
   - Click "Create"
   - Check your email inbox and click the verification link
   - This prevents emails from going to spam

5. **Add to .env File**
   ```env
   SENDGRID_API_KEY=SG.your_api_key_here
   SENDGRID_FROM_EMAIL=your_verified_email@gmail.com
   ```

5. **Test**
   - Restart your backend server
   - Send an invitation from the app
   - Check the email inbox (and spam folder)

### Alternative: AWS SES (More emails, but requires AWS account)
- Free tier: 62,000 emails/month for first year
- Then: $0.10 per 1,000 emails
- Setup: https://aws.amazon.com/ses/

---

## 📱 SMS Service - Twilio (Recommended)

### Free Tier
- **$15.50 free credit** when you sign up
- Enough for ~150 SMS messages (varies by country)
- No credit card required for trial

### Setup Steps

1. **Create Twilio Account**
   - Go to https://www.twilio.com/try-twilio
   - Sign up for a free account
   - Verify your phone number

2. **Get Credentials**
   - Go to https://console.twilio.com/
   - Your Account SID and Auth Token are on the dashboard
   - Copy both values

3. **Get Phone Number (Free Trial)**
   - Go to https://console.twilio.com/us1/develop/phone-numbers/manage/search
   - Click "Get a number"
   - Select a number (free for trial accounts)
   - Copy the phone number (format: +1234567890)

4. **Add to .env File**
   ```env
   TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   TWILIO_AUTH_TOKEN=your_auth_token_here
   TWILIO_PHONE_NUMBER=+1234567890
   ```

5. **Test**
   - Restart your backend server
   - Send an invitation via phone number
   - Check your phone for the SMS

### Alternative: AWS SNS (Requires AWS account)
- Free tier: 100 SMS/month for first year
- Then: ~$0.00645 per SMS
- Setup: https://aws.amazon.com/sns/

---

## 🔧 Configuration

### Environment Variables

Add these to your `apps/backend/.env` file:

```env
# Frontend URL (for invitation links)
FRONTEND_URL=http://localhost:3000

# SendGrid (Email)
SENDGRID_API_KEY=SG.your_api_key_here
SENDGRID_FROM_EMAIL=noreply@dreamfinora.com

# Twilio (SMS)
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+1234567890
```

### Fallback Behavior

If email/SMS credentials are **not** configured:
- The service will **log to console** instead of sending
- This allows development without setting up services
- All invitation links and messages will be visible in backend logs

### Testing Without Services

You can test the invitation flow without setting up services:
1. Don't add the environment variables
2. Invitations will be logged to console
3. Copy the invitation links from logs
4. Test the registration flow manually

---

## 💰 Cost Summary

### Development/Testing (Free)
- **SendGrid**: 100 emails/day free forever ✅
- **Twilio**: $15.50 free credit (~150 SMS) ✅
- **Total Cost**: $0/month for development

### Production (Low Cost)
- **SendGrid**: 100 emails/day free, then $19.95/month for 50,000 emails
- **Twilio**: ~$0.0075 per SMS (varies by country)
- **Estimated**: $20-30/month for moderate usage

---

## 🚀 Quick Start

1. **Set up SendGrid** (5 minutes)
   - Sign up → Create API key → Add to .env

2. **Set up Twilio** (5 minutes)
   - Sign up → Get credentials → Get phone number → Add to .env

3. **Restart backend**
   ```bash
   cd apps/backend
   npm run start:dev
   ```

4. **Test invitation**
   - Go to Settings → Invite Friends
   - Enter email or phone number
   - Check email/SMS inbox

---

## 📝 Notes

- **SendGrid**: Best for development (100/day free forever)
- **Twilio**: Best for testing (free trial credit)
- Both services have excellent documentation and support
- All services gracefully fall back to console logging if not configured
- No credit card required for free tiers

