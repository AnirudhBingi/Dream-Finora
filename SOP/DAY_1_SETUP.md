# Day 1 Setup Guide

## Welcome! Let's Get Started

This guide will take you through setting up everything you need to start building Dream Finora. Follow each step carefully.

**Time Required:** 2-3 hours  
**Difficulty:** Beginner-friendly

---

## Step 1: Install Node.js

### What is Node.js?
Node.js lets you run JavaScript on your computer. We need it to build our apps.

### Installation:

1. **Verify Installation (You Already Have v24.12.0!):**
   Open your terminal/command prompt and type:
   ```bash
   node --version
   npm --version
   ```
   
   You should see `v24.12.0` (or similar). If you see "command not found", install Node.js from https://nodejs.org/

2. **If Not Installed:**
   - Go to: https://nodejs.org/
   - Download: LTS version (v18 or higher)
   - Install: Run the installer with default options

**✅ Step 1 Complete when:** `node --version` shows v24.12.0 or higher

---

## Step 2: Install Git

### What is Git?
Git helps us save and track changes to our code. It's like "save" but much better.

### Installation:

1. **Go to:** https://git-scm.com/downloads
2. **Download:** Click the download for Windows
3. **Install:** Run the installer
   - ✅ Accept all default options
   - ✅ Choose "Git from the command line and also from 3rd-party software"
4. **Verify Installation:**

Open terminal and type:
```bash
git --version
```

You should see a version number.

**✅ Step 2 Complete when:** Git command shows a version number

---

## Step 3: Create GitHub Account

### What is GitHub?
GitHub is where we'll store our code online (think Google Drive for code).

### Setup:

1. **Go to:** https://github.com
2. **Sign Up:** Click "Sign up"
3. **Fill in:**
   - Choose a username (something professional)
   - Email address
   - Password
4. **Verify:** Check your email and verify your account
5. **Login:** Make sure you can log in

**✅ Step 3 Complete when:** You have a GitHub account and can log in

---

## Step 4: Install VS Code

### What is VS Code?
VS Code is a code editor (like Word for code). It's free and the best one for beginners.

### Installation:

1. **Go to:** https://code.visualstudio.com/
2. **Download:** Click "Download for Windows"
3. **Install:** Run the installer
   - ✅ Check "Add to PATH"
   - ✅ Check "Create desktop icon"
4. **Open VS Code**

### Install Extensions:

Once VS Code is open, click the Extensions icon (left sidebar) and install these:

1. **ESLint** - Code quality checker
   - Search: "ESLint"
   - Install: "ESLint" by Microsoft

2. **Prettier** - Code formatter
   - Search: "Prettier"
   - Install: "Prettier - Code formatter" by Prettier

3. **TypeScript** - Language support
   - Search: "TypeScript"
   - Install: "TypeScript" by Microsoft

4. **Expo Tools** - For mobile development
   - Search: "Expo Tools"
   - Install: "Expo Tools" by Expo

**✅ Step 4 Complete when:** VS Code is installed with all extensions

---

## Step 5: Verify PostgreSQL Installation

### What is PostgreSQL?
PostgreSQL is our database (where we store user data, expenses, etc.). You already have it installed!

### Verify Installation:

