/**
 * Render Provider Factory
 *
 * Returns the appropriate RenderProvider for a given provider name.
 */

import type { RenderProvider } from './types'
import { RunwayProvider } from './providers/runway'

export function getProvider(name: string): RenderProvider {
  switch (name) {
    case 'runway':
      return new RunwayProvider()
    default:
      throw new Error(`Unknown render provider: ${name}`)
  }
}

export type { RenderProvider, RenderRequest, RenderSubmitResult, RenderPollResult } from './types'
