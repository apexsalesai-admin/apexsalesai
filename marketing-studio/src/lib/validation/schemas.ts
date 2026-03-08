/**
 * API Request Validation Schemas
 * LYFYE Marketing Studio
 */

import { z } from 'zod';
import { NextResponse } from 'next/server';

// ============================================================
// SHARED VALIDATORS
// ============================================================

const nonEmptyString = z.string().trim().min(1, 'Required');
const optionalString = z.string().trim().optional();
const idString = z.string().min(1, 'ID required');

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// ============================================================
// CONTENT SCHEMAS
// ============================================================

export const createContentSchema = z.object({
  title: nonEmptyString.max(500, 'Title too long'),
  body: optionalString,
  contentType: z
    .enum([
      'BLOG_POST',
      'SOCIAL_POST',
      'EMAIL',
      'VIDEO_SCRIPT',
      'AD_COPY',
      'LANDING_PAGE',
      'NEWSLETTER',
      'PRESS_RELEASE',
      'CASE_STUDY',
      'WHITE_PAPER',
    ])
    .optional()
    .default('BLOG_POST'),
  workspaceId: idString,
  status: z.enum(['DRAFT', 'REVIEW', 'APPROVED', 'PUBLISHED']).optional().default('DRAFT'),
  metadata: z.record(z.unknown()).optional(),
});

export const updateContentSchema = z.object({
  title: nonEmptyString.max(500).optional(),
  body: optionalString,
  contentType: z
    .enum([
      'BLOG_POST',
      'SOCIAL_POST',
      'EMAIL',
      'VIDEO_SCRIPT',
      'AD_COPY',
      'LANDING_PAGE',
      'NEWSLETTER',
      'PRESS_RELEASE',
      'CASE_STUDY',
      'WHITE_PAPER',
    ])
    .optional(),
  status: z.enum(['DRAFT', 'REVIEW', 'APPROVED', 'PUBLISHED']).optional(),
  metadata: z.record(z.unknown()).optional(),
});

// ============================================================
// WORKSPACE SCHEMAS
// ============================================================

export const createWorkspaceSchema = z.object({
  name: nonEmptyString.max(100, 'Workspace name too long'),
  description: optionalString.optional(),
  settings: z.record(z.unknown()).optional(),
});

export const updateWorkspaceSchema = z.object({
  name: nonEmptyString.max(100).optional(),
  description: optionalString.optional(),
  settings: z.record(z.unknown()).optional(),
  features: z.record(z.unknown()).optional(),
});

export const inviteMemberSchema = z.object({
  email: z.string().email('Invalid email address'),
  role: z.enum(['VIEWER', 'EDITOR', 'ADMIN']).default('EDITOR'),
});

// ============================================================
// PUBLISHING SCHEMAS
// ============================================================

export const publishContentSchema = z.object({
  contentId: idString,
  workspaceId: idString,
  channels: z
    .array(z.enum(['LINKEDIN', 'TWITTER', 'YOUTUBE', 'FACEBOOK', 'INSTAGRAM']))
    .min(1, 'At least one channel required'),
  scheduledFor: z
    .string()
    .datetime('Invalid datetime format')
    .optional(),
  idempotencyKey: nonEmptyString.max(255).optional(),
  channelOverrides: z
    .record(
      z.object({
        title: optionalString,
        body: optionalString,
        hashtags: z.array(z.string()).optional(),
      })
    )
    .optional(),
});

export const crossPostSchema = z.object({
  contentId: idString,
  workspaceId: idString,
  platforms: z
    .array(
      z.object({
        channel: z.enum(['LINKEDIN', 'TWITTER', 'YOUTUBE', 'FACEBOOK', 'INSTAGRAM']),
        format: z.enum(['FULL', 'SUMMARY', 'THREAD', 'SHORT']).optional(),
      })
    )
    .min(1, 'At least one platform required'),
  scheduledFor: z.string().datetime().optional(),
});

// ============================================================
// MIA AI SCHEMAS
// ============================================================

export const miaAnalyzeSchema = z.object({
  workspaceId: idString,
  contentId: idString.optional(),
  prompt: nonEmptyString.max(10000, 'Prompt too long'),
  context: optionalString.optional(),
  provider: z.enum(['anthropic', 'openai', 'gemini']).optional().default('anthropic'),
});

export const miaGenerateSchema = z.object({
  workspaceId: idString,
  contentType: z.enum([
    'BLOG_POST',
    'SOCIAL_POST',
    'EMAIL',
    'VIDEO_SCRIPT',
    'AD_COPY',
    'LANDING_PAGE',
    'NEWSLETTER',
    'PRESS_RELEASE',
    'CASE_STUDY',
    'WHITE_PAPER',
  ]),
  prompt: nonEmptyString.max(10000),
  tone: z.enum(['PROFESSIONAL', 'CASUAL', 'AUTHORITATIVE', 'FRIENDLY', 'URGENT']).optional(),
  targetLength: z.enum(['SHORT', 'MEDIUM', 'LONG']).optional().default('MEDIUM'),
  keywords: z.array(z.string().max(100)).max(20).optional(),
  provider: z.enum(['anthropic', 'openai', 'gemini']).optional().default('anthropic'),
});

export const miaSeoSchema = z.object({
  workspaceId: idString,
  contentId: idString,
  targetKeywords: z.array(z.string().max(100)).min(1).max(10),
  provider: z.enum(['anthropic', 'openai', 'gemini']).optional().default('anthropic'),
});

export const miaResearchSchema = z.object({
  workspaceId: idString,
  topic: nonEmptyString.max(500),
  depth: z.enum(['QUICK', 'STANDARD', 'DEEP']).optional().default('STANDARD'),
  provider: z.enum(['anthropic', 'openai', 'gemini']).optional().default('anthropic'),
});

// ============================================================
// VIDEO SCHEMAS
// ============================================================

export const createVideoJobSchema = z.object({
  workspaceId: idString,
  contentId: idString.optional(),
  prompt: nonEmptyString.max(5000, 'Video prompt too long'),
  aspectRatio: z.enum(['16:9', '9:16', '1:1']).optional().default('16:9'),
  duration: z.enum(['5', '10']).optional().default('5'),
  provider: z.enum(['runway']).optional().default('runway'),
});

// ============================================================
// INTEGRATION SCHEMAS
// ============================================================

export const connectIntegrationSchema = z.object({
  workspaceId: idString,
  platform: z.enum(['LINKEDIN', 'TWITTER', 'YOUTUBE', 'FACEBOOK', 'INSTAGRAM']),
  accessToken: nonEmptyString,
  refreshToken: optionalString,
  expiresAt: z.string().datetime().optional(),
  metadata: z.record(z.unknown()).optional(),
});

// ============================================================
// HELPER: Validate and return typed result or error response
// ============================================================

export async function validateBody<T extends z.ZodType>(
  req: Request,
  schema: T
): Promise<
  | { data: z.infer<T>; error: null; response: null }
  | { data: null; error: z.ZodError; response: NextResponse }
> {
  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      return {
        data: null,
        error: parsed.error,
        response: NextResponse.json(
          {
            error: 'Validation failed',
            details: parsed.error.flatten(),
          },
          { status: 400 }
        ),
      };
    }

    return { data: parsed.data, error: null, response: null };
  } catch {
    return {
      data: null,
      error: new z.ZodError([
        {
          code: 'custom',
          message: 'Invalid JSON body',
          path: [],
        },
      ]),
      response: NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      ),
    };
  }
}
