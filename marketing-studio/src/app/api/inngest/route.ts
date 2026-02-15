/**
 * Inngest API Route
 *
 * Handles Inngest webhook requests for job orchestration.
 * Supports GET (discovery), POST (event handling), PUT (function sync).
 */

import { serve } from 'inngest/next'
import { inngest } from '@/lib/inngest/client'
import { functions } from '@/lib/inngest/functions'

// Create the serve handler with all registered functions
const handler = serve({
  client: inngest,
  functions,
  // Serve path must match the API route
  servePath: '/api/inngest',
  streaming: 'allow',
})

// Export handlers for App Router
export const GET = handler.GET
export const POST = handler.POST
export const PUT = handler.PUT

// Export runtime config for Vercel
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
