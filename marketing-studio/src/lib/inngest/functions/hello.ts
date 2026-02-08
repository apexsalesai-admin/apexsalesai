/**
 * Hello Function - System Test
 *
 * Verifies that Inngest orchestration is properly wired.
 * This function is only used to confirm the infrastructure works.
 */

import { inngest } from '../client'

export const helloFunction = inngest.createFunction(
  {
    id: 'studio-hello',
    name: 'Studio Hello Test',
  },
  { event: 'studio/hello' },
  async ({ event, step }) => {
    const startTime = Date.now()

    console.log('[Inngest] Hello function started', {
      eventId: event.id,
      timestamp: new Date().toISOString(),
    })

    // Simulate a step for demonstration
    const greeting = await step.run('generate-greeting', async () => {
      const message = event.data.message || 'Hello from Marketing Studio!'
      return {
        message,
        generatedAt: new Date().toISOString(),
      }
    })

    const durationMs = Date.now() - startTime

    console.log('[Inngest] Hello function completed', {
      eventId: event.id,
      durationMs,
    })

    return {
      success: true,
      data: greeting,
      durationMs,
      timestamp: new Date().toISOString(),
    }
  }
)
