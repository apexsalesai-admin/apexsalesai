# P5-MIA-TYPE-AWARE Engine Report

## Summary

Made the Mia Creative Session genuinely type-aware across prompts, research, structure, scoring, and save behavior. The social post pipeline (`hook -> body -> cta`) remains completely untouched.

## Architecture

### Central Config: `src/lib/content/content-type-config.ts`

Single source of truth for all type-specific behavior. Each `ContentTypeConfig` defines:

| Field | Purpose |
|---|---|
| `type` | Content type identifier |
| `label` | Human-readable type name |
| `researchMode` | Research strategy ('social', 'longform', 'direct', 'visual', 'campaign') |
| `structureMode` | Section structure strategy |
| `scoringMode` | Scoring criteria strategy |
| `requiresChannelUpfront` | Whether channel selection is needed before creation |
| `defaultChannels` | Auto-assigned channels for direct-create modes |
| `sections[]` | Section templates (type, title, subtitle, instruction) |
| `researchPrompt()` | Function returning full research prompt (empty = use default social) |
| `systemPrompt` | Type-specific AI system prompt (empty = use default) |
| `scoringCriteria[]` | Scoring criteria with weights (empty = use default social scoring) |
| `titleExtraction` | How to derive a title from assembled sections |

### Type Configs

| Type | Research | Sections | System Prompt | Scoring |
|---|---|---|---|---|
| **post** | Default social (empty) | Default hook/body/cta (empty) | Default (empty) | Default 5 dims (empty) |
| **article** | Long-form article angles | Headline & Intro, Key Arguments, Conclusion & CTA | Long-form writer | Clarity, Structure, Depth, Relevance |
| **email** | Email strategies | Subject Line & Preview, Email Body, CTA & Close | Email copywriter | Subject Line, Clarity, CTA, Relevance |
| **image** | Visual concepts | Primary Prompt, Alternative Style, Creative Variation | Visual prompt engineer | Prompt Clarity, Specificity, Coherence, Readiness |
| **campaign** | Campaign strategies | LinkedIn Post, X Thread, Email Draft, Blog Summary | Campaign strategist | Strategy, Channel Fit, Completeness, Consistency |

### Research: Full Prompt Replacement

For non-post types, the research route uses the config's `researchPrompt()` function to generate a **complete replacement prompt**, not just context injection. This means:
- Article research asks for "article angles with depth and substance"
- Image research asks for "visual interpretation angles"
- Campaign research asks for "multi-channel campaign strategies"
- Post research runs the original social prompt unchanged (function returns empty string)

Type-specific prompts return `[{title, description, whyItWorks}]` format. The route normalizes `whyItWorks` to `rationale` for backward compatibility with AngleCard.

### Generation: Type-Specific System Prompts

The generate-section route now prepends the type-specific `systemPrompt` before the generation instruction. This changes the AI's persona:
- Article: "expert content writer and editor" focused on long-form
- Email: "expert email copywriter" focused on open rates and conversion
- Image: "expert visual prompt engineer" for DALL-E 3
- Campaign: "expert campaign strategist" generating publishable assets
- Post: No system prompt override (existing behavior)

### Scoring: Weighted Criteria

Each type defines scoring criteria with explicit weights. The API calculates weighted overall scores and maps type-specific keys to the standard MomentumMeter keys for backward compatibility.

### Em Dash Prohibition

All type-specific prompts include: "Never use em dashes. Use commas, semicolons, colons, or separate sentences instead."

## Files Changed

| File | Changes |
|---|---|
| `src/lib/content/content-type-config.ts` | Complete rewrite with function-based research prompts, system prompts, weighted scoring |
| `src/lib/studio/mia-creative-types.ts` | Extended `SectionType` union with all new section types |
| `src/hooks/useMiaCreativeSession.ts` | Type-aware section init, labels, assembly, title extraction, dep arrays |
| `src/app/api/studio/mia/research/route.ts` | Full prompt replacement for non-post types |
| `src/app/api/studio/mia/generate-section/route.ts` | Type-specific system prompts, section instructions, weighted scoring |
| `src/components/mia/creative/mia-section-builder.tsx` | Dynamic section count display |
| `src/components/mia/creative/mia-section-block.tsx` | Labels and descriptions for all section types |
| `docs/P5-mia-type-aware-engine-report.md` | This report |

## Safety: Post Pipeline Unchanged

The `post` config returns empty values for everything:
- `sections: []` -> hook/body/cta pipeline runs
- `researchPrompt() -> ''` -> falsy, original social prompt runs
- `systemPrompt: ''` -> falsy, no system prompt prepended
- `scoringCriteria: []` -> default 5 social dimensions used
- `requiresChannelUpfront: true` -> channel selection shown
- `defaultChannels: []` -> no auto-assignment

## Remaining Limitations

1. **MomentumMeter UI** still shows standard 5-dimension labels (hook/clarity/cta/seo/platformFit) regardless of type. The API maps type-specific scores to these keys for compatibility. A future sprint could make the meter labels dynamic.
2. **Save schema** stores `contentType` but the ScheduledContent model's `contentType` enum may not include all extended types. Content saves as the closest match.
3. **Polishing phase** prompts are not yet type-aware (they analyze "tone consistency, clarity, engagement" generically). Could be adapted per type in a future sprint.

## Data Flow

```
ContentCreator (initialType prop)
  -> MiaCreativeSession (contentType prop)
    -> useMiaCreativeSession hook
      -> createInitialSections(contentType)        // type-aware sections
      -> fetchAngles -> /api/studio/mia/research   // full prompt replacement
      -> generateSection -> /api/generate-section  // type system prompt + instructions
      -> scoreContent -> /api/generate-section     // weighted scoring criteria
      -> finishSession -> type-aware assembly      // title extraction per type
```
