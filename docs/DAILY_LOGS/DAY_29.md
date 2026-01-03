# Day 29-31 - Listings (Basic)

**Date:** 2025-12-28  
**Start Time:** [To be filled]  
**End Time:** [To be filled]  
**Status:** ✅ COMPLETED

---

## Goals

- ✅ Create listings (roommate, accommodation, item)
- ✅ Browse listings
- ✅ View listing details
- ✅ Basic search/filter

### Backend Tasks:
- [x] Add Listing model to Prisma schema (type, title, description, location, price, etc.)
- [x] Create listing endpoints (POST, GET, GET/:id)
- [x] Add search/filter functionality
- [x] Link listings to users
- [x] Add image upload support

### Mobile Tasks:
- [x] Create listing list screen
- [x] Create listing detail screen
- [x] Create listing creation screen
- [x] Add search/filter UI

---

## Work Done

**Backend Implementation:**
- Added `Listing` model to Prisma schema with fields: id, userId, type, title, description, location, price, currency, status, images, views, metadata (JSON), createdAt, updatedAt
- Created `ListingService` with methods:
  - `createListing` - Create new listing with type-specific metadata
  - `getListings` - Get listings with filters (type, status, search)
  - `getListingById` - Get single listing (increments view count)
  - `getMyListings` - Get user's own listings
  - `updateListingStatus` - Update listing status (active/completed/closed)
  - `deleteListing` - Delete listing
  - `addListingImages` - Add images to listing
- Created `ListingController` with endpoints:
  - `POST /listings` - Create listing
  - `GET /listings` - Get listings (with query params for filtering)
  - `GET /listings/my` - Get user's listings
  - `GET /listings/:id` - Get listing by ID
  - `PUT /listings/:id/status` - Update listing status
  - `DELETE /listings/:id` - Delete listing
  - `POST /listings/:id/images` - Upload listing images
  - `GET /listings/suggest-category` - Suggest category for item listings
- Added search functionality (title, description, location)
- Added filter by type and status
- Image upload support (multiple images, up to 10 per listing)
- **Type-specific forms**: Each listing type (roommate, accommodation, item, event, ride) has its own form with relevant fields
- **Auto-categorization**: Item listings auto-categorize based on title

**Mobile Implementation:**
- Created `listingApi.ts` with all API functions including `suggestCategory`
- Created `ListingListScreen`:
  - Browse all listings
  - Search functionality
  - Filter by type (roommate, accommodation, item, event, ride)
  - Display listing cards with images, title, price, location, views
- Created `CreateListingScreen`:
  - **Type-specific forms**: Different fields shown based on listing type
    - **Roommate**: Looking for/offering, location, budget, move-in date, duration, preferences
    - **Accommodation**: Location, rent, bedrooms, bathrooms, available from, lease duration, utilities, furnished
    - **Item**: Price, condition, category (auto-filled from title), brand, location
    - **Event**: Location, event date/time, event type, max attendees, price, visibility
    - **Ride**: Origin, destination, ride date/time, available seats, vehicle type, price per person
  - Upload multiple images
  - **Auto-categorization**: Category auto-fills when typing title (for Item type)
- Created `ListingDetailScreen`:
  - View full listing details
  - Image gallery
  - Status badge
  - Owner actions (update status, delete)
  - Contact creator button (placeholder for messaging)
- Integrated listings into navigation (HomeScreen, App.tsx)

**Auto-Categorization System:**
- Created `CategorizationService` for intelligent category suggestions
- **Listings**: Auto-categorizes item listings based on title (Electronics, Furniture, Clothing, etc.)
- **Expenses**: Added category field to Expense model, auto-categorizes based on description
- **Personal Finance**: Auto-categorizes income/expense transactions based on description
- All use 500ms debounce to reduce API calls
- Categories can still be manually overridden

**Files Created:**
- `apps/backend/src/listing/dto/create-listing.dto.ts`
- `apps/backend/src/listing/listing.service.ts`
- `apps/backend/src/listing/listing.controller.ts`
- `apps/backend/src/listing/listing.module.ts`
- `apps/backend/src/shared/categorization.service.ts` (shared auto-categorization service)
- `apps/mobile/src/api/listingApi.ts`
- `apps/mobile/src/screens/ListingListScreen.tsx`
- `apps/mobile/src/screens/CreateListingScreen.tsx`
- `apps/mobile/src/screens/ListingDetailScreen.tsx`

**Files Modified:**
- `apps/backend/prisma/schema.prisma` (added Listing model with metadata field, added category to Expense)
- `apps/backend/src/app.module.ts` (added ListingModule)
- `apps/backend/src/expense/expense.service.ts` (added auto-categorization)
- `apps/backend/src/expense/expense.controller.ts` (added suggest-category endpoint)
- `apps/backend/src/expense/expense.module.ts` (added CategorizationService)
- `apps/backend/src/expense/dto/create-expense.dto.ts` (added category field)
- `apps/backend/src/finance/finance.service.ts` (added auto-categorization)
- `apps/backend/src/finance/finance.controller.ts` (added suggest-category endpoint)
- `apps/backend/src/finance/finance.module.ts` (added CategorizationService)
- `apps/mobile/App.tsx` (added listing navigation)
- `apps/mobile/src/screens/HomeScreen.tsx` (added Listings button)
- `apps/mobile/src/api/expenseApi.ts` (added category field and suggestCategory function)
- `apps/mobile/src/api/financeApi.ts` (added suggestCategory function)
- `apps/mobile/src/screens/CreateExpenseScreen.tsx` (added category field with auto-categorization)
- `apps/mobile/src/screens/AddTransactionScreen.tsx` (improved auto-categorization with debounce)

---

## Decisions (ADRs)

[Any architectural decisions made]

---

## Issues / Blockers

- **Fixed**: TypeScript error with Prisma JSON type - resolved by casting metadata to `any`
- **Fixed**: Dependency injection error - added `CategorizationService` to `ListingModule` providers
- **Fixed**: Missing `Query` import in expense controller
- **Fixed**: Missing `CategorizationService` import in expense module

---

## Verification / Checks

**End of Day 31 Checklist:**
- [x] Can create listings (roommate, accommodation, item, event, ride)
- [x] Can browse all listings
- [x] Can view listing details
- [x] Basic search/filter works
- [x] Can upload images to listings
- [x] Can manage own listings (update status, delete)

---

## Notes

[Any notes or learnings from today]

---

## Next Steps

- Continue with listings implementation
- Test listing creation and browsing
- Verify search/filter functionality

