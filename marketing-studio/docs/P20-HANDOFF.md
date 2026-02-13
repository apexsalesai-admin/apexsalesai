# P20 Handoff — Mia Co-Pilot Experience

## Completed (P20-A)
- [x] Mia type system (`mia-types.ts` — timestamp: string, serialization-safe)
- [x] Script intelligence engine (`mia-script-analyzer.ts` — scene detection, duration estimation)
- [x] Mia message factory (`mia-messages.ts` — centralized voice, all message types)
- [x] Post-render reviewer (`mia-reviewer.ts` — platform reformats, pacing analysis, cost feedback)
- [x] `useMiaCopilot()` hook — encapsulates all state, localStorage persistence, concurrency guard
- [x] MiaCopilotPanel component — mode toggle, message list, scene breakdown, action buttons
- [x] Analyze API route (`POST /api/studio/mia/analyze`)
- [x] Render plan API route (`POST /api/studio/mia/render-plan`)
- [x] Content page integration — panel replaces old Mia badge
- [x] Guided mode flow (greeting → analyze → approve → render)
- [x] Autopilot mode flow (compact analysis → one-click render)
- [x] Duration mismatch warning (script > selected duration)
- [x] Budget enforcement warnings
- [x] Provider disconnect fallback (auto-switch to Template with explanation)
- [x] Mode toggle with localStorage persistence
- [x] Session persistence per contentId+versionId (1 hour TTL)
- [x] Mobile responsive (panel collapses < 768px)
- [x] Concurrency guard (max 2 concurrent renders)
- [x] TypeScript: 0 errors

## Completed (P20-B)
- [x] Claude Sonnet AI analyzer (`mia-ai-analyzer.ts` — replaces regex for creative intelligence)
- [x] `server-only` import guard (prevents client-side import of API key)
- [x] Zod schema validation for AI responses (`AiAnalysisSchema`)
- [x] Defensive JSON parsing (3 strategies: direct → brace-extract → fence-strip)
- [x] Repair prompt (4th strategy: Claude re-parses broken JSON)
- [x] In-memory response cache by SHA-256 script hash (10-min TTL, 50-entry max)
- [x] Duration snapping to provider-supported buckets
- [x] Scene count clamping (1–8 scenes)
- [x] Budget guard in post-processing (downgrades to template if over budget)
- [x] AI-first pipeline with regex fallback (`analyze/route.ts`)
- [x] Deterministic validator cross-check (AI vs regex scene count divergence merging)
- [x] Extended `MiaSceneAnalysis` with `visualDirection`, `creativeFeedback`, `strengthRating`
- [x] Extended `ScriptAnalysisResult` with `overallFeedback`, `suggestedRewrites`, `narrativeArc`, `aiGenerated`
- [x] Added `MiaGreetingContext` type
- [x] AI-enriched `generateScriptAnalysis()` — uses `overallFeedback` + `narrativeArc` when available
- [x] Auto-analyze on version select (`useMiaCopilot` hook)
- [x] Enriched SceneBreakdown: strength badges, visual direction (eye icon), creative feedback (lightbulb)
- [x] SuggestedRewrites collapsible section (original → rewrite with reason)
- [x] AI-Powered badge on AI-generated messages
- [x] Enhanced TypingIndicator with brain animation
- [x] Dependencies: `@anthropic-ai/sdk`, `server-only` (zod already present)
- [x] TypeScript: 0 errors

## Deferred to P21 (by design)
- [ ] FFmpeg/fluent-ffmpeg stitching (serverless-incompatible)
- [ ] DB migration for parent/child job model (`parentJobId`, `sceneNumber` columns)
- [ ] Per-scene progress polling with scene-aware video-jobs endpoint
- [ ] Cloud-based stitching (Shotstack/Creatomate/R2 worker)
- [ ] `[MIA:STITCH:*]` structured logs
- [ ] `[MIA:SCENE:COMPLETE]` / `[MIA:ALL_SCENES_COMPLETE]` lifecycle logs

