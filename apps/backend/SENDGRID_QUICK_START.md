# SendGrid Quick Start Guide

## 🚀 What to Do on the Onboarding Page

You're currently on the SendGrid onboarding page. Here's what to do:

### Option 1: Skip Domain Setup (Recommended for Development)

1. **Click "Skip to dashboard"** (top right corner)
   - This skips the domain authentication setup
   - Perfect for development and testing
   - You can set up domain authentication later for production

2. **Go to API Keys**
   - Once in the dashboard, go to: **Settings → API Keys**
   - Or visit: https://app.sendgrid.com/settings/api_keys

3. **Create API Key**
   - Click "Create API Key"
   - Name: "Dream Finora Dev"
   - Permissions: "Full Access" (or "Restricted Access" with "Mail Send")
   - Click "Create & View"
   - **COPY THE KEY IMMEDIATELY** - you won't see it again!

4. **Verify Sender Email (Quick)**
   - Go to: **Settings → Sender Authentication → Single Sender Verification**
   - Or visit: https://app.sendgrid.com/settings/sender_auth/senders/new
   - Click "Create New Sender"
   - Use your personal email (e.g., yourname@gmail.com)
   - Check your email and click the verification link

5. **Add to .env**
   ```env
   SENDGRID_API_KEY=SG.paste_your_key_here
   SENDGRID_FROM_EMAIL=your_verified_email@gmail.com
   ```

---

### Option 2: Complete Domain Setup (For Production)

If you want to set up domain authentication now:

1. **Enter Your Domain**
   - In the "Domain" field, enter your domain (e.g., `dreamfinora.com`)
   - You'll need to add DNS records to your domain
   - This is more complex but better for production

2. **Link Branding**
   - Choose "No" for now (you can enable later)
   - This rewrites tracking links to use your domain

3. **Click "Next"** and follow the DNS setup instructions

**Note:** For development, Option 1 is much faster and easier!

---

## ✅ After Setup

1. **Restart your backend:**
   ```bash
   cd apps/backend
   npm run start:dev
   ```

2. **Look for this log message:**
   ```
   [EmailService] SendGrid email service enabled
   ```

3. **Test it:**
   - Go to Settings → Invite Friends
   - Enter your email
   - Check your inbox!

---

## 🆘 Troubleshooting

### "Skip to dashboard" not working?
- Just click "Next" through all the steps
- You can always skip domain setup

### Can't find API Keys?
- Direct link: https://app.sendgrid.com/settings/api_keys
- Or: Settings (gear icon) → API Keys

### Emails going to spam?
- Make sure you verified your sender email
- Check spam folder
- SendGrid free tier emails sometimes go to spam initially

### Need help?
- SendGrid docs: https://docs.sendgrid.com/
- Support: Available in dashboard

---

## 💡 Pro Tips

1. **For Development:** Skip domain setup, use your personal email
2. **For Production:** Set up domain authentication for better deliverability
3. **Free Tier:** 100 emails/day is plenty for development
4. **Testing:** You can test without SendGrid - it logs to console

