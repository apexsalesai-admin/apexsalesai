# P21: PLATFORM ACTIVATION — Handoff

## Completed Phases

### Phase 0: Audit
- Read all critical files, identified status bug root cause, alert popup, Coming Soon bloat

### Phase 1: Integration Status Fix (Critical Bug #1)
**Files created:**
- `src/lib/integrations/registry.ts` — Master integration registry (12 providers, 8 categories)
- `src/lib/integrations/integration-manager.ts` — Universal integration manager (resolveKey, connect, test, disconnect, getAll)

**Files modified:**
- `src/app/api/studio/integrations/route.ts` — GET/POST now delegate to IntegrationManager
- `src/app/api/studio/integrations/[provider]/route.ts` — DELETE delegates to IntegrationManager
- `src/app/api/studio/integrations/[provider]/test/route.ts` — POST delegates to IntegrationManager
- `src/app/studio/integrations/page.tsx` — Complete rewrite: three-state badges, category tabs, ConnectProviderModal, no alert(), no Coming Soon

**Root cause fixed:** The old page fetched from `/api/studio/providers` which only listed video providers. Anthropic/OpenAI (env-connected) had no matching entries. Now IntegrationManager.getAll() checks both DB and env for ALL registered providers.

### Phase 2: Brave Search + Gemini
**Files created:**
- `src/lib/integrations/brave-search.ts` — `braveSearch()`, `testBraveConnection()`
- `src/lib/integrations/gemini.ts` — `generateWithGemini()`, `testGeminiConnection()`
- `src/app/api/studio/integrations/brave/search/route.ts` — POST endpoint

**Files modified:**
- `src/components/content/seo-toolkit.tsx` — Added Competitive Research panel (Keywords tab) wired to Brave Search API

### Phase 3: YouTube OAuth + Publish Pipeline
**Files created:**
- `src/lib/integrations/youtube-oauth.ts` — Full OAuth flow: auth URL, code exchange, token refresh, channel info fetch, token storage
- `src/lib/integrations/youtube-upload.ts` — Resumable upload to YouTube Data API v3
- `src/app/api/studio/youtube/authorize/route.ts` — GET redirect to Google OAuth
- `src/app/api/studio/youtube/callback/route.ts` — GET callback handler
- `src/app/api/studio/youtube/publish/route.ts` — POST upload endpoint

### Phase 4: Dashboard + Mia Context Hints
**Files created:**
- `src/app/api/studio/dashboard/stats/route.ts` — Real dashboard metrics from DB (content counts, publish jobs, integrations, renders, recent activity)
- `src/components/studio/MiaContextHint.tsx` — Dismissible hint component with localStorage persistence

**Files modified:**
- `src/app/studio/page.tsx` — Replaced hardcoded KPI_DATA with live API fetch, added Mia hints (welcome + no-integrations warning), removed unused mock data
- `src/app/studio/integrations/page.tsx` — Added Mia context hint about BYOK encryption

## Verification
- `tsc --noEmit`: 0 errors
- No new dependencies added (Brave Search and Gemini use REST APIs directly)
- File deny list respected: no modifications to mia-*, sora.ts, runway-adapter.ts, budget.ts, video registry, auth routes, middleware, config files

## Architecture Notes

### Integration Resolution Priority
1. User's DB key (workspace-scoped, AES-256-GCM encrypted)
2. Platform env key (admin-configured in `.env.local`)
3. null (disconnected)

### Provider Registry
12 providers across 8 categories:
- AI Models: Anthropic, OpenAI, Gemini
- Search: Brave
- Video Generation: Runway, HeyGen, Sora 2
- Voice & Audio: ElevenLabs
- Thumbnails: Leonardo AI
- Video Editing: Descript, Opus Clip
- Publishing: YouTube (OAuth)

### YouTube OAuth Flow
1. `/api/studio/youtube/authorize` — Redirects to Google with `youtube.upload` + `youtube.readonly` scopes
2. Google callback hits `/api/studio/youtube/callback` with auth code
3. Code exchanged for tokens, channel info fetched, tokens encrypted and stored in StudioIntegration
4. Token refresh handled transparently by `getYouTubeAccessToken()`

## Env Vars (New/Referenced)
- `BRAVE_SEARCH_API_KEY` — Brave Search API
- `GOOGLE_AI_API_KEY` — Google Gemini
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — YouTube OAuth (same as NextAuth Google)
- `NEXTAUTH_URL` — Callback URL base
