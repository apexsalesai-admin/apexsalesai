'use client'

import { useState, useEffect, useCallback } from 'react'
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
  Star,
  Plus,
  ChevronDown,
  ChevronUp,
  AlertCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { SeoToolkit } from '@/components/content/seo-toolkit'
import { RenderArtifactPanel } from '@/components/studio/video/RenderArtifactPanel'
import { MiaCopilotPanel } from '@/components/studio/MiaCopilotPanel'
import { useMiaCopilot } from '@/hooks/useMiaCopilot'
import { MiaContextHint } from '@/components/studio/MiaContextHint'
import type { RenderResult } from '@/lib/video/types/render-result'

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

interface ContentVersion {
  id: string
  contentId: string
  versionNumber: number
  label: string | null
  isFinal: boolean
  script: string
  visualPrompt: string | null
  config: Record<string, unknown>
  videoJobId: string | null
  videoJob: {
    id: string
    status: string
    progress: number
    progressMessage: string | null
    errorMessage: string | null
    outputAssets: {
      id: string
      publicUrl: string | null
      thumbnailUrl: string | null
      status: string
    }[]
  } | null
  createdAt: string
}

interface PublishEligibility {
  eligible: boolean
  reason?: string
  finalVersionId?: string
  videoUrl?: string
  progress?: number
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

const JOB_STATUS_PILLS: Record<string, { label: string; color: string; bgColor: string }> = {
  QUEUED: { label: 'Queued', color: 'text-blue-700', bgColor: 'bg-blue-100' },
  PROCESSING: { label: 'Rendering', color: 'text-amber-700', bgColor: 'bg-amber-100' },
  COMPLETED: { label: 'Ready', color: 'text-emerald-700', bgColor: 'bg-emerald-100' },
  FAILED: { label: 'Failed', color: 'text-red-700', bgColor: 'bg-red-100' },
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
  const [publishResults, setPublishResults] = useState<unknown[]>([])

  // Quick Action state
  const [showEditModal, setShowEditModal] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const [editBody, setEditBody] = useState('')
  const [editHashtags, setEditHashtags] = useState('')
  const [editCallToAction, setEditCallToAction] = useState('')
  const [isSavingEdit, setIsSavingEdit] = useState(false)
  const [isDuplicating, setIsDuplicating] = useState(false)
  const [showRescheduleModal, setShowRescheduleModal] = useState(false)
  const [rescheduleDate, setRescheduleDate] = useState('')
  const [isRescheduling, setIsRescheduling] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // YouTube publish modal state
  const [showYouTubeModal, setShowYouTubeModal] = useState(false)
  const [ytTitle, setYtTitle] = useState('')
  const [ytDescription, setYtDescription] = useState('')
  const [ytTags, setYtTags] = useState('')
  const [ytPrivacy, setYtPrivacy] = useState<'private' | 'unlisted' | 'public'>('private')
  const [isYtPublishing, setIsYtPublishing] = useState(false)
  const [ytResult, setYtResult] = useState<{ videoId?: string; permalink?: string; error?: string } | null>(null)

  // Video version state
  const [versions, setVersions] = useState<ContentVersion[]>([])
  const [isLoadingVersions, setIsLoadingVersions] = useState(false)
  const [isCreatingVersion, setIsCreatingVersion] = useState(false)
  const [renderingVersionId, setRenderingVersionId] = useState<string | null>(null)
  const [selectedProvider, setSelectedProvider] = useState('template')
  const [selectedModel, setSelectedModel] = useState<string | null>(null)
  const [renderDuration, setRenderDuration] = useState(8)
  const [renderAspect, setRenderAspect] = useState('16:9')
  const [costEstimate, setCostEstimate] = useState<{ estimatedUsd: number; monthlySpent: number; monthlyLimit: number; withinBudget: boolean; warning?: string } | null>(null)
  const [showRenderConfirm, setShowRenderConfirm] = useState(false)
  const [pendingRenderVersionId, setPendingRenderVersionId] = useState<string | null>(null)
  const [availableProviders, setAvailableProviders] = useState<{ name: string; displayName: string; category: string; supportedDurations: number[]; supportedAspectRatios: string[]; costPerSecond: number; requiresApiKey: boolean; models?: { id: string; displayName: string; supportedDurations: number[]; costPerSecond: number }[] }[]>([])
  const [renderResults, setRenderResults] = useState<Record<string, RenderResult>>({})
  const [showNewVersionForm, setShowNewVersionForm] = useState(false)
  const [newVersionScript, setNewVersionScript] = useState('')
  const [newVersionPrompt, setNewVersionPrompt] = useState('')
  const [newVersionAspect, setNewVersionAspect] = useState<'16:9' | '9:16' | '1:1'>('16:9')
  const [newVersionDuration, setNewVersionDuration] = useState(8)

  // Mia recommendation (legacy — kept as fallback data source)
  const [miaRec, setMiaRec] = useState<{
    provider: string; model?: string; confidence: string; reason: string
    estimatedCost: number; estimatedDuration: string
    alternatives: { provider: string; reason: string; estimatedCost: number }[]
  } | null>(null)

  // Mia Co-Pilot — active version for the panel
  const [activeVersionForMia, setActiveVersionForMia] = useState<{
    id: string; script: string; versionNumber: number
  } | null>(null)

  // Publish eligibility for video content
  const [publishEligibility, setPublishEligibility] = useState<PublishEligibility | null>(null)

  // Worker health (dev only)
  const [workerOffline, setWorkerOffline] = useState(false)

  // Mia Co-Pilot hook
  const connectedProviderNames = availableProviders
    .filter(p => !p.requiresApiKey || p.name === 'template')
    .map(p => p.name)
  const miaCopilot = useMiaCopilot({
    content: content ? {
      id: content.id,
      title: content.title,
      contentType: content.contentType,
      channels: content.channels,
      aiTone: content.aiTone,
    } : null,
    version: activeVersionForMia,
    connectedProviders: connectedProviderNames,
  })

  // Set active version for Mia when versions load or change
  useEffect(() => {
    if (versions.length === 0) { setActiveVersionForMia(null); return }
    const finalV = versions.find(v => v.isFinal)
    const target = finalV || versions[0]
    setActiveVersionForMia({
      id: target.id,
      script: target.script,
      versionNumber: target.versionNumber,
    })
  }, [versions])

  // Fetch content
  useEffect(() => {
    async function fetchContent() {
      try {
        const response = await fetch(`/api/content/${params.id}`)
        const data = await response.json()
        if (data.success) {
          setContent(data.data)
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

  // Fetch versions when content loads and it's video type
  const fetchVersions = useCallback(async () => {
    if (!params.id) return
    setIsLoadingVersions(true)
    try {
      const response = await fetch(`/api/studio/versions?contentId=${params.id}`)
      const data = await response.json()
      if (data.success) {
        setVersions(data.data)
      }
    } catch (e) {
      console.error('Failed to fetch versions:', e)
    } finally {
      setIsLoadingVersions(false)
    }
  }, [params.id])

  const isVideo = content?.contentType === 'VIDEO' || content?.contentType === 'REEL'

  useEffect(() => {
    if (content && isVideo) {
      fetchVersions()
    }
  }, [content, isVideo, fetchVersions])

  // Hydrate renderResults from existing version data (returning to page)
  useEffect(() => {
    if (!versions.length) return
    const hydrated: Record<string, RenderResult> = {}
    for (const v of versions) {
      if (!v.videoJob) continue
      // Don't overwrite if we already have a result with frames (from a fresh render)
      if (renderResults[v.id]?.frames?.length) continue
      const readyAsset = v.videoJob.outputAssets.find(a => a.status === 'READY')
      hydrated[v.id] = {
        jobId: v.videoJob.id,
        provider: 'unknown', // DB doesn't expose provider in the version query
        status: v.videoJob.status === 'COMPLETED' ? 'completed'
          : v.videoJob.status === 'FAILED' ? 'failed'
          : v.videoJob.status === 'QUEUED' ? 'queued' : 'processing',
        previewUrl: readyAsset?.publicUrl ?? null,
        outputUrl: readyAsset?.publicUrl ?? null,
        thumbnailUrl: readyAsset?.thumbnailUrl ?? null,
        frames: null, // Will be populated by the panel's own polling via video-jobs endpoint
        progress: v.videoJob.progress,
        error: v.videoJob.errorMessage ?? null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
    }
    if (Object.keys(hydrated).length) {
      setRenderResults(prev => ({ ...hydrated, ...prev }))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [versions])

  // Check worker health (dev only) when video tab is active
  useEffect(() => {
    if (!isVideo || activeTab !== 'video') return
    let cancelled = false
    async function checkWorker() {
      try {
        const response = await fetch('/api/health/worker')
        const data = await response.json()
        if (!cancelled) setWorkerOffline(!data.ok)
      } catch {
        if (!cancelled) setWorkerOffline(true)
      }
    }
    checkWorker()
    return () => { cancelled = true }
  }, [isVideo, activeTab])

  // Fetch publish eligibility for video content
  useEffect(() => {
    if (!content || !isVideo) return
    async function checkEligibility() {
      try {
        const response = await fetch(`/api/studio/content/${params.id}/publish-eligibility`)
        const data = await response.json()
        if (data.success) {
          setPublishEligibility(data.data)
        }
      } catch (e) {
        console.error('Failed to check eligibility:', e)
      }
    }
    checkEligibility()
  }, [content, isVideo, params.id, versions])

  // Poll for active render jobs — in-place state updates, parallel requests
  useEffect(() => {
    const activeJobs = versions.filter(
      v => v.videoJob && (v.videoJob.status === 'QUEUED' || v.videoJob.status === 'PROCESSING')
    )
    if (activeJobs.length === 0) return

    let pollInterval = 5000 // start at 5s
    let pollCount = 0
    let cancelled = false

    const poll = async () => {
      if (cancelled) return
      pollCount++

      // Poll all active jobs in parallel
      const results = await Promise.allSettled(
        activeJobs.map(async (version) => {
          if (!version.videoJob) return null
          const response = await fetch(`/api/studio/render/${version.videoJob.id}/status`)
          const data = await response.json()
          if (!data.success) return null
          return { versionId: version.id, status: data.data }
        })
      )

      let needsFullRefetch = false

      setVersions(prev => prev.map(v => {
        const result = results.find((r, i) => r.status === 'fulfilled' && r.value?.versionId === v.id)
        if (!result || result.status !== 'fulfilled' || !result.value) return v

        const pollData = result.value.status
        const isTerminal = pollData.status === 'COMPLETED' || pollData.status === 'FAILED'
        if (isTerminal) needsFullRefetch = true

        return {
          ...v,
          videoJob: v.videoJob ? {
            ...v.videoJob,
            status: pollData.status,
            progress: pollData.progress ?? v.videoJob.progress,
            progressMessage: pollData.progressMessage ?? v.videoJob.progressMessage,
            errorMessage: pollData.errorMessage ?? v.videoJob.errorMessage,
          } : v.videoJob,
        }
      }))

      // Full refetch on terminal status to get output assets
      if (needsFullRefetch) {
        setTimeout(() => fetchVersions(), 500)
        return // stop polling, the refetch will re-trigger the effect
      }

      // Client-side backoff: after 12 polls (~1 min), slow to 10s
      if (pollCount > 12) pollInterval = 10000

      if (!cancelled) {
        setTimeout(poll, pollInterval)
      }
    }

    const timer = setTimeout(poll, pollInterval)
    return () => { cancelled = true; clearTimeout(timer) }
  }, [versions, fetchVersions])

  // Fetch available providers on mount
  useEffect(() => {
    fetch('/api/studio/providers')
      .then(r => r.json())
      .then(data => {
        if (data.success && data.data) setAvailableProviders(data.data)
      })
      .catch(() => {})
  }, [])

  // Fetch Mia recommendation when content loads
  useEffect(() => {
    if (!content?.id) return
    const channel = content.channels?.[0]?.toLowerCase() || 'general'
    const platformMap: Record<string, string> = {
      youtube: 'youtube', linkedin: 'linkedin', tiktok: 'tiktok',
      instagram: 'instagram', x_twitter: 'general', facebook: 'general',
    }
    fetch('/api/studio/recommend', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contentId: content.id, targetPlatform: platformMap[channel] || 'general' }),
    })
      .then(r => r.json())
      .then(data => { if (data.success && data.data) setMiaRec(data.data) })
      .catch(() => {})
  }, [content?.id, content?.channels])

  // Fetch cost estimate when provider/model/duration/aspect changes
  useEffect(() => {
    if (!selectedProvider) return
    const controller = new AbortController()
    fetch('/api/studio/render/estimate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider: selectedProvider, model: selectedModel || undefined, durationSeconds: renderDuration, aspectRatio: renderAspect }),
      signal: controller.signal,
    })
      .then(r => r.json())
      .then(data => {
        if (data.success && data.data) setCostEstimate(data.data)
      })
      .catch(() => {})
    return () => controller.abort()
  }, [selectedProvider, selectedModel, renderDuration, renderAspect])

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
      const response = await fetch('/api/studio/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contentId: content.id,
          channels: content.channels,
        }),
      })
      const data = await response.json()
      if (data.success) {
        setContent(prev => prev ? { ...prev, status: 'PUBLISHING' } : null)
        setPublishResults([])
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

  // YouTube publish modal helpers
  const openYouTubeModal = () => {
    if (!content) return
    setYtTitle(content.title)
    setYtDescription(content.body?.slice(0, 5000) || '')
    setYtTags(content.hashtags?.map(h => h.replace('#', '')).join(', ') || '')
    setYtPrivacy('private')
    setYtResult(null)
    setShowYouTubeModal(true)
  }

  const handleYouTubePublish = async () => {
    const videoUrl = publishEligibility?.videoUrl || finalVideoUrl
    if (!videoUrl) return

    setIsYtPublishing(true)
    setYtResult(null)
    try {
      const response = await fetch('/api/studio/youtube/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: ytTitle,
          description: ytDescription,
          tags: ytTags.split(',').map(t => t.trim()).filter(Boolean),
          privacyStatus: ytPrivacy,
          videoUrl,
        }),
      })
      const data = await response.json()
      if (data.success) {
        setYtResult({ videoId: data.data.videoId, permalink: data.data.permalink })
        setContent(prev => prev ? { ...prev, status: 'PUBLISHED' } : null)
      } else {
        setYtResult({ error: data.error || 'YouTube publish failed' })
      }
    } catch (e) {
      console.error('YouTube publish failed:', e)
      setYtResult({ error: 'YouTube publish failed. Please try again.' })
    } finally {
      setIsYtPublishing(false)
    }
  }

