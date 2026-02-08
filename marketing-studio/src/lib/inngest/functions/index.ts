/**
 * Inngest Function Registry
 *
 * Central registry of all Inngest functions for Marketing Studio.
 * This array is passed to the serve() handler in the API route.
 */

import { helloFunction } from './hello'
import { publishContentJob } from '../jobs/publish'
import { generateVideoJob } from '../jobs/video'
import { seoAnalysisJob } from '../jobs/seo'

/**
 * All registered Inngest functions.
 * Add new functions here as they are implemented.
 */
export const functions = [
  // System
  helloFunction,

  // Publishing
  publishContentJob,

  // Video Generation
  generateVideoJob,

  // SEO Analysis
  seoAnalysisJob,

  // Repurposing (future phase)
  // repurposeContentJob,

  // Analytics (future phase)
  // aggregateMetricsJob,

  // Workflows (future phase)
  // executeWorkflowJob,
]

// Re-export individual functions for direct imports
export { helloFunction }
export { publishContentJob }
export { generateVideoJob }
export { seoAnalysisJob }
