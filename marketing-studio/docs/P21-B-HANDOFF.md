# P21-B: INTERACTION WIRING — Handoff

## Completed Phases

### Phase 0.5: Hydration Fix
**File modified:** `src/components/studio/MiaContextHint.tsx`
- Fixed hydration mismatch caused by localStorage read in `useState` initializer
- Changed to `useState(false)` + `useEffect` for deferred localStorage read
- Added `mounted` guard: returns null before mount to avoid SSR/CSR mismatch

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

### Phase 3: Mia Panel — Content-Aware AI Suggestions
**Files created:**
- `src/app/api/studio/mia/suggest/route.ts` — POST endpoint with 8 AI actions

**Files modified:**
- `src/components/mia/mia-panel.tsx` — Replaced all fake `setTimeout` actions with real AI calls

**Actions wired:**
| Section | Action | Behavior |
|---------|--------|----------|
| Recommended | Suggest 3 viral hooks | Real AI → inline hook cards with Copy + formula label |
| Recommended | Generate CTA options | Real AI → inline CTA cards with urgency color + Copy |
| Recommended | Suggest content structure | Real AI → numbered section outline with word counts |
| Improve This | Tighten hook | Real AI → improved text with Copy |
| Improve This | Make it executive | Real AI → rewritten content with changes list |
| Improve This | Add proof | Real AI → content with proof points |
| Improve This | Shorten 30% | Real AI → shortened content with reduction % |
| Repurpose Into | LinkedIn/X/Email/Video | Real AI → repurposed title + body with Copy |

Features: inline result display in panel, error banner, loading states, buttons disabled during any action, results cleared on panel close.

### Phase 4: Sidebar Stats — Live Data
**File modified:** `src/app/studio/layout.tsx`
- Replaced hardcoded "42", "8", "+24%" with `SidebarStats` component
- Fetches from existing `/api/studio/dashboard/stats` endpoint
- Shows Content Created, Videos Rendered, Integrations count
- Skeleton loading state (animate-pulse placeholders)

### Phase 5: YouTube OAuth Fix + YouTube Publish Modal
**File modified:** `src/app/studio/integrations/page.tsx`
- Fixed YouTube OAuth redirect: `/api/studio/integrations/youtube/authorize` → `/api/studio/youtube/authorize`
- Improved test-failed display: plain text → amber badge with icon and helpful message

**File modified:** `src/app/studio/content/[id]/page.tsx`
- Added YouTube publish modal with full metadata form
- Pre-fills title, description, tags from content data
- Privacy selector (Private/Unlisted/Public, defaults to Private)
- Calls `/api/studio/youtube/publish` API (existing endpoint)
- Success state shows permalink to YouTube video
- Error display within modal
- Button shown when: status is APPROVED/SCHEDULED + video content + YOUTUBE channel + video URL ready

### Phase 6: Mia Context Hints — Editor & SEO
**Files modified:**
- `src/app/studio/content/[id]/page.tsx` — Added hints to Preview tab (editing tips) and SEO tab (optimization guidance)
- `src/app/studio/content/new/page.tsx` — Added hint for content creation flow

### Phase 7: Per-Scene Accept / Reject
**File modified:** `src/components/studio/MiaCopilotPanel.tsx`
- Added per-scene Accept/Reject buttons to `SceneBreakdown` component
- Accept: green checkmark badge, "Scene approved" status text, calls `onAction('accept-scene', { sceneNumber })`
- Reject: red X badge, "Requesting alternative..." status text, calls `onAction('reject-scene', { sceneNumber })`
- Visual state change: accepted scenes get emerald border, rejected scenes get red border + opacity fade
- Scene number badge changes to Check/X icon based on status
- Buttons hidden after decision (no double-clicking)

## Verification
- `tsc --noEmit`: 0 errors
- No new dependencies added
- File deny list respected: no modifications to useMiaCopilot.ts, mia-ai-analyzer.ts, mia-script-analyzer.ts, mia-messages.ts, mia-types.ts, sora.ts, runway-adapter.ts, budget.ts, registry.ts (video), RenderArtifactPanel.tsx, integration-manager.ts, brave-search.ts, gemini.ts, youtube-oauth.ts, youtube-upload.ts, auth routes, middleware, config files, prisma/schema.prisma

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
| YouTube Publish | WIRED (P21-B) |
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

### Mia Panel (Global)
| Element | Status |
|---------|--------|
| Viral hooks | WIRED — real AI (P21-B) |
| CTA options | WIRED — real AI (P21-B) |
| Content structure | WIRED — real AI (P21-B) |
| Improve: tighten hook | WIRED — real AI (P21-B) |
| Improve: executive tone | WIRED — real AI (P21-B) |
| Improve: add proof | WIRED — real AI (P21-B) |
| Improve: shorten 30% | WIRED — real AI (P21-B) |
| Repurpose (4 channels) | WIRED — real AI (P21-B) |

### Mia Co-Pilot Panel (Video)
| Element | Status |
|---------|--------|
| Script analysis | WIRED (P20-B) |
| Scene breakdown | WIRED (P20-B) |
| Per-scene accept/reject | WIRED (P21-B) |
| Render actions | WIRED (P20-B) |
| Suggested rewrites | WIRED (P20-B) |

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

## Files Created (P21-B)
- `src/app/api/studio/seo/optimize/route.ts`
- `src/app/api/studio/mia/suggest/route.ts`

## Files Modified (P21-B)
- `src/app/studio/content/page.tsx` — sort + search
- `src/app/studio/layout.tsx` — live sidebar stats
- `src/app/studio/integrations/page.tsx` — YouTube OAuth fix + test-failed display
- `src/app/studio/content/[id]/page.tsx` — Mia hints + YouTube publish modal
- `src/app/studio/content/new/page.tsx` — Mia hint
- `src/components/content/seo-toolkit.tsx` — SEO optimize buttons
- `src/components/mia/mia-panel.tsx` — real AI suggestions
- `src/components/studio/MiaContextHint.tsx` — hydration fix
- `src/components/studio/MiaCopilotPanel.tsx` — per-scene accept/reject
