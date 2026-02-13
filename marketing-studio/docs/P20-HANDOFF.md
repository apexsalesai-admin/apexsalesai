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

## Deferred to P21 (by design)
- [ ] FFmpeg/fluent-ffmpeg stitching (serverless-incompatible)
- [ ] DB migration for parent/child job model (`parentJobId`, `sceneNumber` columns)
- [ ] Per-scene progress polling with scene-aware video-jobs endpoint
- [ ] Cloud-based stitching (Shotstack/Creatomate/R2 worker)
- [ ] `[MIA:STITCH:*]` structured logs
- [ ] `[MIA:SCENE:COMPLETE]` / `[MIA:ALL_SCENES_COMPLETE]` lifecycle logs

## Files Created
- `src/lib/studio/mia-types.ts` — Type system (existed from prep, verified correct)
- `src/lib/studio/mia-script-analyzer.ts` — Scene detection + duration + provider recommendation
- `src/lib/studio/mia-messages.ts` — Message factory (Mia's voice)
- `src/lib/studio/mia-reviewer.ts` — Post-render optimization suggestions
- `src/hooks/useMiaCopilot.ts` — State management hook
- `src/components/studio/MiaCopilotPanel.tsx` — Conversational panel UI
- `src/app/api/studio/mia/analyze/route.ts` — Script analysis API
- `src/app/api/studio/mia/render-plan/route.ts` — Multi-scene render execution API

## Files Modified
- `src/app/studio/content/[id]/page.tsx` — Panel integration, old badge removed

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

## Structured Log Tags
```
[MIA:ANALYZE]          — Script analysis (scene count, duration, cost)
[MIA:WARN]             — Duration/budget/script warnings
[MIA:ORCHESTRATE]      — Multi-scene render plan creation
[MIA:SCENE:CREATE]     — Individual scene job creation
[MIA:REVIEW]           — Post-render review generation
[MIA:ANALYZE:ERROR]    — Analysis failure
[MIA:RENDER:ERROR]     — Render plan execution failure
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
