/**
 * LinkedIn REST Publisher
 *
 * Server-side LinkedIn UGC posting via the Marketing API.
 * Handles real API calls, error classification, and content validation.
 *
 * API NOTES:
 * - Uses LinkedIn ugcPosts endpoint (v2). LinkedIn is migrating to the
 *   Posts API (v2 /rest/posts) — monitor for deprecation notices.
 * - Required OAuth scopes: openid, profile, w_member_social
 * - Token refresh is OUT OF SCOPE for P8. On 401, return errorType: 'TOKEN'
 *   with a "reconnect required" message.
 * - Max text length: 3,000 characters
 * - X-Restli-Protocol-Version: 2.0.0 header is REQUIRED
 */

const LOG_PREFIX = '[LinkedIn:Publisher]'
const MAX_TEXT_LENGTH = 3000
const LINKEDIN_API_BASE = 'https://api.linkedin.com'
const API_TIMEOUT_MS = 15000

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type LinkedInErrorType =
  | 'TOKEN'
  | 'SCOPE'
  | 'PAYLOAD'
  | 'RATE_LIMIT'
  | 'UPSTREAM'
  | 'UNKNOWN'

export interface LinkedInPublishResult {
  success: boolean
  externalPostId?: string
  permalink?: string
  errorType?: LinkedInErrorType
  errorMessage?: string
  httpStatus?: number
  platformResponse: Record<string, unknown>
  durationMs: number
}

export interface LinkedInPublishInput {
  /** The text body to publish. Will be trimmed + validated (max 3000 chars). */
  text: string
  /** LinkedIn person URN. If omitted, we resolve it via /v2/userinfo. */
  authorUrn?: string
  /** Optional visibility. Defaults to PUBLIC. */
  visibility?: 'PUBLIC' | 'CONNECTIONS'
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Validate text content before publishing.
 */
export function validateLinkedInText(text: string): {
  valid: boolean
  error?: string
  characterCount: number
} {
  const trimmed = text.trim()

  if (!trimmed) {
    return { valid: false, error: 'Text content is required', characterCount: 0 }
  }

  if (trimmed.length > MAX_TEXT_LENGTH) {
    return {
      valid: false,
      error: `Text exceeds LinkedIn limit (${trimmed.length}/${MAX_TEXT_LENGTH} characters)`,
      characterCount: trimmed.length,
    }
  }

  return { valid: true, characterCount: trimmed.length }
}

/**
 * Classify a LinkedIn API error into a typed category.
 */
function classifyError(
  httpStatus: number | undefined,
  errorBody: string
): { errorType: LinkedInErrorType; errorMessage: string } {
  const lower = errorBody.toLowerCase()

  // 401 — token expired or revoked
  if (httpStatus === 401) {
    return {
      errorType: 'TOKEN',
      errorMessage: 'LinkedIn token expired or revoked — reconnect required',
    }
  }

  // 403 — scope or permission issue
  if (httpStatus === 403) {
    if (lower.includes('scope') || lower.includes('permission')) {
      return {
        errorType: 'SCOPE',
        errorMessage: 'Missing required OAuth scope (w_member_social). Re-authorize with correct scopes.',
      }
    }
    return {
      errorType: 'SCOPE',
      errorMessage: `LinkedIn permission denied: ${errorBody.slice(0, 200)}`,
    }
  }

  // 422 / 400 — payload validation
  if (httpStatus === 422 || httpStatus === 400) {
    return {
      errorType: 'PAYLOAD',
      errorMessage: `LinkedIn rejected the payload: ${errorBody.slice(0, 200)}`,
    }
  }

  // 429 — rate limit
  if (httpStatus === 429) {
    return {
      errorType: 'RATE_LIMIT',
      errorMessage: 'LinkedIn API rate limit exceeded — retry later',
    }
  }

  // 5xx — upstream
  if (httpStatus && httpStatus >= 500) {
    return {
      errorType: 'UPSTREAM',
      errorMessage: `LinkedIn server error (${httpStatus}): ${errorBody.slice(0, 200)}`,
    }
  }

  return {
    errorType: 'UNKNOWN',
    errorMessage: `LinkedIn API error: ${errorBody.slice(0, 300)}`,
  }
}

/**
 * Resolve the authenticated user's LinkedIn person URN.
 * Uses /v2/userinfo (OpenID Connect) which requires `openid` + `profile` scopes.
 */
async function resolveAuthorUrn(
  accessToken: string
): Promise<{ urn: string | null; error?: string }> {
  try {
    const res = await fetch(`${LINKEDIN_API_BASE}/v2/userinfo`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      signal: AbortSignal.timeout(5000),
    })

    if (!res.ok) {
      const body = await res.text()
      console.error(LOG_PREFIX, 'Failed to resolve author URN', { status: res.status, body: body.slice(0, 200) })
      return { urn: null, error: `Failed to resolve LinkedIn identity (${res.status})` }
    }

    const data = await res.json()
    const sub = data.sub // LinkedIn user ID from OpenID

    if (!sub) {
      return { urn: null, error: 'LinkedIn userinfo response missing "sub" field' }
    }

    return { urn: `urn:li:person:${sub}` }
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    console.error(LOG_PREFIX, 'Author URN resolution failed:', msg)
    return { urn: null, error: msg }
  }
}

