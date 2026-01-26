'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Edit,
  Trash2,
  Calendar,
  Clock,
  Check,
  X,
  Copy,
  Download,
  Share2,
  Eye,
  Sparkles,
  Video,
  FileText,
  Hash,
  MessageSquare,
  BarChart3,
  Loader2,
  ExternalLink,
  Play,
  Volume2,
  Image as ImageIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { SeoToolkit } from '@/components/content/seo-toolkit'

interface ContentDetail {
  id: string
  title: string
  body: string
  contentType: string
  aiGenerated: boolean
  aiTopic: string | null
  aiTone: string | null
  hashtags: string[]
  callToAction: string | null
  mediaUrls: string[]
  channels: string[]
  variations: { channel: string; title: string; body: string }[]
  status: string
  scheduledFor: string | null
  publishedAt: string | null
  createdAt: string
  updatedAt: string
  // Video-specific fields
  videoScript?: string
  videoHook?: string
  thumbnailIdeas?: string[]
  timestamps?: { time: string; label: string }[]
  seoAnalysis?: {
    score: number
    readability: number
    keywordDensity: number
    headlineScore: number
    suggestions: string[]
    metaDescription: string
  }
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
  DRAFT: { label: 'Draft', color: 'text-slate-700', bgColor: 'bg-slate-100' },
  SCHEDULED: { label: 'Scheduled', color: 'text-blue-700', bgColor: 'bg-blue-100' },
  PENDING_APPROVAL: { label: 'Pending Approval', color: 'text-amber-700', bgColor: 'bg-amber-100' },
  APPROVED: { label: 'Approved', color: 'text-emerald-700', bgColor: 'bg-emerald-100' },
  PUBLISHED: { label: 'Published', color: 'text-emerald-700', bgColor: 'bg-emerald-100' },
  FAILED: { label: 'Failed', color: 'text-red-700', bgColor: 'bg-red-100' },
}

const CHANNEL_COLORS: Record<string, string> = {
  YOUTUBE: 'bg-red-100 text-red-700',
  TIKTOK: 'bg-slate-900 text-white',
  LINKEDIN: 'bg-blue-100 text-blue-700',
  X_TWITTER: 'bg-slate-100 text-slate-900',
  FACEBOOK: 'bg-blue-100 text-blue-600',
  INSTAGRAM: 'bg-pink-100 text-pink-700',
}