## Files Created
- `src/lib/studio/mia-types.ts` — Type system (P20-A: base, P20-B: AI fields)
- `src/lib/studio/mia-script-analyzer.ts` — Scene detection + duration + provider recommendation
- `src/lib/studio/mia-messages.ts` — Message factory (Mia's voice)
- `src/lib/studio/mia-reviewer.ts` — Post-render optimization suggestions
- `src/lib/studio/mia-ai-analyzer.ts` — Claude Sonnet AI analysis (P20-B)
- `src/hooks/useMiaCopilot.ts` — State management hook
- `src/components/studio/MiaCopilotPanel.tsx` — Conversational panel UI
- `src/app/api/studio/mia/analyze/route.ts` — Script analysis API (AI-first + regex fallback)
- `src/app/api/studio/mia/render-plan/route.ts` — Multi-scene render execution API

## Files Modified (P20-B)
- `src/lib/studio/mia-types.ts` — Added AI fields to MiaSceneAnalysis, MiaMessage metadata, MiaGreetingContext
- `src/lib/studio/mia-script-analyzer.ts` — Extended ScriptAnalysisResult interface
- `src/lib/studio/mia-messages.ts` — AI-enriched generateScriptAnalysis with overallFeedback
- `src/hooks/useMiaCopilot.ts` — Auto-analyze on version select
- `src/components/studio/MiaCopilotPanel.tsx` — Enriched scene cards, rewrites, AI badge, brain indicator
- `src/app/api/studio/mia/analyze/route.ts` — AI-first pipeline with cross-check
- `src/app/studio/content/[id]/page.tsx` — Panel integration (P20-A, unchanged in P20-B)

## Files NOT Touched (deny list respected)
- `src/lib/providers/video/sora.ts` — P19 stable
- `src/lib/providers/video/runway-adapter.ts` — P19 stable
- `src/lib/render/providers/runway.ts` — P19 stable
- `src/lib/providers/video/budget.ts` — P19 stable
- `src/lib/providers/video/registry.ts` — P19 stable
- `src/lib/providers/video/types.ts` — P19 stable
- `src/lib/studio/mia-recommender.ts` — P19 kept as fallback
- `src/app/api/studio/recommend/route.ts` — P19 kept as fallback
- `prisma/schema.prisma` — No migration (scene metadata in config JSON)
- `src/components/studio/RenderArtifactPanel.tsx` — P18 stable

## Architecture Decisions
1. **No DB migration** — Scene metadata stored in `StudioVideoJob.config` JSON field. Full parent/child model deferred to P21.
2. **No FFmpeg** — Stitching deferred. Each scene renders independently as its own video job.
3. **`useMiaCopilot()` hook** — All Mia state encapsulated. page.tsx stays clean (~3 new lines).
4. **`timestamp: string`** — ISO strings, not Date objects. Serialization-safe across API boundaries.
5. **localStorage persistence** — Messages persist per contentId+versionId with 1-hour TTL. No DB round-trip.
6. **Concurrency guard** — Max 2 concurrent Inngest events per render plan. Prevents rate limit storms.
7. **Fail-soft fallback** — If recommended provider isn't connected, Mia auto-switches to Template and explains why.
8. **AI-first with regex fallback** (P20-B) — Claude Sonnet provides creative intelligence; regex analyzer runs in parallel as structural baseline. If AI fails, regex takes over seamlessly.
9. **Deterministic cross-check** (P20-B) — If AI and regex scene counts diverge by >3, trust regex structure but overlay AI creative fields.
10. **Defensive JSON parsing** (P20-B) — 4 extraction strategies prevent LLM formatting quirks from crashing analysis.
11. **Zod validation** (P20-B) — Schema-validated AI responses prevent hallucinated field types from propagating.
12. **In-memory cache** (P20-B) — SHA-256 hash of script+platform+providers. 10-min TTL, 50-entry max. Avoids redundant API calls on re-analyze.
13. **`server-only` guard** (P20-B) — `mia-ai-analyzer.ts` imports `server-only` to prevent accidental client-side bundling of Anthropic API key.

## Structured Log Tags
```
[MIA:ANALYZE]            — Script analysis (scene count, duration, cost)
[MIA:AI]                 — AI analyzer lifecycle (cache hit, calling Claude, complete)
[MIA:AI:CROSSCHECK]      — Deterministic validator divergence detected
[MIA:AI:ERROR]           — AI analysis failure (falls back to regex)
[MIA:WARN]               — Duration/budget/script warnings
[MIA:ORCHESTRATE]        — Multi-scene render plan creation
[MIA:SCENE:CREATE]       — Individual scene job creation
[MIA:REVIEW]             — Post-render review generation
[MIA:ANALYZE:ERROR]      — Analysis failure
[MIA:RENDER:ERROR]       — Render plan execution failure
[MIA:RENDER_SCENE:ERROR] — Single scene render failure
```

## P21 Candidates
- Cloud-based stitching for serverless (Vercel) deployment
- Parent/child job model with DB migration
- Per-scene progress tracking in UI (scene-aware polling)
- Image-to-video (scene reference images as input)
- Voice cloning integration for consistent voiceover across scenes
- A/B version testing (render same script with different providers, compare)
- Mia learning from user preferences over time
- `renderPlanId` audit trail — saved to DB for reproducibility
- Streaming AI analysis (SSE for real-time scene-by-scene feedback)
- AI-powered post-render review (currently regex-based)
