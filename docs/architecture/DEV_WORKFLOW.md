# Dev Workflow (Day 3)

## Start everything (recommended)

From project root:

```bash
cd /d "D:\Dream Finora"
npm run dev
```

This starts:
- Backend (Nest dev watch)
- Website (Next dev)
- Mobile (Expo dev server)

## Start services individually

### Backend

```bash
cd /d "D:\Dream Finora\apps\backend"
npm run start:dev
```

### Website

```bash
cd /d "D:\Dream Finora\apps\website"
npm run dev
```

### Mobile (Expo)

```bash
cd /d "D:\Dream Finora\apps\mobile"
npx expo start --lan
```

Then scan QR in Expo Go.

## Verify quickly

### Backend

```bash
curl.exe -s http://localhost:3001/
```

### Website

Open: `http://localhost:3000`