export default function ContentDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [content, setContent] = useState<ContentDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'preview' | 'variations' | 'seo' | 'video'>('preview')
  const [selectedVariation, setSelectedVariation] = useState<string | null>(null)
  const [seoKeywords, setSeoKeywords] = useState<string[]>([])
  const [isPublishing, setIsPublishing] = useState(false)
  const [publishResults, setPublishResults] = useState<any[]>([])

  useEffect(() => {
    async function fetchContent() {
      try {
        const response = await fetch(`/api/content/${params.id}`)
        const data = await response.json()
        if (data.success) {
          setContent(data.data)
          // Extract keywords from hashtags
          if (data.data.hashtags) {
            setSeoKeywords(data.data.hashtags.map((h: string) => h.replace('#', '')))
          }
        } else {
          setError(data.error || 'Failed to load content')
        }
      } catch (e) {
        setError('Failed to load content')
      } finally {
        setIsLoading(false)
      }
    }
    fetchContent()
  }, [params.id])

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  const handleApprove = async () => {
    try {
      const response = await fetch(`/api/content/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'APPROVED' }),
      })
      const data = await response.json()
      if (data.success) {
        setContent(prev => prev ? { ...prev, status: 'APPROVED' } : null)
      }
    } catch (e) {
      console.error('Failed to approve:', e)
    }
  }

  const handleReject = async () => {
    try {
      const response = await fetch(`/api/content/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'DRAFT' }),
      })
      const data = await response.json()
      if (data.success) {
        setContent(prev => prev ? { ...prev, status: 'DRAFT' } : null)
      }
    } catch (e) {
      console.error('Failed to reject:', e)
    }
  }

  const handlePublish = async () => {
    if (!content) return
    setIsPublishing(true)
    setPublishResults([])

    try {
      const response = await fetch('/api/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contentId: content.id,
          channels: content.channels,
        }),
      })
      const data = await response.json()
      if (data.success) {
        setContent(prev => prev ? { ...prev, status: data.data.status, publishedAt: data.data.publishedAt } : null)
        setPublishResults(data.data.results || [])
      } else {
        alert(data.error || 'Publishing failed')
      }
    } catch (e) {
      console.error('Failed to publish:', e)
      alert('Publishing failed. Please try again.')
    } finally {
      setIsPublishing(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    )
  }

  if (error || !content) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 mb-4">{error || 'Content not found'}</p>
        <Link href="/studio/content" className="text-purple-600 hover:underline">
          Back to Content
        </Link>
      </div>
    )
  }

  const statusConfig = STATUS_CONFIG[content.status] || STATUS_CONFIG.DRAFT
  const isVideo = content.contentType === 'VIDEO' || content.contentType === 'REEL'

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-4">
          <Link
            href="/studio/content"
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </Link>
          <div>
            <div className="flex items-center space-x-3 mb-2">
              <h1 className="text-2xl font-bold text-slate-900">{content.title}</h1>
              <span className={cn('px-3 py-1 rounded-full text-sm font-medium', statusConfig.bgColor, statusConfig.color)}>
                {statusConfig.label}
              </span>
              {content.aiGenerated && (
                <span className="flex items-center space-x-1 px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                  <Sparkles className="w-3 h-3" />
                  <span>AI Generated</span>
                </span>
              )}
            </div>
            <div className="flex items-center space-x-4 text-sm text-slate-500">
              <span className="flex items-center space-x-1">
                <FileText className="w-4 h-4" />
                <span>{content.contentType}</span>
              </span>
              <span className="flex items-center space-x-1">
                <Calendar className="w-4 h-4" />
                <span>Created {new Date(content.createdAt).toLocaleDateString()}</span>
              </span>
              {content.scheduledFor && (
                <span className="flex items-center space-x-1">
                  <Clock className="w-4 h-4" />
                  <span>Scheduled for {new Date(content.scheduledFor).toLocaleString()}</span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center space-x-2">
          {content.status === 'PENDING_APPROVAL' && (
            <>
              <button
                onClick={handleReject}
                className="px-4 py-2 border border-red-200 text-red-600 hover:bg-red-50 rounded-lg flex items-center space-x-2"
              >
                <X className="w-4 h-4" />
                <span>Reject</span>
              </button>
              <button
                onClick={handleApprove}
                className="px-4 py-2 bg-emerald-600 text-white hover:bg-emerald-700 rounded-lg flex items-center space-x-2"
              >
                <Check className="w-4 h-4" />
                <span>Approve</span>
              </button>
            </>
          )}
          {(content.status === 'APPROVED' || content.status === 'SCHEDULED') && (
            <button
              onClick={handlePublish}
              disabled={isPublishing}
              className="px-6 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:shadow-lg rounded-lg flex items-center space-x-2 disabled:opacity-50 transition-all"
            >
              {isPublishing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Publishing...</span>
                </>
              ) : (
                <>
                  <ExternalLink className="w-4 h-4" />
                  <span>Publish Now</span>
                </>
              )}
            </button>
          )}
          {content.status === 'PUBLISHED' && (
            <span className="px-4 py-2 bg-emerald-100 text-emerald-700 rounded-lg flex items-center space-x-2">
              <Check className="w-4 h-4" />
              <span>Published</span>
            </span>
          )}
          <button className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
            <Edit className="w-5 h-5 text-slate-600" />
          </button>
          <button className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
            <Share2 className="w-5 h-5 text-slate-600" />
          </button>
        </div>
      </div>

      {/* Channels */}
      <div className="flex items-center space-x-2">
        <span className="text-sm text-slate-500">Publishing to:</span>
        {content.channels.map(channel => (
          <span
            key={channel}
            className={cn('px-3 py-1 rounded-lg text-sm font-medium', CHANNEL_COLORS[channel] || 'bg-slate-100 text-slate-700')}
          >
            {channel.replace('_', ' ')}
          </span>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 border-b border-slate-200">
        {[
          { id: 'preview', label: 'Content Preview', icon: Eye },
          { id: 'variations', label: 'Channel Variations', icon: Layers },
          { id: 'seo', label: 'SEO & Marketing', icon: BarChart3 },
          ...(isVideo ? [{ id: 'video', label: 'Video Assets', icon: Video }] : []),
        ].map(tab => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={cn(
                'flex items-center space-x-2 px-4 py-3 text-sm font-medium transition-colors border-b-2 -mb-px',
                activeTab === tab.id
                  ? 'border-purple-500 text-purple-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              )}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          )
        })}
      </div>

      {/* Tab Content */}
      <div className="grid grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="col-span-2">
          {activeTab === 'preview' && (
            <div className="space-y-6">
              {/* Content Body */}
              <div className="p-6 bg-white rounded-xl border border-slate-200">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-slate-900">Content</h3>
                  <button
                    onClick={() => handleCopy(content.body)}
                    className="text-sm text-slate-500 hover:text-slate-700 flex items-center space-x-1"
                  >
                    <Copy className="w-4 h-4" />
                    <span>Copy</span>
                  </button>
                </div>
                <div className="prose prose-slate max-w-none">
                  <p className="whitespace-pre-wrap">{content.body}</p>
                </div>
              </div>

              {/* Call to Action */}
              {content.callToAction && (
                <div className="p-4 bg-purple-50 rounded-xl border border-purple-200">
                  <p className="text-sm font-medium text-purple-700 mb-1">Call to Action</p>
                  <p className="text-purple-900">{content.callToAction}</p>
                </div>
              )}

              {/* Hashtags */}
              {content.hashtags && content.hashtags.length > 0 && (
                <div className="p-4 bg-slate-50 rounded-xl">
                  <p className="text-sm font-medium text-slate-700 mb-2">Hashtags</p>
                  <div className="flex flex-wrap gap-2">
                    {content.hashtags.map((tag, i) => (
                      <span key={i} className="px-3 py-1 bg-white border border-slate-200 rounded-full text-sm text-slate-600">
                        {tag.startsWith('#') ? tag : `#${tag}`}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'variations' && (
            <div className="space-y-4">
              {content.variations && content.variations.length > 0 ? (
                content.variations.map((variation, i) => (
                  <div
                    key={i}
                    className={cn(
                      'p-6 bg-white rounded-xl border-2 transition-all cursor-pointer',
                      selectedVariation === variation.channel
                        ? 'border-purple-500 shadow-lg'
                        : 'border-slate-200 hover:border-slate-300'
                    )}
                    onClick={() => setSelectedVariation(
                      selectedVariation === variation.channel ? null : variation.channel
                    )}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <span className={cn(
                        'px-3 py-1 rounded-lg text-sm font-medium',
                        CHANNEL_COLORS[variation.channel] || 'bg-slate-100 text-slate-700'
                      )}>
                        {variation.channel.replace('_', ' ')}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleCopy(variation.body)
                        }}
                        className="text-sm text-slate-500 hover:text-slate-700 flex items-center space-x-1"
                      >
                        <Copy className="w-4 h-4" />
                        <span>Copy</span>
                      </button>
                    </div>
                    <h4 className="font-bold text-slate-900 mb-2">{variation.title}</h4>
                    <p className="text-slate-600 whitespace-pre-wrap">{variation.body}</p>
                  </div>
                ))
              ) : (
                <div className="text-center py-12 text-slate-500">
                  <Layers className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                  <p>No channel variations available</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'seo' && (
            <SeoToolkit
              title={content.title}
              content={content.body}
              keywords={seoKeywords}
              onKeywordsChange={setSeoKeywords}
            />
          )}

          {activeTab === 'video' && isVideo && (
            <div className="space-y-6">
              {/* Video Script */}
              {content.videoScript && (
                <div className="p-6 bg-white rounded-xl border border-slate-200">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-slate-900 flex items-center space-x-2">
                      <FileText className="w-5 h-5 text-purple-600" />
                      <span>Video Script</span>
                    </h3>
                    <button
                      onClick={() => handleCopy(content.videoScript || '')}
                      className="text-sm text-slate-500 hover:text-slate-700 flex items-center space-x-1"
                    >
                      <Copy className="w-4 h-4" />
                      <span>Copy</span>
                    </button>
                  </div>
                  <div className="prose prose-slate max-w-none">
                    <p className="whitespace-pre-wrap">{content.videoScript}</p>
                  </div>
                </div>
              )}

              {/* Video Hook */}
              {content.videoHook && (
                <div className="p-4 bg-red-50 rounded-xl border border-red-200">
                  <p className="text-sm font-medium text-red-700 mb-1 flex items-center space-x-2">
                    <Play className="w-4 h-4" />
                    <span>Video Hook (First 3 Seconds)</span>
                  </p>
                  <p className="text-red-900">{content.videoHook}</p>
                </div>
              )}

              {/* Thumbnail Ideas */}
              {content.thumbnailIdeas && content.thumbnailIdeas.length > 0 && (
                <div className="p-6 bg-white rounded-xl border border-slate-200">
                  <h3 className="font-bold text-slate-900 flex items-center space-x-2 mb-4">
                    <ImageIcon className="w-5 h-5 text-purple-600" />
                    <span>Thumbnail Ideas</span>
                  </h3>
                  <div className="space-y-3">
                    {content.thumbnailIdeas.map((idea, i) => (
                      <div key={i} className="p-3 bg-slate-50 rounded-lg flex items-start space-x-3">
                        <span className="w-6 h-6 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center text-sm font-bold">
                          {i + 1}
                        </span>
                        <p className="text-slate-700">{idea}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Timestamps */}
              {content.timestamps && content.timestamps.length > 0 && (
                <div className="p-6 bg-white rounded-xl border border-slate-200">
                  <h3 className="font-bold text-slate-900 flex items-center space-x-2 mb-4">
                    <Clock className="w-5 h-5 text-purple-600" />
                    <span>Video Chapters</span>
                  </h3>
                  <div className="space-y-2">
                    {content.timestamps.map((ts, i) => (
                      <div key={i} className="flex items-center space-x-4 p-2 hover:bg-slate-50 rounded-lg">
                        <span className="text-sm font-mono text-purple-600 w-16">{ts.time}</span>
                        <span className="text-slate-700">{ts.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* SEO Score */}
          {content.seoAnalysis && (
            <div className="p-6 bg-white rounded-xl border border-slate-200">
              <h3 className="font-bold text-slate-900 mb-4">SEO Score</h3>
              <div className="flex items-center justify-center mb-4">
                <div className={cn(
                  'w-24 h-24 rounded-full flex items-center justify-center border-4',
                  content.seoAnalysis.score >= 80 ? 'border-emerald-500 bg-emerald-50' :
                  content.seoAnalysis.score >= 60 ? 'border-amber-500 bg-amber-50' :
                  'border-red-500 bg-red-50'
                )}>
                  <span className={cn(
                    'text-3xl font-bold',
                    content.seoAnalysis.score >= 80 ? 'text-emerald-600' :
                    content.seoAnalysis.score >= 60 ? 'text-amber-600' :
                    'text-red-600'
                  )}>
                    {content.seoAnalysis.score}
                  </span>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-500">Readability</span>
                  <span className="font-medium">{content.seoAnalysis.readability}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-500">Headline</span>
                  <span className="font-medium">{content.seoAnalysis.headlineScore}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-500">Keywords</span>
                  <span className="font-medium">{content.seoAnalysis.keywordDensity}%</span>
                </div>
              </div>
            </div>
          )}

          {/* AI Info */}
          {content.aiGenerated && (
            <div className="p-6 bg-purple-50 rounded-xl border border-purple-200">
              <div className="flex items-center space-x-2 mb-3">
                <Sparkles className="w-5 h-5 text-purple-600" />
                <h3 className="font-bold text-purple-900">Generated by Mia</h3>
              </div>
              {content.aiTopic && (
                <div className="mb-2">
                  <p className="text-xs text-purple-600 font-medium">Topic</p>
                  <p className="text-sm text-purple-900">{content.aiTopic}</p>
                </div>
              )}
              {content.aiTone && (
                <div>
                  <p className="text-xs text-purple-600 font-medium">Tone</p>
                  <p className="text-sm text-purple-900 capitalize">{content.aiTone}</p>
                </div>
              )}
            </div>
          )}

          {/* Quick Actions */}
          <div className="p-6 bg-white rounded-xl border border-slate-200">
            <h3 className="font-bold text-slate-900 mb-4">Quick Actions</h3>
            <div className="space-y-2">
              <button className="w-full p-3 text-left hover:bg-slate-50 rounded-lg transition-colors flex items-center space-x-3">
                <Edit className="w-5 h-5 text-slate-600" />
                <span>Edit Content</span>
              </button>
              <button className="w-full p-3 text-left hover:bg-slate-50 rounded-lg transition-colors flex items-center space-x-3">
                <Copy className="w-5 h-5 text-slate-600" />
                <span>Duplicate</span>
              </button>
              <button className="w-full p-3 text-left hover:bg-slate-50 rounded-lg transition-colors flex items-center space-x-3">
                <Calendar className="w-5 h-5 text-slate-600" />
                <span>Reschedule</span>
              </button>
              <button className="w-full p-3 text-left hover:bg-red-50 rounded-lg transition-colors flex items-center space-x-3 text-red-600">
                <Trash2 className="w-5 h-5" />
                <span>Delete</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Missing import
function Layers(props: any) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <polygon points="12 2 2 7 12 12 22 7 12 2" />
      <polyline points="2 17 12 22 22 17" />
      <polyline points="2 12 12 17 22 12" />
    </svg>
  )
}