1. **Check PostgreSQL is running:**
   - Open Docker Desktop
   - You should see containers running (or we'll set one up on Day 4)

2. **Verify PostgreSQL version:**
   Open terminal and type:
   ```bash
   psql --version
   ```
   
   You should see: `psql (PostgreSQL) 18.1` or similar

3. **Create Supabase Account (Optional for Production):**
   - We'll use local PostgreSQL for development (faster, free, no internet needed)
   - Supabase account is optional for production deployment
   - If you want: https://supabase.com (we'll set this up later if needed)

**Note:** We'll set up the database connection on Day 4. For now, just verify PostgreSQL is installed.

**✅ Step 5 Complete when:** PostgreSQL is installed and Docker Desktop is ready

---

## Step 6: Create Expo Account & Install Expo Go

### What is Expo?
Expo lets us test our mobile app on our phone without building it first. It's amazing!

### Setup:

1. **Create Account:**
   - Go to: https://expo.dev
   - Click "Sign Up"
   - Sign up with email or GitHub

2. **Install Expo Go on Your Phone:**
   - **iPhone:** Open App Store → Search "Expo Go" → Install
   - **Android:** Open Play Store → Search "Expo Go" → Install

3. **Test (Optional):**
   - Open Expo Go on your phone
   - Scan the QR code on the Expo homepage
   - You should see a demo app (this confirms it works)

**✅ Step 6 Complete when:** 
- You have an Expo account
- Expo Go is installed on your phone
- You can open the app (test optional)

---

## Step 7: Create Vercel Account

### What is Vercel?
Vercel will host our website for free. It's perfect for Next.js apps.

### Setup:

1. **Go to:** https://vercel.com
2. **Sign Up:** Click "Sign Up"
3. **Sign Up with GitHub:** This connects your accounts (recommended)
4. **Verify:** Complete the setup

**Note:** We won't deploy anything yet - that's Day 48. Just have the account ready.

**✅ Step 7 Complete when:** You have a Vercel account and can log in

---

## Step 8: Configure Git (First Time Setup)

### What is this?
We need to tell Git who you are (so your commits have your name).

### Setup:

Open terminal/command prompt and type (replace with YOUR info):

```bash
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"
```

**Example:**
```bash
git config --global user.name "John Doe"
git config --global user.email "john@example.com"
```

**Verify:**
```bash
git config --global user.name
git config --global user.email
```

You should see your name and email.

**✅ Step 8 Complete when:** Git knows your name and email

---

## Step 9: Verify Everything Works

### Final Check:

Run these commands in your terminal one by one. All should show version numbers or work without errors:

```bash
# Check Node.js
node --version

# Check npm (comes with Node.js)
npm --version

# Check Git
git --version

# Check VS Code (should open VS Code)
code --version
```

**✅ Step 9 Complete when:** All commands work

---

## Troubleshooting

### "Command not found" Errors:

**Solution:** 
1. Restart your computer
2. Make sure you checked "Add to PATH" during installation
3. Try the commands again

### VS Code not opening from terminal:

**Solution:**
1. Open VS Code manually
2. Press `Ctrl + Shift + P`
3. Type: "Shell Command: Install 'code' command in PATH"
4. Press Enter
5. Close and reopen terminal, try `code --version` again

### Can't sign up for services:

**Solutions:**
- Make sure you're using a valid email
- Check your spam folder for verification emails
- Try a different browser
- Clear browser cache and try again

### Still having issues?

Don't worry! We'll work through any problems together when we start Day 2.

---

## Congratulations! 🎉

You've completed Day 1 setup! 

**What you've accomplished:**
- ✅ Installed all development tools
- ✅ Created all necessary accounts
- ✅ Configured your development environment
- ✅ Ready to start building!

**Next Steps:**
- Take a break! You've done a lot.
- Tomorrow we'll start Day 2: Initializing the project
- You're ready to build your first app!

---

## Quick Reference

**Accounts Created:**
- GitHub: https://github.com
- Supabase: https://supabase.com
- Expo: https://expo.dev
- Vercel: https://vercel.com

**Apps Installed:**
- Node.js v24.12.0
- Git
- VS Code
- Docker Desktop
- PostgreSQL 18.1
- Expo Go (on phone)

**Commands to Remember:**
```bash
node --version    # Check Node.js (should show v24.12.0)
npm --version     # Check npm
git --version     # Check Git
psql --version    # Check PostgreSQL (should show 18.1)
docker --version  # Check Docker
code .            # Open current folder in VS Code
```

---

**You're all set! See you on Day 2! 🚀**

*Questions? We'll work through everything step by step.*

