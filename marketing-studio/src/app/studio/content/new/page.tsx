'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useState } from 'react'
import { ContentCreator } from '@/components/content/content-creator'

interface ContentDraft {
  channels: string[]
  contentType: string
  title: string
  body: string
  hashtags: string[]
  callToAction: string
  media: string[]
  scheduledFor: Date | null
  publishImmediately: boolean
  variations: { channel: string; title: string; body: string }[]
  aiGenerated?: boolean
  aiTopic?: string
  aiTone?: string
}

function ContentCreatorWrapper() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const dateParam = searchParams.get('date')
  const initialDate = dateParam ? new Date(dateParam) : undefined

  const handleSave = async (draft: ContentDraft) => {
    setIsSaving(true)
    setError(null)

    try {
      const response = await fetch('/api/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: draft.title,
          body: draft.body,
          contentType: draft.contentType,
          channels: draft.channels,
          hashtags: draft.hashtags,
          callToAction: draft.callToAction,
          variations: draft.variations,
          scheduledFor: draft.scheduledFor?.toISOString(),
          publishImmediately: draft.publishImmediately,
          aiGenerated: draft.aiGenerated || false,
          aiTopic: draft.aiTopic,
          aiTone: draft.aiTone,
        }),
      })

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || 'Failed to save content')
      }

      // Show success and redirect
      router.push('/studio/content?saved=true')
    } catch (err) {
      console.error('Error saving content:', err)
      setError(err instanceof Error ? err.message : 'Failed to save content')
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    router.push('/studio/content')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Create Content</h1>
        <p className="text-slate-500 mt-1">
          Create, preview, and schedule content for your channels
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700">
          {error}
        </div>
      )}

      {/* Content Creator Wizard */}
      <ContentCreator
        initialDate={initialDate}
        onSave={handleSave}
        onCancel={handleCancel}
        isSaving={isSaving}
      />
    </div>
  )
}

export default function NewContentPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-500">Loading...</div>}>
      <ContentCreatorWrapper />
    </Suspense>
  )
}
