/**
 * Asset Storage Utilities
 * Primary: Vercel Blob Storage
 * Fallback: Local filesystem (dev only)
 *
 * ENVIRONMENT VARIABLES:
 * - BLOB_READ_WRITE_TOKEN: Vercel Blob token (required for production)
 *
 * All generated media (thumbnails, videos) are stored via this module
 * and referenced through Asset records in the database.
 */

import { put, del, list, head } from '@vercel/blob'

export type StorageProvider = 'vercel-blob' | 's3' | 'r2' | 'local'

export interface UploadOptions {
  filename: string
  contentType: string
  folder?: string // Organize by workspace/type
  access?: 'public' | 'private'
}

export interface UploadResult {
  success: boolean
  storageKey: string
  publicUrl?: string
  sizeBytes: number
  error?: string
}

export interface StorageStatus {
  provider: StorageProvider
  configured: boolean
  error?: string
}

/**
 * Get the current storage provider status
 */
export function getStorageStatus(): StorageStatus {
  const blobToken = process.env.BLOB_READ_WRITE_TOKEN

  if (blobToken) {
    return {
      provider: 'vercel-blob',
      configured: true,
    }
  }

  // In development, we can use local storage
  if (process.env.NODE_ENV === 'development') {
    return {
      provider: 'local',
      configured: true,
    }
  }

  return {
    provider: 'vercel-blob',
    configured: false,
    error: 'BLOB_READ_WRITE_TOKEN is not configured',
  }
}

/**
 * Upload a file to storage
 * @param data - File data (Buffer, Blob, or readable stream)
 * @param options - Upload options
 */
export async function uploadFile(
  data: Buffer | Blob | ReadableStream,
  options: UploadOptions
): Promise<UploadResult> {
  const { filename, contentType, folder = 'uploads', access = 'public' } = options

  const storageKey = `${folder}/${Date.now()}-${filename}`

  try {
    // Check if Vercel Blob is configured
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      throw new Error('Storage not configured: BLOB_READ_WRITE_TOKEN is required')
    }

    // Vercel Blob only supports 'public' access
    const blob = await put(storageKey, data, {
      contentType,
      access: 'public',
    })

    return {
      success: true,
      storageKey: blob.pathname,
      publicUrl: blob.url,
      sizeBytes: data instanceof Buffer ? data.length : 0,
    }
  } catch (error) {
    console.error('Upload failed:', error)
    return {
      success: false,
      storageKey,
      sizeBytes: 0,
      error: error instanceof Error ? error.message : 'Upload failed',
    }
  }
}

/**
 * Upload a file from a URL (e.g., from AI generation services)
 * @param sourceUrl - URL to fetch the file from
 * @param options - Upload options
 */
export async function uploadFromUrl(
  sourceUrl: string,
  options: UploadOptions
): Promise<UploadResult> {
  try {
    // Fetch the file from the source URL
    const response = await fetch(sourceUrl)

    if (!response.ok) {
      throw new Error(`Failed to fetch from source: ${response.status} ${response.statusText}`)
    }

    const arrayBuffer = await response.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Get actual content type from response if not provided
    const contentType =
      options.contentType || response.headers.get('content-type') || 'application/octet-stream'

    return uploadFile(buffer, { ...options, contentType })
  } catch (error) {
    console.error('Upload from URL failed:', error)
    return {
      success: false,
      storageKey: '',
      sizeBytes: 0,
      error: error instanceof Error ? error.message : 'Upload from URL failed',
    }
  }
}

/**
 * Delete a file from storage
 * @param storageKey - The storage key/path of the file
 */
export async function deleteFile(storageKey: string): Promise<boolean> {
  try {
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      console.warn('Storage not configured, cannot delete')
      return false
    }

    await del(storageKey)
    return true
  } catch (error) {
    console.error('Delete failed:', error)
    return false
  }
}

/**
 * Get file metadata
 * @param url - The public URL of the file
 */
export async function getFileMetadata(url: string): Promise<{
  exists: boolean
  size?: number
  contentType?: string
  uploadedAt?: Date
}> {
  try {
    const metadata = await head(url)

    return {
      exists: true,
      size: metadata.size,
      contentType: metadata.contentType,
      uploadedAt: metadata.uploadedAt,
    }
  } catch {
    return { exists: false }
  }
}

/**
 * List files in a folder
 * @param prefix - Folder prefix to list
 * @param limit - Maximum number of results
 */
export async function listFiles(prefix: string, limit = 100): Promise<
  Array<{
    pathname: string
    url: string
    size: number
    uploadedAt: Date
  }>
> {
  try {
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return []
    }

    const result = await list({ prefix, limit })

    return result.blobs.map((blob) => ({
      pathname: blob.pathname,
      url: blob.url,
      size: blob.size,
      uploadedAt: blob.uploadedAt,
    }))
  } catch (error) {
    console.error('List files failed:', error)
    return []
  }
}

/**
 * Generate a storage key for an asset
 */
export function generateStorageKey(
  workspaceId: string,
  assetType: 'image' | 'video' | 'audio' | 'thumbnail',
  filename: string
): string {
  const timestamp = Date.now()
  const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_')
  return `workspaces/${workspaceId}/${assetType}s/${timestamp}-${sanitizedFilename}`
}

/**
 * Determine content type from filename
 */
export function getContentTypeFromFilename(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase()

  const contentTypes: Record<string, string> = {
    // Images
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
    svg: 'image/svg+xml',

    // Videos
    mp4: 'video/mp4',
    webm: 'video/webm',
    mov: 'video/quicktime',
    avi: 'video/x-msvideo',

    // Audio
    mp3: 'audio/mpeg',
    wav: 'audio/wav',
    ogg: 'audio/ogg',
    m4a: 'audio/mp4',

    // Documents
    pdf: 'application/pdf',
    json: 'application/json',
  }

  return contentTypes[ext || ''] || 'application/octet-stream'
}
