/**
 * Media Upload API
 *
 * POST /api/upload
 * Accepts multipart FormData with a single "file" field.
 * Stores via Vercel Blob, persists StudioAsset record in DB.
 * Returns { success, url, assetId, filename, sizeBytes, mimeType }.
 *
 * Constraints:
 *  - 10 MB max
 *  - image/*, video/*, audio/* MIME types only
 *  - Auth required
 *  - Dev fallback: data URI when BLOB_READ_WRITE_TOKEN unset
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { uploadFile, getContentTypeFromFilename } from '@/lib/storage'
import { prisma } from '@/lib/db'
import { getOrCreateWorkspace } from '@/lib/workspace'
import { shouldUseFallback, log, logError } from '@/lib/dev-mode'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB

const ALLOWED_MIME_PREFIXES = ['image/', 'video/', 'audio/']

function isAllowedMime(mime: string): boolean {
  return ALLOWED_MIME_PREFIXES.some((prefix) => mime.startsWith(prefix))
}

function getAssetType(mime: string): 'IMAGE' | 'VIDEO' | 'AUDIO' | 'DOCUMENT' {
  if (mime.startsWith('image/')) return 'IMAGE'
  if (mime.startsWith('video/')) return 'VIDEO'
  if (mime.startsWith('audio/')) return 'AUDIO'
  return 'DOCUMENT'
}

export async function POST(request: NextRequest) {
  try {
    // Auth
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Parse form data
    const formData = await request.formData()
    const file = formData.get('file')
    const contentId = formData.get('contentId') as string | null

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { success: false, error: 'No file provided. Send a "file" field in multipart form data.' },
        { status: 400 }
      )
    }

    log('UPLOAD', `File received: ${file.name} (${file.size} bytes, ${file.type})`)

    // Validate size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, error: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB.` },
        { status: 400 }
      )
    }

    // Validate MIME
    const mimeType = file.type || getContentTypeFromFilename(file.name)
    if (!isAllowedMime(mimeType)) {
      return NextResponse.json(
        { success: false, error: `Unsupported file type "${mimeType}". Only image, video, and audio files are allowed.` },
        { status: 400 }
      )
    }

    const workspace = await getOrCreateWorkspace(session.user.id)
    const assetType = getAssetType(mimeType)
    const buffer = Buffer.from(await file.arrayBuffer())

    let publicUrl: string
    let storageKey: string
    let storageProvider: string

    // Dev fallback: convert to base64 data URI
    if (shouldUseFallback('blob')) {
      log('UPLOAD', 'Dev mode — generating data URI for', file.name)
      const base64 = buffer.toString('base64')
      publicUrl = `data:${mimeType};base64,${base64}`
      storageKey = `dev/${Date.now()}-${file.name}`
      storageProvider = 'dev-local'
    } else {
      // Production: upload via Vercel Blob
      const result = await uploadFile(buffer, {
        filename: file.name,
        contentType: mimeType,
        folder: `media/${workspace.id}`,
      })

      if (!result.success) {
        logError('UPLOAD', 'Blob upload failed:', result.error)
        return NextResponse.json(
          { success: false, error: result.error || 'Upload failed' },
          { status: 500 }
        )
      }

      publicUrl = result.publicUrl!
      storageKey = result.storageKey
      storageProvider = 'vercel-blob'
    }

    // Persist StudioAsset record
    const asset = await prisma.studioAsset.create({
      data: {
        workspaceId: workspace.id,
        type: assetType,
        status: 'READY',
        filename: file.name,
        mimeType,
        sizeBytes: file.size,
        storageProvider,
        storageKey,
        publicUrl,
        provider: 'UPLOAD',
        contentId: contentId || null,
      },
    })

    log('UPLOAD', `Asset created: ${asset.id} → ${file.name}`)

    return NextResponse.json({
      success: true,
      url: publicUrl,
      assetId: asset.id,
      filename: file.name,
      sizeBytes: file.size,
      mimeType,
    })
  } catch (error) {
    logError('UPLOAD', 'Error:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
