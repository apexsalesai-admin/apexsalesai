import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
})

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

/**
 * Retry wrapper for transient Prisma/PostgreSQL connection failures.
 * Catches cold-start pool drops on Vercel serverless and retries automatically.
 *
 * Usage:
 *   const content = await withRetry(() => prisma.scheduledContent.findUnique({ where: { id } }))
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  retries = 2,
  delayMs = 500
): Promise<T> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn()
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error)
      const isTransient =
        message.includes('kind: Closed') ||
        message.includes('Connection refused') ||
        message.includes('connection pool') ||
        message.includes('Can\'t reach database server') ||
        message.includes('Connection timed out')

      if (!isTransient || attempt === retries) throw error

      console.warn(`[PRISMA] Transient error, retrying (${attempt + 1}/${retries})...`, message.slice(0, 100))
      await new Promise(r => setTimeout(r, delayMs * (attempt + 1)))
    }
  }
  throw new Error('Unreachable')
}

export default prisma
