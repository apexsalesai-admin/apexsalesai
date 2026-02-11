/**
 * Video Provider Registry
 *
 * Central registry for all video rendering providers.
 * Auto-registers providers on module load.
 */

import type { VideoProvider, VideoProviderName, VideoProviderConfig } from './types'
import { RunwayAdapter } from './runway-adapter'
import { HeyGenProvider } from './heygen'
import { TemplateProvider } from './template'

const providers = new Map<VideoProviderName, VideoProvider>()

function register(provider: VideoProvider): void {
  providers.set(provider.config.name, provider)
}

// Auto-register on module load
register(new TemplateProvider())
register(new RunwayAdapter())
register(new HeyGenProvider())

export function getVideoProvider(name: string): VideoProvider | null {
  return providers.get(name as VideoProviderName) || null
}

export function getVideoProviderOrThrow(name: string): VideoProvider {
  const provider = getVideoProvider(name)
  if (!provider) {
    throw new Error(`[PROVIDER:REGISTRY] Unknown provider: ${name}`)
  }
  return provider
}

export function listVideoProviders(): VideoProviderConfig[] {
  return Array.from(providers.values()).map(p => p.config)
}
