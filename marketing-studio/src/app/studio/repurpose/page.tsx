'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Sparkles, Loader2, AlertCircle, Copy, Check, ArrowLeft, Save, Globe, Upload, Library } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

interface ContentItem {
  id: string
  title: string
  body: string
  contentType: string
}

const FORMATS = [
  { id: 'LINKEDIN_POST', label: 'LinkedIn Post' },
  { id: 'X_THREAD', label: 'X Thread' },
  { id: 'BLOG_ARTICLE', label: 'Blog Article' },
  { id: 'EMAIL_NEWSLETTER', label: 'Email Newsletter' },
  { id: 'YOUTUBE_DESCRIPTION', label: 'YouTube Description' },
  { id: 'SHORT_SUMMARY', label: 'Short Summary' },
] as const

export default function RepurposePage() {
  const router = useRouter()
  const [contentList, setContentList] = useState<ContentItem[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [selectedFormats, setSelectedFormats] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [results, setResults] = useState<Record<string, string> | null>(null)
  const [activeTab, setActiveTab] = useState('')
  const [copied, setCopied] = useState(false)
  const [sourceMode, setSourceMode] = useState<'library' | 'url' | 'file'>('library')
  const [sourceUrl, setSourceUrl] = useState('')
  const [sourceText, setSourceText] = useState('')
  const [fetchingUrl, setFetchingUrl] = useState(false)

  // Load user's content
  useEffect(() => {
    fetch('/api/studio/library?limit=50')
      .then(r => r.json())
      .then(res => {
        if (res.success) {
          setContentList(res.data.filter((c: ContentItem) => c.body && c.body.length > 20))
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const toggleFormat = (id: string) => {
    setSelectedFormats(prev =>
      prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]
    )
  }

  const handleFetchUrl = async () => {
    if (!sourceUrl.trim()) return
    setFetchingUrl(true)
    setError(null)
    try {
      const res = await fetch('/api/studio/mia/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: sourceUrl,
          channels: ['LINKEDIN'],
          contentType: 'article',
          goal: 'repurpose',
        }),
      })
      const data = await res.json()
      if (data.success && data.angles?.[0]) {
        setSourceText(
          data.angles.map((a: { title: string; description: string; rationale: string }) =>
            `${a.title}\n${a.description}\n${a.rationale}`
          ).join('\n\n')
        )
      } else {
        setError('Could not fetch content from URL. Try pasting the text directly.')
      }
    } catch {
      setError('Failed to fetch URL content.')
    } finally {
      setFetchingUrl(false)
    }
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      setSourceText(ev.target?.result as string || '')
    }
    reader.readAsText(file)
  }

  const canRepurpose = selectedFormats.length > 0 && (
    (sourceMode === 'library' && selectedId) ||
    (sourceMode === 'url' && sourceText) ||
    (sourceMode === 'file' && sourceText)
  )

  const handleRepurpose = async () => {
    if (!canRepurpose) return
    setGenerating(true)
    setError(null)
    setResults(null)

    try {
      const bodyPayload: Record<string, unknown> = {
        targetFormats: selectedFormats,
      }

      if (sourceMode === 'library') {
        bodyPayload.contentId = selectedId
      } else {
        bodyPayload.sourceText = sourceText
      }

      const res = await fetch('/api/studio/repurpose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyPayload),
      })

      const data = await res.json()
      if (data.success) {
        setResults(data.data.repurposed)
        setActiveTab(selectedFormats[0])
      } else {
        setError(data.error || 'Failed to repurpose content')
      }
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setGenerating(false)
    }
  }

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleSave = async (format: string, text: string) => {
    setSaving(true)
    try {
      const label = FORMATS.find(f => f.id === format)?.label || format
      const res = await fetch('/api/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `${label} (Repurposed)`,
          body: text,
          contentType: 'POST',
          channels: ['LINKEDIN'],
          aiGenerated: true,
          aiTopic: label,
          aiTone: 'PROFESSIONAL',
        }),
      })
      if (!res.ok) throw new Error('Save failed')
      const data = await res.json()
      if (data.success && data.data?.id) {
        router.push(`/studio/content/${data.data.id}`)
      }
    } catch {
      setError('Failed to save. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <Link href="/studio/create" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-4">
          <ArrowLeft className="w-4 h-4" /> Back to Create
        </Link>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Repurpose Content</h1>
            <p className="text-sm text-slate-500">Turn one piece into many with Mia</p>
          </div>
        </div>
      </div>

      {/* Step 1: Select Content Source */}
      <div className="p-6 bg-white rounded-xl border border-slate-200">
        <label className="block text-sm font-medium text-slate-700 mb-3">
          1. Choose your source
        </label>

        {/* Source Mode Tabs */}
        <div className="flex gap-2 mb-4">
          {([
            { id: 'library' as const, label: 'From Library', icon: Library },
            { id: 'url' as const, label: 'From a URL', icon: Globe },
            { id: 'file' as const, label: 'From a File', icon: Upload },
          ]).map(mode => (
            <button
              key={mode.id}
              onClick={() => setSourceMode(mode.id)}
              className={cn(
                'flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors',
                sourceMode === mode.id
                  ? 'bg-purple-100 text-purple-700 border border-purple-200'
                  : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'
              )}
            >
              <mode.icon className="w-4 h-4" />
              {mode.label}
            </button>
          ))}
        </div>

        {/* Library Mode */}
        {sourceMode === 'library' && (
          loading ? (
            <div className="flex items-center gap-2 text-slate-400 text-sm">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading your content...
            </div>
          ) : contentList.length === 0 ? (
            <p className="text-sm text-slate-400">
              No content with body text found.{' '}
              <Link href="/studio/create" className="text-purple-600 hover:text-purple-700">Create something first.</Link>
            </p>
          ) : (
            <select
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-slate-300 text-slate-900 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="">Choose a piece of content...</option>
              {contentList.map(item => (
                <option key={item.id} value={item.id}>
                  {item.title} ({item.contentType})
                </option>
              ))}
            </select>
          )
        )}

        {/* URL Mode */}
        {sourceMode === 'url' && (
          <div className="space-y-3">
            <div className="flex gap-2">
              <input
                type="url"
                value={sourceUrl}
                onChange={(e) => setSourceUrl(e.target.value)}
                placeholder="Paste a URL to repurpose content from..."
                className="flex-1 px-4 py-3 rounded-lg border border-slate-300 text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
              />
              <button
                onClick={handleFetchUrl}
                disabled={fetchingUrl || !sourceUrl.trim()}
                className="px-4 py-3 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50 flex items-center gap-2"
              >
                {fetchingUrl ? <Loader2 className="w-4 h-4 animate-spin" /> : <Globe className="w-4 h-4" />}
                Fetch
              </button>
            </div>
            {sourceText && (
              <textarea
                value={sourceText}
                onChange={(e) => setSourceText(e.target.value)}
                rows={4}
                className="w-full px-4 py-3 rounded-lg border border-slate-200 text-sm text-slate-700 resize-y"
                placeholder="Fetched content will appear here — you can edit before repurposing"
              />
            )}
          </div>
        )}

        {/* File Mode */}
        {sourceMode === 'file' && (
          <div className="space-y-3">
            <label className="flex items-center justify-center gap-3 px-6 py-8 border-2 border-dashed border-slate-300 rounded-xl cursor-pointer hover:border-purple-400 hover:bg-purple-50/50 transition-colors">
              <Upload className="w-5 h-5 text-slate-400" />
              <span className="text-sm text-slate-500">
                {sourceText ? 'File loaded — click to replace' : 'Click to upload .txt, .md, or .pdf'}
              </span>
              <input
                type="file"
                accept=".txt,.md,.pdf,.docx"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
            {sourceText && (
              <textarea
                value={sourceText}
                onChange={(e) => setSourceText(e.target.value)}
                rows={4}
                className="w-full px-4 py-3 rounded-lg border border-slate-200 text-sm text-slate-700 resize-y"
                placeholder="File content — you can edit before repurposing"
              />
            )}
          </div>
        )}
      </div>

      {/* Step 2: Choose Formats */}
      {(selectedId || sourceText) && (
        <div className="p-6 bg-white rounded-xl border border-slate-200">
          <label className="block text-sm font-medium text-slate-700 mb-3">
            2. Choose target formats
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {FORMATS.map(f => (
              <button
                key={f.id}
                onClick={() => toggleFormat(f.id)}
                className={cn(
                  'px-4 py-3 rounded-lg border text-sm font-medium transition-colors text-left',
                  selectedFormats.includes(f.id)
                    ? 'border-purple-500 bg-purple-50 text-purple-700'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                )}
              >
                {f.label}
              </button>
            ))}
          </div>

          <button
            onClick={handleRepurpose}
            disabled={generating || !canRepurpose}
            className="mt-6 flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50"
          >
            {generating ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Mia is repurposing...</>
            ) : (
              <><Sparkles className="w-4 h-4" /> Repurpose with Mia</>
            )}
          </button>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-sm text-red-700">
          <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
        </div>
      )}

      {/* Results */}
      {results && (
        <div className="p-6 bg-white rounded-xl border border-slate-200">
          <h3 className="text-sm font-medium text-slate-700 mb-4">3. Results</h3>

          {/* Tabs */}
          <div className="flex gap-2 border-b border-slate-200 mb-4">
            {selectedFormats.map(f => {
              const label = FORMATS.find(fmt => fmt.id === f)?.label || f
              return (
                <button
                  key={f}
                  onClick={() => setActiveTab(f)}
                  className={cn(
                    'px-3 py-2 text-sm font-medium border-b-2 -mb-[1px] transition-colors',
                    activeTab === f
                      ? 'border-purple-600 text-purple-700'
                      : 'border-transparent text-slate-500 hover:text-slate-700'
                  )}
                >
                  {label}
                </button>
              )
            })}
          </div>

          {/* Content */}
          {activeTab && activeTab in results && (
            <div>
              <div className="relative">
                <pre className="p-4 bg-slate-50 rounded-lg text-sm text-slate-700 whitespace-pre-wrap font-sans leading-relaxed max-h-96 overflow-y-auto">
                  {results[activeTab] || '(No content generated for this format)'}
                </pre>
                <div className="absolute top-3 right-3 flex items-center gap-2">
                  <button
                    onClick={() => handleCopy(results[activeTab] || '')}
                    className="p-2 bg-white rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
                    title="Copy to clipboard"
                  >
                    {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4 text-slate-400" />}
                  </button>
                </div>
              </div>
              <div className="mt-3 flex justify-end">
                <button
                  onClick={() => handleSave(activeTab, results[activeTab] || '')}
                  disabled={saving || !results[activeTab]}
                  className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors"
                >
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  Save as New Content
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
