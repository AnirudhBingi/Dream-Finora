# ISSUE-004: Mobile Registration Failed

**Date:** 2025-12-27  
**Date Resolved:** 2025-12-28  
**Status:** ✅ Resolved  
**Severity:** High (blocks user registration)

---

## Problem

Mobile app shows "Registration failed" error when attempting to register a new user.

## Environment

- Mobile: Expo Go (iOS)
- Backend: NestJS on port 3001
- Network: PC and phone on same Wi-Fi

## Troubleshooting Steps

### 1. Check Backend is Running
- Verify backend terminal shows: `🚀 Backend API is running on: http://localhost:3001`
- Check no errors in backend terminal

### 2. Check Network Connectivity
- Verify PC and phone are on same Wi-Fi network (NOT mobile hotspot)
- Mobile app should detect PC's LAN IP automatically
- Check console logs for API URL being used

### 3. Check CORS Configuration
- Backend should have `app.enableCors()` in `main.ts`
- Verify CORS is enabled

### 4. Check Database Connection
- Verify PostgreSQL is running: `docker-compose ps`
- Check backend can connect to database
- Verify Prisma migrations are applied

### 5. Check Error Details
- Improved error handling now shows detailed error messages
- Check mobile console logs for specific error
- Check backend terminal for error logs

## Common Issues

### Issue: "Cannot connect to server"
- **Cause:** Backend not running or network issue
- **Fix:** Start backend, ensure same Wi-Fi network

### Issue: "User with this email already exists"
- **Cause:** User already registered
- **Fix:** Try different email or login instead

### Issue: Validation errors (email/password format)
- **Cause:** Invalid input format
- **Fix:** Check email format and password length (min 6 characters)

### Issue: Database connection error
- **Cause:** PostgreSQL not running or wrong DATABASE_URL
- **Fix:** Start Docker PostgreSQL, verify .env file

## Debug Information

To get more details:
1. Check mobile app console logs
2. Check backend terminal for errors
3. Try accessing backend directly: `http://<PC-IP>:3001/` (should return JSON)
4. Test registration with curl:
   ```bash
   curl -X POST http://localhost:3001/auth/register \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","password":"test123"}'
   ```

## Solution Applied

1. ✅ Improved error handling to show detailed backend error messages
2. ✅ Added network error detection
3. ✅ Added console logging for debugging (shows API URL being used)
4. ✅ Improved validation error message display
5. ✅ Added detailed logging for IP detection

## Current Issue: Network Request Failed

**Error:** `TypeError: Network request failed`

This means the mobile app cannot reach the backend server. Check:

### 1. Check Console Logs
Look for these log messages:
- `[API] Script URL: ...`
- `[API] Detected host: ...`
- `[API] Base URL: ...`
- `[API] Register URL: ...`

### 2. Verify Network Setup
- **PC and phone MUST be on same Wi-Fi network** (NOT mobile hotspot)
- Check your PC's IP address:
  - Windows: Open Command Prompt, run `ipconfig`
  - Look for "IPv4 Address" under your Wi-Fi adapter (e.g., `192.168.1.10`)
- The mobile app should detect this IP automatically

### 3. Verify Backend is Running
- Backend terminal should show: `🚀 Backend API is running on: http://localhost:3001`
- Test from PC browser: `http://localhost:3001/` (should return JSON)

### 4. Firewall Check
- Windows Firewall might be blocking port 3001
- Try temporarily disabling firewall to test
- Or add exception for port 3001

### 5. Manual IP Override (If Needed)
If auto-detection fails, you can manually set the IP in `apps/mobile/src/api/getApiBaseUrl.ts`:
```typescript
export function getApiBaseUrl(): string {
  // MANUAL OVERRIDE: Replace with your PC's IP address
  // const manualIp = '192.168.1.10'; // <-- Your PC's IP here
  // if (manualIp) return `http://${manualIp}:3001`;
  
  const host = tryGetHostFromScriptURL() ?? tryGetHostFromExpoManifest();
  const url = host ? `http://${host}:3001` : 'http://localhost:3001';
  return url;
}
```

### 6. Test Backend from Phone Browser
- On your phone, open Safari/Chrome
- Go to: `http://<YOUR-PC-IP>:3001/`
- Example: `http://192.168.1.10:3001/`
- If this doesn't work, the backend isn't accessible from your phone

---

**Note:** DevTools warning about Hermes is normal - Expo Go doesn't use Hermes engine, so DevTools won't work. This doesn't affect app functionality.

