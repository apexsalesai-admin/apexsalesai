'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Download, Copy, RefreshCw, Share2, ArrowLeft, Check, Loader2, ImageIcon } from 'lucide-react'

interface ContentData {
  id: string
  title: string
  body: string
  status: string
  mediaUrls: string[]
  hashtags: string[]
  createdAt: string
}

export default function ImageDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [content, setContent] = useState<ContentData | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    fetch(`/api/content/${params.id}`)
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          setContent(data.data)
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [params.id])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    )
  }

  if (!content) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <p className="text-slate-500 mb-4">Image not found</p>
        <Link href="/studio/library" className="text-purple-600 hover:text-purple-700 text-sm font-medium">
          Back to Library
        </Link>
      </div>
    )
  }

  const imageUrl = content.mediaUrls?.[0] || null

  const handleCopyPrompt = async () => {
    await navigator.clipboard.writeText(content.body || '')
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDownload = () => {
    if (!imageUrl) return
    const link = document.createElement('a')
    link.href = imageUrl
    link.download = `${content.title || 'generated-image'}.png`
    link.target = '_blank'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleRegenerateSimilar = () => {
    const encoded = encodeURIComponent(content.body || '')
    router.push(`/studio/create/image?prompt=${encoded}`)
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Link
        href="/studio/library"
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-purple-600 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Library
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Image panel */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={imageUrl}
                alt={content.title || 'Generated Image'}
                className="w-full h-auto block"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none'
                  const parent = (e.target as HTMLImageElement).parentElement
                  if (parent) {
                    const placeholder = document.createElement('div')
                    placeholder.className = 'w-full aspect-square bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center'
                    placeholder.innerHTML = '<p class="text-slate-400 text-sm">Image URL expired. Use "Regenerate Similar" to create a new one.</p>'
                    parent.appendChild(placeholder)
                  }
                }}
              />
            ) : (
              <div className="w-full aspect-square bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center">
                <p className="text-slate-400 text-sm">No image URL saved. Use &quot;Regenerate Similar&quot; to create a new one.</p>
              </div>
            )}
          </div>

          {/* Action bar */}
          <div className="flex flex-wrap gap-3 mt-4">
            <button
              onClick={handleDownload}
              disabled={!imageUrl}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors"
            >
              <Download className="w-4 h-4" />
              Download
            </button>

            <button
              onClick={handleRegenerateSimilar}
              className="flex items-center gap-2 px-4 py-2 border border-slate-300 text-slate-700 text-sm rounded-lg hover:border-purple-400 hover:text-purple-600 transition-colors bg-white"
            >
              <RefreshCw className="w-4 h-4" />
              Regenerate Similar
            </button>

            <Link
              href="/studio/content/new"
              className="flex items-center gap-2 px-4 py-2 border border-slate-300 text-slate-700 text-sm rounded-lg hover:border-purple-400 hover:text-purple-600 transition-colors bg-white"
            >
              <Share2 className="w-4 h-4" />
              Use in Post
            </Link>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Title */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
            <h1 className="text-base font-semibold text-slate-900 line-clamp-3">{content.title}</h1>
            <p className="text-xs text-slate-400 mt-1">
              Created {new Date(content.createdAt).toLocaleDateString()}
            </p>
            <span className="inline-block mt-2 px-2 py-0.5 text-xs rounded-full bg-slate-100 text-slate-600 capitalize">
              {(content.status || 'DRAFT').replace(/_/g, ' ').toLowerCase()}
            </span>
          </div>

          {/* DALL-E Prompt */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Mia&apos;s Prompt</p>
              <button
                onClick={handleCopyPrompt}
                className="flex items-center gap-1 text-xs text-slate-500 hover:text-purple-600 transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">{content.body}</p>
          </div>

          {/* Tags */}
          {content.hashtags && content.hashtags.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
              <p className="text-xs font-semibold text-slate-700 uppercase tracking-wide mb-2">Tags</p>
              <div className="flex flex-wrap gap-2">
                {content.hashtags.map((tag, i) => (
                  <span key={i} className="px-2 py-0.5 text-xs rounded-full bg-purple-50 text-purple-700">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
