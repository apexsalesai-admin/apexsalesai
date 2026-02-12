# P19 Handoff — Premium Provider Activation

## Completed
- [x] Runway Gen-4.5 end-to-end (submit → poll → display real video)
- [x] Sora 2 adapter (submit → poll → download → display real video)
- [x] BYOK Settings page (connect, test, disconnect, budget)
- [x] Encrypted key storage (AES-256-GCM)
- [x] Key resolver: user DB → platform env fallback
- [x] Mia recommendation engine
- [x] Provider dropdown reflects connection status
- [x] Structured logging for all providers
- [x] Cost estimation and ledger recording

## Files Created (7)
| File | Lines | Purpose |
|------|-------|---------|
| `src/lib/providers/video/sora.ts` | 172 | OpenAI Sora 2 provider (submit/poll/download) |
| `src/lib/studio/mia-recommender.ts` | 228 | Mia provider recommendation engine |
| `src/app/api/studio/recommend/route.ts` | 94 | POST /api/studio/recommend |
| `src/app/api/studio/integrations/route.ts` | 208 | GET/POST /api/studio/integrations |
| `src/app/api/studio/integrations/[provider]/route.ts` | 67 | DELETE /api/studio/integrations/:provider |
| `src/app/api/studio/integrations/[provider]/test/route.ts` | 118 | POST /api/studio/integrations/:provider/test |
| `src/app/studio/settings/providers/page.tsx` | 410 | BYOK settings page UI |

## Files Modified (9)
| File | Changes | Purpose |
|------|---------|---------|
| `src/lib/render/providers/runway.ts` | +27/-14 | Gen-4.5 model, 2-10s duration, optional apiKey in poll |
| `src/lib/render/types.ts` | +4/-4 | Flexible duration (number), apiKey in poll signature |
| `src/lib/providers/video/runway-adapter.ts` | +16/-8 | Gen-4.5 display, durations [4,5,6,8,10], apiKey passthrough |
| `src/lib/providers/video/types.ts` | +4/-2 | Added 'sora' to VideoProviderName, requiresDownload flag |
| `src/lib/providers/video/registry.ts` | +2 | Register SoraProvider |
| `src/lib/providers/video/budget.ts` | +1 | [LEDGER:RECORD] structured log |
| `src/lib/integrations/resolveProviderKey.ts` | +6/-2 | Added sora→OPENAI, template→INVIDEO mappings |
| `src/lib/inngest/jobs/video/generateVideoJob.ts` | +46/-20 | Provider routing, Sora download step, dynamic logs |
| `src/app/studio/content/[id]/page.tsx` | +103 | Mia recommendation UI + fetch, alternatives |
| `src/app/studio/layout.tsx` | +2 | Video Providers nav item |

## Provider Status
| Provider | Status | Model | Durations | Cost |
|----------|--------|-------|-----------|------|
| template | Always available | — | 4-60s | Free |
| runway | Requires API key | Gen-4.5 | 4,5,6,8,10s | ~$0.34/s |
| sora | Requires API key | sora-2 | 4,8,12s | ~$0.10/s |
| heygen | Requires API key | Avatar | 15-300s | ~$0.033/s |

## Structured Log Tags
```
[RENDER:REQUEST]    — render route entry
[BUDGET:CHECK]      — budget enforcement check
[BUDGET:EXCEEDED]   — budget cap hit
[LEDGER:RECORD]     — cost ledger write
[RUNWAY:API:SUBMIT] — legacy Runway submit
[RUNWAY:API:POLL]   — legacy Runway poll
[SORA:SUBMIT]       — Sora submit
[SORA:POLL]         — Sora poll
[SORA:DOWNLOAD]     — Sora binary download
[HEYGEN:SUBMIT]     — HeyGen submit
[HEYGEN:POLL]       — HeyGen poll
[HEYGEN:COMPLETE]   — HeyGen complete
[INNGEST:RECEIVED]  — Inngest job entry
[PROVIDER:REGISTRY] — Provider registration
```

## Key Architecture Decisions
- **Sora binary download**: Unlike Runway (public CDN URLs), Sora returns authenticated `/content` endpoints. The Inngest job includes a dedicated download step that saves MP4 to `public/studio/renders/`.
- **Provider key resolution**: Two-tier — encrypted DB key (user BYOK) → env var fallback (platform). Inngest steps re-resolve keys per step (no shared state).
- **Mia recommendation**: Scoring matrix (contentType × platform) + bonuses for connected/within-budget + penalties for disconnected/over-budget. Template is always fallback.
- **Budget enforcement**: $25/month default, 20 renders/day default, configurable via workspace settings JSON.

## Known Issues
- Sora API endpoints are based on the documented OpenAI video API spec; if the production API differs from documentation, the submit/poll URLs may need adjustment.
- HeyGen adapter exists and is fully implemented but untested end-to-end (requires paid key).
- The `RUNWAY_TEXT_TO_VIDEO_MODEL` env var defaults to `gen4.5`; update `.env.local` if a different model is needed.
- Video files downloaded from Sora are stored in `public/studio/renders/` on the local filesystem — production deployment should use cloud storage (S3/R2).

## P20 Scope Recommendations
- Invideo MCP integration (requires MCP bridge architecture)
- Three-column Video Console layout redesign
- Provider analytics dashboard (renders per provider, cost trends)
- Bulk render queue (multiple contents, same provider)
- Video comparison view (side-by-side provider outputs)
- Export/download management
- Cloud storage for rendered videos (replace local filesystem)
