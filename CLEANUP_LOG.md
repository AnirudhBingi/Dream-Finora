# Cleanup Log

## 2026-01-15
- Removed unused `ListingDetailScreen` duplicate to avoid confusion.
- Standardized SpaceV comment responses to return `user` consistently.
- Added SpaceV detail interaction buttons (favorite, comment focus, share).
- Included listing favorite/comment counts and user favorite state in list endpoints.
- Wired SpaceV favorites navigation and header action.
- Removed unused `ListingListScreen`, `CreateListingScreen`, and `EditListingScreen`.
- Added My Listings filter in SpaceV list and removed forced receipt crop.

## 2026-01-19
- Added story media upload endpoint and client upload flow before story creation.
- Added My Listings filter + manage actions in unified SpaceV feed.
- Enabled native post sharing from feed and ensured share count updates.
- Fixed story viewer progress listener cleanup to avoid leaks.
- Filtered out empty stories and enforced media URL validation on create.
- Adjusted story viewer safe-area, tap zones, and keyboard avoidance.
- Repositioned story tools and post button to avoid overlap.

## 2026-01-19
- Removed SpaceV stories end-to-end (backend, mobile, schema, navigation).

## 2026-01-20
- Removed unused navigation stack context and helpers in mobile.
- Consolidated transitions under `RootScreenRenderer` only.
- Removed duplicate SpaceV list screen in favor of unified feed.
- Consolidated shared `BalanceInfo` type for group/expense APIs.
- Deleted unused `packages/shared` workspace package.
- Completed FinScore enhancements: post signals, rank history, share rank, leaderboard perf.
- Unified feed now lazy-loads and adds price context tags.
- Confirmed post media upload handling (backend + mobile).
- Started SpaceV circles: group-scoped feed + create support.
- Added group feed access + pagination tests.
- Added Circle feed CTA in group details.

## 2026-01-21 (Settings UI Phase 1)
- **Task 1.3.2**: Updated backend DTO (`update-profile.dto.ts`) with new theme fields: `theme`, `language`, `fontSize`, `highContrast`
- **Task 1.3.2**: Extended Prisma schema `UserProfile` model with theme settings (with sensible defaults)
- **Task 1.3.3**: Created unified `SettingsScreen` combining all settings sections:
  - Account & Profile (visibility controls)
  - Preferences (theme, font size, high contrast, currencies)
  - Notifications (all notification types with master toggle)
  - Data & Privacy (export functionality)
  - Support & About (invite, logout)
- **Task 1.3.3**: Exported `SettingsPickerOption` type from components
- **Task 1.3.3**: Extended mobile `Profile` and `UpdateProfileDto` interfaces with theme fields
- **Verification**: Backend compiles ✅, Mobile TypeScript passes ✅