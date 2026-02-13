# P21-B: INTERACTION WIRING — Handoff

## Completed Phases

### Phase 1: Content List Sort + Search
**File modified:** `src/app/studio/content/page.tsx`
- Added search input with 300ms debounce (searches title, contentType, channels)
- Added sortable column headers (Content, Status, Scheduled, Created)
- Click-to-toggle direction with arrow indicators (ChevronUp/ChevronDown/ArrowUpDown)
- Default sort: createdAt desc
- Client-side sort & filter via `useMemo` on fetched data
- Distinct empty states: "No content yet" vs "No results found" with clear-search button

### Phase 2: SEO Optimize Tab — AI-Powered Quick Actions
**Files created:**
- `src/app/api/studio/seo/optimize/route.ts` — POST endpoint with 4 AI actions

**Files modified:**
- `src/components/content/seo-toolkit.tsx` — Wired all 4 Optimize tab buttons

**Actions wired:**
| Button | Action | Result UI |
|--------|--------|-----------|
| Generate SEO Title | `generate-title` | 3 title suggestions with Copy buttons |
| Suggest Keywords | `suggest-keywords` | Keyword chips with click-to-add to keyword list |
| Improve Readability | `improve-readability` | Rewritten content with Copy + changes list |
| Suggest Internal Links | `suggest-links` | Anchor text + target topic + reason for each link |

All buttons have: loading spinner, disabled state during any action, error display, persistent results.

### Phase 3: Sidebar Stats — Live Data
**File modified:** `src/app/studio/layout.tsx`
- Replaced hardcoded "42", "8", "+24%" with `SidebarStats` component
- Fetches from existing `/api/studio/dashboard/stats` endpoint
- Shows Content Created, Videos Rendered, Integrations count
- Skeleton loading state (animate-pulse placeholders)

### Phase 4: YouTube OAuth + Test-Failed Display Fix
**File modified:** `src/app/studio/integrations/page.tsx`
- Fixed YouTube OAuth redirect: `/api/studio/integrations/youtube/authorize` → `/api/studio/youtube/authorize`
- Improved test-failed display: plain text → amber badge with icon and helpful message

### Phase 5: Mia Context Hints — Editor & SEO
**Files modified:**
- `src/app/studio/content/[id]/page.tsx` — Added hints to Preview tab (editing tips) and SEO tab (optimization guidance)
- `src/app/studio/content/new/page.tsx` — Added hint for content creation flow

## Verification
- `tsc --noEmit`: 0 errors
- No new dependencies added
- File deny list respected: no modifications to mia-*, sora.ts, runway-adapter.ts, budget.ts, registry.ts (video), RenderArtifactPanel.tsx, integration-manager.ts, brave-search.ts, gemini.ts, youtube-oauth.ts, youtube-upload.ts, auth routes, middleware, config files, prisma/schema.prisma

## Summary of All Wiring

### Content List (`/studio/content`)
| Element | Status |
|---------|--------|
| Filter tabs | WIRED (pre-existing) |
| Sort columns | WIRED (P21-B) |
| Search input | WIRED (P21-B) |
| Delete button | WIRED (pre-existing) |
| View/Edit links | WIRED (pre-existing) |

### Content Detail (`/studio/content/[id]`)
| Element | Status |
|---------|--------|
| Edit modal | WIRED (pre-existing) |
| Delete | WIRED (pre-existing) |
| Approve/Reject | WIRED (pre-existing) |
| Publish | WIRED (pre-existing) |
| Duplicate | WIRED (pre-existing) |
| Reschedule | WIRED (pre-existing) |
| Mia editor hint | WIRED (P21-B) |
| Mia SEO hint | WIRED (P21-B) |

### SEO Toolkit (Optimize tab)
| Element | Status |
|---------|--------|
| Generate SEO Title | WIRED (P21-B) |
| Suggest Keywords | WIRED (P21-B) |
| Improve Readability | WIRED (P21-B) |
| Suggest Internal Links | WIRED (P21-B) |
| Generate Meta Description | WIRED (pre-existing) |
| Competitive Research (Brave) | WIRED (P21) |

### Sidebar (`layout.tsx`)
| Element | Status |
|---------|--------|
| Content Created | LIVE DATA (P21-B) |
| Videos Rendered | LIVE DATA (P21-B) |
| Integrations | LIVE DATA (P21-B) |

### Integrations (`/studio/integrations`)
| Element | Status |
|---------|--------|
| YouTube OAuth button | FIXED (P21-B) |
| Test-failed display | IMPROVED (P21-B) |
| Connect/Disconnect | WIRED (P21) |
| Test Connections | WIRED (P21) |
