# Architecture Overview (Day 3)

## What runs where

- **Mobile app**: `apps/mobile` (Expo / React Native)
  - Runs on your iPhone via **Expo Go**
  - Bundled by Metro at `http://localhost:8081` (on your dev machine)
- **Backend API**: `apps/backend` (NestJS)
  - Runs on `http://localhost:3001` (dev machine)
  - Mobile talks to this via HTTP
- **Website**: `apps/website` (Next.js)
  - **Marketing landing page only**
  - Runs on `http://localhost:3000` (dev machine)
  - Does **not** talk to backend in MVP

## How the mobile app reaches the backend (development)

When you run Expo in development, the app loads its JS bundle from your dev machine.

On a physical phone, **`localhost` means “the phone itself”**, not your PC.

So to call your API from the phone, the app needs your dev machine’s LAN IP (e.g. `http://192.168.x.x:3001`).

**Solution (no extra dependencies):**
- We derive the host IP from the Metro “script URL” and map it to port `3001`.

## Ports (local dev)

- **Website**: `3000`
- **Backend**: `3001`
- **Expo / Metro**: `8081`

## Navigation System

The mobile app uses a **root-level screen rendering** approach for smooth, flicker-free navigation:

- **RootScreenRenderer**: Manages all screen rendering at the app root
- **ScreenContainer**: Provides fade transitions (250ms) for screen changes
- **Lazy Loading**: Screens only render after first visit (optimizes startup)
- **Bottom Navigation**: Floating island design, absolutely positioned at bottom

**Key Benefits:**
- No flickering during navigation
- Smooth 60fps transitions (native driver)
- Screens stay mounted during transitions
- Consistent experience across all screens

See `docs/NAVIGATION_TRANSITIONS.md` for detailed documentation.


