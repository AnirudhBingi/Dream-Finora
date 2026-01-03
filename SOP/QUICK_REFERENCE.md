# Quick Reference Guide

## 🎨 UI/UX Design System

**📚 ALWAYS Reference:** [UI/UX Design Guide](./UI_UX_DESIGN_GUIDE.md)

**Before building any UI component:**
1. Check color palette (#2563EB primary, etc.)
2. Use typography scale (32px H1, 16px body, etc.)
3. Follow spacing system (4px base unit)
4. Match component specs (buttons, cards, forms)
5. Apply design principles (trust, simplicity, clarity)

**Quick Design Tokens:**
- Primary Blue: `#2563EB`
- Success Green: `#10B981`
- Danger Red: `#EF4444`
- Spacing: 4px base (xs:4, sm:8, md:16, lg:24, xl:32)
- Button height: 44px minimum
- Card radius: 12px

---

## Common Commands

### Git Commands
```bash
# Initialize git repository
git init

# Check status
git status

# Add all files
git add .

# Commit changes
git commit -m "Your message here"

# Push to GitHub
git push origin main

# Pull latest changes
git pull
```

### Node.js / npm Commands
```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

### Expo Commands
```bash
# Start Expo development server
npx expo start

# Start on iOS simulator (Mac only)
npx expo start --ios

# Start on Android emulator
npx expo start --android

# Clear cache
npx expo start --clear
```

### VS Code Shortcuts
```
Ctrl + `          Open terminal
Ctrl + P          Quick file search
Ctrl + Shift + P  Command palette
Ctrl + B          Toggle sidebar
Ctrl + /          Toggle comment
Alt + Up/Down     Move line up/down
Ctrl + D          Select next occurrence
```

---

## Project Structure Quick Reference

```
dream-finora/
├── apps/
│   ├── mobile/       # Expo React Native app
│   ├── web/          # Next.js web app
│   └── backend/      # NestJS API
├── packages/
│   └── shared/       # Shared TypeScript code
└── docs/             # Documentation
```

---

## Common Tasks

### Adding a New Feature

1. **Update Database Schema:**
   ```bash
   cd apps/backend
   # Edit prisma/schema.prisma
   npx prisma migrate dev --name add_feature_name
   ```

2. **Create Backend Endpoint:**
   - Create module in `apps/backend/src/feature-name/`
   - Add controller, service, DTOs

3. **Update Frontend:**
   - Add API call in `apps/mobile/src/services/` or `apps/web/src/lib/`
   - Create UI components
   - Update state management

4. **Test:**
   - Test on mobile (Expo Go)
   - Test on web (localhost)
   - Test API endpoints

### Fixing Common Errors

**"Module not found":**
```bash
# Reinstall dependencies
npm install

# Clear cache
npm cache clean --force
```

**"Port already in use":**
```bash
# Find and kill process (Windows)
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Or just use a different port
PORT=3001 npm run dev
```

**"Expo Go not connecting":**
- Make sure phone and computer on same WiFi
- Try restarting Expo: `npx expo start --clear`
- Check firewall settings

**"Database connection error":**
- Check PostgreSQL is running: `docker ps`
- Check Docker Desktop is running
- Verify DATABASE_URL in .env file
- Check connection string format
- Try restarting: `docker-compose restart postgres`

---

## Development Workflow

### Daily Workflow:
1. Pull latest code: `git pull`
2. Start backend: `cd apps/backend && npm run dev`
3. Start web: `cd apps/web && npm run dev`
4. Start mobile: `cd apps/mobile && npx expo start`
5. Test changes
6. Commit: `git add . && git commit -m "Description"`
7. Push: `git push`

### Before Committing:
- [ ] Code works
- [ ] No console errors
- [ ] Tested on mobile (if changed mobile code)
- [ ] Tested on web (if changed web code)
- [ ] No console.logs left behind

---

## Environment Variables

### Backend (.env)
```
DATABASE_URL="postgresql://..."
JWT_SECRET="your-secret-key"
NODE_ENV="development"
```

### Mobile (.env)
```
API_BASE_URL="http://localhost:3001"
EXPO_PUBLIC_API_URL="http://your-backend-url.com"
```

### Web (.env.local)
```
NEXT_PUBLIC_API_URL="http://localhost:3001"
```

**Note:** Never commit `.env` files! They're in `.gitignore`

---

## Testing Checklist

### Before Deployment:
- [ ] All features work
- [ ] Login/logout works
- [ ] No console errors
- [ ] Mobile app loads
- [ ] Web app loads
- [ ] API responds correctly
- [ ] Database operations work
- [ ] Images upload correctly
- [ ] Forms validate correctly

---

## Useful Resources

### Documentation:
- [Expo Docs](https://docs.expo.dev)
- [Next.js Docs](https://nextjs.org/docs)
- [NestJS Docs](https://docs.nestjs.com)
- [Prisma Docs](https://www.prisma.io/docs)
- [Supabase Docs](https://supabase.com/docs)

### Tools:
- [Docker Desktop](https://www.docker.com/products/docker-desktop) (you have this!)
- [Expo Dashboard](https://expo.dev)
- [Vercel Dashboard](https://vercel.com/dashboard)
- [GitHub](https://github.com)
- [Supabase Dashboard](https://app.supabase.com) (optional - for production)

### Learning:
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [React Docs](https://react.dev)
- [React Native Docs](https://reactnative.dev)

---

## Getting Help

### When Stuck:

1. **Check Documentation:** Most answers are in docs
2. **Search Error Message:** Google the exact error
3. **Check Git History:** See what changed
4. **Ask:** We'll work through problems together
5. **Take a Break:** Sometimes stepping away helps

### Debugging Tips:

**Backend:**
- Check terminal for errors
- Use `console.log()` to debug
- Check database in Supabase dashboard
- Test endpoints with Postman or browser

**Frontend:**
- Check browser console (F12)
- Check React DevTools
- Use `console.log()` to debug
- Check Network tab for API calls

**Mobile:**
- Check Expo logs in terminal
- Use React Native Debugger
- Check device logs
- Test on real device, not just simulator

---

## Code Style Guidelines

### Naming:
- **Components:** PascalCase (`UserProfile.tsx`)
- **Functions:** camelCase (`getUserProfile`)
- **Constants:** UPPER_SNAKE_CASE (`API_BASE_URL`)
- **Types:** PascalCase (`User`, `Expense`)

### Formatting:
- Use Prettier (auto-formats on save)
- Use ESLint (catches errors)
- 2 spaces for indentation
- Semicolons optional (be consistent)

### Best Practices:
- ✅ Write clear variable names
- ✅ Add comments for complex logic
- ✅ Keep functions small
- ✅ Don't repeat code (DRY)
- ✅ Test as you build
- ❌ Don't commit commented-out code
- ❌ Don't leave console.logs
- ❌ Don't ignore errors

---

## Emergency Fixes

### "Everything is broken!"
```bash
# 1. Stop all servers (Ctrl+C)
# 2. Delete node_modules
rm -rf node_modules
# 3. Reinstall
npm install
# 4. Clear caches
npm cache clean --force
npx expo start --clear
```

### "Can't connect to database"
1. Check Supabase dashboard
2. Verify DATABASE_URL in .env
3. Test connection: `npx prisma db pull`
4. Check if project is paused (free tier pauses after inactivity)

### "App won't build"
1. Check for TypeScript errors: `npm run type-check`
2. Check for lint errors: `npm run lint`
3. Clear build cache
4. Try building from scratch

---

## Deployment Checklist

### Before Deploying:
- [ ] All tests pass
- [ ] Environment variables set in production
- [ ] Database migrated
- [ ] Build succeeds locally
- [ ] No hardcoded localhost URLs
- [ ] API URLs updated for production
- [ ] Error tracking configured (Sentry)
- [ ] Analytics configured

---

*Keep this handy - you'll reference it often!*

