# Root Architectural Issues

**Date:** 2025-01-XX  
**Purpose:** Complete list of root implementation issues that need to be addressed

---

## Summary

After comprehensive codebase analysis, here are the **root architectural issues** that need to be fixed or guarded against reintroduction:

1. **Design/Feature Coupling** (HIGH PRIORITY)
2. **Inconsistent Error Handling** (MEDIUM PRIORITY)
3. **Repeated Loading/Error State Logic** (RESOLVED — guard against reintroduction)
4. **No Centralized API Client** (RESOLVED — guard against reintroduction)
5. **Scattered State Management** (LOW PRIORITY)
6. **Code Duplication** (LOW PRIORITY)
7. **Parallel Navigation Systems & Transition Duplication** (HIGH PRIORITY)

---

## Issue 1: Design/Feature Coupling ⚠️ **HIGH PRIORITY**

### Problem

**Design values are hard-coded in feature files.**

**Evidence:**
- Colors like `#6366F1`, `#111827`, `#6B7280` repeated in 100+ files
- Spacing values like `16`, `24`, `12` hard-coded everywhere
- Typography values repeated in every screen
- No design system or theme

**Impact:**
- ❌ Designers can't work independently
- ❌ Developers can't work independently
- ❌ Changing primary color requires editing 100+ files
- ❌ Inconsistent design across app

**Solution:**
- Create design system (`theme/` directory)
- Extract all design values to theme files
- Refactor components/screens to use theme

**Time:** 2-4 weeks  
**Blocks:** Team collaboration

---

## Issue 2: Inconsistent Error Handling ⚠️ **MEDIUM PRIORITY**

### Problem

**Error handling is inconsistent across the app.**

**Evidence:**
- Some screens use `try/catch` with `Alert.alert`
- Some screens use `ErrorState` component
- Some screens have no error handling
- API calls have basic error handling but inconsistent
- No centralized error handling pattern

**Example - Inconsistent Patterns:**

```typescript
// Pattern 1: Alert.alert
try {
  await createExpense(...);
} catch (err) {
  Alert.alert('Error', err.message);
}

// Pattern 2: ErrorState component
if (error) {
  return <ErrorState message={error} onRetry={loadData} />;
}

// Pattern 3: No error handling
const data = await getExpenses(...); // No try/catch
```

**Impact:**
- ❌ Inconsistent user experience
- ❌ Some errors not handled
- ❌ Hard to maintain
- ❌ No centralized error logging

**Solution:**
- Create centralized error handler
- Standardize error handling pattern
- Add error boundary
- Centralized error logging

**Time:** 1-2 weeks  
**Blocks:** Production readiness

---

## Issue 3: Repeated Loading/Error State Logic ⚠️ **MEDIUM PRIORITY**

### Problem

**Every screen implements loading/error states individually.**

**Status:** ✅ **Resolved** — `useDataFetch` and `useAsyncOperation` are in place and used broadly.  
**Guard:** Do not reintroduce ad‑hoc loading/error patterns in screens; always use the hooks.

**Evidence:**
- Every screen has: `const [loading, setLoading] = useState(true)`
- Every screen has: `const [error, setError] = useState<string | null>(null)`
- Loading UI repeated in every screen
- Error UI repeated in every screen

**Example - Repeated Pattern:**

```typescript
// In EVERY screen:
const [loading, setLoading] = useState(true);
const [error, setError] = useState<string | null>(null);

useEffect(() => {
  loadData();
}, []);

async function loadData() {
  try {
    setLoading(true);
    setError(null);
    const data = await fetchData();
    setData(data);
  } catch (err) {
    setError(err.message);
  } finally {
    setLoading(false);
  }
}

if (loading) {
  return <ActivityIndicator />;
}

if (error) {
  return <ErrorState message={error} />;
}
```

**Impact:**
- ❌ Code duplication (repeated 74 times)
- ❌ Hard to maintain
- ❌ Inconsistent loading/error UI
- ❌ No centralized loading state management

**Solution:**
- Create `useDataFetch` hook
- Create `useAsyncOperation` hook
- Standardize loading/error UI
- Reduce code duplication

**Time:** 1 week  
**Blocks:** Code maintainability

---

## Issue 4: No Centralized API Client ⚠️ **MEDIUM PRIORITY**

### Problem

**API calls have repeated error handling and token management.**

**Status:** ✅ **Resolved** — centralized `api` client exists in `apps/mobile/src/api/client.ts`.  
**Guard:** All new API calls must use the centralized client; do not add direct `fetch` wrappers per file.

**Evidence:**
- Every API function repeats:
  - Token in headers
  - Error handling
  - Response parsing
  - Status checking
- No centralized API client wrapper

**Example - Repeated Pattern:**

```typescript
// In EVERY API function:
export async function getExpenses(token: string) {
  const response = await fetch(`${getApiBaseUrl()}/expenses`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,  // Repeated
      'Content-Type': 'application/json',  // Repeated
    },
  });

  if (!response.ok) {  // Repeated
    const error = await response.json().catch(() => ({ message: 'Failed' }));
    throw new Error(error.message || `Failed: ${response.status}`);
  }

  return response.json();  // Repeated
}
```

**Impact:**
- ❌ Code duplication
- ❌ Hard to add features (retry, timeout, etc.)
- ❌ Inconsistent error handling
- ❌ Hard to maintain

**Solution:**
- Create centralized API client
- Wrap fetch with retry, timeout, error handling
- Automatic token injection
- Standardized error handling

