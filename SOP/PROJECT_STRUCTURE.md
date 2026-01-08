# Project Structure

## Recommended Monorepo Structure

```
dream-finora/
├── apps/
│   ├── mobile/                    # Expo React Native app (PRIMARY)
│   │   ├── app/                   # Expo Router (file-based routing)
│   │   │   ├── (auth)/           # Auth screens
│   │   │   │   ├── login.tsx
│   │   │   │   └── register.tsx
│   │   │   ├── (tabs)/           # Tab navigation
│   │   │   │   ├── home.tsx
│   │   │   │   ├── expenses.tsx
│   │   │   │   ├── finance.tsx
│   │   │   │   ├── listings.tsx
│   │   │   │   └── profile.tsx
│   │   │   └── _layout.tsx       # Root layout
│   │   ├── src/
│   │   │   ├── components/       # Reusable UI components
│   │   │   ├── services/         # API clients
│   │   │   ├── store/            # Zustand state management
│   │   │   ├── hooks/            # Custom React hooks
│   │   │   ├── utils/            # Utility functions
│   │   │   └── constants/        # App constants
│   │   ├── assets/               # Images, fonts
│   │   ├── app.json              # Expo configuration
│   │   └── package.json
│   │
│   ├── website/                  # Next.js landing page (MARKETING ONLY)
│   │   ├── src/
│   │   │   ├── app/
│   │   │   │   ├── page.tsx      # Home/landing page
│   │   │   │   ├── about/        # About page
│   │   │   │   ├── privacy/      # Privacy policy
│   │   │   │   └── terms/        # Terms of service
│   │   │   ├── components/       # Landing page components
│   │   │   │   ├── Hero.tsx
│   │   │   │   ├── Features.tsx
│   │   │   │   ├── Screenshots.tsx
│   │   │   │   ├── DownloadButtons.tsx
│   │   │   │   └── Footer.tsx
│   │   │   └── lib/              # Utilities (no API clients needed)
│   │   ├── public/               # Static assets (screenshots, logos)
│   │   └── package.json
│   │
│   └── backend/                  # NestJS API
│       ├── src/
│       │   ├── auth/             # Authentication
│       │   ├── users/            # User management
│       │   ├── groups/           # Group management
│       │   ├── expenses/         # Expense splitting
│       │   ├── chores/           # Chore management
│       │   ├── rideshare/        # Rideshare features
│       │   ├── listings/         # Community listings
│       │   ├── finance/          # Personal finance
│       │   ├── messaging/        # Chat & inbox
│       │   ├── analytics/        # Analytics & insights
│       │   ├── ai/               # AI services
│       │   ├── scoring/          # Trust score calculation
│       │   ├── notifications/    # Push & email
│       │   ├── shared/           # Shared modules
│       │   │   ├── database/     # Prisma service
│       │   │   ├── guards/       # Auth guards
│       │   │   ├── interceptors/ # Logging, transformation
│       │   │   ├── filters/      # Exception filters
│       │   │   └── decorators/   # Custom decorators
│       │   └── main.ts
│       ├── prisma/
│       │   ├── schema.prisma     # Database schema
│       │   └── migrations/       # Database migrations
│       └── package.json
│
├── packages/
│   └── shared/                   # Shared TypeScript code
│       ├── src/
│       │   ├── types/            # Shared TypeScript types
│       │   ├── constants/        # Shared constants
│       │   └── utils/            # Shared utilities
│       └── package.json
│
├── tools/                        # Build scripts, configs
│   ├── eslint-config/            # Shared ESLint config
│   └── tsconfig/                 # Shared TypeScript configs
│
├── docs/                         # Documentation
│   ├── api/                      # API documentation
│   ├── architecture/             # Architecture docs
│   └── user-guides/              # User documentation
│
├── .github/                      # GitHub workflows
│   └── workflows/
│       ├── ci.yml
│       └── deploy.yml
│
├── docker/                       # Docker configurations
│   ├── Dockerfile.backend
│   └── docker-compose.yml
│
├── .env.example                  # Environment variable templates
├── .gitignore
├── package.json                  # Root workspace config
├── pnpm-workspace.yaml           # pnpm workspace config
├── turbo.json                    # Turborepo config (optional)
├── README.md
├── COMPETITIVE_ANALYSIS.md
├── TECHNICAL_ROADMAP.md
├── FEATURE_SPECIFICATIONS.md
└── PROJECT_STRUCTURE.md
```

---

## Key Directories Explained

### Mobile (`apps/mobile/`)

**Expo Router Structure** (file-based routing):
- `app/_layout.tsx` - Root layout with navigation
- `app/index.tsx` - Entry point (redirects based on auth)
- `app/(auth)/` - Authentication screens (login, register)
- `app/(tabs)/` - Main tab navigation screens