// ---------------------------------------------------------------------------
// Main publisher
// ---------------------------------------------------------------------------

/**
 * Publish a text post to LinkedIn using the UGC Posts API.
 *
 * @param accessToken - Decrypted OAuth access token
 * @param input - Post content and options
 * @returns Structured result with success/error details
 */
export async function publishLinkedInTextPost(
  accessToken: string,
  input: LinkedInPublishInput
): Promise<LinkedInPublishResult> {
  const startTime = Date.now()
  const elapsed = () => Date.now() - startTime

  console.log(LOG_PREFIX, 'Publish initiated', {
    textLength: input.text.length,
    hasAuthorUrn: !!input.authorUrn,
    visibility: input.visibility || 'PUBLIC',
  })

  // 1. Validate text content
  const validation = validateLinkedInText(input.text)
  if (!validation.valid) {
    console.warn(LOG_PREFIX, 'Validation failed:', validation.error)
    return {
      success: false,
      errorType: 'PAYLOAD',
      errorMessage: validation.error!,
      platformResponse: { validation },
      durationMs: elapsed(),
    }
  }

  // 2. Resolve author URN if not provided
  let authorUrn = input.authorUrn
  if (!authorUrn) {
    console.log(LOG_PREFIX, 'Resolving author URN from token...')
    const { urn, error } = await resolveAuthorUrn(accessToken)
    if (!urn) {
      return {
        success: false,
        errorType: 'TOKEN',
        errorMessage: error || 'Could not resolve LinkedIn identity',
        platformResponse: { resolveError: error },
        durationMs: elapsed(),
      }
    }
    authorUrn = urn
    console.log(LOG_PREFIX, 'Author URN resolved')
  }

  // 3. Build UGC post payload
  const visibility = input.visibility || 'PUBLIC'
  const ugcPayload = {
    author: authorUrn,
    lifecycleState: 'PUBLISHED',
    specificContent: {
      'com.linkedin.ugc.ShareContent': {
        shareCommentary: {
          text: input.text.trim(),
        },
        shareMediaCategory: 'NONE',
      },
    },
    visibility: {
      'com.linkedin.ugc.MemberNetworkVisibility': visibility,
    },
  }

  // 4. Call LinkedIn API
  try {
    console.log(LOG_PREFIX, 'Calling LinkedIn ugcPosts API...')

    const response = await fetch(`${LINKEDIN_API_BASE}/v2/ugcPosts`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Restli-Protocol-Version': '2.0.0',
      },
      body: JSON.stringify(ugcPayload),
      signal: AbortSignal.timeout(API_TIMEOUT_MS),
    })

    // Handle error responses
    if (!response.ok) {
      const errorBody = await response.text()
      console.error(LOG_PREFIX, 'API error', {
        status: response.status,
        body: errorBody.slice(0, 300),
      })

      const classified = classifyError(response.status, errorBody)

      return {
        success: false,
        errorType: classified.errorType,
        errorMessage: classified.errorMessage,
        httpStatus: response.status,
        platformResponse: {
          status: response.status,
          body: errorBody.slice(0, 500),
        },
        durationMs: elapsed(),
      }
    }

    // Success — extract post ID
    const data = await response.json()
    const postId = data.id // e.g., "urn:li:ugcPost:12345"

    // Build permalink (best-effort)
    const permalink = postId
      ? `https://www.linkedin.com/feed/update/${postId}`
      : undefined

    console.log(LOG_PREFIX, 'Published successfully', {
      postId,
      durationMs: elapsed(),
    })

    return {
      success: true,
      externalPostId: postId,
      permalink,
      httpStatus: response.status,
      platformResponse: {
        id: data.id,
        lifecycleState: data.lifecycleState,
        author: authorUrn,
        visibility,
      },
      durationMs: elapsed(),
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    const isTimeout = msg.includes('abort') || msg.includes('timeout')

    console.error(LOG_PREFIX, 'Publish failed:', msg)

    return {
      success: false,
      errorType: isTimeout ? 'UPSTREAM' : 'UNKNOWN',
      errorMessage: isTimeout
        ? `LinkedIn API timed out after ${API_TIMEOUT_MS}ms`
        : `Unexpected error: ${msg}`,
      platformResponse: { error: msg },
      durationMs: elapsed(),
    }
  }
}

/**
 * Validate a LinkedIn access token by calling /v2/userinfo.
 * Returns the user's display name on success, or null on failure.
 */
export async function validateLinkedInToken(
  accessToken: string
): Promise<{ valid: boolean; displayName?: string; error?: string }> {
  try {
    const res = await fetch(`${LINKEDIN_API_BASE}/v2/userinfo`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(5000),
    })

    if (!res.ok) {
      return {
        valid: false,
        error: `LinkedIn returned ${res.status}`,
      }
    }

    const data = await res.json()
    return {
      valid: true,
      displayName: data.name || data.given_name || 'LinkedIn User',
    }
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}