**Time:** 1 week  
**Blocks:** Code maintainability

---

## Issue 5: Scattered State Management ⚠️ **LOW PRIORITY**

### Problem

**State is managed locally in each screen, no centralized data layer.**

**Evidence:**
- Each screen manages its own data state
- No global state for shared data (expenses, groups, etc.)
- Data refetched on every screen navigation
- No caching layer

**Example:**

```typescript
// Every screen fetches its own data:
function ExpenseListScreen() {
  const [expenses, setExpenses] = useState([]);
  useEffect(() => {
    loadExpenses(); // Fetches every time
  }, []);
}

function HomeScreen() {
  const [expenses, setExpenses] = useState([]);
  useEffect(() => {
    loadExpenses(); // Fetches again
  }, []);
}
```

**Impact:**
- ❌ Unnecessary API calls
- ❌ No data caching
- ❌ Inconsistent data across screens
- ❌ Poor performance

**Solution:**
- Add React Query or similar
- Centralized data caching
- Automatic refetching
- Optimistic updates

**Time:** 1-2 weeks  
**Blocks:** Performance optimization

---

## Issue 6: Code Duplication ⚠️ **LOW PRIORITY**

### Problem

**Similar patterns repeated across screens.**

**Evidence:**
- Similar form handling patterns
- Similar validation logic
- Similar navigation patterns
- Similar data fetching patterns

**Impact:**
- ❌ Code duplication
- ❌ Hard to maintain
- ❌ Inconsistent behavior

**Solution:**
- Extract common patterns to hooks
- Create reusable utilities
- Reduce duplication

**Time:** 1-2 weeks  
**Blocks:** Code maintainability

---

## Issue 7: Parallel Navigation Systems & Transition Duplication ⚠️ **HIGH PRIORITY**

### Problem

**Multiple navigation stacks and transition wrappers coexisted.**

**Evidence:**
- State-based navigation in `App.tsx` plus an unused navigation context
- Separate `NavigationStack` component and unused helpers
- Transition handling duplicated in both `RootScreenRenderer` and screen wrappers

**Impact:**
- ❌ Multiple sources of truth for navigation
- ❌ Harder to reason about state restoration
- ❌ Redundant animations and unnecessary renders
- ❌ Increased maintenance cost

**Solution:**
- **Single source of truth:** `App.tsx` state + `useNavigationHistory`
- **Single transition owner:** `RootScreenRenderer` only
- Remove unused navigation/transition files
- Avoid adding parallel navigation layers

**Time:** 1-2 days  
**Blocks:** Stability, maintainability

---

## Priority Ranking

### Must Fix Before Team Collaboration

1. **Design/Feature Coupling** ⚠️ **HIGH**
   - Blocks designers and developers from working independently
   - Time: 2-4 weeks
   - Impact: Critical for team collaboration
2. **Parallel Navigation Systems & Transition Duplication** ⚠️ **HIGH**
   - Multiple sources of truth cause bugs and regressions
   - Time: 1-2 days
   - Impact: Stability and maintainability

### Should Fix Before Production

2. **Inconsistent Error Handling** ⚠️ **MEDIUM**
   - Affects user experience
   - Time: 1-2 weeks
   - Impact: Production readiness

3. **Repeated Loading/Error Logic** ⚠️ **MEDIUM**
   - ✅ Resolved — keep hooks as the only pattern

4. **No Centralized API Client** ⚠️ **MEDIUM**
   - ✅ Resolved — keep `api` client as the only entry

### Can Fix Post-Launch

5. **Scattered State Management** ⚠️ **LOW**
   - Performance optimization
   - Time: 1-2 weeks
   - Impact: Performance

6. **Code Duplication** ⚠️ **LOW**
   - Code quality
   - Time: 1-2 weeks
   - Impact: Maintainability

---

## Recommended Implementation Order

### Phase 1: Team Collaboration (Weeks 1-4)
1. **Design System** (2-4 weeks)
   - Create theme system
   - Refactor components
   - Refactor screens

2. **Navigation Single-Source Cleanup** (1-2 days)
   - Remove duplicate navigation stacks
   - Keep `App.tsx` as source of truth
   - Keep transitions in `RootScreenRenderer`

**Result:** Designers and developers can work independently

---

### Phase 2: Code Quality (Weeks 5-7)
2. **Centralized API Client** (1 week)
3. **Loading/Error Hooks** (1 week)
4. **Error Handling Standardization** (1 week)

**Result:** Cleaner, more maintainable code

---

### Phase 3: Performance (Post-Launch)
5. **State Management** (1-2 weeks)
6. **Code Deduplication** (1-2 weeks)

**Result:** Better performance, cleaner code

---

## Backend Architecture ✅ **GOOD**

**Backend is well-organized:**
- ✅ Modular structure (NestJS)
- ✅ Clear separation of concerns
- ✅ Consistent patterns
- ✅ Well-structured database schema

**No major issues found in backend.**

---

## Summary

**Most Critical Issue:**
- **Design/Feature Coupling** - This is the #1 blocker for team collaboration

**Other Issues:**
- Error handling, loading states, API client - Important but not blockers
- State management, code duplication - Can wait until post-launch

**Recommendation:**
- Fix design system first (enables team collaboration)
- Fix error handling/API client next (production readiness)
- Fix state management later (performance optimization)

---

*Last Updated: 2025-01-XX*