**Source Code:**
- `components/` - Reusable UI components
  - `Avatar.tsx` - Standardized user profile picture rendering
  - `Header.tsx` - Consistent header component
  - `ParticipantPicker.tsx` - Friend/group member selection
  - `SkeletonLoader.tsx` - Loading state components
  - Other reusable components (buttons, cards, forms, etc.)
- `services/` - API clients (authService, expenseService, etc.)
- `store/` - Zustand stores for state management
- `hooks/` - Custom React hooks
- `utils/` - Utility functions
  - `avatar.ts` - Avatar URL processing utility (`getAvatarUrl`)
  - Other utility functions
- `constants/` - App-wide constants

### Website (`apps/website/`)

**Next.js Static Site:**
- Simple landing page structure
- No authentication needed
- No API routes (backend handles all)
- Static pages only:
  - Home/landing page
  - About page
  - Privacy policy
  - Terms of service
- Components for:
  - Hero section
  - Feature highlights
  - App screenshots gallery
  - Download buttons (App Store + Play Store)
  - Footer with links

### Backend (`apps/backend/`)

**Module Structure:**
Each feature has its own module:
- Controllers (handle HTTP requests)
- Services (business logic)
- DTOs (data transfer objects)
- Entities (Prisma models)

**Shared Modules:**
- Database service (Prisma client)
- Guards (authentication, authorization)
- Interceptors (logging, transformation)
- Filters (exception handling)
- Decorators (custom decorators)

### Shared Package (`packages/shared/`)

**Purpose:** Code shared across mobile, web, and backend
- TypeScript types/interfaces
- Constants (API endpoints, error codes)
- Utility functions (date formatting, validation)

**Benefits:**
- Single source of truth for types
- Type safety across all apps
- No code duplication

---

## File Naming Conventions

- **Components:** PascalCase (`UserProfile.tsx`, `ExpenseCard.tsx`)
- **Services:** camelCase (`authService.ts`, `expenseService.ts`)
- **Utils:** camelCase (`formatCurrency.ts`, `validateEmail.ts`)
- **Types:** PascalCase (`User.ts`, `Expense.ts`)
- **Constants:** UPPER_SNAKE_CASE (`API_BASE_URL`, `MAX_FILE_SIZE`)
- **Hooks:** camelCase with `use` prefix (`useAuth.ts`, `useExpenses.ts`)

---

## Import Path Aliases

**Mobile/Web:**
```typescript
import { User } from '@/types'           // from shared package
import { Button } from '@/components'    // local components
import { useAuth } from '@/hooks'        // local hooks
import { apiClient } from '@/services'   // local services
```

**Backend:**
```typescript
import { User } from '@shared/types'     // from shared package
import { UserService } from './users.service'
import { JwtAuthGuard } from '../shared/guards'
```

---

## State Management

**Mobile & Web:**
- Zustand for global state
- React Query (optional) for server state caching
- Local state (useState) for component-specific state

**Backend:**
- No client-side state (stateless API)
- Redis for caching
- Database for persistent state

---

## Environment Variables

**Structure:**
```
.env.example              # Template (committed)
.env                      # Actual values (gitignored)
.env.local               # Local overrides (gitignored)
.env.production          # Production values (gitignored)
```

**Backend:**
- `DATABASE_URL`
- `JWT_SECRET`
- `REDIS_URL`
- `AWS_ACCESS_KEY_ID`
- `OPENAI_API_KEY`
- etc.

**Mobile/Web:**
- `API_BASE_URL`
- `SOCKET_URL`
- `GOOGLE_MAPS_API_KEY`
- etc.

---

## Testing Structure

```
apps/
├── mobile/
│   └── __tests__/
├── web/
│   └── __tests__/
└── backend/
    └── __tests__/
        ├── unit/
        └── e2e/
```

---

## Build & Deployment

**Development:**
```bash
# Start all apps
pnpm dev

# Start individual apps
pnpm --filter mobile dev
pnpm --filter web dev
pnpm --filter backend dev
```

**Production:**
- Mobile: Expo EAS Build
- Web: Vercel or similar
- Backend: Docker containers on AWS/GCP

---

## Component Library

### Standardized Components

**Avatar Component** (`apps/mobile/src/components/Avatar.tsx`)
- Standardized user profile picture rendering
- Used across all screens for consistent avatar display
- Handles URL processing, image loading, and fallback to colored initials
- See: `docs/AVATAR_RENDERING_PATTERN.md` for complete documentation

**Key Components:**
- `Avatar` - User profile pictures with fallback
- `Header` - Consistent header with navigation
- `ParticipantPicker` - Friend/group member selection
- `SkeletonLoader` - Loading state components
- `EmptyState` - Empty state displays
- `ErrorState` - Error state displays

**Utility Functions:**
- `getAvatarUrl` (`apps/mobile/src/utils/avatar.ts`) - Centralized avatar URL processing

---

*Last Updated: January 2025*

