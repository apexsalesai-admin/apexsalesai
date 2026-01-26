'use client'

import { useRouter } from 'next/navigation'
import { Plus } from 'lucide-react'
import { ContentCalendar } from '@/components/content/content-calendar'

export default function CalendarPage() {
  const router = useRouter()

  const handleCreateContent = (date: Date) => {
    // Navigate to content creator with the selected date
    const dateStr = date.toISOString().split('T')[0]
    router.push(`/studio/content/new?date=${dateStr}`)
  }

  const handleSelectContent = (content: { id: string; title: string }) => {
    // Navigate to content editor
    router.push(`/studio/content/${content.id}`)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Content Calendar</h1>
          <p className="text-slate-500 mt-1">
            Plan and schedule your content across all channels
          </p>
        </div>
        <button
          onClick={() => router.push('/studio/content/new')}
          className="btn-primary flex items-center space-x-2"
        >
          <Plus className="w-4 h-4" />
          <span>Create Content</span>
        </button>
      </div>

      {/* Calendar */}
      <ContentCalendar
        onCreateContent={handleCreateContent}
        onSelectContent={handleSelectContent}
      />
    </div>
  )
}
