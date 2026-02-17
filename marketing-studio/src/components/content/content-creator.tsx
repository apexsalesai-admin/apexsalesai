'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import NextImage from 'next/image'
import {
  ArrowLeft,
  ArrowRight,
  Youtube,
  Linkedin,
  Twitter,
  Sparkles,
  Image as ImageIcon,
  Video,
  FileText,
  Calendar,
  Clock,
  Send,
  Check,
  Loader2,
  Wand2,
  Copy,
  RotateCcw,
  Zap,
  AlertCircle,
  TrendingUp,
  Target,
  Users,
  BarChart3,
  Smartphone,
  Monitor,
  Sun,
  Moon,
  Hash,
  AtSign,
  Link2,
  Bold,
  Italic,
  List,
  Smile,
  Mic,
  Brain,
  Lightbulb,
  Flame,
  Award,
  MessageSquare,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Star,
  Eye,
  Play,
  X,
  Plus,
  Minus,
  Settings,
  Palette,
  Type,
  Layout,
  Layers,
  Megaphone,
  PenTool,
  BookOpen,
  Gift,
  Rocket,
  Heart
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { MiaCreativeSession } from '@/components/mia/creative/mia-creative-session'
import { MiaChannelPreview } from '@/components/mia/creative/mia-channel-previews'
import type { MiaCreativeResult } from '@/lib/studio/mia-creative-types'
import { ProfileSwitcher } from '@/components/profile/profile-switcher'
import type { CreatorProfile } from '@/lib/studio/creator-profile'
import { IntegrationType } from '@/types'
import { VideoPreviewPlayer } from '@/components/content/video-preview-player'
import type { VideoRenderState } from '@/types/content-draft'
import { createEmptyVideoRenderState } from '@/types/content-draft'

type ContentType = 'post' | 'video' | 'article' | 'thread' | 'story' | 'reel'
type ToneType = 'professional' | 'friendly' | 'bold' | 'educational' | 'witty' | 'inspirational' | 'urgent' | 'storytelling'
type ContentGoal = 'awareness' | 'engagement' | 'leads' | 'sales' | 'education' | 'community'
type VideoLength = 'short' | 'medium' | 'long'
type ContentStyle = 'minimal' | 'detailed' | 'listicle' | 'storytelling' | 'data-driven'

interface ContentDraft {
  channels: IntegrationType[]
  contentType: ContentType
  title: string
  body: string
  hashtags: string[]
  callToAction: string
  media: string[]
  scheduledFor: Date | null
  publishImmediately: boolean
  variations: { channel: string; title: string; body: string }[]
  // Video-specific fields
  videoScript?: string
  videoHook?: string
  thumbnailIdeas?: string[]
  timestamps?: { time: string; label: string }[]
  bRollSuggestions?: string[]
}

interface GuidanceTip {
  id: string
  type: 'tip' | 'warning' | 'suggestion' | 'best-practice'
  title: string
  message: string
  action?: { label: string; onClick: () => void }
}

interface AIProvider {
  id: string
  name: string
  description: string
  icon: typeof Sparkles
  available: boolean
  models: { id: string; name: string; description: string }[]
}

const VIDEO_LENGTHS: { id: VideoLength; name: string; duration: string; description: string }[] = [
  { id: 'short', name: 'Short', duration: '15-60s', description: 'TikTok, Reels, Shorts' },
  { id: 'medium', name: 'Medium', duration: '2-5 min', description: 'Explainers, tutorials' },
  { id: 'long', name: 'Long', duration: '10+ min', description: 'Deep dives, podcasts' },
]

const CONTENT_STYLES: { id: ContentStyle; name: string; description: string; icon: typeof FileText }[] = [
  { id: 'minimal', name: 'Minimal', description: 'Clean, concise, impactful', icon: Minus },
  { id: 'detailed', name: 'Detailed', description: 'Comprehensive coverage', icon: FileText },
  { id: 'listicle', name: 'Listicle', description: 'Numbered points, scannable', icon: List },
  { id: 'storytelling', name: 'Narrative', description: 'Story-driven, personal', icon: BookOpen },
  { id: 'data-driven', name: 'Data-Driven', description: 'Stats, facts, research', icon: BarChart3 },
]

const AI_PROVIDERS: AIProvider[] = [
  {
    id: 'anthropic',
    name: 'Anthropic',
    description: 'Claude AI - Nuanced, thoughtful content',
    icon: Brain,
    available: true,
    models: [
      { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4', description: 'Balanced performance' },
      { id: 'claude-opus-4-20250514', name: 'Claude Opus 4', description: 'Most capable' },
    ]
  },
  {
    id: 'openai',
    name: 'OpenAI',
    description: 'GPT-4 - Creative, diverse outputs',
    icon: Zap,
    available: true,
    models: [
      { id: 'gpt-4o', name: 'GPT-4o', description: 'Latest multimodal' },
      { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', description: 'Fast & capable' },
    ]
  },
  {
    id: 'google',
    name: 'Google',
    description: 'Gemini - Multimodal AI',
    icon: Sparkles,
    available: true,
    models: [
      { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', description: 'Fast & capable' },
      { id: 'gemini-2.5-pro-preview-05-06', name: 'Gemini 2.5 Pro', description: 'Most capable' },
    ]
  },
]

interface SeoAnalysis {
  score: number
  readability: number
  keywordDensity: number
  headlineScore: number
  suggestions: string[]
  metaDescription: string
}

interface GeneratedContent {
  title: string
  body: string
  hashtags: string[]
  callToAction: string
  variations: { channel: string; title: string; body: string }[]
  seoAnalysis?: SeoAnalysis
}

type AIModel = 'auto' | 'claude' | 'gpt4'

const AI_MODELS = [
  { id: 'auto' as AIModel, name: 'Auto (Best Available)', description: 'Tries Claude first, falls back to GPT-4', icon: Sparkles },
  { id: 'claude' as AIModel, name: 'Claude (Anthropic)', description: 'Best for nuanced, thoughtful content', icon: Brain },
  { id: 'gpt4' as AIModel, name: 'GPT-4 (OpenAI)', description: 'Best for creative, diverse outputs', icon: Zap },
]

interface ContentScore {
  overall: number
  engagement: number
  clarity: number
  emotion: number
  cta: number
}

const CHANNELS = [
  { id: 'YOUTUBE' as IntegrationType, name: 'YouTube', icon: Youtube, color: 'bg-red-500', gradient: 'from-red-500 to-red-600', charLimit: 5000, types: ['video'] },
  { id: 'LINKEDIN' as IntegrationType, name: 'LinkedIn', icon: Linkedin, color: 'bg-blue-600', gradient: 'from-blue-600 to-blue-700', charLimit: 3000, types: ['post', 'article'] },
  { id: 'X_TWITTER' as IntegrationType, name: 'X (Twitter)', icon: Twitter, color: 'bg-slate-900', gradient: 'from-slate-800 to-slate-900', charLimit: 280, types: ['post', 'thread'] },
  { id: 'TIKTOK' as IntegrationType, name: 'TikTok', icon: Video, color: 'bg-pink-600', gradient: 'from-pink-500 to-purple-600', charLimit: 2200, types: ['video', 'reel'] },
]

const CONTENT_TYPES = [
  { id: 'post' as ContentType, name: 'Post', icon: FileText, description: 'Short-form social content', color: 'from-blue-500 to-cyan-500' },
  { id: 'video' as ContentType, name: 'Video', icon: Video, description: 'Video with title & description', color: 'from-red-500 to-orange-500' },
  { id: 'article' as ContentType, name: 'Article', icon: BookOpen, description: 'Long-form blog content', color: 'from-emerald-500 to-teal-500' },
  { id: 'thread' as ContentType, name: 'Thread', icon: Layers, description: 'Multi-part connected posts', color: 'from-purple-500 to-pink-500' },
  { id: 'story' as ContentType, name: 'Story', icon: Flame, description: '24-hour ephemeral content', color: 'from-amber-500 to-orange-500' },
  { id: 'reel' as ContentType, name: 'Reel', icon: Play, description: 'Short-form vertical video', color: 'from-pink-500 to-rose-500' },
]

const AI_TONES = [
  { id: 'professional' as ToneType, name: 'Professional', emoji: '💼', description: 'Formal, business-focused', color: 'from-slate-600 to-slate-700' },
  { id: 'friendly' as ToneType, name: 'Friendly', emoji: '😊', description: 'Warm, approachable', color: 'from-amber-400 to-orange-500' },
  { id: 'bold' as ToneType, name: 'Bold', emoji: '🔥', description: 'Confident, attention-grabbing', color: 'from-red-500 to-orange-500' },
  { id: 'educational' as ToneType, name: 'Educational', emoji: '📚', description: 'Informative, helpful', color: 'from-blue-500 to-indigo-500' },
  { id: 'witty' as ToneType, name: 'Witty', emoji: '✨', description: 'Clever, engaging', color: 'from-purple-500 to-pink-500' },
  { id: 'inspirational' as ToneType, name: 'Inspirational', emoji: '🚀', description: 'Motivating, uplifting', color: 'from-emerald-500 to-teal-500' },
  { id: 'urgent' as ToneType, name: 'Urgent', emoji: '⚡', description: 'Time-sensitive, action-driven', color: 'from-rose-500 to-red-600' },
  { id: 'storytelling' as ToneType, name: 'Story', emoji: '📖', description: 'Narrative, personal', color: 'from-violet-500 to-purple-600' },
]

const CONTENT_GOALS = [
  { id: 'awareness' as ContentGoal, name: 'Brand Awareness', icon: Megaphone, description: 'Reach new audiences' },
  { id: 'engagement' as ContentGoal, name: 'Engagement', icon: MessageSquare, description: 'Spark conversations' },
  { id: 'leads' as ContentGoal, name: 'Lead Generation', icon: Target, description: 'Capture interest' },
  { id: 'sales' as ContentGoal, name: 'Drive Sales', icon: TrendingUp, description: 'Convert to customers' },
  { id: 'education' as ContentGoal, name: 'Educate', icon: BookOpen, description: 'Share knowledge' },
  { id: 'community' as ContentGoal, name: 'Community', icon: Users, description: 'Build relationships' },
]

const CONTENT_TEMPLATES = [
  { id: 'announcement', name: 'Product Announcement', icon: Rocket, prompt: 'Announce a new product or feature' },
  { id: 'tips', name: 'Tips & Tricks', icon: Lightbulb, prompt: 'Share valuable tips with your audience' },
  { id: 'behind-scenes', name: 'Behind the Scenes', icon: Eye, prompt: 'Show your company culture or process' },
  { id: 'case-study', name: 'Case Study', icon: Award, prompt: 'Share a customer success story' },
  { id: 'question', name: 'Engagement Question', icon: MessageSquare, prompt: 'Ask a thought-provoking question' },
  { id: 'celebration', name: 'Celebration', icon: Gift, prompt: 'Celebrate a milestone or achievement' },
]

interface ContentCreatorProps {
  initialDate?: Date
  onSave?: (draft: ContentDraft & { aiGenerated?: boolean; aiTopic?: string; aiTone?: string }) => void
  onCancel?: () => void
  isSaving?: boolean
}

export function ContentCreator({ initialDate, onSave, onCancel, isSaving = false }: ContentCreatorProps) {
  const [step, setStep] = useState(1)
  const [draft, setDraft] = useState<ContentDraft>({
    channels: [],
    contentType: 'post',
    title: '',
    body: '',
    hashtags: [],
    callToAction: '',
    media: [],
    scheduledFor: initialDate || null,
    publishImmediately: false,
    variations: [],
  })

  // AI Generation State
  const [isGenerating, setIsGenerating] = useState(false)
  const [aiTopic, setAiTopic] = useState('')
  const [aiTones, setAiTones] = useState<ToneType[]>(['professional']) // Multi-select tones
  const [contentGoal, setContentGoal] = useState<ContentGoal>('engagement')
  const [contentStyle, setContentStyle] = useState<ContentStyle>('detailed')
  const [aiContext, setAiContext] = useState('')
  const [generationError, setGenerationError] = useState<string | null>(null)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [generationCount, setGenerationCount] = useState(0)
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null)
  const [selectedProvider, setSelectedProvider] = useState<string>('anthropic')
  const [selectedModel, setSelectedModel] = useState<string>('claude-sonnet-4-20250514')
  const [usedModel, setUsedModel] = useState<string | null>(null)

  // Mia Creative Mode
  const [miaCreativeMode, setMiaCreativeMode] = useState(true)

  // Creator Profile
  const [activeProfile, setActiveProfile] = useState<CreatorProfile | null>(null)

  // Fetch default profile on mount
  useEffect(() => {
    fetch('/api/studio/profile')
      .then((res) => res.json())
      .then((data) => {
        const profiles = data.profiles || []
        const defaultProfile = profiles.find((p: CreatorProfile) => p.isDefault) || profiles[0] || null
        setActiveProfile(defaultProfile)
      })
      .catch(() => {})
  }, [])

  // Video-specific State
  const [videoLength, setVideoLength] = useState<VideoLength>('medium')
  const [generateScript, setGenerateScript] = useState(true)
  const [generateThumbnails, setGenerateThumbnails] = useState(true)
  const [generateTimestamps, setGenerateTimestamps] = useState(true)

  // Guidance State
  const [guidanceTips, setGuidanceTips] = useState<GuidanceTip[]>([])
  const [showGuidance, setShowGuidance] = useState(true)
  const [currentGuidanceStep, setCurrentGuidanceStep] = useState(0)

  // SEO & Marketing State
  const [seoKeywords, setSeoKeywords] = useState<string[]>([])
  const [newKeyword, setNewKeyword] = useState('')
  const [targetAudience, setTargetAudience] = useState('')
  const [seoAnalysis, setSeoAnalysis] = useState<SeoAnalysis | null>(null)
  const [showSeoPanel, setShowSeoPanel] = useState(false)
  const [campaignName, setCampaignName] = useState('')
  const [utmSource, setUtmSource] = useState('')
  const [utmMedium, setUtmMedium] = useState('')
  const [utmCampaign, setUtmCampaign] = useState('')

  // AI Chat Refinement
  const [showAiChat, setShowAiChat] = useState(false)
  const [aiChatInput, setAiChatInput] = useState('')
  const [aiChatHistory, setAiChatHistory] = useState<{ role: 'user' | 'assistant'; content: string }[]>([])
  const [isRefining, setIsRefining] = useState(false)

  // Content Score
  const [contentScore, setContentScore] = useState<ContentScore | null>(null)
  const [isScoring, setIsScoring] = useState(false)

  // Preview State
  const [activePreviewChannel, setActivePreviewChannel] = useState<string | null>(null)

  // Channel Adaptation State
  const [isAdapting, setIsAdapting] = useState(false)

  // Script Analysis State
  const [scriptAnalysis, setScriptAnalysis] = useState<Record<string, unknown> | null>(null)
  const [isAnalyzingScript, setIsAnalyzingScript] = useState(false)

  // Video Render & Media Upload State
  const [videoRenderState, setVideoRenderState] = useState<VideoRenderState>(createEmptyVideoRenderState())
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [textOnlyPublish, setTextOnlyPublish] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop')
  const [previewTheme, setPreviewTheme] = useState<'light' | 'dark'>('light')

  // Optimal Times
  const [optimalTimes, setOptimalTimes] = useState<{ day: string; time: string; score: number }[]>([])

  const totalSteps = 4
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const calculateContentScore = useCallback(async () => {
    setIsScoring(true)
    // Simulate AI scoring
    await new Promise(r => setTimeout(r, 500))

    // Check for common emojis using surrogate pair detection
    const hasEmoji = /[\uD83C-\uDBFF\uDC00-\uDFFF]+/.test(draft.body)
    const hasQuestion = draft.body.includes('?')
    const hasCTA = draft.callToAction.length > 0 || /click|learn|discover|try|get|start/i.test(draft.body)
    const hasHashtags = draft.hashtags.length > 0
    const wordCount = draft.body.split(/\s+/).length
    const optimalLength = wordCount >= 50 && wordCount <= 300

    const tone = aiTones[0]
    const engagement = Math.min(100, 40 + (hasEmoji ? 15 : 0) + (hasQuestion ? 20 : 0) + (hasHashtags ? 15 : 0) + (optimalLength ? 10 : 0))
    const clarity = Math.min(100, 50 + (wordCount < 500 ? 25 : 0) + (draft.title.length > 0 ? 25 : 0))
    const emotion = Math.min(100, 30 + (hasEmoji ? 30 : 0) + (/!/.test(draft.body) ? 20 : 0) + (AI_TONES.find(t => t.id === tone)?.id === 'bold' ? 20 : 0))
    const cta = hasCTA ? 85 : 40
    const overall = Math.round((engagement + clarity + emotion + cta) / 4)

    setContentScore({ overall, engagement, clarity, emotion, cta })
    setIsScoring(false)
  }, [draft.body, draft.title, draft.hashtags, draft.callToAction, aiTones])

  // Calculate content score when body changes
  useEffect(() => {
    if (draft.body.length > 50) {
      calculateContentScore()
    } else {
      setContentScore(null)
    }
  }, [draft.body, calculateContentScore])

  // Set initial preview channel when channels are selected
  useEffect(() => {
    if (draft.channels.length > 0 && !activePreviewChannel) {
      setActivePreviewChannel(draft.channels[0])
    }
  }, [draft.channels, activePreviewChannel])

  // Generate optimal posting times
  useEffect(() => {
    if (draft.channels.length > 0) {
      generateOptimalTimes()
    }
  }, [draft.channels])

  const generateOptimalTimes = () => {
    const times = [
      { day: 'Tuesday', time: '10:00 AM', score: 95 },
      { day: 'Wednesday', time: '2:00 PM', score: 88 },
      { day: 'Thursday', time: '9:00 AM', score: 82 },
      { day: 'Monday', time: '11:00 AM', score: 78 },
      { day: 'Friday', time: '3:00 PM', score: 72 },
    ]
    setOptimalTimes(times)
  }

  // Generate contextual guidance tips based on current state
  const generateGuidanceTips = useCallback(() => {
    const tips: GuidanceTip[] = []

    // Channel-specific tips
    if (draft.channels.includes('X_TWITTER' as IntegrationType)) {
      tips.push({
        id: 'twitter-hook',
        type: 'tip',
        title: 'X/Twitter Best Practice',
        message: 'Start with a bold hook - your first 7 words determine if people read more. Questions and contrarian takes perform best.',
      })
    }

    if (draft.channels.includes('LINKEDIN' as IntegrationType)) {
      tips.push({
        id: 'linkedin-format',
        type: 'tip',
        title: 'LinkedIn Formatting',
        message: 'Use line breaks after every 1-2 sentences. Posts with 1,200-1,500 characters get the most engagement.',
      })
    }

    if (draft.channels.includes('YOUTUBE' as IntegrationType)) {
      tips.push({
        id: 'youtube-seo',
        type: 'best-practice',
        title: 'YouTube SEO',
        message: 'Include your main keyword in the title, first 100 characters of description, and as a hashtag.',
      })
    }

    // Content type tips
    if (draft.contentType === 'video') {
      tips.push({
        id: 'video-hook',
        type: 'suggestion',
        title: 'Video Hook',
        message: 'The first 3 seconds are critical. Lead with a question, surprising fact, or bold statement.',
      })
    }

    // Tone combination tips
    if (aiTones.length > 2) {
      tips.push({
        id: 'tone-warning',
        type: 'warning',
        title: 'Tone Overload',
        message: 'Using more than 2 tones can make content feel inconsistent. Consider focusing on 1-2 primary tones.',
      })
    }

    // Goal-specific tips
    if (contentGoal === 'leads') {
      tips.push({
        id: 'lead-magnet',
        type: 'suggestion',
        title: 'Lead Generation',
        message: 'Offer value first (free guide, template, checklist) before asking for contact info. This increases conversion by 3x.',
      })
    }

    setGuidanceTips(tips)
  }, [draft.channels, draft.contentType, aiTones, contentGoal])

  // Update guidance when relevant state changes
  useEffect(() => {
    generateGuidanceTips()
  }, [generateGuidanceTips])

  // Toggle tone (multi-select)
  const toggleTone = (tone: ToneType) => {
    setAiTones(prev => {
      if (prev.includes(tone)) {
        // Don't allow empty selection
        if (prev.length === 1) return prev
        return prev.filter(t => t !== tone)
      }
      // Max 3 tones
      if (prev.length >= 3) {
        return [...prev.slice(1), tone]
      }
      return [...prev, tone]
    })
  }

  // Get combined tone description
  const getCombinedToneDescription = () => {
    if (aiTones.length === 1) {
      return AI_TONES.find(t => t.id === aiTones[0])?.description || ''
    }
    const toneNames = aiTones.map(t => AI_TONES.find(tone => tone.id === t)?.name || t)
    return `A blend of ${toneNames.join(' + ')} voices`
  }

  // Backward compatibility - primary tone for functions that expect single tone
  const aiTone = aiTones[0]

  const isVideoContent = draft.contentType === 'video' || draft.contentType === 'reel'

  const canProceed = () => {
    switch (step) {
      case 1: return draft.channels.length > 0
      case 2: return draft.title.trim() !== '' && draft.body.trim() !== ''
      case 3: return true
      case 4: {
        const hasSchedule = draft.publishImmediately || draft.scheduledFor !== null
        if (!hasSchedule) return false
        // Video/reel must have render READY unless user opts for text-only
        if (isVideoContent && !textOnlyPublish && videoRenderState.status !== 'READY') return false
        return true
      }
      default: return false
    }
  }

  // Auto-save draft ID for persistence across step transitions
  const [draftId, setDraftId] = useState<string | null>(null)
  const [isSavingDraft, setIsSavingDraft] = useState(false)

  const saveDraft = async () => {
    const payload = {
      title: draft.title || 'Untitled Draft',
      body: draft.body,
      contentType: draft.contentType,
      channels: draft.channels.map(c => c.toString()),
      hashtags: draft.hashtags,
      callToAction: draft.callToAction,
      status: 'DRAFT',
    }
    try {
      setIsSavingDraft(true)
      if (draftId) {
        await fetch(`/api/content/${draftId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      } else {
        const res = await fetch('/api/content', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        const data = await res.json()
        if (data.success && data.data?.id) {
          setDraftId(data.data.id)
        }
      }
    } catch (err) {
      console.error('[ContentCreator] Draft save failed:', err)
    } finally {
      setIsSavingDraft(false)
    }
  }

  const handleNext = async () => {
    if (step < totalSteps && canProceed()) {
      // Auto-save draft when advancing to Preview (step 3)
      if (step === 2) {
        await saveDraft()
      }
      setStep(step + 1)
    }
  }

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1)
    }
  }

  const handleSubmit = () => {
    if (onSave) {
      onSave({
        ...draft,
        channels: draft.channels.map(c => c.toString()),
        aiGenerated: generationCount > 0,
        aiTopic: generationCount > 0 ? aiTopic : undefined,
        aiTone: generationCount > 0 ? aiTone : undefined,
      } as ContentDraft & { aiGenerated?: boolean; aiTopic?: string; aiTone?: string })
    }
  }

  const toggleChannel = (channelId: IntegrationType) => {
    setDraft(prev => ({
      ...prev,
      channels: prev.channels.includes(channelId)
        ? prev.channels.filter(c => c !== channelId)
        : [...prev.channels, channelId]
    }))
  }

  const generateWithAI = async () => {
    if (!aiTopic.trim()) return

    setIsGenerating(true)
    setGenerationError(null)

    try {
      // Determine model based on provider selection
      const modelParam = selectedProvider === 'anthropic' ? 'claude'
        : selectedProvider === 'google' ? 'gemini'
        : 'gpt4'

      // Build video-specific context if applicable
      let videoContext = ''
      if (draft.contentType === 'video' || draft.contentType === 'reel') {
        videoContext = `\n\nVideo Requirements:
- Length: ${VIDEO_LENGTHS.find(v => v.id === videoLength)?.duration || 'medium'}
${generateScript ? '- Include a detailed video script with scene directions' : ''}
${generateThumbnails ? '- Suggest 3 thumbnail ideas with text overlays' : ''}
${generateTimestamps ? '- Include timestamps/chapters for the video' : ''}
- Include hook for first 3 seconds
- Suggest B-roll footage ideas`
      }

      // Build tone string for multi-tone
      const toneString = aiTones.length === 1
        ? aiTones[0]
        : `a blend of ${aiTones.join(' and ')} tones`

      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: aiTopic,
          tone: toneString,
          tones: aiTones, // Send array for backend processing
          channels: draft.channels,
          contentType: draft.contentType,
          contentStyle: contentStyle,
          goal: contentGoal,
          template: selectedTemplate,
          additionalContext: aiContext + videoContext,
          model: modelParam,
          seoKeywords: seoKeywords,
          targetAudience: targetAudience,
          includeSeoAnalysis: true,
          videoOptions: draft.contentType === 'video' || draft.contentType === 'reel' ? {
            length: videoLength,
            generateScript,
            generateThumbnails,
            generateTimestamps,
          } : undefined,
        }),
      })

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || 'Generation failed')
      }

      const content: GeneratedContent = data.content

      setDraft(prev => ({
        ...prev,
        title: content.title || prev.title || aiTopic,
        body: content.body,
        hashtags: content.hashtags || [],
        callToAction: content.callToAction || '',
        variations: content.variations || [],
        // Video-specific content would be parsed here
        videoScript: (content as any).videoScript,
        videoHook: (content as any).videoHook,
        thumbnailIdeas: (content as any).thumbnailIdeas,
        timestamps: (content as any).timestamps,
        bRollSuggestions: (content as any).bRollSuggestions,
      }))

      // Set SEO analysis if available
      if (content.seoAnalysis) {
        setSeoAnalysis(content.seoAnalysis)
        setShowSeoPanel(true)
      }

      // Track which model was used
      if (data.model) {
        setUsedModel(data.model)
      }

      setGenerationCount(prev => prev + 1)
      setShowAiChat(true)

      const toneDisplay = aiTones.length === 1
        ? aiTones[0]
        : aiTones.join(' + ')

      setAiChatHistory([
        { role: 'assistant', content: `I've created your ${draft.contentType} about "${aiTopic}" with a ${toneDisplay} tone using ${data.model || 'AI'}.\n\nWould you like me to adjust anything? You can ask me to:\n\n• Make it shorter or longer\n• Adjust the tone balance\n• Add specific points or statistics\n• Make it more engaging or provocative\n• Strengthen the call-to-action\n• Optimize for specific keywords\n• ${draft.contentType === 'video' ? 'Refine the script or hook' : 'Add more examples'}` }
      ])
    } catch (error) {
      console.error('Generation error:', error)
      setGenerationError(error instanceof Error ? error.message : 'Failed to generate content')
    } finally {
      setIsGenerating(false)
    }
  }

  const addKeyword = () => {
    if (newKeyword.trim() && !seoKeywords.includes(newKeyword.trim())) {
      setSeoKeywords([...seoKeywords, newKeyword.trim()])
      setNewKeyword('')
    }
  }

  const removeKeyword = (keyword: string) => {
    setSeoKeywords(seoKeywords.filter(k => k !== keyword))
  }

  const generateUtmLink = (baseUrl: string = 'https://lyfye.com') => {
    const params = new URLSearchParams()
    if (utmSource) params.set('utm_source', utmSource)
    if (utmMedium) params.set('utm_medium', utmMedium)
    if (utmCampaign) params.set('utm_campaign', utmCampaign)
    return `${baseUrl}?${params.toString()}`
  }

  const refineWithAI = async () => {
    if (!aiChatInput.trim()) return

    const userMessage = aiChatInput
    setAiChatInput('')
    setAiChatHistory(prev => [...prev, { role: 'user', content: userMessage }])
    setIsRefining(true)

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: aiTopic,
          tone: aiTone,
          channels: draft.channels,
          contentType: draft.contentType,
          currentContent: { title: draft.title, body: draft.body },
          refinementRequest: userMessage,
          additionalContext: `Current content to refine:\nTitle: ${draft.title}\nBody: ${draft.body}\n\nUser request: ${userMessage}`,
        }),
      })

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || 'Refinement failed')
      }

      const content: GeneratedContent = data.content

      setDraft(prev => ({
        ...prev,
        title: content.title,
        body: content.body,
        hashtags: content.hashtags || prev.hashtags,
        callToAction: content.callToAction || prev.callToAction,
      }))

      setAiChatHistory(prev => [...prev, { role: 'assistant', content: `Done! I've updated the content based on your request. Here's what I changed:\n\n${content.title !== draft.title ? '• Updated the title\n' : ''}${content.body !== draft.body ? '• Revised the body text\n' : ''}\nAnything else you'd like me to adjust?` }])
    } catch (error) {
      console.error('Refinement error:', error)
      setAiChatHistory(prev => [...prev, { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' }])
    } finally {
      setIsRefining(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  const getVariationForChannel = (channelId: string) => {
    return draft.variations.find(v => v.channel === channelId)
  }

  const getCharacterLimit = (channelId: string): number => {
    return CHANNELS.find(c => c.id === channelId)?.charLimit || 5000
  }

  // Adapt content for all selected channels via AI
  const adaptForChannels = async (contentId: string) => {
    if (isAdapting || draft.channels.length === 0) return
    setIsAdapting(true)
    try {
      // Map IntegrationType to platform registry keys
      const platformMap: Record<string, string> = {
        LINKEDIN: 'linkedin', YOUTUBE: 'youtube', X_TWITTER: 'x',
        FACEBOOK: 'facebook', TIKTOK: 'tiktok', INSTAGRAM: 'instagram',
      }
      const platforms = draft.channels
        .map(ch => platformMap[ch] || ch.toLowerCase())
        .filter(Boolean)

      const res = await fetch('/api/studio/publish/adapt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contentId, platforms }),
      })
      const data = await res.json()
      if (data.success && data.adaptations) {
        const newVariations = data.adaptations.map((a: { platform: string; title: string | null; body: string }) => ({
          channel: a.platform.toUpperCase(),
          title: a.title || draft.title,
          body: a.body,
        }))
        setDraft(prev => ({ ...prev, variations: newVariations }))
      }
    } catch (err) {
      console.error('[ContentCreator] Adapt failed:', err)
    } finally {
      setIsAdapting(false)
    }
  }

  // Analyze video script via AI
  const analyzeScript = async () => {
    const script = draft.videoScript || draft.body
    if (!script?.trim() || isAnalyzingScript) return
    setIsAnalyzingScript(true)
    setScriptAnalysis(null)
    try {
      const res = await fetch('/api/studio/mia/analyze-script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          script,
          platform: draft.channels[0] || 'youtube',
          duration: draft.contentType === 'reel' ? 15 : 30,
        }),
      })
      const data = await res.json()
      if (data.success) setScriptAnalysis(data.analysis)
    } catch (err) {
      console.error('[ContentCreator] Script analysis failed:', err)
    } finally {
      setIsAnalyzingScript(false)
    }
  }

  const insertAtCursor = (text: string) => {
    if (textareaRef.current) {
      const start = textareaRef.current.selectionStart
      const end = textareaRef.current.selectionEnd
      const newBody = draft.body.substring(0, start) + text + draft.body.substring(end)
      setDraft(prev => ({ ...prev, body: newBody }))
    }
  }

  return (
    <div className="max-w-5xl mx-auto">
      {/* Premium Header */}
      <div className="mb-8 text-center">
        <div className="inline-flex items-center space-x-2 px-4 py-2 rounded-full bg-gradient-to-r from-apex-primary/10 to-purple-500/10 border border-apex-primary/20 mb-4">
          <Sparkles className="w-4 h-4 text-apex-primary" />
          <span className="text-sm font-medium text-apex-primary">AI-Powered Content Studio</span>
        </div>
      </div>

      {/* Progress Bar - Premium Design */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {['Select Channels', 'Create with AI', 'Preview & Score', 'Schedule'].map((label, index) => (
            <div key={label} className="flex items-center flex-1">
              <div className="flex flex-col items-center">
                <div className={cn(
                  'w-12 h-12 rounded-2xl flex items-center justify-center text-sm font-bold transition-all duration-500 shadow-lg',
                  step > index + 1 && 'bg-gradient-to-br from-apex-primary to-emerald-500 text-white shadow-apex-primary/30',
                  step === index + 1 && 'bg-gradient-to-br from-apex-primary to-purple-500 text-white ring-4 ring-apex-primary/20 shadow-apex-primary/40 scale-110',
                  step < index + 1 && 'bg-slate-100 text-slate-400'
                )}>
                  {step > index + 1 ? <Check className="w-6 h-6" /> : index + 1}
                </div>
                <span className={cn(
                  'mt-3 text-sm font-medium transition-colors',
                  step === index + 1 ? 'text-apex-primary' : 'text-slate-400'
                )}>
                  {label}
                </span>
              </div>
              {index < 3 && (
                <div className="flex-1 h-1 mx-4 rounded-full overflow-hidden bg-slate-200">
                  <div
                    className={cn(
                      'h-full bg-gradient-to-r from-apex-primary to-purple-500 transition-all duration-500',
                      step > index + 1 ? 'w-full' : 'w-0'
                    )}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Step Content */}
      <div className="relative">
        {/* Glassmorphism card */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/80 to-white/40 backdrop-blur-xl rounded-3xl" />
        <div className="relative card shadow-2xl border-0 rounded-3xl overflow-hidden">
          {/* Gradient border effect */}
          <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-apex-primary/20 via-transparent to-purple-500/20 pointer-events-none" />

          <div className="relative p-8">
            {/* Step 1: Select Channels */}
            {step === 1 && (
              <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-apex-primary via-purple-500 to-pink-500 mb-6 shadow-2xl shadow-purple-500/30">
                    <Zap className="w-10 h-10 text-white" />
                  </div>
                  <h2 className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
                    Where will your content shine?
                  </h2>
                  <p className="text-slate-500 mt-3 text-lg">Select your target platforms for maximum impact</p>
                </div>

                {/* Creator Profile Switcher */}
                <div className="max-w-xs mx-auto">
                  <ProfileSwitcher
                    activeProfile={activeProfile}
                    onSwitch={(p) => setActiveProfile(p)}
                  />
                </div>

                {/* Channel Selection - Premium Cards */}
                <div className="grid grid-cols-2 gap-5">
                  {CHANNELS.map(channel => {
                    const Icon = channel.icon
                    const isSelected = draft.channels.includes(channel.id)
                    return (
                      <button
                        key={channel.id}
                        onClick={() => toggleChannel(channel.id)}
                        className={cn(
                          'group relative p-6 rounded-2xl border-2 transition-all duration-300 text-left overflow-hidden',
                          isSelected
                            ? 'border-transparent shadow-xl scale-[1.02]'
                            : 'border-slate-200 hover:border-slate-300 hover:shadow-lg hover:scale-[1.01]'
                        )}
                      >
                        {/* Background gradient when selected */}
                        {isSelected && (
                          <div className={cn('absolute inset-0 bg-gradient-to-br opacity-10', channel.gradient)} />
                        )}

                        {/* Selection indicator */}
                        {isSelected && (
                          <div className="absolute top-4 right-4">
                            <div className={cn('w-7 h-7 rounded-full bg-gradient-to-br flex items-center justify-center shadow-lg', channel.gradient)}>
                              <Check className="w-4 h-4 text-white" />
                            </div>
                          </div>
                        )}

                        <div className="relative">
                          <div className={cn(
                            'w-16 h-16 rounded-2xl flex items-center justify-center text-white mb-5 transition-all duration-300 shadow-lg',
                            `bg-gradient-to-br ${channel.gradient}`,
                            isSelected && 'shadow-xl scale-110'
                          )}>
                            <Icon className="w-8 h-8" />
                          </div>
                          <p className="font-bold text-xl text-slate-900">{channel.name}</p>
                          <p className="text-sm text-slate-500 mt-2">
                            {channel.types.map(t => t.charAt(0).toUpperCase() + t.slice(1)).join(' • ')}
                          </p>
                          <p className="text-xs text-slate-400 mt-2">
                            Up to {channel.charLimit.toLocaleString()} characters
                          </p>
                        </div>
                      </button>
                    )
                  })}
                </div>

                {/* Content Type Selection */}
                {draft.channels.length > 0 && (
                  <div className="pt-8 border-t border-slate-100 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <label className="block text-lg font-bold text-slate-900 mb-4">What type of content?</label>
                    <div className="grid grid-cols-3 gap-4">
                      {CONTENT_TYPES.map(type => {
                        const Icon = type.icon
                        return (
                          <button
                            key={type.id}
                            onClick={() => setDraft(prev => ({ ...prev, contentType: type.id }))}
                            className={cn(
                              'relative p-5 rounded-2xl border-2 text-center transition-all duration-300 overflow-hidden',
                              draft.contentType === type.id
                                ? 'border-transparent shadow-xl scale-[1.02]'
                                : 'border-slate-200 hover:border-slate-300 hover:shadow-md'
                            )}
                          >
                            {draft.contentType === type.id && (
                              <div className={cn('absolute inset-0 bg-gradient-to-br opacity-10', type.color)} />
                            )}
                            <div className="relative">
                              <div className={cn(
                                'w-12 h-12 rounded-xl mx-auto mb-3 flex items-center justify-center transition-all',
                                draft.contentType === type.id
                                  ? `bg-gradient-to-br ${type.color} text-white shadow-lg`
                                  : 'bg-slate-100 text-slate-500'
                              )}>
                                <Icon className="w-6 h-6" />
                              </div>
                              <p className="font-bold text-slate-900">{type.name}</p>
                              <p className="text-xs text-slate-500 mt-1">{type.description}</p>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Content Goal Selection */}
                {draft.channels.length > 0 && (
                  <div className="pt-6 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100">
                    <label className="block text-lg font-bold text-slate-900 mb-4">What&apos;s your goal?</label>
                    <div className="grid grid-cols-3 gap-3">
                      {CONTENT_GOALS.map(goal => {
                        const Icon = goal.icon
                        return (
                          <button
                            key={goal.id}
                            onClick={() => setContentGoal(goal.id)}
                            className={cn(
                              'p-4 rounded-xl border-2 text-left transition-all duration-200',
                              contentGoal === goal.id
                                ? 'border-apex-primary bg-apex-primary/5 shadow-md'
                                : 'border-slate-200 hover:border-slate-300'
                            )}
                          >
                            <div className="flex items-center space-x-3">
                              <Icon className={cn(
                                'w-5 h-5',
                                contentGoal === goal.id ? 'text-apex-primary' : 'text-slate-400'
                              )} />
                              <div>
                                <p className="font-semibold text-sm text-slate-900">{goal.name}</p>
                                <p className="text-xs text-slate-500">{goal.description}</p>
                              </div>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Channel Strategy Recommendations */}
                {draft.channels.length > 0 && (
                  <div className="pt-6 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-200">
                    <div className="p-6 bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 rounded-2xl border border-indigo-200">
                      <div className="flex items-center space-x-3 mb-4">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
                          <Lightbulb className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-900">Mia&apos;s Strategy Recommendation</h4>
                          <p className="text-xs text-slate-500">Based on your selected channels & goal</p>
                        </div>
                      </div>

                      <div className="space-y-3">
                        {/* Cross-platform tip */}
                        {draft.channels.length > 1 && (
                          <div className="flex items-start space-x-3 p-3 bg-white rounded-xl">
                            <Layers className="w-4 h-4 text-purple-600 mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="text-sm font-medium text-slate-900">Multi-Platform Strategy</p>
                              <p className="text-xs text-slate-600 mt-1">
                                I&apos;ll create unique variations for each platform while keeping your core message consistent. Cross-posting identical content reduces engagement by up to 40%.
                              </p>
                            </div>
                          </div>
                        )}

                        {/* LinkedIn specific */}
                        {draft.channels.includes('LINKEDIN' as IntegrationType) && (
                          <div className="flex items-start space-x-3 p-3 bg-white rounded-xl">
                            <Linkedin className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="text-sm font-medium text-slate-900">LinkedIn Best Time: Tue-Thu, 8-10 AM</p>
                              <p className="text-xs text-slate-600 mt-1">
                                {contentGoal === 'leads' ? 'Lead gen posts perform best with a soft CTA and value-first approach. Include a link in comments, not the post.' :
                                 contentGoal === 'engagement' ? 'Questions and contrarian takes drive 2x more comments. Use personal stories.' :
                                 'Long-form posts (1,200+ characters) get 3x more reach than short updates.'}
                              </p>
                            </div>
                          </div>
                        )}

                        {/* YouTube specific */}
                        {draft.channels.includes('YOUTUBE' as IntegrationType) && (
                          <div className="flex items-start space-x-3 p-3 bg-white rounded-xl">
                            <Youtube className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="text-sm font-medium text-slate-900">YouTube Optimization</p>
                              <p className="text-xs text-slate-600 mt-1">
                                I&apos;ll optimize your title for CTR (curiosity + clarity), create a keyword-rich description, and suggest timestamps for better watch time.
                              </p>
                            </div>
                          </div>
                        )}

                        {/* X/Twitter specific */}
                        {draft.channels.includes('X_TWITTER' as IntegrationType) && (
                          <div className="flex items-start space-x-3 p-3 bg-white rounded-xl">
                            <Twitter className="w-4 h-4 text-slate-900 mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="text-sm font-medium text-slate-900">X/Twitter Strategy</p>
                              <p className="text-xs text-slate-600 mt-1">
                                {draft.contentType === 'thread' ? 'Threads with 5-7 tweets perform best. Each tweet should stand alone but build narrative.' :
                                 'Single tweets with bold hooks and one clear idea. Replies often outperform original posts.'}
                              </p>
                            </div>
                          </div>
                        )}

                        {/* TikTok specific */}
                        {draft.channels.includes('TIKTOK' as IntegrationType) && (
                          <div className="flex items-start space-x-3 p-3 bg-white rounded-xl">
                            <Video className="w-4 h-4 text-pink-600 mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="text-sm font-medium text-slate-900">TikTok Hook Formula</p>
                              <p className="text-xs text-slate-600 mt-1">
                                First 1-2 seconds = 90% of your success. Use pattern interrupts, controversial statements, or &quot;Wait for it&quot; setups.
                              </p>
                            </div>
                          </div>
                        )}

                        {/* Goal-specific recommendation */}
                        <div className="flex items-start space-x-3 p-3 bg-gradient-to-r from-apex-primary/10 to-purple-500/10 rounded-xl border border-apex-primary/20">
                          <Target className="w-4 h-4 text-apex-primary mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-sm font-medium text-apex-primary">
                              {contentGoal === 'awareness' && 'Awareness Strategy: Maximum Reach'}
                              {contentGoal === 'engagement' && 'Engagement Strategy: Conversation Starters'}
                              {contentGoal === 'leads' && 'Lead Gen Strategy: Value Exchange'}
                              {contentGoal === 'sales' && 'Sales Strategy: Conversion Focus'}
                              {contentGoal === 'education' && 'Education Strategy: Thought Leadership'}
                              {contentGoal === 'community' && 'Community Strategy: Connection Building'}
                            </p>
                            <p className="text-xs text-slate-600 mt-1">
                              {contentGoal === 'awareness' && "I'll optimize for shareability with emotional hooks and quotable lines."}
                              {contentGoal === 'engagement' && "I'll include questions, polls, and debate-worthy takes to spark discussion."}
                              {contentGoal === 'leads' && "I'll create a soft value proposition with a clear but non-pushy call-to-action."}
                              {contentGoal === 'sales' && "I'll highlight benefits, include social proof, and create urgency authentically."}
                              {contentGoal === 'education' && "I'll break down complex topics with examples, frameworks, and actionable takeaways."}
                              {contentGoal === 'community' && "I'll create inclusive content that celebrates wins and invites participation."}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Step 2: Create Content with AI */}
            {step === 2 && miaCreativeMode && (
              <MiaCreativeSession
                channels={draft.channels.map(c => c.toString())}
                contentType={draft.contentType}
                goal={contentGoal}
                profile={activeProfile}
                onComplete={async (result: MiaCreativeResult) => {
                  const safeTitle = result.title || result.body?.split('\n')[0]?.slice(0, 100) || 'Untitled'
                  setDraft(prev => ({
                    ...prev,
                    title: safeTitle,
                    body: result.body,
                    hashtags: result.hashtags,
                    callToAction: result.callToAction,
                    videoScript: prev.contentType === 'video' || prev.contentType === 'reel' ? result.body : prev.videoScript,
                  }))
                  setGenerationCount(prev => prev + 1)
                  // Auto-save draft before advancing to preview
                  await saveDraft()
                  setStep(3)
                }}
                onSwitchToManual={() => setMiaCreativeMode(false)}
              />
            )}
            {step === 2 && !miaCreativeMode && (
              <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-purple-500 via-pink-500 to-rose-500 mb-6 shadow-2xl shadow-pink-500/30">
                    <Brain className="w-10 h-10 text-white" />
                  </div>
                  <h2 className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
                    Let Mia craft your content
                  </h2>
                  <p className="text-slate-500 mt-3 text-lg">AI-powered content creation with your brand voice</p>
                </div>

                {/* Quick Templates */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-3">Quick Start Templates</label>
                  <div className="grid grid-cols-3 gap-3">
                    {CONTENT_TEMPLATES.map(template => {
                      const Icon = template.icon
                      return (
                        <button
                          key={template.id}
                          onClick={() => {
                            setSelectedTemplate(template.id)
                            setAiTopic(template.prompt)
                          }}
                          className={cn(
                            'p-3 rounded-xl border-2 text-left transition-all flex items-center space-x-3',
                            selectedTemplate === template.id
                              ? 'border-apex-primary bg-apex-primary/5'
                              : 'border-slate-200 hover:border-slate-300'
                          )}
                        >
                          <Icon className={cn(
                            'w-5 h-5 flex-shrink-0',
                            selectedTemplate === template.id ? 'text-apex-primary' : 'text-slate-400'
                          )} />
                          <span className="text-sm font-medium text-slate-700 truncate">{template.name}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* AI Generation Panel - Premium Design */}
                <div className="relative rounded-3xl overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-apex-primary/5 via-purple-500/5 to-pink-500/5" />
                  <div className="relative border-2 border-apex-primary/20 rounded-3xl p-8">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center space-x-4">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-apex-primary via-purple-500 to-pink-500 flex items-center justify-center shadow-xl shadow-purple-500/30">
                          <Sparkles className="w-7 h-7 text-white" />
                        </div>
                        <div>
                          <h3 className="font-bold text-xl text-slate-900">Generate with Mia</h3>
                          <p className="text-sm text-slate-500">Your AI content assistant</p>
                        </div>
                      </div>
                      {generationCount > 0 && (
                        <div className="flex items-center space-x-2">
                          <span className="text-sm bg-gradient-to-r from-apex-primary to-purple-500 text-white px-3 py-1 rounded-full font-medium shadow-lg">
                            {generationCount} generated
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="space-y-6">
                      {/* Topic Input with Suggestions */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-sm font-semibold text-slate-700">What&apos;s the topic?</label>
                          {aiTopic.length > 0 && (
                            <span className="text-xs text-emerald-600 flex items-center space-x-1">
                              <Check className="w-3 h-3" />
                              <span>Good topic length</span>
                            </span>
                          )}
                        </div>
                        <div className="relative">
                          <input
                            type="text"
                            value={aiTopic}
                            onChange={(e) => setAiTopic(e.target.value)}
                            placeholder="e.g., AI transforming B2B sales in 2025, new product launch, industry insights..."
                            className="input text-lg pr-12 rounded-xl"
                          />
                          <div className="absolute right-3 top-1/2 -translate-y-1/2">
                            <Mic className="w-5 h-5 text-slate-400 cursor-pointer hover:text-apex-primary transition-colors" />
                          </div>
                        </div>

                        {/* Topic Inspiration - shows when empty */}
                        {!aiTopic && (
                          <div className="mt-3 p-4 bg-gradient-to-r from-amber-50 to-yellow-50 rounded-xl border border-amber-200">
                            <div className="flex items-center space-x-2 mb-3">
                              <Lightbulb className="w-4 h-4 text-amber-600" />
                              <span className="text-sm font-semibold text-slate-900">Need inspiration?</span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {[
                                { label: 'Industry trend', topic: 'How AI is changing the future of sales' },
                                { label: 'Product update', topic: 'Announcing our latest feature release' },
                                { label: 'Tips & advice', topic: '5 ways to increase conversion rates' },
                                { label: 'Behind the scenes', topic: 'A day in the life at our company' },
                                { label: 'Case study', topic: 'How we helped a client achieve 3x growth' },
                                { label: 'Hot take', topic: 'Why traditional sales methods are dying' },
                              ].map(suggestion => (
                                <button
                                  key={suggestion.label}
                                  onClick={() => setAiTopic(suggestion.topic)}
                                  className="px-3 py-1.5 bg-white hover:bg-amber-100 border border-amber-200 rounded-lg text-xs font-medium text-slate-700 transition-colors"
                                >
                                  {suggestion.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Topic Enhancement Suggestions - shows when topic is entered */}
                        {aiTopic.length > 10 && aiTopic.length < 50 && (
                          <div className="mt-2 flex items-center space-x-2 text-xs text-slate-500">
                            <Sparkles className="w-3 h-3 text-apex-primary" />
                            <span>Tip: Adding specifics like numbers, timeframes, or outcomes makes content more compelling</span>
                          </div>
                        )}
                      </div>

                      {/* Tone Selection - Multi-Select Pills */}
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <label className="text-sm font-semibold text-slate-700">Choose your tone(s)</label>
                          <span className="text-xs text-slate-500">
                            {aiTones.length}/3 selected • {getCombinedToneDescription()}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {AI_TONES.map(tone => {
                            const isSelected = aiTones.includes(tone.id)
                            const selectionOrder = aiTones.indexOf(tone.id) + 1
                            return (
                              <button
                                key={tone.id}
                                onClick={() => toggleTone(tone.id)}
                                className={cn(
                                  'relative px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 flex items-center space-x-2',
                                  isSelected
                                    ? `bg-gradient-to-r ${tone.color} text-white shadow-lg scale-105`
                                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                )}
                              >
                                {isSelected && aiTones.length > 1 && (
                                  <span className="absolute -top-2 -right-2 w-5 h-5 bg-white text-apex-primary text-xs font-bold rounded-full flex items-center justify-center shadow-md">
                                    {selectionOrder}
                                  </span>
                                )}
                                <span>{tone.emoji}</span>
                                <span>{tone.name}</span>
                              </button>
                            )
                          })}
                        </div>
                        {aiTones.length > 1 && (
                          <p className="mt-2 text-xs text-slate-500 flex items-center space-x-1">
                            <Sparkles className="w-3 h-3" />
                            <span>Mia will blend these tones for a unique voice</span>
                          </p>
                        )}
                      </div>

                      {/* Content Style Selection */}
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-3">Content Style</label>
                        <div className="grid grid-cols-5 gap-2">
                          {CONTENT_STYLES.map(style => {
                            const Icon = style.icon
                            return (
                              <button
                                key={style.id}
                                onClick={() => setContentStyle(style.id)}
                                className={cn(
                                  'p-3 rounded-xl text-center transition-all',
                                  contentStyle === style.id
                                    ? 'bg-apex-primary/10 border-2 border-apex-primary shadow-md'
                                    : 'bg-slate-50 border-2 border-transparent hover:bg-slate-100'
                                )}
                              >
                                <Icon className={cn(
                                  'w-5 h-5 mx-auto mb-1',
                                  contentStyle === style.id ? 'text-apex-primary' : 'text-slate-400'
                                )} />
                                <p className={cn(
                                  'text-xs font-medium',
                                  contentStyle === style.id ? 'text-apex-primary' : 'text-slate-600'
                                )}>
                                  {style.name}
                                </p>
                              </button>
                            )
                          })}
                        </div>
                      </div>

                      {/* AI Provider & Model Selection */}
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-3">AI Provider & Model</label>
                        <div className="space-y-3">
                          {/* Provider Selection */}
                          <div className="grid grid-cols-3 gap-3">
                            {AI_PROVIDERS.map(provider => {
                              const Icon = provider.icon
                              return (
                                <button
                                  key={provider.id}
                                  onClick={() => {
                                    if (provider.available) {
                                      setSelectedProvider(provider.id)
                                      setSelectedModel(provider.models[0]?.id || '')
                                    }
                                  }}
                                  disabled={!provider.available}
                                  className={cn(
                                    'p-3 rounded-xl border-2 text-left transition-all relative',
                                    selectedProvider === provider.id
                                      ? 'border-apex-primary bg-apex-primary/5 shadow-md'
                                      : provider.available
                                        ? 'border-slate-200 hover:border-slate-300'
                                        : 'border-slate-100 bg-slate-50 opacity-60 cursor-not-allowed'
                                  )}
                                >
                                  {!provider.available && (
                                    <span className="absolute top-2 right-2 text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
                                      Soon
                                    </span>
                                  )}
                                  <div className="flex items-center space-x-2 mb-1">
                                    <Icon className={cn('w-4 h-4', selectedProvider === provider.id ? 'text-apex-primary' : 'text-slate-400')} />
                                    <span className="font-semibold text-sm text-slate-900">{provider.name}</span>
                                  </div>
                                  <p className="text-xs text-slate-500">{provider.description}</p>
                                </button>
                              )
                            })}
                          </div>

                          {/* Model Selection (for selected provider) */}
                          {AI_PROVIDERS.find(p => p.id === selectedProvider)?.models && (
                            <div className="flex flex-wrap gap-2">
                              {AI_PROVIDERS.find(p => p.id === selectedProvider)?.models.map(model => (
                                <button
                                  key={model.id}
                                  onClick={() => setSelectedModel(model.id)}
                                  className={cn(
                                    'px-3 py-2 rounded-lg text-sm transition-all',
                                    selectedModel === model.id
                                      ? 'bg-apex-primary text-white shadow-md'
                                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                  )}
                                >
                                  <span className="font-medium">{model.name}</span>
                                  <span className="text-xs opacity-75 ml-1">({model.description})</span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                        {usedModel && (
                          <p className="mt-2 text-xs text-slate-500">
                            Last generated with: <span className="font-medium text-apex-primary">{usedModel}</span>
                          </p>
                        )}
                      </div>

                      {/* Video-Specific Options */}
                      {(draft.contentType === 'video' || draft.contentType === 'reel') && (
                        <div className="p-4 bg-gradient-to-br from-red-50 to-orange-50 rounded-xl border border-red-200 animate-in fade-in slide-in-from-top-2 duration-300">
                          <div className="flex items-center space-x-2 mb-4">
                            <Video className="w-5 h-5 text-red-600" />
                            <h4 className="font-bold text-slate-900">Video Options</h4>
                          </div>

                          {/* Video Length */}
                          <div className="mb-4">
                            <label className="block text-sm font-medium text-slate-700 mb-2">Video Length</label>
                            <div className="grid grid-cols-3 gap-2">
                              {VIDEO_LENGTHS.map(length => (
                                <button
                                  key={length.id}
                                  onClick={() => setVideoLength(length.id)}
                                  className={cn(
                                    'p-3 rounded-lg text-center transition-all',
                                    videoLength === length.id
                                      ? 'bg-red-500 text-white shadow-md'
                                      : 'bg-white text-slate-700 hover:bg-red-50'
                                  )}
                                >
                                  <p className="font-bold text-sm">{length.name}</p>
                                  <p className={cn('text-xs', videoLength === length.id ? 'text-red-100' : 'text-slate-500')}>
                                    {length.duration}
                                  </p>
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Video Generation Options */}
                          <div className="space-y-2">
                            <label className="block text-sm font-medium text-slate-700 mb-2">Include in Generation</label>
                            {[
                              { id: 'script', label: 'Video Script', desc: 'Scene-by-scene breakdown', state: generateScript, setState: setGenerateScript },
                              { id: 'thumbnails', label: 'Thumbnail Ideas', desc: '3 clickable thumbnail concepts', state: generateThumbnails, setState: setGenerateThumbnails },
                              { id: 'timestamps', label: 'Chapters/Timestamps', desc: 'Video sections for navigation', state: generateTimestamps, setState: setGenerateTimestamps },
                            ].map(option => (
                              <label
                                key={option.id}
                                className="flex items-center justify-between p-3 bg-white rounded-lg cursor-pointer hover:bg-red-50 transition-colors"
                              >
                                <div>
                                  <p className="font-medium text-sm text-slate-900">{option.label}</p>
                                  <p className="text-xs text-slate-500">{option.desc}</p>
                                </div>
                                <input
                                  type="checkbox"
                                  checked={option.state}
                                  onChange={(e) => option.setState(e.target.checked)}
                                  className="w-5 h-5 rounded text-red-500 focus:ring-red-500"
                                />
                              </label>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Advanced Options */}
                      <div>
                        <button
                          onClick={() => setShowAdvanced(!showAdvanced)}
                          className="flex items-center space-x-2 text-sm text-apex-primary hover:underline font-medium"
                        >
                          <Settings className="w-4 h-4" />
                          <span>{showAdvanced ? 'Hide' : 'Show'} SEO & Marketing Options</span>
                          {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>

                        {showAdvanced && (
                          <div className="mt-4 space-y-4 p-5 bg-gradient-to-br from-slate-50 to-white rounded-xl border border-slate-200 animate-in fade-in slide-in-from-top-2 duration-300">
                            {/* Target Audience */}
                            <div>
                              <label className="block text-sm font-medium text-slate-700 mb-2">Target Audience</label>
                              <input
                                type="text"
                                value={targetAudience}
                                onChange={(e) => setTargetAudience(e.target.value)}
                                placeholder="e.g., B2B SaaS executives, marketing managers, startup founders..."
                                className="input rounded-xl"
                              />
                            </div>

                            {/* SEO Keywords */}
                            <div>
                              <label className="block text-sm font-medium text-slate-700 mb-2">SEO Keywords</label>
                              <div className="flex space-x-2 mb-2">
                                <input
                                  type="text"
                                  value={newKeyword}
                                  onChange={(e) => setNewKeyword(e.target.value)}
                                  onKeyDown={(e) => e.key === 'Enter' && addKeyword()}
                                  placeholder="Add a keyword..."
                                  className="flex-1 input rounded-xl"
                                />
                                <button
                                  onClick={addKeyword}
                                  className="px-4 py-2 bg-apex-primary text-white rounded-xl hover:bg-apex-primary/90"
                                >
                                  <Plus className="w-4 h-4" />
                                </button>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {seoKeywords.map(keyword => (
                                  <span key={keyword} className="inline-flex items-center px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-sm font-medium">
                                    {keyword}
                                    <button onClick={() => removeKeyword(keyword)} className="ml-2 hover:text-red-500">
                                      <X className="w-3 h-3" />
                                    </button>
                                  </span>
                                ))}
                              </div>
                            </div>

                            {/* Campaign Tracking */}
                            <div>
                              <label className="block text-sm font-medium text-slate-700 mb-2">Campaign Tracking (UTM)</label>
                              <div className="grid grid-cols-3 gap-2">
                                <input
                                  type="text"
                                  value={utmSource}
                                  onChange={(e) => setUtmSource(e.target.value)}
                                  placeholder="Source (e.g., linkedin)"
                                  className="input rounded-xl text-sm"
                                />
                                <input
                                  type="text"
                                  value={utmMedium}
                                  onChange={(e) => setUtmMedium(e.target.value)}
                                  placeholder="Medium (e.g., social)"
                                  className="input rounded-xl text-sm"
                                />
                                <input
                                  type="text"
                                  value={utmCampaign}
                                  onChange={(e) => setUtmCampaign(e.target.value)}
                                  placeholder="Campaign name"
                                  className="input rounded-xl text-sm"
                                />
                              </div>
                              {utmSource && (
                                <div className="mt-2 p-2 bg-slate-100 rounded-lg">
                                  <p className="text-xs text-slate-500 mb-1">Generated Link:</p>
                                  <code className="text-xs text-apex-primary break-all">{generateUtmLink()}</code>
                                </div>
                              )}
                            </div>

                            {/* Additional Context */}
                            <div>
                              <label className="block text-sm font-medium text-slate-700 mb-2">Additional Context</label>
                              <textarea
                                value={aiContext}
                                onChange={(e) => setAiContext(e.target.value)}
                                placeholder="Add specific details, brand guidelines, competitor info, key messages..."
                                rows={3}
                                className="input resize-none rounded-xl"
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      {generationError && (
                        <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
                          <div className="flex items-start space-x-3">
                            <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-600 mt-0.5" />
                            <div className="flex-1">
                              <p className="text-sm text-red-700 font-medium">{generationError}</p>
                              {generationError.toLowerCase().includes('not configured') && (
                                <a
                                  href="/studio/settings/ai"
                                  className="inline-flex items-center mt-2 text-sm text-red-600 hover:text-red-800 font-medium"
                                >
                                  Fix AI Provider Settings →
                                </a>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Generate Button */}
                      <button
                        onClick={generateWithAI}
                        disabled={!aiTopic.trim() || isGenerating}
                        className={cn(
                          'w-full py-4 rounded-2xl font-bold text-lg text-white transition-all flex items-center justify-center space-x-3',
                          isGenerating
                            ? 'bg-slate-400 cursor-not-allowed'
                            : 'bg-gradient-to-r from-apex-primary via-purple-500 to-pink-500 hover:shadow-2xl hover:shadow-purple-500/30 hover:-translate-y-1'
                        )}
                      >
                        {isGenerating ? (
                          <>
                            <Loader2 className="w-6 h-6 animate-spin" />
                            <span>Mia is crafting your content...</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-6 h-6" />
                            <span>Generate Content</span>
                            <ArrowRight className="w-5 h-5" />
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Divider */}
                <div className="flex items-center space-x-4">
                  <div className="flex-1 h-px bg-gradient-to-r from-transparent via-slate-300 to-transparent" />
                  <span className="text-sm text-slate-400 font-medium px-4">or write manually</span>
                  <div className="flex-1 h-px bg-gradient-to-r from-transparent via-slate-300 to-transparent" />
                </div>

                {/* Content Editor */}
                <div className="grid grid-cols-3 gap-6">
                  {/* Main Editor - 2 columns */}
                  <div className="col-span-2 space-y-5">
                    {/* Title */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-sm font-semibold text-slate-700">Title</label>
                        {draft.title && (
                          <button
                            onClick={() => copyToClipboard(draft.title)}
                            className="text-xs text-slate-400 hover:text-slate-600 flex items-center space-x-1"
                          >
                            <Copy className="w-3 h-3" />
                            <span>Copy</span>
                          </button>
                        )}
                      </div>
                      <input
                        type="text"
                        value={draft.title}
                        onChange={(e) => setDraft(prev => ({ ...prev, title: e.target.value }))}
                        placeholder="Enter a compelling title..."
                        className="input text-lg font-semibold rounded-xl"
                      />
                    </div>

                    {/* Rich Text Toolbar */}
                    <div className="flex items-center space-x-1 p-2 bg-slate-50 rounded-xl">
                      <button className="p-2 hover:bg-white rounded-lg transition-colors" title="Bold">
                        <Bold className="w-4 h-4 text-slate-600" />
                      </button>
                      <button className="p-2 hover:bg-white rounded-lg transition-colors" title="Italic">
                        <Italic className="w-4 h-4 text-slate-600" />
                      </button>
                      <button className="p-2 hover:bg-white rounded-lg transition-colors" title="List">
                        <List className="w-4 h-4 text-slate-600" />
                      </button>
                      <div className="w-px h-5 bg-slate-300 mx-1" />
                      <button className="p-2 hover:bg-white rounded-lg transition-colors" title="Add Link">
                        <Link2 className="w-4 h-4 text-slate-600" />
                      </button>
                      <button className="p-2 hover:bg-white rounded-lg transition-colors" title="Add Hashtag" onClick={() => insertAtCursor('#')}>
                        <Hash className="w-4 h-4 text-slate-600" />
                      </button>
                      <button className="p-2 hover:bg-white rounded-lg transition-colors" title="Mention" onClick={() => insertAtCursor('@')}>
                        <AtSign className="w-4 h-4 text-slate-600" />
                      </button>
                      <button className="p-2 hover:bg-white rounded-lg transition-colors" title="Add Emoji">
                        <Smile className="w-4 h-4 text-slate-600" />
                      </button>
                    </div>

                    {/* Content Body */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-sm font-semibold text-slate-700">Content</label>
                        <div className="flex items-center space-x-3 text-xs text-slate-400">
                          <span className={cn(
                            'font-medium',
                            activePreviewChannel && draft.body.length > getCharacterLimit(activePreviewChannel) && 'text-red-500'
                          )}>
                            {draft.body.length} / {activePreviewChannel ? getCharacterLimit(activePreviewChannel).toLocaleString() : '∞'} chars
                          </span>
                          <span>•</span>
                          <span>{draft.body.split(/\s+/).filter(Boolean).length} words</span>
                          {draft.body && (
                            <button
                              onClick={() => copyToClipboard(draft.body)}
                              className="hover:text-slate-600 flex items-center space-x-1"
                            >
                              <Copy className="w-3 h-3" />
                              <span>Copy</span>
                            </button>
                          )}
                        </div>
                      </div>
                      <textarea
                        ref={textareaRef}
                        value={draft.body}
                        onChange={(e) => setDraft(prev => ({ ...prev, body: e.target.value }))}
                        placeholder="Write your content here... or let Mia help you create something amazing"
                        rows={12}
                        className="input resize-none font-mono text-sm leading-relaxed rounded-xl"
                      />
                    </div>

                    {/* Hashtags & CTA */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-semibold text-slate-700 mb-2 block">Hashtags</label>
                        <div className="flex flex-wrap gap-2 p-3 bg-slate-50 rounded-xl min-h-[60px]">
                          {draft.hashtags.map((tag, i) => (
                            <span key={i} className="inline-flex items-center px-3 py-1 bg-apex-primary/10 text-apex-primary rounded-full text-sm font-medium">
                              #{tag}
                              <button
                                onClick={() => setDraft(prev => ({ ...prev, hashtags: prev.hashtags.filter((_, idx) => idx !== i) }))}
                                className="ml-2 hover:text-red-500"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </span>
                          ))}
                          {draft.hashtags.length === 0 && (
                            <span className="text-sm text-slate-400">Generate content to get hashtag suggestions</span>
                          )}
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-semibold text-slate-700 mb-2 block">Call to Action</label>
                        <input
                          type="text"
                          value={draft.callToAction}
                          onChange={(e) => setDraft(prev => ({ ...prev, callToAction: e.target.value }))}
                          placeholder="e.g., Learn more, Sign up now, Get started"
                          className="input rounded-xl"
                        />
                      </div>
                    </div>
                  </div>

                  {/* AI Chat Sidebar */}
                  <div className="space-y-4">
                    {/* Content Score Card */}
                    {contentScore && (
                      <div className="p-5 bg-gradient-to-br from-slate-50 to-white rounded-2xl border border-slate-200">
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="font-bold text-slate-900 flex items-center space-x-2">
                            <BarChart3 className="w-4 h-4 text-apex-primary" />
                            <span>Content Score</span>
                          </h4>
                          <div className={cn(
                            'text-2xl font-bold',
                            contentScore.overall >= 80 ? 'text-emerald-500' :
                            contentScore.overall >= 60 ? 'text-amber-500' : 'text-red-500'
                          )}>
                            {contentScore.overall}
                          </div>
                        </div>
                        <div className="space-y-3">
                          {[
                            { label: 'Engagement', value: contentScore.engagement, icon: Heart },
                            { label: 'Clarity', value: contentScore.clarity, icon: Eye },
                            { label: 'Emotion', value: contentScore.emotion, icon: Flame },
                            { label: 'CTA Strength', value: contentScore.cta, icon: Target },
                          ].map(metric => (
                            <div key={metric.label}>
                              <div className="flex items-center justify-between text-xs mb-1">
                                <span className="text-slate-600 flex items-center space-x-1">
                                  <metric.icon className="w-3 h-3" />
                                  <span>{metric.label}</span>
                                </span>
                                <span className="font-medium">{metric.value}%</span>
                              </div>
                              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                <div
                                  className={cn(
                                    'h-full rounded-full transition-all duration-500',
                                    metric.value >= 80 ? 'bg-emerald-500' :
                                    metric.value >= 60 ? 'bg-amber-500' : 'bg-red-500'
                                  )}
                                  style={{ width: `${metric.value}%` }}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* SEO Analysis Toggle Button (when panel is closed) */}
                    {seoAnalysis && !showSeoPanel && (
                      <button
                        onClick={() => setShowSeoPanel(true)}
                        className="w-full p-3 bg-emerald-50 hover:bg-emerald-100 rounded-xl border border-emerald-200 text-sm font-medium text-emerald-700 flex items-center justify-center space-x-2 transition-colors"
                      >
                        <TrendingUp className="w-4 h-4" />
                        <span>Show SEO Analysis (Score: {seoAnalysis.score})</span>
                      </button>
                    )}

                    {/* SEO Analysis Panel */}
                    {seoAnalysis && showSeoPanel && (
                      <div className="p-5 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl border border-emerald-200 animate-in fade-in slide-in-from-top-2 duration-300">
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="font-bold text-slate-900 flex items-center space-x-2">
                            <TrendingUp className="w-4 h-4 text-emerald-600" />
                            <span>SEO Analysis</span>
                          </h4>
                          <button
                            onClick={() => setShowSeoPanel(false)}
                            className="text-slate-400 hover:text-slate-600"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Overall SEO Score */}
                        <div className="flex items-center justify-center mb-4">
                          <div className={cn(
                            'w-20 h-20 rounded-full flex items-center justify-center border-4',
                            seoAnalysis.score >= 80 ? 'border-emerald-500 bg-emerald-50' :
                            seoAnalysis.score >= 60 ? 'border-amber-500 bg-amber-50' : 'border-red-500 bg-red-50'
                          )}>
                            <div className="text-center">
                              <span className={cn(
                                'text-2xl font-bold',
                                seoAnalysis.score >= 80 ? 'text-emerald-600' :
                                seoAnalysis.score >= 60 ? 'text-amber-600' : 'text-red-600'
                              )}>
                                {seoAnalysis.score}
                              </span>
                              <p className="text-xs text-slate-500">SEO</p>
                            </div>
                          </div>
                        </div>

                        {/* Metric Bars */}
                        <div className="space-y-3 mb-4">
                          {[
                            { label: 'Readability', value: seoAnalysis.readability, icon: BookOpen },
                            { label: 'Headline', value: seoAnalysis.headlineScore, icon: Type },
                            { label: 'Keywords', value: Math.min(100, seoAnalysis.keywordDensity * 20), icon: Hash },
                          ].map(metric => (
                            <div key={metric.label}>
                              <div className="flex items-center justify-between text-xs mb-1">
                                <span className="text-slate-600 flex items-center space-x-1">
                                  <metric.icon className="w-3 h-3" />
                                  <span>{metric.label}</span>
                                </span>
                                <span className="font-medium">{Math.round(metric.value)}%</span>
                              </div>
                              <div className="h-2 bg-white rounded-full overflow-hidden">
                                <div
                                  className={cn(
                                    'h-full rounded-full transition-all duration-500',
                                    metric.value >= 80 ? 'bg-emerald-500' :
                                    metric.value >= 60 ? 'bg-amber-500' : 'bg-red-500'
                                  )}
                                  style={{ width: `${metric.value}%` }}
                                />
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Meta Description */}
                        {seoAnalysis.metaDescription && (
                          <div className="mb-4 p-3 bg-white rounded-xl">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs font-semibold text-slate-700">Meta Description</span>
                              <button
                                onClick={() => copyToClipboard(seoAnalysis.metaDescription)}
                                className="text-xs text-emerald-600 hover:text-emerald-700 flex items-center space-x-1"
                              >
                                <Copy className="w-3 h-3" />
                                <span>Copy</span>
                              </button>
                            </div>
                            <p className="text-xs text-slate-600 leading-relaxed">
                              {seoAnalysis.metaDescription}
                            </p>
                            <span className={cn(
                              'text-xs mt-1 inline-block',
                              seoAnalysis.metaDescription.length <= 155 ? 'text-emerald-600' : 'text-amber-600'
                            )}>
                              {seoAnalysis.metaDescription.length}/155 chars
                            </span>
                          </div>
                        )}

                        {/* Suggestions with Apply */}
                        {seoAnalysis.suggestions && seoAnalysis.suggestions.length > 0 && (
                          <div>
                            <h5 className="text-xs font-semibold text-slate-700 mb-2 flex items-center space-x-1">
                              <Lightbulb className="w-3 h-3 text-amber-500" />
                              <span>Suggestions</span>
                            </h5>
                            <ul className="space-y-2">
                              {seoAnalysis.suggestions.slice(0, 3).map((suggestion, i) => (
                                <li key={i} className="text-xs text-slate-600 flex items-start space-x-2 group">
                                  <Check className="w-3 h-3 text-emerald-500 mt-0.5 flex-shrink-0" />
                                  <span className="flex-1">{suggestion}</span>
                                  <button
                                    onClick={() => {
                                      const lower = suggestion.toLowerCase()
                                      if (lower.includes('title') || lower.includes('headline')) {
                                        setDraft(prev => ({ ...prev, title: `${prev.title} — Optimized` }))
                                      } else if (lower.includes('keyword')) {
                                        const words = suggestion.match(/"([^"]+)"/g)
                                        if (words?.length) {
                                          const newKw = words.map(w => w.replace(/"/g, ''))
                                          setSeoKeywords(prev => Array.from(new Set([...prev, ...newKw])))
                                        }
                                      }
                                    }}
                                    className="opacity-0 group-hover:opacity-100 text-[10px] font-medium px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 hover:bg-purple-200 transition-all flex-shrink-0"
                                    title="Apply this suggestion"
                                  >
                                    Apply
                                  </button>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}

                    {/* AI Chat Refinement */}
                    {showAiChat && (
                      <div className="p-4 bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl border border-purple-200">
                        <div className="flex items-center space-x-2 mb-4">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-apex-primary to-purple-500 flex items-center justify-center">
                            <Sparkles className="w-4 h-4 text-white" />
                          </div>
                          <span className="font-bold text-slate-900">Chat with Mia</span>
                        </div>

                        <div className="space-y-3 max-h-[200px] overflow-y-auto mb-4">
                          {aiChatHistory.map((msg, i) => (
                            <div key={i} className={cn(
                              'p-3 rounded-xl text-sm',
                              msg.role === 'user'
                                ? 'bg-apex-primary text-white ml-4'
                                : 'bg-white text-slate-700 mr-4'
                            )}>
                              <p className="whitespace-pre-line">{msg.content}</p>
                            </div>
                          ))}
                          {isRefining && (
                            <div className="flex items-center space-x-2 text-slate-500 text-sm">
                              <Loader2 className="w-4 h-4 animate-spin" />
                              <span>Mia is thinking...</span>
                            </div>
                          )}
                        </div>

                        <div className="flex space-x-2">
                          <input
                            type="text"
                            value={aiChatInput}
                            onChange={(e) => setAiChatInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && refineWithAI()}
                            placeholder="Make it shorter, add humor..."
                            className="flex-1 text-sm px-3 py-2 rounded-xl border border-purple-200 focus:border-purple-400 focus:ring-2 focus:ring-purple-200 outline-none"
                          />
                          <button
                            onClick={refineWithAI}
                            disabled={!aiChatInput.trim() || isRefining}
                            className="p-2 bg-apex-primary text-white rounded-xl hover:bg-apex-primary/90 disabled:opacity-50"
                          >
                            <Send className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Guidance Panel */}
                    {showGuidance && guidanceTips.length > 0 && (
                      <div className="p-4 bg-gradient-to-br from-amber-50 to-yellow-50 rounded-2xl border border-amber-200">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-bold text-slate-900 flex items-center space-x-2">
                            <Lightbulb className="w-4 h-4 text-amber-600" />
                            <span>Smart Tips</span>
                          </h4>
                          <button
                            onClick={() => setShowGuidance(false)}
                            className="text-slate-400 hover:text-slate-600"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="space-y-3">
                          {guidanceTips.slice(0, 3).map(tip => (
                            <div
                              key={tip.id}
                              className={cn(
                                'p-3 rounded-xl text-sm',
                                tip.type === 'warning' ? 'bg-red-100 border border-red-200' :
                                tip.type === 'suggestion' ? 'bg-blue-100 border border-blue-200' :
                                tip.type === 'best-practice' ? 'bg-emerald-100 border border-emerald-200' :
                                'bg-white border border-amber-200'
                              )}
                            >
                              <div className="flex items-start space-x-2">
                                {tip.type === 'warning' && <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />}
                                {tip.type === 'suggestion' && <Lightbulb className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />}
                                {tip.type === 'best-practice' && <Award className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />}
                                {tip.type === 'tip' && <Star className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />}
                                <div>
                                  <p className="font-semibold text-slate-900">{tip.title}</p>
                                  <p className="text-slate-600 text-xs mt-1">{tip.message}</p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                        {guidanceTips.length > 3 && (
                          <button className="mt-3 text-xs text-amber-600 hover:text-amber-700 font-medium">
                            +{guidanceTips.length - 3} more tips
                          </button>
                        )}
                      </div>
                    )}

                    {/* Toggle Guidance Button */}
                    {!showGuidance && guidanceTips.length > 0 && (
                      <button
                        onClick={() => setShowGuidance(true)}
                        className="w-full p-3 bg-amber-50 hover:bg-amber-100 rounded-xl border border-amber-200 text-sm font-medium text-amber-700 flex items-center justify-center space-x-2 transition-colors"
                      >
                        <Lightbulb className="w-4 h-4" />
                        <span>Show {guidanceTips.length} Smart Tips</span>
                      </button>
                    )}

                    {/* Media Upload */}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*,video/*,audio/*"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0]
                        if (!file) return
                        setIsUploading(true)
                        setUploadError(null)
                        try {
                          const formData = new FormData()
                          formData.append('file', file)
                          const res = await fetch('/api/upload', { method: 'POST', body: formData })
                          const data = await res.json()
                          if (!data.success) throw new Error(data.error || 'Upload failed')
                          setDraft(prev => ({ ...prev, media: [...prev.media, data.url] }))
                        } catch (err) {
                          setUploadError(err instanceof Error ? err.message : 'Upload failed')
                        } finally {
                          setIsUploading(false)
                          e.target.value = ''
                        }
                      }}
                    />
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className={cn(
                        'p-5 border-2 border-dashed rounded-2xl text-center transition-all cursor-pointer group',
                        isUploading
                          ? 'border-apex-primary/50 bg-apex-primary/5'
                          : 'border-slate-200 hover:border-apex-primary/50 hover:bg-apex-primary/5'
                      )}
                    >
                      <div className="w-12 h-12 rounded-2xl bg-slate-100 group-hover:bg-apex-primary/10 flex items-center justify-center mx-auto mb-3 transition-colors">
                        {isUploading ? (
                          <Loader2 className="w-6 h-6 text-apex-primary animate-spin" />
                        ) : (
                          <ImageIcon className="w-6 h-6 text-slate-400 group-hover:text-apex-primary transition-colors" />
                        )}
                      </div>
                      <p className="text-sm text-slate-600 font-medium">
                        {isUploading ? 'Uploading...' : 'Add Media'}
                      </p>
                      <p className="text-xs text-slate-400 mt-1">PNG, JPG, GIF, MP4</p>
                    </div>

                    {/* Upload Error */}
                    {uploadError && (
                      <div className="p-3 bg-red-50 rounded-xl border border-red-200 flex items-center space-x-2">
                        <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                        <p className="text-sm text-red-600">{uploadError}</p>
                        <button onClick={() => setUploadError(null)} className="ml-auto text-red-400 hover:text-red-600">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    )}

                    {/* Media Thumbnails */}
                    {draft.media.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {draft.media.map((url, idx) => (
                          <div key={idx} className="relative group/thumb w-20 h-20 rounded-xl overflow-hidden border border-slate-200">
                            <NextImage src={url} alt={`Media ${idx + 1}`} fill className="object-cover" unoptimized />
                            <button
                              onClick={() => setDraft(prev => ({ ...prev, media: prev.media.filter((_, i) => i !== idx) }))}
                              className="absolute top-0.5 right-0.5 w-5 h-5 bg-black/60 text-white rounded-full flex items-center justify-center opacity-0 group-hover/thumb:opacity-100 transition-opacity"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Video Script Preview (for video content) */}
                    {(draft.contentType === 'video' || draft.contentType === 'reel') && draft.videoScript && (
                      <div className="p-4 bg-gradient-to-br from-red-50 to-orange-50 rounded-2xl border border-red-200">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-bold text-slate-900 flex items-center space-x-2">
                            <Play className="w-4 h-4 text-red-600" />
                            <span>Video Script</span>
                          </h4>
                          <button
                            onClick={() => copyToClipboard(draft.videoScript || '')}
                            className="text-xs text-red-600 hover:text-red-700 flex items-center space-x-1"
                          >
                            <Copy className="w-3 h-3" />
                            <span>Copy</span>
                          </button>
                        </div>
                        <div className="text-sm text-slate-700 whitespace-pre-wrap max-h-48 overflow-y-auto">
                          {draft.videoScript}
                        </div>
                      </div>
                    )}

                    {/* Thumbnail Ideas (for video content) */}
                    {(draft.contentType === 'video' || draft.contentType === 'reel') && draft.thumbnailIdeas && draft.thumbnailIdeas.length > 0 && (
                      <div className="p-4 bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl border border-purple-200">
                        <h4 className="font-bold text-slate-900 flex items-center space-x-2 mb-3">
                          <ImageIcon className="w-4 h-4 text-purple-600" />
                          <span>Thumbnail Ideas</span>
                        </h4>
                        <div className="space-y-2">
                          {draft.thumbnailIdeas.map((idea, i) => (
                            <div key={i} className="p-2 bg-white rounded-lg text-sm text-slate-700">
                              <span className="font-bold text-purple-600">#{i + 1}</span> {idea}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Preview & Score */}
            {step === 3 && (
              <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-500 mb-6 shadow-2xl shadow-emerald-500/30">
                    <Eye className="w-10 h-10 text-white" />
                  </div>
                  <h2 className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
                    Preview Your Masterpiece
                  </h2>
                  <p className="text-slate-500 mt-3 text-lg">See exactly how it will appear on each platform</p>
                </div>

                {/* Preview Controls */}
                <div className="flex items-center justify-center space-x-4">
                  {/* Device Toggle */}
                  <div className="flex items-center bg-slate-100 rounded-xl p-1">
                    <button
                      onClick={() => setPreviewMode('desktop')}
                      className={cn(
                        'px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center space-x-2',
                        previewMode === 'desktop' ? 'bg-white shadow-md text-slate-900' : 'text-slate-500 hover:text-slate-700'
                      )}
                    >
                      <Monitor className="w-4 h-4" />
                      <span>Desktop</span>
                    </button>
                    <button
                      onClick={() => setPreviewMode('mobile')}
                      className={cn(
                        'px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center space-x-2',
                        previewMode === 'mobile' ? 'bg-white shadow-md text-slate-900' : 'text-slate-500 hover:text-slate-700'
                      )}
                    >
                      <Smartphone className="w-4 h-4" />
                      <span>Mobile</span>
                    </button>
                  </div>

                  {/* Theme Toggle */}
                  <div className="flex items-center bg-slate-100 rounded-xl p-1">
                    <button
                      onClick={() => setPreviewTheme('light')}
                      className={cn(
                        'px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center space-x-2',
                        previewTheme === 'light' ? 'bg-white shadow-md text-slate-900' : 'text-slate-500 hover:text-slate-700'
                      )}
                    >
                      <Sun className="w-4 h-4" />
                      <span>Light</span>
                    </button>
                    <button
                      onClick={() => setPreviewTheme('dark')}
                      className={cn(
                        'px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center space-x-2',
                        previewTheme === 'dark' ? 'bg-white shadow-md text-slate-900' : 'text-slate-500 hover:text-slate-700'
                      )}
                    >
                      <Moon className="w-4 h-4" />
                      <span>Dark</span>
                    </button>
                  </div>
                </div>

                {/* Channel Tabs + Adapt Button */}
                <div className="flex items-center justify-center space-x-3">
                  <div className="flex space-x-2">
                    {draft.channels.map(channelId => {
                      const channel = CHANNELS.find(c => c.id === channelId)
                      if (!channel) return null
                      const Icon = channel.icon
                      const isActive = activePreviewChannel === channelId

                      return (
                        <button
                          key={channelId}
                          onClick={() => setActivePreviewChannel(channelId)}
                          className={cn(
                            'flex items-center space-x-2 px-5 py-3 rounded-xl font-medium transition-all',
                            isActive
                              ? `bg-gradient-to-r ${channel.gradient} text-white shadow-lg`
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          )}
                        >
                          <Icon className="w-5 h-5" />
                          <span>{channel.name}</span>
                        </button>
                      )
                    })}
                  </div>
                  {draft.channels.length >= 2 && (
                    <button
                      onClick={() => adaptForChannels(draft.title)}
                      disabled={isAdapting}
                      className="flex items-center space-x-2 px-4 py-3 rounded-xl font-medium bg-purple-100 text-purple-700 hover:bg-purple-200 transition-all disabled:opacity-50"
                      title="AI-adapt content for each channel"
                    >
                      {isAdapting ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Layers className="w-4 h-4" />
                      )}
                      <span className="text-sm">{isAdapting ? 'Adapting...' : 'Adapt'}</span>
                    </button>
                  )}
                </div>

                {/* Preview Content */}
                <div className={cn(
                  'flex justify-center',
                  previewMode === 'mobile' && 'px-20'
                )}>
                  {draft.channels.map(channelId => {
                    if (activePreviewChannel !== channelId) return null
                    const channel = CHANNELS.find(c => c.id === channelId)
                    if (!channel) return null
                    const variation = getVariationForChannel(channelId)
                    const displayTitle = variation?.title || draft.title
                    const displayBody = variation?.body || draft.body

                    return (
                      <div
                        key={channelId}
                        className={cn(
                          'rounded-3xl overflow-hidden shadow-2xl transition-all',
                          previewMode === 'mobile' ? 'w-[375px]' : 'w-full max-w-2xl',
                          previewTheme === 'dark' ? 'bg-slate-900' : 'bg-white'
                        )}
                      >
                        <MiaChannelPreview
                          channelId={channelId}
                          title={displayTitle}
                          body={displayBody}
                          hashtags={draft.hashtags}
                          theme={previewTheme}
                          mode={previewMode}
                        />
                      </div>
                    )
                  })}
                </div>

                {/* Video Script Display + Analyze (Step 3 — video/reel only) */}
                {(draft.contentType === 'video' || draft.contentType === 'reel') && draft.videoScript && (
                  <div className="max-w-2xl mx-auto mt-8 space-y-4">
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-semibold text-slate-900 flex items-center space-x-2">
                          <FileText className="w-4 h-4 text-purple-600" />
                          <span>Video Script</span>
                        </h4>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => copyToClipboard(draft.videoScript || '')}
                            className="text-xs text-slate-500 hover:text-slate-700 flex items-center space-x-1"
                          >
                            <Copy className="w-3 h-3" />
                            <span>Copy</span>
                          </button>
                          <button
                            onClick={analyzeScript}
                            disabled={isAnalyzingScript}
                            className="text-xs font-medium px-3 py-1 rounded-full bg-purple-100 text-purple-700 hover:bg-purple-200 transition-colors flex items-center space-x-1 disabled:opacity-50"
                          >
                            {isAnalyzingScript ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <Brain className="w-3 h-3" />
                            )}
                            <span>{isAnalyzingScript ? 'Analyzing...' : 'Analyze Script'}</span>
                          </button>
                        </div>
                      </div>
                      <pre className="text-sm text-slate-700 whitespace-pre-wrap font-sans leading-relaxed max-h-48 overflow-y-auto">
                        {draft.videoScript}
                      </pre>
                    </div>

                    {/* Script Analysis Results */}
                    {scriptAnalysis && (
                      <div className="p-4 bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl border border-purple-200">
                        <h4 className="font-semibold text-slate-900 mb-3 flex items-center space-x-2">
                          <Brain className="w-4 h-4 text-purple-600" />
                          <span>Script Analysis</span>
                          <span className={cn(
                            'ml-2 text-xs font-bold px-2 py-0.5 rounded-full',
                            (scriptAnalysis.overallScore as number) >= 70
                              ? 'bg-emerald-100 text-emerald-700'
                              : (scriptAnalysis.overallScore as number) >= 50
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-red-100 text-red-700'
                          )}>
                            {scriptAnalysis.overallScore as number}/100
                          </span>
                        </h4>
                        <div className="grid grid-cols-3 gap-3 mb-3">
                          {[
                            { label: 'Hook', score: scriptAnalysis.hookScore as number },
                            { label: 'Pacing', score: scriptAnalysis.pacingScore as number },
                            { label: 'CTA', score: scriptAnalysis.ctaScore as number },
                          ].map(item => (
                            <div key={item.label} className="text-center p-2 bg-white rounded-xl">
                              <div className="text-lg font-bold text-purple-700">{item.score}/10</div>
                              <div className="text-xs text-slate-500">{item.label}</div>
                            </div>
                          ))}
                        </div>
                        {(scriptAnalysis.suggestions as string[])?.length > 0 && (
                          <ul className="space-y-1">
                            {(scriptAnalysis.suggestions as string[]).map((s, i) => (
                              <li key={i} className="text-xs text-slate-600 flex items-start space-x-2">
                                <Lightbulb className="w-3 h-3 text-amber-500 mt-0.5 flex-shrink-0" />
                                <span>{s}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Video Preview (Step 3 — video/reel only) */}
                {(draft.contentType === 'video' || draft.contentType === 'reel') && (
                  <div className="max-w-2xl mx-auto mt-8">
                    <VideoPreviewPlayer
                      status={videoRenderState.status}
                      previewUrl={videoRenderState.previewUrl}
                      errorMessage={videoRenderState.errorMessage}
                      progress={videoRenderState.progress}
                      onRequestRender={async () => {
                        setVideoRenderState({ status: 'QUEUED' })
                        try {
                          setVideoRenderState({ status: 'RENDERING', progress: 10 })
                          const aspectRatio = draft.contentType === 'reel' ? '9:16' : '16:9'
                          const durationSeconds = draft.contentType === 'reel' ? 15 : 30

                          // 1. Save content as draft to get a contentId
                          setVideoRenderState({ status: 'RENDERING', progress: 20 })
                          const contentRes = await fetch('/api/content', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              title: draft.title || aiTopic || draft.body?.split('\n')[0]?.slice(0, 100) || 'Untitled Video',
                              body: draft.body || draft.videoScript || 'Video content',
                              contentType: draft.contentType?.toUpperCase() || 'VIDEO',
                              channels: draft.channels?.length ? draft.channels : ['youtube'],
                              aiGenerated: true,
                            }),
                          })
                          const contentData = await contentRes.json()
                          if (!contentData.success) throw new Error(contentData.error || 'Failed to save content')

                          // 2. Create a version
                          setVideoRenderState({ status: 'RENDERING', progress: 40 })
                          const versionRes = await fetch('/api/studio/versions', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              contentId: contentData.data.id,
                              script: draft.videoScript || draft.body,
                              visualPrompt: draft.videoScript || draft.body,
                              config: { duration: durationSeconds, aspectRatio },
                              label: 'Auto-render from wizard',
                            }),
                          })
                          const versionData = await versionRes.json()
                          if (!versionData.success) throw new Error(versionData.error || 'Failed to create version')

                          // 3. Trigger render with template provider (free, instant)
                          setVideoRenderState({ status: 'RENDERING', progress: 60 })
                          const renderRes = await fetch(`/api/studio/versions/${versionData.data.id}/render`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              provider: 'template',
                              durationSeconds,
                              aspectRatio,
                            }),
                          })
                          const renderData = await renderRes.json()
                          if (!renderData.success) throw new Error(renderData.error || 'Render failed')

                          // Template completes instantly
                          setVideoRenderState({
                            status: 'READY',
                            previewUrl: undefined,
                          })
                        } catch (err) {
                          setVideoRenderState({
                            status: 'FAILED',
                            errorMessage: err instanceof Error ? err.message : 'Network error',
                          })
                        }
                      }}
                      onRetry={() => setVideoRenderState(createEmptyVideoRenderState())}
                    />
                  </div>
                )}

                {/* SEO Score Summary (Step 3) */}
                {seoAnalysis && (
                  <div className="max-w-2xl mx-auto mt-8 p-6 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-2xl border border-emerald-200">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div className={cn(
                          'w-14 h-14 rounded-2xl flex items-center justify-center text-white font-bold text-xl shadow-lg',
                          seoAnalysis.score >= 80 ? 'bg-gradient-to-br from-emerald-500 to-teal-500' :
                          seoAnalysis.score >= 60 ? 'bg-gradient-to-br from-amber-500 to-orange-500' :
                          'bg-gradient-to-br from-red-500 to-rose-500'
                        )}>
                          {seoAnalysis.score}
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-900">SEO Score</h4>
                          <p className="text-sm text-slate-500">
                            {seoAnalysis.score >= 80 ? 'Excellent - Ready to perform!' :
                             seoAnalysis.score >= 60 ? 'Good - Minor improvements possible' :
                             'Needs work - Consider suggestions below'}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4 mb-4">
                      {[
                        { label: 'Readability', value: seoAnalysis.readability },
                        { label: 'Headline', value: seoAnalysis.headlineScore },
                        { label: 'Keyword Density', value: `${seoAnalysis.keywordDensity.toFixed(1)}%` },
                      ].map(metric => (
                        <div key={metric.label} className="bg-white p-3 rounded-xl text-center">
                          <p className="text-2xl font-bold text-slate-900">
                            {typeof metric.value === 'number' ? metric.value : metric.value}
                          </p>
                          <p className="text-xs text-slate-500">{metric.label}</p>
                        </div>
                      ))}
                    </div>

                    {seoAnalysis.metaDescription && (
                      <div className="bg-white p-4 rounded-xl">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-semibold text-slate-700">Suggested Meta Description</span>
                          <button
                            onClick={() => copyToClipboard(seoAnalysis.metaDescription)}
                            className="text-xs text-emerald-600 hover:text-emerald-700 flex items-center space-x-1"
                          >
                            <Copy className="w-3 h-3" />
                            <span>Copy</span>
                          </button>
                        </div>
                        <p className="text-sm text-slate-600">{seoAnalysis.metaDescription}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Edit CTA */}
                <div className="flex justify-center mt-6">
                  <button
                    onClick={() => setStep(2)}
                    className="flex items-center space-x-2 text-slate-500 hover:text-apex-primary transition-colors"
                  >
                    <PenTool className="w-4 h-4" />
                    <span>Edit content</span>
                  </button>
                </div>
              </div>
            )}

            {/* Step 4: Schedule */}
            {step === 4 && (
              <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-amber-500 to-orange-500 mb-6 shadow-2xl shadow-orange-500/30">
                    <Calendar className="w-10 h-10 text-white" />
                  </div>
                  <h2 className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
                    Perfect Timing
                  </h2>
                  <p className="text-slate-500 mt-3 text-lg">Choose when to reach your audience</p>
                </div>

                <div className="grid grid-cols-2 gap-8 max-w-3xl mx-auto">
                  {/* Scheduling Options */}
                  <div className="space-y-4">
                    {/* Publish Now */}
                    <button
                      onClick={() => setDraft(prev => ({ ...prev, publishImmediately: true, scheduledFor: null }))}
                      className={cn(
                        'w-full p-6 rounded-2xl border-2 text-left transition-all flex items-center space-x-4',
                        draft.publishImmediately
                          ? 'border-apex-primary bg-apex-primary/5 shadow-lg'
                          : 'border-slate-200 hover:border-slate-300 hover:shadow-md'
                      )}
                    >
                      <div className={cn(
                        'p-4 rounded-2xl transition-colors',
                        draft.publishImmediately ? 'bg-gradient-to-br from-apex-primary to-purple-500 text-white shadow-lg' : 'bg-slate-100 text-slate-500'
                      )}>
                        <Rocket className="w-7 h-7" />
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-lg text-slate-900">Publish Now</p>
                        <p className="text-sm text-slate-500">Send to approval queue immediately</p>
                      </div>
                      {draft.publishImmediately && <Check className="w-6 h-6 text-apex-primary" />}
                    </button>

                    {/* Schedule Later */}
                    <div
                      className={cn(
                        'p-6 rounded-2xl border-2 transition-all',
                        !draft.publishImmediately
                          ? 'border-apex-primary bg-apex-primary/5 shadow-lg'
                          : 'border-slate-200'
                      )}
                    >
                      <button
                        onClick={() => setDraft(prev => ({ ...prev, publishImmediately: false }))}
                        className="w-full flex items-center space-x-4 text-left"
                      >
                        <div className={cn(
                          'p-4 rounded-2xl transition-colors',
                          !draft.publishImmediately ? 'bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-lg' : 'bg-slate-100 text-slate-500'
                        )}>
                          <Calendar className="w-7 h-7" />
                        </div>
                        <div className="flex-1">
                          <p className="font-bold text-lg text-slate-900">Schedule</p>
                          <p className="text-sm text-slate-500">Pick the perfect time</p>
                        </div>
                        {!draft.publishImmediately && <Check className="w-6 h-6 text-apex-primary" />}
                      </button>

                      {!draft.publishImmediately && (
                        <div className="mt-6 pt-6 border-t border-slate-200 grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Date</label>
                            <input
                              type="date"
                              value={draft.scheduledFor?.toISOString().split('T')[0] || ''}
                              onChange={(e) => {
                                const date = new Date(e.target.value)
                                if (draft.scheduledFor) {
                                  date.setHours(draft.scheduledFor.getHours())
                                  date.setMinutes(draft.scheduledFor.getMinutes())
                                } else {
                                  date.setHours(10, 0, 0, 0)
                                }
                                setDraft(prev => ({ ...prev, scheduledFor: date }))
                              }}
                              className="input rounded-xl"
                              min={new Date().toISOString().split('T')[0]}
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Time</label>
                            <input
                              type="time"
                              value={draft.scheduledFor ?
                                `${String(draft.scheduledFor.getHours()).padStart(2, '0')}:${String(draft.scheduledFor.getMinutes()).padStart(2, '0')}`
                                : '10:00'
                              }
                              onChange={(e) => {
                                const [hours, minutes] = e.target.value.split(':').map(Number)
                                const date = draft.scheduledFor ? new Date(draft.scheduledFor) : new Date()
                                date.setHours(hours)
                                date.setMinutes(minutes)
                                setDraft(prev => ({ ...prev, scheduledFor: date }))
                              }}
                              className="input rounded-xl"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Optimal Times Sidebar */}
                  <div className="space-y-4">
                    <div className="p-6 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl border border-emerald-200">
                      <div className="flex items-center space-x-2 mb-4">
                        <TrendingUp className="w-5 h-5 text-emerald-600" />
                        <h4 className="font-bold text-slate-900">AI-Recommended Times</h4>
                      </div>
                      <p className="text-sm text-slate-600 mb-4">Based on your audience engagement patterns</p>
                      <div className="space-y-2">
                        {optimalTimes.slice(0, 4).map((time, i) => (
                          <button
                            key={i}
                            onClick={() => {
                              const date = new Date()
                              const dayOffset = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].indexOf(time.day)
                              const currentDay = date.getDay()
                              const daysUntil = (dayOffset - currentDay + 7) % 7 || 7
                              date.setDate(date.getDate() + daysUntil)
                              const [hours, period] = time.time.split(' ')
                              const [h, m] = hours.split(':').map(Number)
                              date.setHours(period === 'PM' && h !== 12 ? h + 12 : h, m || 0, 0, 0)
                              setDraft(prev => ({ ...prev, scheduledFor: date, publishImmediately: false }))
                            }}
                            className="w-full flex items-center justify-between p-3 bg-white rounded-xl hover:shadow-md transition-all"
                          >
                            <div className="flex items-center space-x-3">
                              <div className={cn(
                                'w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold text-white',
                                i === 0 ? 'bg-emerald-500' : 'bg-slate-300'
                              )}>
                                {i + 1}
                              </div>
                              <div className="text-left">
                                <p className="font-medium text-slate-900">{time.day}</p>
                                <p className="text-sm text-slate-500">{time.time}</p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <div className="w-16 h-2 bg-slate-100 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-emerald-500 rounded-full"
                                  style={{ width: `${time.score}%` }}
                                />
                              </div>
                              <span className="text-sm font-medium text-emerald-600">{time.score}%</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Summary */}
                    {draft.scheduledFor && !draft.publishImmediately && (
                      <div className="p-6 bg-gradient-to-r from-apex-primary/10 to-purple-500/10 rounded-2xl border border-apex-primary/20">
                        <div className="flex items-center space-x-3 mb-2">
                          <Clock className="w-6 h-6 text-apex-primary" />
                          <span className="font-bold text-slate-900">Scheduled For</span>
                        </div>
                        <p className="text-lg text-slate-700">
                          <strong>{draft.scheduledFor.toLocaleDateString('en-US', {
                            weekday: 'long',
                            month: 'long',
                            day: 'numeric',
                          })}</strong>
                        </p>
                        <p className="text-apex-primary font-medium">
                          {draft.scheduledFor.toLocaleTimeString('en-US', {
                            hour: 'numeric',
                            minute: '2-digit',
                            hour12: true
                          })}
                        </p>
                      </div>
                    )}

                    {/* Video Publish Gate */}
                    {isVideoContent && (
                      <div className="space-y-3">
                        {videoRenderState.status === 'READY' && !textOnlyPublish && (
                          <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center space-x-3">
                            <Check className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                            <span className="text-sm font-medium text-emerald-700">Video preview ready — good to publish</span>
                          </div>
                        )}
                        {videoRenderState.status !== 'READY' && !textOnlyPublish && (
                          <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
                              <span className="text-sm font-medium text-amber-700">Video preview required before publishing</span>
                            </div>
                            <button
                              onClick={() => setStep(3)}
                              className="text-sm font-semibold text-amber-700 hover:text-amber-900 underline underline-offset-2"
                            >
                              Go to Preview
                            </button>
                          </div>
                        )}
                        <label className="flex items-center space-x-3 p-3 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors">
                          <input
                            type="checkbox"
                            checked={textOnlyPublish}
                            onChange={(e) => setTextOnlyPublish(e.target.checked)}
                            className="w-4 h-4 rounded border-slate-300 text-apex-primary focus:ring-apex-primary"
                          />
                          <span className="text-sm text-slate-600">Publish as text-only (skip video preview requirement)</span>
                        </label>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between mt-8">
        <button
          onClick={step === 1 ? onCancel : handleBack}
          className="btn-secondary flex items-center space-x-2 px-6 py-3 rounded-xl"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{step === 1 ? 'Cancel' : 'Back'}</span>
        </button>

        {step < totalSteps ? (
          <button
            onClick={handleNext}
            disabled={!canProceed()}
            className={cn(
              'flex items-center space-x-3 px-8 py-4 rounded-2xl font-bold text-lg transition-all',
              canProceed()
                ? 'bg-gradient-to-r from-apex-primary to-purple-500 text-white hover:shadow-2xl hover:shadow-apex-primary/30 hover:-translate-y-1'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            )}
          >
            <span>Continue</span>
            <ArrowRight className="w-5 h-5" />
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={!canProceed() || isSaving}
            className={cn(
              'flex items-center space-x-3 px-8 py-4 rounded-2xl font-bold text-lg transition-all',
              canProceed() && !isSaving
                ? 'bg-gradient-to-r from-apex-primary via-purple-500 to-pink-500 text-white hover:shadow-2xl hover:shadow-purple-500/30 hover:-translate-y-1'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            )}
          >
            {isSaving ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <span>{draft.publishImmediately ? 'Submit for Approval' : 'Schedule Content'}</span>
                <Sparkles className="w-5 h-5" />
              </>
            )}
          </button>
        )}
      </div>
    </div>
  )
}
