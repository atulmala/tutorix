---
name: Tutor Search Button
overview: Update the admin Tutors page search UI to show a visible "Search Tutor" label, keep the existing placeholder, and run the GraphQL search only when the user clicks a Search button (not while typing).
todos:
  - id: search-state
    content: Replace debounced search with appliedSearch state triggered by button
    status: completed
  - id: search-ui
    content: Add visible Search Tutor label and Search button beside input
    status: completed
  - id: verify-search
    content: Verify queries only run on Search click/Enter, not while typing
    status: completed
isProject: false
---

# Tutor Search Button and Label

## Current behavior

[`apps/web-admin/src/app/pages/TutorsPage.tsx`](apps/web-admin/src/app/pages/TutorsPage.tsx) uses:
- `searchInput` — controlled input value
- `useDebouncedValue(searchInput, 300)` — auto-triggers queries after 300ms of typing
- `searchArg` passed to `GET_ADMIN_TUTORS` and `GET_ADMIN_TUTOR_STAGE_COUNTS`

The search label is screen-reader only (`sr-only`).

## Desired behavior

1. Show visible label **Search Tutor** above the search field (matching the **Onboarding stage** label pattern)
2. Keep placeholder: `Search by name, email, or mobile`
3. Add a **Search** button; queries run only when the button is pressed (not on every keystroke)

## Implementation

All changes in [`TutorsPage.tsx`](apps/web-admin/src/app/pages/TutorsPage.tsx).

### 1. Split draft input from applied search

Replace debounce with two state values:

```tsx
const [searchInput, setSearchInput] = useState('');      // what user is typing
const [appliedSearch, setAppliedSearch] = useState('');  // what queries use
```

Remove `useDebouncedValue` and its helper function (no longer needed in this file).

Update query variables to use applied search:

```tsx
const searchArg = appliedSearch.trim() || undefined;
```

Reset pagination when applied search or stage changes:

```tsx
useEffect(() => {
  setPage(1);
}, [activeStage, appliedSearch]);
```

### 2. Add search trigger handler

```tsx
function handleSearch() {
  setAppliedSearch(searchInput);
}
```

Wire to:
- **Search** button `onClick`
- Input **Enter** key (`onKeyDown`) — standard search-form UX; avoids forcing another click

Do **not** trigger search on `onChange`.

### 3. Update search UI layout

Replace the search block (L185–204) with:

```tsx
<div className="flex-1 max-w-md">
  <label htmlFor="tutor-search" className="mb-1 block text-sm font-medium text-primary">
    Search Tutor
  </label>
  <div className="flex gap-2">
    <div className="relative min-w-0 flex-1">
      {/* search icon + input (unchanged placeholder) */}
    </div>
    <button type="button" onClick={handleSearch} className="...">
      Search
    </button>
  </div>
</div>
```

Button styling: match existing admin actions (e.g. sky border/background, `h-11` to align with the stage select height).

Keep the toolbar row layout (`flex flex-col gap-3 sm:flex-row sm:items-end`) so search + stage dropdown stay side by side on desktop.

### 4. No backend changes

GraphQL queries and stage dropdown behavior stay the same — only the client-side trigger for `search` changes.

## Files to change

| File | Change |
|------|--------|
| [`apps/web-admin/src/app/pages/TutorsPage.tsx`](apps/web-admin/src/app/pages/TutorsPage.tsx) | Visible label, Search button, button-triggered search, remove debounce |

## Verification

1. Typing in the search box does **not** refetch tutors or update stage counts
2. Clicking **Search** (or pressing Enter) applies the term and refetches list + counts
3. Label reads **Search Tutor**; placeholder unchanged
4. Changing onboarding stage still works; pagination resets on search/stage change
5. Empty search + Search button clears the filter (shows all tutors for the stage)
