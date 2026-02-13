/**
 * Brave Search Integration (P21)
 *
 * Real-time web search for competitive intelligence and keyword research.
 * Uses Brave Search API v1 — requires BRAVE_SEARCH_API_KEY env var or BYOK.
 */

import { IntegrationManager } from './integration-manager'

export interface BraveSearchResult {
  title: string
  url: string
  description: string
  age?: string
}

export interface BraveSearchResponse {
  results: BraveSearchResult[]
  query: string
  totalResults: number
}

/**
 * Execute a Brave web search.
 */
export async function braveSearch(
  query: string,
  workspaceId: string,
  options?: { count?: number; freshness?: 'day' | 'week' | 'month' }
): Promise<BraveSearchResponse> {
  const resolved = await IntegrationManager.resolveKey('brave', workspaceId)
  if (!resolved) {
    throw new Error('Brave Search API key not configured')
  }

  const params = new URLSearchParams({
    q: query,
    count: String(options?.count ?? 10),
    text_decorations: 'false',
  })

  if (options?.freshness) {
    params.set('freshness', options.freshness)
  }

  const response = await fetch(`https://api.search.brave.com/res/v1/web/search?${params}`, {
    headers: {
      'Accept': 'application/json',
      'Accept-Encoding': 'gzip',
      'X-Subscription-Token': resolved.key,
    },
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Brave Search API error ${response.status}: ${text}`)
  }

  const data = await response.json()

  const results: BraveSearchResult[] = (data.web?.results ?? []).map(
    (r: { title: string; url: string; description: string; age?: string }) => ({
      title: r.title,
      url: r.url,
      description: r.description,
      age: r.age,
    })
  )

  return {
    results,
    query,
    totalResults: data.web?.totalResults ?? results.length,
  }
}

/**
 * Test Brave Search API connection.
 */
export async function testBraveConnection(apiKey: string): Promise<boolean> {
  try {
    const response = await fetch(
      'https://api.search.brave.com/res/v1/web/search?q=test&count=1',
      {
        headers: {
          'Accept': 'application/json',
          'X-Subscription-Token': apiKey,
        },
      }
    )
    return response.ok
  } catch {
    return false
  }
}
