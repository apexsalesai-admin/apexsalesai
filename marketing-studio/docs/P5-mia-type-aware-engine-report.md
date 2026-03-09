# P5-MIA-TYPE-AWARE Engine Report

## Summary

Made the Mia Creative Session genuinely type-aware across prompts, research, structure, scoring, and save behavior. The social post pipeline (`hook → body → cta`) remains completely untouched.

## Architecture

### Central Config: `src/lib/content/content-type-config.ts`

Single source of truth for all type-specific behavior. Each content type defines:

| Field | Purpose |
|---|---|
| `sections[]` | Section templates (types, labels, AI instructions) |
| `researchContext` | Injected into research prompts for type-specific angles |
| `scoringDimensions[]` | Custom scoring criteria per type |
| `titleExtraction` | How to derive a title from assembled sections |
| `defaultChannel` | Auto-assigned channel for direct-create modes |
| `generateLabel` | Button label in section builder |

### Type Configs

| Type | Sections | Scoring Dimensions |
|---|---|---|
| **post** | `[]` (uses default hook/body/cta) | `[]` (uses default 5 dims) |
| **article** | headline, introduction, body, conclusion | headline power, depth, structure, SEO, CTA |
| **email** | subject_line, preview_text, body, cta | subject line, clarity, personalization, CTA, deliverability |
| **image** | visual_concept, prompt_variations, body | visual impact, prompt clarity, brand alignment, caption, platform fit |
| **campaign** | strategy_overview, channel_plan, messaging_framework, body | strategy, channel coverage, messaging, actionability, launch content |

### Files Modified

| File | Changes |
|---|---|
| `src/lib/studio/mia-creative-types.ts` | Extended `SectionType` union with new section types |
| `src/lib/content/content-type-config.ts` | **NEW** — Central type configuration |
| `src/hooks/useMiaCreativeSession.ts` | Type-aware section initialization, labels, assembly, title extraction |
| `src/app/api/studio/mia/research/route.ts` | Type-specific research prompt context injection |
| `src/app/api/studio/mia/generate-section/route.ts` | Type-specific section instructions, scoring dimensions |
| `src/components/mia/creative/mia-section-builder.tsx` | Dynamic section count display |
| `src/components/mia/creative/mia-section-block.tsx` | Labels and descriptions for all section types |

### Safety: Post Pipeline Unchanged

The `post` config returns empty arrays for `sections`, `researchContext`, and `scoringDimensions`. The `getContentTypeConfig()` function returns this empty config for any unknown type. This means:

1. `hasCustomSections('post')` → `false` → hook/body/cta pipeline runs
2. Research prompt gets no extra context → same prompt as before
3. Section instructions fall through to default hook/body/cta map
4. Scoring uses default 5 dimensions
5. Assembly uses existing hook+body+cta concatenation

### Data Flow

```
ContentCreator (initialType prop)
  → MiaCreativeSession (contentType prop)
    → useMiaCreativeSession hook
      → createInitialSections(contentType)  // type-aware sections
      → fetchAngles → /api/studio/mia/research (type-aware prompts)
      → generateSection → /api/studio/mia/generate-section (type-aware instructions)
      → scoreContent → /api/studio/mia/generate-section?action=score (type-aware dimensions)
      → finishSession → type-aware assembly + title extraction
```