  const handleCreateVersion = async () => {
    if (!newVersionScript.trim()) return
    setIsCreatingVersion(true)
    try {
      const response = await fetch('/api/studio/versions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contentId: params.id,
          script: newVersionScript,
          visualPrompt: newVersionPrompt || undefined,
          config: {
            aspectRatio: newVersionAspect,
            duration: newVersionDuration,
          },
        }),
      })
      const data = await response.json()
      if (data.success) {
        setShowNewVersionForm(false)
        setNewVersionScript('')
        setNewVersionPrompt('')
        fetchVersions()
      }
    } catch (e) {
      console.error('Failed to create version:', e)
    } finally {
      setIsCreatingVersion(false)
    }
  }

  const handleRender = async (versionId: string) => {
    // For expensive renders (> $1), show confirmation dialog
    if (costEstimate && costEstimate.estimatedUsd > 1 && selectedProvider !== 'template') {
      setPendingRenderVersionId(versionId)
      setShowRenderConfirm(true)
      return
    }
    await executeRender(versionId)
  }

  const executeRender = async (versionId: string) => {
    setShowRenderConfirm(false)
    setPendingRenderVersionId(null)
    setRenderingVersionId(versionId)
    try {
      const response = await fetch(`/api/studio/versions/${versionId}/render`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: selectedProvider,
          model: selectedModel || undefined,
          durationSeconds: renderDuration,
          aspectRatio: renderAspect,
        }),
      })
      const data = await response.json()
      if (data.success && data.data) {
        const d = data.data as { jobId: string; status: string; provider?: string; frames?: unknown[]; estimatedCostUsd?: number }
        // Build initial RenderResult for the artifact panel
        const initial: RenderResult = {
          jobId: d.jobId,
          provider: d.provider || selectedProvider,
          status: d.status === 'COMPLETED' ? 'completed' : d.status === 'QUEUED' ? 'queued' : 'processing',
          previewUrl: null,
          outputUrl: null,
          thumbnailUrl: null,
          frames: (d.frames as RenderResult['frames']) ?? null,
          progress: d.status === 'COMPLETED' ? 100 : 0,
          error: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
        setRenderResults(prev => ({ ...prev, [versionId]: initial }))
        fetchVersions()
      } else if (data.data?.status) {
        // Server returned a RenderResult-shaped error (awaiting_provider, budget_exceeded, etc.)
        const errResult = data.data as RenderResult
        setRenderResults(prev => ({
          ...prev,
          [versionId]: {
            ...errResult,
            jobId: errResult.jobId || '',
            provider: errResult.provider || selectedProvider,
            createdAt: errResult.createdAt || new Date().toISOString(),
            updatedAt: errResult.updatedAt || new Date().toISOString(),
          },
        }))
      } else if (response.status === 429) {
        setRenderResults(prev => ({
          ...prev,
          [versionId]: {
            jobId: '',
            provider: selectedProvider,
            status: 'budget_exceeded',
            error: data.error || 'Render budget exceeded',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        }))
      } else if (!data.success) {
        setRenderResults(prev => ({
          ...prev,
          [versionId]: {
            jobId: '',
            provider: selectedProvider,
            status: 'failed',
            error: data.error || 'Failed to start render',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        }))
      }
    } catch (e) {
      console.error('Failed to start render:', e)
    } finally {
      setRenderingVersionId(null)
    }
  }

  const handleSetFinal = async (versionId: string) => {
    try {
      const response = await fetch(`/api/studio/versions/${versionId}/final`, {
        method: 'PATCH',
      })
      const data = await response.json()
      if (data.success) {
        fetchVersions()
      }
    } catch (e) {
      console.error('Failed to set final:', e)
    }
  }

  // --- Quick Action Handlers ---

  const handleOpenEdit = () => {
    if (!content) return
    setEditTitle(content.title)
    setEditBody(content.body)
    setEditHashtags(content.hashtags?.join(', ') || '')
    setEditCallToAction(content.callToAction || '')
    setShowEditModal(true)
  }

  const handleSaveEdit = async () => {
    if (!content) return
    setIsSavingEdit(true)
    try {
      const hashtags = editHashtags
        .split(',')
        .map(t => t.trim())
        .filter(Boolean)
        .map(t => t.startsWith('#') ? t : `#${t}`)

      const response = await fetch(`/api/content/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editTitle,
          body: editBody,
          hashtags,
          callToAction: editCallToAction || null,
        }),
      })
      const data = await response.json()
      if (data.success) {
        setContent(data.data)
        setShowEditModal(false)
      }
    } catch (e) {
      console.error('Failed to save edits:', e)
    } finally {
      setIsSavingEdit(false)
    }
  }

  const handleDuplicate = async () => {
    setIsDuplicating(true)
    try {
      const response = await fetch(`/api/content/${params.id}/duplicate`, {
        method: 'POST',
      })
      const data = await response.json()
      if (data.success) {
        router.push(`/studio/content/${data.data.id}`)
      }
    } catch (e) {
      console.error('Failed to duplicate:', e)
    } finally {
      setIsDuplicating(false)
    }
  }

  const handleReschedule = async () => {
    if (!rescheduleDate) return
    setIsRescheduling(true)
    try {
      const response = await fetch(`/api/content/${params.id}/reschedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scheduledFor: new Date(rescheduleDate).toISOString() }),
      })
      const data = await response.json()
      if (data.success) {
        setContent(data.data)
        setShowRescheduleModal(false)
        setRescheduleDate('')
      }
    } catch (e) {
      console.error('Failed to reschedule:', e)
    } finally {
      setIsRescheduling(false)
    }
  }

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      const response = await fetch(`/api/content/${params.id}`, {
        method: 'DELETE',
      })
      const data = await response.json()
      if (data.success) {
        router.push('/studio/content')
      }
    } catch (e) {
      console.error('Failed to delete:', e)
    } finally {
      setIsDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  const handleRetry = async (versionId: string) => {
    setRenderingVersionId(versionId)
    try {
      const response = await fetch(`/api/studio/versions/${versionId}/retry`, {
        method: 'POST',
      })
      const data = await response.json()
      if (data.success) {
        fetchVersions()
      }
    } catch (e) {
      console.error('Failed to retry render:', e)
    } finally {
      setRenderingVersionId(null)
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

  // Get final version's render result for the top-level preview
  const finalVersion = versions.find(v => v.isFinal)
  const finalRenderResult = finalVersion ? renderResults[finalVersion.id] : null
  const finalVideoUrl = finalVersion?.videoJob?.status === 'COMPLETED'
    ? finalVersion.videoJob.outputAssets.find(a => a.status === 'READY')?.publicUrl
    : null

  // Determine if publish button should be disabled for video content
  const isPublishDisabledForVideo = isVideo && publishEligibility && !publishEligibility.eligible

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
            <div className="relative group">
              <button
                onClick={handlePublish}
                disabled={isPublishing || !!isPublishDisabledForVideo}
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
              {isPublishDisabledForVideo && publishEligibility?.reason && (
                <div className="absolute right-0 top-full mt-2 w-64 p-3 bg-slate-900 text-white text-sm rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-10">
                  <div className="flex items-start space-x-2">
                    <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                    <span>{publishEligibility.reason}</span>
                  </div>
                </div>
              )}
            </div>
          )}
          {/* YouTube publish button — shown when content is video + has YOUTUBE channel + video is ready */}
          {(content.status === 'APPROVED' || content.status === 'SCHEDULED') &&
            isVideo &&
            content.channels.includes('YOUTUBE') &&
            (publishEligibility?.videoUrl || finalVideoUrl) && (
            <button
              onClick={openYouTubeModal}
              className="px-4 py-2 bg-red-600 text-white hover:bg-red-700 rounded-lg flex items-center space-x-2 transition-colors"
            >
              <Play className="w-4 h-4" />
              <span>YouTube</span>
            </button>
          )}
          {content.status === 'PUBLISHED' && (
            <span className="px-4 py-2 bg-emerald-100 text-emerald-700 rounded-lg flex items-center space-x-2">
              <Check className="w-4 h-4" />
              <span>Published</span>
            </span>
          )}
          <button
            onClick={handleOpenEdit}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            title="Edit Content"
          >
            <Edit className="w-5 h-5 text-slate-600" />
          </button>
          <button
            onClick={() => handleCopy(`${content.title}\n\n${content.body}`)}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            title="Copy to Clipboard"
          >
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
              <MiaContextHint
                hintKey="content-editor-tips"
                message="Tip: Use the Edit button to refine your content. For video posts, switch to the Video Assets tab to manage renders and scenes."
              />
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
            <div className="space-y-4">
              <MiaContextHint
                hintKey="content-seo-tips"
                message="Use the Optimize tab to generate SEO titles, suggest keywords, and improve readability — all powered by AI. Check your score in the Analysis tab first!"
                action={{ label: 'Learn about SEO', href: 'https://developers.google.com/search/docs/fundamentals/seo-starter-guide' }}
              />
              <SeoToolkit
                title={content.title}
                content={content.body}
                keywords={seoKeywords}
                contentId={content.id}
                onKeywordsChange={(kw) => {
                  setSeoKeywords(kw)
                  // Persist keywords as hashtags
                  fetch(`/api/content/${params.id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ hashtags: kw.map(k => k.startsWith('#') ? k : `#${k}`) }),
                  })
                    .then(r => r.json())
                    .then(data => { if (data.success) setContent(data.data) })
                    .catch(() => {})
                }}
                onTitleChange={(newTitle) => {
                  fetch(`/api/content/${params.id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ title: newTitle }),
                  })
                    .then(r => r.json())
                    .then(data => { if (data.success) setContent(data.data) })
                    .catch(() => {})
                }}
                onBodyChange={(newBody) => {
                  fetch(`/api/content/${params.id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ body: newBody }),
                  })
                    .then(r => r.json())
                    .then(data => { if (data.success) setContent(data.data) })
                    .catch(() => {})
                }}
              />
            </div>
          )}

          {activeTab === 'video' && isVideo && (
            <div className="space-y-6">
              {/* Worker offline banner (dev only) */}
              {workerOffline && (
                <div className="px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start space-x-2 text-sm">
                  <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-amber-800 font-medium">Video rendering worker offline</p>
                    <p className="text-amber-600 mt-0.5">Run <code className="bg-amber-100 px-1 rounded text-xs">npm run dev:inngest</code> in a separate terminal to enable background rendering.</p>
                  </div>
                </div>
              )}

              {/* Video Preview — shows artifact panel for final version, or placeholder */}
              <div className="p-6 bg-white rounded-xl border border-slate-200">
                <h3 className="font-bold text-slate-900 flex items-center space-x-2 mb-4">
                  <Play className="w-5 h-5 text-purple-600" />
                  <span>Video Preview</span>
                  {finalVersion && (
                    <span className="text-xs text-slate-400 font-normal">
                      ({finalVersion.label || `Version ${finalVersion.versionNumber}`})
                    </span>
                  )}
                </h3>
                {finalVideoUrl ? (
                  <video
                    controls
                    className="w-full rounded-lg bg-black"
                    src={finalVideoUrl}
                  >
                    Your browser does not support the video tag.
                  </video>
                ) : finalRenderResult ? (
                  <RenderArtifactPanel
                    initial={finalRenderResult}
                    onRetry={finalVersion ? () => handleRender(finalVersion.id) : undefined}
                  />
                ) : (
                  <div className="aspect-video bg-slate-100 rounded-lg flex items-center justify-center">
                    <div className="text-center text-slate-400">
                      <Video className="w-12 h-12 mx-auto mb-2" />
                      <p className="text-sm">No rendered video yet</p>
                      <p className="text-xs mt-1">Create a version and render it to see a preview</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Version List */}
              <div className="p-6 bg-white rounded-xl border border-slate-200">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-slate-900 flex items-center space-x-2">
                    <FileText className="w-5 h-5 text-purple-600" />
                    <span>Versions ({versions.length})</span>
                  </h3>
                  <button
                    onClick={() => {
                      setShowNewVersionForm(!showNewVersionForm)
                      if (!newVersionScript && content.body) {
                        setNewVersionScript(content.body)
                      }
                    }}
                    className="px-3 py-1.5 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center space-x-1"
                  >
                    {showNewVersionForm ? <ChevronUp className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                    <span>{showNewVersionForm ? 'Close' : 'New Version'}</span>
                  </button>
                </div>

                {/* New Version Form */}
                {showNewVersionForm && (
                  <div className="mb-6 p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Script</label>
                      <textarea
                        value={newVersionScript}
                        onChange={e => setNewVersionScript(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm resize-y min-h-[120px] focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        placeholder="Enter your video script..."
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Visual Prompt (optional)</label>
                      <textarea
                        value={newVersionPrompt}
                        onChange={e => setNewVersionPrompt(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm resize-y min-h-[60px] focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        placeholder="Describe the visual style for the video generation..."
                      />
                    </div>
                    <div className="flex items-center space-x-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Aspect Ratio</label>
                        <select
                          value={newVersionAspect}
                          onChange={e => setNewVersionAspect(e.target.value as '16:9' | '9:16' | '1:1')}
                          className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                        >
                          <option value="16:9">16:9 (Landscape)</option>
                          <option value="9:16">9:16 (Portrait)</option>
                          <option value="1:1">1:1 (Square)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Duration</label>
                        <select
                          value={newVersionDuration}
                          onChange={e => setNewVersionDuration(Number(e.target.value))}
                          className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                        >
                          {(() => {
                            const prov = availableProviders.find(p => p.name === selectedProvider)
                            const model = selectedModel && prov?.models?.find(m => m.id === selectedModel)
                            return (model ? model.supportedDurations : prov?.supportedDurations || [4, 6, 8]).map(d => (
                              <option key={d} value={d}>{d} seconds</option>
                            ))
                          })()}
                        </select>
                      </div>
                    </div>
                    <button
                      onClick={handleCreateVersion}
                      disabled={isCreatingVersion || !newVersionScript.trim()}
                      className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center space-x-2 text-sm"
                    >
                      {isCreatingVersion ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Creating...</span>
                        </>
                      ) : (
                        <>
                          <Plus className="w-4 h-4" />
                          <span>Create Version</span>
                        </>
                      )}
                    </button>
                  </div>
                )}

                {/* Mia Co-Pilot Panel */}
                <div className="mb-4">
                  <MiaCopilotPanel
                    mode={miaCopilot.mode}
                    messages={miaCopilot.messages}
                    isTyping={miaCopilot.isTyping}
                    currentStep={miaCopilot.currentStep}
                    renderPlan={miaCopilot.renderPlan}
                    activeRenders={miaCopilot.activeRenders}
                    onModeChange={miaCopilot.setMode}
                    onAction={(action, data) => {
                      miaCopilot.handleAction(action, data)
                      // Handle actions that affect page-level state
                      if (action === 'set-duration' && data?.duration) {
                        setRenderDuration(data.duration as number)
                      }
                    }}
                    onAnalyzeScript={miaCopilot.analyzeScript}
                    onRenderAll={() => {
                      miaCopilot.renderAll()
                      // Trigger version refresh after a delay to pick up new jobs
                      setTimeout(() => fetchVersions(), 2000)
                    }}
                  />
                </div>

                {/* Render Settings */}
                {availableProviders.length > 0 && (
                  <div className="mb-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
                    <h4 className="text-sm font-medium text-slate-700 mb-3">Render Settings</h4>
                    <div className="space-y-3">
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label className="block text-xs text-slate-500 mb-1">Provider</label>
                          <select
                            value={selectedProvider}
                            onChange={e => {
                              const name = e.target.value
                              setSelectedProvider(name)
                              const prov = availableProviders.find(p => p.name === name)
                              // Reset model when provider changes
                              if (prov?.models?.length) {
                                setSelectedModel(prov.models[0].id)
                                const durations = prov.models[0].supportedDurations
                                if (!durations.includes(renderDuration)) setRenderDuration(durations[0])
                              } else {
                                setSelectedModel(null)
                                if (prov && !prov.supportedDurations.includes(renderDuration)) setRenderDuration(prov.supportedDurations[0])
                              }
                            }}
                            className="w-full px-2 py-1.5 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                          >
                            {availableProviders.map(p => (
                              <option key={p.name} value={p.name}>
                                {p.displayName} {p.costPerSecond > 0 ? `(~$${(p.costPerSecond * 8).toFixed(2)}/8s)` : '(Free)'}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs text-slate-500 mb-1">Duration</label>
                          <select
                            value={renderDuration}
                            onChange={e => setRenderDuration(Number(e.target.value))}
                            className="w-full px-2 py-1.5 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                          >
                            {(() => {
                              const prov = availableProviders.find(p => p.name === selectedProvider)
                              const model = selectedModel && prov?.models?.find(m => m.id === selectedModel)
                              const durations = model ? model.supportedDurations : prov?.supportedDurations || [4, 6, 8]
                              return durations.map(d => (
                                <option key={d} value={d}>{d}s</option>
                              ))
                            })()}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs text-slate-500 mb-1">Aspect Ratio</label>
                          <select
                            value={renderAspect}
                            onChange={e => setRenderAspect(e.target.value)}
                            className="w-full px-2 py-1.5 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                          >
                            {(availableProviders.find(p => p.name === selectedProvider)?.supportedAspectRatios || ['16:9', '9:16', '1:1']).map(r => (
                              <option key={r} value={r}>{r}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                      {/* Model dropdown — conditional on provider having models */}
                      {(() => {
                        const prov = availableProviders.find(p => p.name === selectedProvider)
                        if (!prov?.models || prov.models.length <= 1) return null
                        return (
                          <div>
                            <label className="block text-xs text-slate-500 mb-1">Model</label>
                            <select
                              value={selectedModel || prov.models[0].id}
                              onChange={e => {
                                const modelId = e.target.value
                                setSelectedModel(modelId)
                                const model = prov.models!.find(m => m.id === modelId)
                                if (model && !model.supportedDurations.includes(renderDuration)) {
                                  setRenderDuration(model.supportedDurations[0])
                                }
                              }}
                              className="w-full px-2 py-1.5 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                            >
                              {prov.models.map(m => (
                                <option key={m.id} value={m.id}>
                                  {m.displayName} {m.costPerSecond > 0 ? `($${m.costPerSecond.toFixed(2)}/s)` : ''}
                                </option>
                              ))}
                            </select>
                          </div>
                        )
                      })()}
                    </div>
                    {costEstimate && (
                      <div className={cn(
                        'mt-3 px-3 py-2 rounded-md text-sm flex items-center justify-between',
                        costEstimate.estimatedUsd === 0 ? 'bg-green-50 text-green-700' :
                        costEstimate.withinBudget ? 'bg-blue-50 text-blue-700' :
                        'bg-red-50 text-red-700'
                      )}>
                        <span>
                          Est. cost: <strong>${costEstimate.estimatedUsd.toFixed(2)}</strong>
                          {costEstimate.monthlyLimit > 0 && (
                            <span className="ml-2 text-xs opacity-75">
                              (${costEstimate.monthlySpent.toFixed(2)} / ${costEstimate.monthlyLimit.toFixed(2)} this month)
                            </span>
                          )}
                        </span>
                        {!costEstimate.withinBudget && (
                          <span className="flex items-center space-x-1">
                            <AlertCircle className="w-4 h-4" />
                            <span className="text-xs">Over budget</span>
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Render Confirmation Dialog */}
                {showRenderConfirm && pendingRenderVersionId && costEstimate && (
                  <div className="mb-4 p-4 bg-amber-50 rounded-lg border-2 border-amber-300">
                    <h4 className="text-sm font-medium text-amber-800 mb-2 flex items-center space-x-2">
                      <AlertCircle className="w-4 h-4" />
                      <span>Confirm Render</span>
                    </h4>
                    <p className="text-sm text-amber-700 mb-3">
                      This render will cost approximately <strong>${costEstimate.estimatedUsd.toFixed(2)}</strong> using{' '}
                      <strong>{availableProviders.find(p => p.name === selectedProvider)?.displayName || selectedProvider}</strong> ({renderDuration}s, {renderAspect}).
                    </p>
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={() => executeRender(pendingRenderVersionId)}
                        className="px-4 py-1.5 bg-amber-600 text-white rounded-lg hover:bg-amber-700 text-sm font-medium"
                      >
                        Render (${costEstimate.estimatedUsd.toFixed(2)})
                      </button>
                      <button
                        onClick={() => { setShowRenderConfirm(false); setPendingRenderVersionId(null) }}
                        className="px-4 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 text-sm text-slate-600"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {/* Versions */}
                {isLoadingVersions ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-purple-600" />
                  </div>
                ) : versions.length === 0 ? (
                  <div className="text-center py-8 text-slate-400">
                    <Video className="w-10 h-10 mx-auto mb-2" />
                    <p className="text-sm">No versions yet. Create one to get started.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {versions.map(version => {
                      const jobStatus = version.videoJob?.status
                      const statusPill = jobStatus
                        ? JOB_STATUS_PILLS[jobStatus] || { label: jobStatus, color: 'text-slate-700', bgColor: 'bg-slate-100' }
                        : { label: 'Not Rendered', color: 'text-slate-500', bgColor: 'bg-slate-100' }
                      const isActive = jobStatus === 'QUEUED' || jobStatus === 'PROCESSING'
                      const readyAsset = version.videoJob?.outputAssets.find(a => a.status === 'READY')

                      return (
                        <div
                          key={version.id}
                          className={cn(
                            'p-4 rounded-lg border-2 transition-all',
                            version.isFinal
                              ? 'border-amber-400 bg-amber-50/50'
                              : 'border-slate-200 bg-white'
                          )}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center space-x-2">
                              {version.isFinal && (
                                <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                              )}
                              <span className="font-medium text-slate-900">
                                {version.label || `Version ${version.versionNumber}`}
                              </span>
                              <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', statusPill.bgColor, statusPill.color)}>
                                {statusPill.label}
                                {jobStatus === 'PROCESSING' && version.videoJob?.progress != null && (
                                  <span> {version.videoJob.progress}%</span>
                                )}
                              </span>
                            </div>
                            <div className="flex items-center space-x-2">
                              {/* Render / Retry button */}
                              {jobStatus === 'FAILED' ? (
                                <button
                                  onClick={() => handleRetry(version.id)}
                                  disabled={renderingVersionId === version.id}
                                  className="px-3 py-1 text-xs border border-red-200 text-red-600 rounded-lg hover:bg-red-50 disabled:opacity-50 flex items-center space-x-1"
                                >
                                  {renderingVersionId === version.id ? (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                  ) : (
                                    <Play className="w-3 h-3" />
                                  )}
                                  <span>Retry</span>
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleRender(version.id)}
                                  disabled={isActive || renderingVersionId === version.id}
                                  className="px-3 py-1 text-xs border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 flex items-center space-x-1"
                                >
                                  {renderingVersionId === version.id ? (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                  ) : (
                                    <Play className="w-3 h-3" />
                                  )}
                                  <span>Render</span>
                                </button>
                              )}
                              {/* Set as Final button */}
                              <button
                                onClick={() => handleSetFinal(version.id)}
                                className={cn(
                                  'px-3 py-1 text-xs rounded-lg flex items-center space-x-1',
                                  version.isFinal
                                    ? 'bg-amber-100 text-amber-700 border border-amber-300'
                                    : 'border border-slate-200 hover:bg-slate-50 text-slate-600'
                                )}
                              >
                                <Star className={cn('w-3 h-3', version.isFinal && 'fill-amber-500')} />
                                <span>{version.isFinal ? 'Final' : 'Set Final'}</span>
                              </button>
                            </div>
                          </div>

                          {/* Script excerpt */}
                          <p className="text-sm text-slate-500 line-clamp-2 mb-1">
                            {version.script}
                          </p>

                          {/* Render Artifact — shows storyboard, video, progress, or error */}
                          {renderResults[version.id] && (
                            <div className="mt-2">
                              <RenderArtifactPanel
                                initial={renderResults[version.id]}
                                onRetry={() => handleRender(version.id)}
                                compact
                              />
                            </div>
                          )}

                          {/* Timestamp */}
                          <p className="text-xs text-slate-400 mt-1">
                            Created {new Date(version.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
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
              <button
                onClick={handleOpenEdit}
                className="w-full p-3 text-left hover:bg-slate-50 rounded-lg transition-colors flex items-center space-x-3"
              >
                <Edit className="w-5 h-5 text-slate-600" />
                <span>Edit Content</span>
              </button>
              <button
                onClick={handleDuplicate}
                disabled={isDuplicating}
                className="w-full p-3 text-left hover:bg-slate-50 rounded-lg transition-colors flex items-center space-x-3 disabled:opacity-50"
              >
                {isDuplicating ? <Loader2 className="w-5 h-5 text-slate-600 animate-spin" /> : <Copy className="w-5 h-5 text-slate-600" />}
                <span>{isDuplicating ? 'Duplicating...' : 'Duplicate'}</span>
              </button>
              <button
                onClick={() => setShowRescheduleModal(true)}
                className="w-full p-3 text-left hover:bg-slate-50 rounded-lg transition-colors flex items-center space-x-3"
              >
                <Calendar className="w-5 h-5 text-slate-600" />
                <span>Reschedule</span>
              </button>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="w-full p-3 text-left hover:bg-red-50 rounded-lg transition-colors flex items-center space-x-3 text-red-600"
              >
                <Trash2 className="w-5 h-5" />
                <span>Delete</span>
              </button>
            </div>
          </div>
        </div>
      </div>
      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <h2 className="text-lg font-bold text-slate-900">Edit Content</h2>
              <button onClick={() => setShowEditModal(false)} className="p-1 hover:bg-slate-100 rounded">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={e => setEditTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Body</label>
                <textarea
                  value={editBody}
                  onChange={e => setEditBody(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm resize-y min-h-[160px] focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Hashtags (comma-separated)</label>
                <input
                  type="text"
                  value={editHashtags}
                  onChange={e => setEditHashtags(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="#marketing, #sales, #AI"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Call to Action</label>
                <input
                  type="text"
                  value={editCallToAction}
                  onChange={e => setEditCallToAction(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Learn more at..."
                />
              </div>
            </div>
            <div className="flex items-center justify-end space-x-3 p-6 border-t border-slate-200">
              <button
                onClick={() => setShowEditModal(false)}
                className="px-4 py-2 border border-slate-200 rounded-lg text-sm hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={isSavingEdit || !editTitle.trim()}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700 disabled:opacity-50 flex items-center space-x-2"
              >
                {isSavingEdit ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                <span>{isSavingEdit ? 'Saving...' : 'Save Changes'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reschedule Modal */}
      {showRescheduleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm mx-4">
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <h2 className="text-lg font-bold text-slate-900">Reschedule Content</h2>
              <button onClick={() => setShowRescheduleModal(false)} className="p-1 hover:bg-slate-100 rounded">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <div className="p-6">
              <label className="block text-sm font-medium text-slate-700 mb-2">New Date & Time</label>
              <input
                type="datetime-local"
                value={rescheduleDate}
                onChange={e => setRescheduleDate(e.target.value)}
                min={new Date().toISOString().slice(0, 16)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
            <div className="flex items-center justify-end space-x-3 p-6 border-t border-slate-200">
              <button
                onClick={() => { setShowRescheduleModal(false); setRescheduleDate('') }}
                className="px-4 py-2 border border-slate-200 rounded-lg text-sm hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleReschedule}
                disabled={isRescheduling || !rescheduleDate}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700 disabled:opacity-50 flex items-center space-x-2"
              >
                {isRescheduling ? <Loader2 className="w-4 h-4 animate-spin" /> : <Calendar className="w-4 h-4" />}
                <span>{isRescheduling ? 'Saving...' : 'Reschedule'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm mx-4">
            <div className="p-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                  <Trash2 className="w-5 h-5 text-red-600" />
                </div>
                <h2 className="text-lg font-bold text-slate-900">Delete Content</h2>
              </div>
              <p className="text-sm text-slate-600 mb-2">
                Are you sure you want to delete <strong>{content.title}</strong>?
              </p>
              <p className="text-sm text-slate-500">This action cannot be undone.</p>
            </div>
            <div className="flex items-center justify-end space-x-3 p-6 border-t border-slate-200">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 border border-slate-200 rounded-lg text-sm hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 disabled:opacity-50 flex items-center space-x-2"
              >
                {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                <span>{isDeleting ? 'Deleting...' : 'Delete'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* YouTube Publish Modal */}
      {showYouTubeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center space-x-3 mb-5">
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                  <Play className="w-5 h-5 text-red-600" />
                </div>
                <h2 className="text-lg font-bold text-slate-900">Publish to YouTube</h2>
              </div>

              {ytResult?.permalink ? (
                <div className="space-y-4">
                  <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                    <p className="text-sm font-medium text-emerald-700">Video published successfully!</p>
                    <a
                      href={ytResult.permalink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-emerald-600 hover:underline flex items-center space-x-1 mt-1"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>{ytResult.permalink}</span>
                    </a>
                  </div>
                  <div className="flex justify-end">
                    <button
                      onClick={() => setShowYouTubeModal(false)}
                      className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm hover:bg-slate-200"
                    >
                      Close
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {ytResult?.error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                      {ytResult.error}
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
                    <input
                      type="text"
                      value={ytTitle}
                      onChange={e => setYtTitle(e.target.value)}
                      maxLength={100}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    />
                    <p className="text-xs text-slate-400 mt-1">{ytTitle.length}/100</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                    <textarea
                      value={ytDescription}
                      onChange={e => setYtDescription(e.target.value)}
                      rows={4}
                      maxLength={5000}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 resize-none"
                    />
                    <p className="text-xs text-slate-400 mt-1">{ytDescription.length}/5000</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Tags (comma-separated)</label>
                    <input
                      type="text"
                      value={ytTags}
                      onChange={e => setYtTags(e.target.value)}
                      placeholder="marketing, ai, content"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Visibility</label>
                    <select
                      value={ytPrivacy}
                      onChange={e => setYtPrivacy(e.target.value as 'private' | 'unlisted' | 'public')}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 bg-white"
                    >
                      <option value="private">Private</option>
                      <option value="unlisted">Unlisted</option>
                      <option value="public">Public</option>
                    </select>
                  </div>

                  <div className="flex items-center justify-end space-x-3 pt-2">
                    <button
                      onClick={() => setShowYouTubeModal(false)}
                      disabled={isYtPublishing}
                      className="px-4 py-2 border border-slate-200 rounded-lg text-sm hover:bg-slate-50 disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleYouTubePublish}
                      disabled={isYtPublishing || !ytTitle.trim()}
                      className="px-6 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 disabled:opacity-50 flex items-center space-x-2"
                    >
                      {isYtPublishing ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Uploading...</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4" />
                          <span>Publish to YouTube</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Inline SVG for Layers icon (not available in lucide-react at this version)
function Layers(props: React.SVGProps<SVGSVGElement>) {
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
