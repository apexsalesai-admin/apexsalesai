import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const url = new URL(req.url)
    const contentId = url.searchParams.get('contentId')

    if (!contentId) {
      return NextResponse.json({ error: 'contentId query param is required' }, { status: 400 })
    }

    const variants = await prisma.contentVariant.findMany({
      where: { contentId },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ success: true, variants })
  } catch (error) {
    console.error('[API:publish/variants] GET error:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch variants' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { variantId, body: newBody, title, hashtags, callToAction } = body as {
      variantId: string
      body?: string
      title?: string | null
      hashtags?: string[]
      callToAction?: string
    }

    if (!variantId) {
      return NextResponse.json({ error: 'variantId is required' }, { status: 400 })
    }

    const variant = await prisma.contentVariant.findUnique({ where: { id: variantId } })
    if (!variant) return NextResponse.json({ error: 'Variant not found' }, { status: 404 })

    const updated = await prisma.contentVariant.update({
      where: { id: variantId },
      data: {
        ...(newBody !== undefined && { body: newBody, charCount: newBody.length }),
        ...(title !== undefined && { title }),
        ...(hashtags !== undefined && { hashtags }),
        ...(callToAction !== undefined && { callToAction }),
      },
    })

    return NextResponse.json({ success: true, variant: updated })
  } catch (error) {
    console.error('[API:publish/variants] PUT error:', error)
    return NextResponse.json({ success: false, error: 'Failed to update variant' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { variantId } = body as { variantId: string }

    if (!variantId) {
      return NextResponse.json({ error: 'variantId is required' }, { status: 400 })
    }

    await prisma.contentVariant.delete({ where: { id: variantId } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[API:publish/variants] DELETE error:', error)
    return NextResponse.json({ success: false, error: 'Failed to delete variant' }, { status: 500 })
  }
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
