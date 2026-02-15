'use client'

import { useState } from 'react'
import {
  Linkedin,
  Youtube,
  Twitter,
  Hash,
  Type,
  Save,
  Loader2,
  Trash2,
  RotateCcw,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface ContentVariant {
  id: string
  contentId: string
  platform: string
  title: string | null
  body: string
  hashtags: string[]
  callToAction: string | null
  charCount: number | null
  charLimit: number | null
  adaptationNotes: string | null
  threadParts: string[]
}

interface VariantEditorProps {
  variant: ContentVariant
  onSave?: (variant: ContentVariant) => void
  onDelete?: (variantId: string) => void
  onRevert?: () => void
}

const PLATFORM_ICONS: Record<string, typeof Linkedin> = {
  linkedin: Linkedin,
  youtube: Youtube,
  x: Twitter,
}

const PLATFORM_COLORS: Record<string, string> = {
  linkedin: '#0A66C2',
  youtube: '#FF0000',
  x: '#000000',
  facebook: '#1877F2',
  tiktok: '#000000',
  instagram: '#E4405F',
  threads: '#000000',
  pinterest: '#E60023',
  medium: '#000000',
}

export function VariantEditor({ variant, onSave, onDelete, onRevert }: VariantEditorProps) {
  const [body, setBody] = useState(variant.body)
  const [title, setTitle] = useState(variant.title || '')
  const [hashtags, setHashtags] = useState(variant.hashtags.join(' '))
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const Icon = PLATFORM_ICONS[variant.platform] || Type
  const color = PLATFORM_COLORS[variant.platform] || '#6366F1'
  const charCount = body.length
  const charLimit = variant.charLimit || 3000
  const isOverLimit = charCount > charLimit

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/studio/publish/variants', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          variantId: variant.id,
          body,
          title: title || null,
          hashtags: hashtags.split(/\s+/).filter(Boolean),
        }),
      })
      const data = await res.json()
      if (data.success) {
        onSave?.({
          ...variant,
          body,
          title: title || null,
          hashtags: hashtags.split(/\s+/).filter(Boolean),
          charCount: body.length,
        })
      }
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await fetch('/api/studio/publish/variants', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ variantId: variant.id }),
      })
      onDelete?.(variant.id)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="p-4 bg-white rounded-xl border border-slate-200 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: color }}
          >
            <Icon className="w-4 h-4 text-white" />
          </div>
          <span className="font-semibold text-sm text-slate-900 capitalize">{variant.platform}</span>
          <span className={cn(
            'text-xs px-2 py-0.5 rounded-full',
            isOverLimit ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'
          )}>
            {charCount}/{charLimit}
          </span>
        </div>
        <div className="flex items-center space-x-1">
          {onRevert && (
            <button onClick={onRevert} className="p-1 text-slate-400 hover:text-slate-600" title="Revert">
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="p-1 text-slate-400 hover:text-red-500 disabled:opacity-50"
            title="Delete variant"
          >
            {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Title */}
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Variant title (optional)"
        className="w-full text-sm px-3 py-2 border border-slate-200 rounded-lg focus:border-purple-400 focus:ring-1 focus:ring-purple-200 outline-none"
      />

      {/* Body */}
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={6}
        className={cn(
          'w-full text-sm px-3 py-2 border rounded-lg focus:ring-1 outline-none resize-none',
          isOverLimit
            ? 'border-red-300 focus:border-red-400 focus:ring-red-200'
            : 'border-slate-200 focus:border-purple-400 focus:ring-purple-200'
        )}
      />

      {/* Hashtags */}
      <div className="flex items-center space-x-2">
        <Hash className="w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={hashtags}
          onChange={(e) => setHashtags(e.target.value)}
          placeholder="Hashtags (space-separated)"
          className="flex-1 text-xs px-2 py-1.5 border border-slate-200 rounded-lg focus:border-purple-400 outline-none"
        />
      </div>

      {/* Adaptation Notes */}
      {variant.adaptationNotes && (
        <p className="text-xs text-slate-500 italic">{variant.adaptationNotes}</p>
      )}

      {/* Save Button */}
      <button
        onClick={handleSave}
        disabled={saving || isOverLimit}
        className="w-full flex items-center justify-center space-x-2 px-4 py-2 text-sm font-medium bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
      >
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        <span>{saving ? 'Saving...' : 'Save Variant'}</span>
      </button>
    </div>
  )
}
