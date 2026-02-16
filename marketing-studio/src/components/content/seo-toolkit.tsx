'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Search,
  TrendingUp,
  Target,
  BarChart3,
  Globe,
  Hash,
  FileText,
  Lightbulb,
  Check,
  AlertCircle,
  Copy,
  RefreshCw,
  Loader2,
  Sparkles,
  Zap,
  Eye,
  Users,
  Clock,
  Award,
  BookOpen,
  Link as LinkIcon,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface SeoToolkitProps {
  title: string
  content: string
  keywords: string[]
  contentId?: string
  onKeywordsChange?: (keywords: string[]) => void
  onMetaDescriptionChange?: (description: string) => void
  onTitleChange?: (title: string) => void
  onBodyChange?: (body: string) => void
}

interface KeywordAnalysis {
  keyword: string
  volume: number
  difficulty: number
  trend: 'up' | 'down' | 'stable'
  inTitle: boolean
  inContent: boolean
  density: number
}

interface ContentAnalysis {
  wordCount: number
  readingTime: number
  sentenceCount: number
  avgSentenceLength: number
  paragraphCount: number
  fleschScore: number
  gradeLevel: string
}

interface SeoScore {
  overall: number
  title: number
  meta: number
  keywords: number
  readability: number
  structure: number
}

// Flesch Reading Ease calculation
function calculateFleschScore(text: string): number {
  const words = text.split(/\s+/).filter(w => w.length > 0)
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0)
  const syllables = words.reduce((count, word) => {
    return count + countSyllables(word)
  }, 0)

  if (words.length === 0 || sentences.length === 0) return 0

  const score = 206.835 - 1.015 * (words.length / sentences.length) - 84.6 * (syllables / words.length)
  return Math.max(0, Math.min(100, Math.round(score)))
}

function countSyllables(word: string): number {
  word = word.toLowerCase().replace(/[^a-z]/g, '')
  if (word.length <= 3) return 1
  word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '')
  word = word.replace(/^y/, '')
  const matches = word.match(/[aeiouy]{1,2}/g)
  return matches ? matches.length : 1
}

function getGradeLevel(fleschScore: number): string {
  if (fleschScore >= 90) return '5th Grade'
  if (fleschScore >= 80) return '6th Grade'
  if (fleschScore >= 70) return '7th Grade'
  if (fleschScore >= 60) return '8th-9th Grade'
  if (fleschScore >= 50) return '10th-12th Grade'
  if (fleschScore >= 30) return 'College'
  return 'Graduate'
}

export function SeoToolkit({
  title,
  content,
  keywords,
  contentId,
  onKeywordsChange,
  onMetaDescriptionChange,
  onTitleChange,
  onBodyChange,
}: SeoToolkitProps) {
  const [activeTab, setActiveTab] = useState<'analysis' | 'keywords' | 'optimization' | 'preview'>('analysis')
  const [metaDescription, setMetaDescription] = useState('')
  const [newKeyword, setNewKeyword] = useState('')
  const [isGeneratingMeta, setIsGeneratingMeta] = useState(false)
  const [keywordAnalysis, setKeywordAnalysis] = useState<KeywordAnalysis[]>([])
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    title: true,
    meta: true,
    keywords: true,
    readability: false,
    structure: false,
  })
  const [searchResults, setSearchResults] = useState<Array<{ title: string; url: string; description: string }>>([])
  const [isSearching, setIsSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)

  // SEO Optimize actions state
  type OptimizeData = {
    titles?: string[]
    keywords?: Array<{ keyword: string; type?: string }>
    improved?: string
    changes?: string[]
    links?: Array<{ anchorText: string; targetTopic: string; reason: string }>
  }
  const [optimizeLoading, setOptimizeLoading] = useState<string | null>(null)
  const [optimizeResults, setOptimizeResults] = useState<Record<string, OptimizeData>>({})
  const [optimizeError, setOptimizeError] = useState<string | null>(null)
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const [appliedField, setAppliedField] = useState<string | null>(null)
  const [isExpandingContent, setIsExpandingContent] = useState(false)

  // Calculate content analysis
  const contentAnalysis: ContentAnalysis = {
    wordCount: content.split(/\s+/).filter(w => w.length > 0).length,
    readingTime: Math.ceil(content.split(/\s+/).filter(w => w.length > 0).length / 200),
    sentenceCount: content.split(/[.!?]+/).filter(s => s.trim().length > 0).length,
    avgSentenceLength: Math.round(
      content.split(/\s+/).filter(w => w.length > 0).length /
      Math.max(1, content.split(/[.!?]+/).filter(s => s.trim().length > 0).length)
    ),
    paragraphCount: content.split(/\n\n+/).filter(p => p.trim().length > 0).length,
    fleschScore: calculateFleschScore(content),
    gradeLevel: getGradeLevel(calculateFleschScore(content)),
  }

  // Calculate keyword analysis
  useEffect(() => {
    const analysis: KeywordAnalysis[] = keywords.map(keyword => {
      const lowerContent = content.toLowerCase()
      const lowerTitle = title.toLowerCase()
      const lowerKeyword = keyword.toLowerCase()
      const keywordCount = (lowerContent.match(new RegExp(lowerKeyword, 'g')) || []).length
      const wordCount = content.split(/\s+/).length

      return {
        keyword,
        volume: Math.floor(Math.random() * 10000) + 100, // Simulated
        difficulty: Math.floor(Math.random() * 100), // Simulated
        trend: ['up', 'down', 'stable'][Math.floor(Math.random() * 3)] as 'up' | 'down' | 'stable',
        inTitle: lowerTitle.includes(lowerKeyword),
        inContent: lowerContent.includes(lowerKeyword),
        density: wordCount > 0 ? Math.round((keywordCount / wordCount) * 1000) / 10 : 0,
      }
    })
    setKeywordAnalysis(analysis)
  }, [keywords, content, title])

  // Calculate SEO scores
  const seoScore: SeoScore = {
    title: Math.min(100, Math.max(0,
      (title.length >= 30 && title.length <= 60 ? 40 : title.length > 0 ? 20 : 0) +
      (keywords.some(k => title.toLowerCase().includes(k.toLowerCase())) ? 40 : 0) +
      (title.match(/\d/) ? 10 : 0) +
      (title.match(/[!?]/) ? 10 : 0)
    )),
    meta: Math.min(100, Math.max(0,
      (metaDescription.length >= 120 && metaDescription.length <= 160 ? 50 : metaDescription.length > 0 ? 25 : 0) +
      (keywords.some(k => metaDescription.toLowerCase().includes(k.toLowerCase())) ? 30 : 0) +
      (metaDescription.includes(title.split(' ')[0]) ? 20 : 0)
    )),
    keywords: Math.min(100, Math.max(0,
      (keywords.length >= 3 && keywords.length <= 7 ? 30 : keywords.length > 0 ? 15 : 0) +
      (keywordAnalysis.filter(k => k.inContent).length / Math.max(1, keywords.length) * 40) +
      (keywordAnalysis.filter(k => k.density >= 1 && k.density <= 3).length / Math.max(1, keywords.length) * 30)
    )),
    readability: Math.min(100, Math.max(0,
      (contentAnalysis.fleschScore >= 60 ? 50 : contentAnalysis.fleschScore >= 40 ? 30 : 10) +
      (contentAnalysis.avgSentenceLength <= 20 ? 30 : contentAnalysis.avgSentenceLength <= 25 ? 15 : 0) +
      (contentAnalysis.paragraphCount >= 3 ? 20 : contentAnalysis.paragraphCount >= 1 ? 10 : 0)
    )),
    structure: Math.min(100, Math.max(0,
      (content.includes('\n\n') ? 30 : 0) +
      (contentAnalysis.wordCount >= 300 ? 30 : contentAnalysis.wordCount >= 100 ? 15 : 0) +
      (content.match(/[•\-\*]\s/g)?.length ? 20 : 0) +
      (content.match(/\d+\./g)?.length ? 20 : 0)
    )),
    overall: 0,
  }
  seoScore.overall = Math.round((seoScore.title + seoScore.meta + seoScore.keywords + seoScore.readability + seoScore.structure) / 5)

  const addKeyword = () => {
    if (newKeyword.trim() && !keywords.includes(newKeyword.trim())) {
      onKeywordsChange?.([...keywords, newKeyword.trim()])
      setNewKeyword('')
    }
  }

  const removeKeyword = (keyword: string) => {
    onKeywordsChange?.(keywords.filter(k => k !== keyword))
  }

  const runCompetitiveResearch = async () => {
    if (!title.trim() && keywords.length === 0) return
    setIsSearching(true)
    setSearchError(null)
    try {
      // Build query from keywords + title context for brand-scoped results
      const keywordPart = keywords.length > 0 ? keywords.slice(0, 3).join(' ') : ''
      const titlePart = title.trim().slice(0, 60)
      const query = keywordPart ? `${keywordPart} ${titlePart}`.trim() : titlePart
      const res = await fetch('/api/studio/integrations/brave/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, count: 8, freshness: 'month' }),
      })
      const data = await res.json()
      if (data.success) {
        setSearchResults(data.data.results)
      } else {
        setSearchError(data.error || 'Search failed')
      }
    } catch {
      setSearchError('Brave Search not available. Add your API key in Integrations.')
    } finally {
      setIsSearching(false)
    }
  }

  const generateMetaDescription = async () => {
    setIsGeneratingMeta(true)
    try {
      const response = await fetch('/api/studio/mia/generate-meta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          body: content.slice(0, 500),
          keywords,
        }),
      })
      const data = await response.json()
      if (data.success && data.metaDescription) {
        setMetaDescription(data.metaDescription)
        onMetaDescriptionChange?.(data.metaDescription)
      }
    } catch (e) {
      console.error('Failed to generate meta description:', e)
    } finally {
      setIsGeneratingMeta(false)
    }
  }

  const expandContentWithMia = async () => {
    setIsExpandingContent(true)
    try {
      const res = await fetch('/api/studio/seo/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'improve-readability', title, content, keywords }),
      })
      const data = await res.json()
      if (data.success && data.data?.improved) {
        onBodyChange?.(data.data.improved)
        setAppliedField('expand')
        setTimeout(() => setAppliedField(null), 2000)
      }
    } catch (e) {
      console.error('Failed to expand content:', e)
    } finally {
      setIsExpandingContent(false)
    }
  }

  const runOptimizeAction = useCallback(async (action: string) => {
    setOptimizeLoading(action)
    setOptimizeError(null)
    try {
      const res = await fetch('/api/studio/seo/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, title, content, keywords }),
      })
      const data = await res.json()
      if (data.success) {
        setOptimizeResults(prev => ({ ...prev, [action]: data.data as OptimizeData }))
      } else {
        setOptimizeError(data.error || 'Optimization failed')
      }
    } catch {
      setOptimizeError('AI provider not available. Check your API keys in Integrations.')
    } finally {
      setOptimizeLoading(null)
    }
  }, [title, content, keywords])

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text)
    setCopiedField(field)
    setTimeout(() => setCopiedField(null), 2000)
  }

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }))
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-600'
    if (score >= 60) return 'text-amber-600'
    return 'text-red-600'
  }

  const getScoreBg = (score: number) => {
    if (score >= 80) return 'bg-emerald-500'
    if (score >= 60) return 'bg-amber-500'
    return 'bg-red-500'
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="p-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Search className="w-6 h-6" />
            <div>
              <h3 className="font-bold">SEO & Marketing Toolkit</h3>
              <p className="text-sm text-white/80">Optimize your content for maximum reach</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <div className={cn(
              'w-14 h-14 rounded-xl flex items-center justify-center text-xl font-bold',
              seoScore.overall >= 80 ? 'bg-emerald-500' :
              seoScore.overall >= 60 ? 'bg-amber-500' : 'bg-red-500'
            )}>
              {seoScore.overall}
            </div>
            <div className="text-right">
              <p className="text-sm font-medium">
                {seoScore.overall >= 80 ? 'Excellent' :
                 seoScore.overall >= 60 ? 'Good' :
                 seoScore.overall >= 40 ? 'Needs Work' : 'Poor'}
              </p>
              <p className="text-xs text-white/70">
                {seoScore.overall >= 80 ? 'Ready to publish!' :
                 seoScore.overall >= 60 ? 'A few tweaks will help' :
                 seoScore.overall >= 40 ? 'Check the Optimize tab' : 'Use Optimize to improve'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200">
        {[
          { id: 'analysis', label: 'Analysis', icon: BarChart3 },
          { id: 'keywords', label: 'Keywords', icon: Hash },
          { id: 'optimization', label: 'Optimize', icon: Zap },
          { id: 'preview', label: 'Preview', icon: Eye },
        ].map(tab => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={cn(
                'flex-1 flex items-center justify-center space-x-2 px-4 py-3 text-sm font-medium transition-colors',
                activeTab === tab.id
                  ? 'border-b-2 border-purple-500 text-purple-600 bg-purple-50'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
              )}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          )
        })}
      </div>

      {/* Content */}
      <div className="p-6">
        {/* Analysis Tab */}
        {activeTab === 'analysis' && (
          <div className="space-y-6">
            {/* Score Cards */}
            <div className="grid grid-cols-5 gap-3">
              {[
                { label: 'Title', score: seoScore.title, icon: FileText },
                { label: 'Meta', score: seoScore.meta, icon: Globe },
                { label: 'Keywords', score: seoScore.keywords, icon: Hash },
                { label: 'Readability', score: seoScore.readability, icon: BookOpen },
                { label: 'Structure', score: seoScore.structure, icon: Target },
              ].map(item => {
                const Icon = item.icon
                return (
                  <div key={item.label} className="p-3 bg-slate-50 rounded-xl text-center">
                    <Icon className={cn('w-5 h-5 mx-auto mb-1', getScoreColor(item.score))} />
                    <p className={cn('text-xl font-bold', getScoreColor(item.score))}>{item.score}</p>
                    <p className="text-xs text-slate-500">{item.label}</p>
                  </div>
                )
              })}
            </div>

            {/* Content Stats */}
            <div className="grid grid-cols-4 gap-4">
              <div className="p-4 bg-purple-50 rounded-xl">
                <p className="text-2xl font-bold text-purple-600">{contentAnalysis.wordCount}</p>
                <p className="text-xs text-slate-600">Words</p>
              </div>
              <div className="p-4 bg-blue-50 rounded-xl">
                <p className="text-2xl font-bold text-blue-600">{contentAnalysis.readingTime} min</p>
                <p className="text-xs text-slate-600">Read Time</p>
              </div>
              <div className="p-4 bg-emerald-50 rounded-xl">
                <p className="text-2xl font-bold text-emerald-600">{contentAnalysis.fleschScore}</p>
                <p className="text-xs text-slate-600">Readability</p>
              </div>
              <div className="p-4 bg-amber-50 rounded-xl">
                <p className="text-2xl font-bold text-amber-600">{contentAnalysis.gradeLevel}</p>
                <p className="text-xs text-slate-600">Reading Level</p>
              </div>
            </div>

            {/* Detailed Checklist */}
            <div className="space-y-3">
              {/* Title Section */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <button
                  onClick={() => toggleSection('title')}
                  className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <FileText className={cn('w-5 h-5', getScoreColor(seoScore.title))} />
                    <span className="font-medium">Title Optimization</span>
                    <span className={cn('text-sm font-bold', getScoreColor(seoScore.title))}>{seoScore.title}/100</span>
                  </div>
                  {expandedSections.title ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                {expandedSections.title && (
                  <div className="p-4 space-y-2">
                    <CheckItem
                      checked={title.length >= 30 && title.length <= 60}
                      label={`Title length: ${title.length} characters (ideal: 30-60)`}
                    />
                    <CheckItem
                      checked={keywords.some(k => title.toLowerCase().includes(k.toLowerCase()))}
                      label="Primary keyword in title"
                    />
                    <CheckItem
                      checked={!!title.match(/\d/)}
                      label="Contains numbers (increases CTR)"
                    />
                    <CheckItem
                      checked={!!title.match(/[!?]/)}
                      label="Uses power punctuation"
                    />
                  </div>
                )}
              </div>

              {/* Meta Section */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <button
                  onClick={() => toggleSection('meta')}
                  className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <Globe className={cn('w-5 h-5', getScoreColor(seoScore.meta))} />
                    <span className="font-medium">Meta Description</span>
                    <span className={cn('text-sm font-bold', getScoreColor(seoScore.meta))}>{seoScore.meta}/100</span>
                  </div>
                  {expandedSections.meta ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                {expandedSections.meta && (
                  <div className="p-4 space-y-3">
                    <div className="flex items-center space-x-2">
                      <input
                        type="text"
                        value={metaDescription}
                        onChange={(e) => {
                          setMetaDescription(e.target.value)
                          onMetaDescriptionChange?.(e.target.value)
                        }}
                        placeholder="Enter meta description (150-160 chars ideal)"
                        className="flex-1 px-3 py-2 rounded-lg border border-slate-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none text-sm"
                      />
                      <button
                        onClick={generateMetaDescription}
                        disabled={isGeneratingMeta}
                        className="px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center space-x-1"
                      >
                        {isGeneratingMeta ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <Sparkles className="w-4 h-4" />
                        )}
                        <span>Generate</span>
                      </button>
                    </div>
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>{metaDescription.length}/160 characters</span>
                      <span className={metaDescription.length >= 120 && metaDescription.length <= 160 ? 'text-emerald-600' : 'text-amber-600'}>
                        {metaDescription.length >= 120 && metaDescription.length <= 160 ? 'Perfect length' : 'Aim for 120-160 chars'}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Keywords Tab */}
        {activeTab === 'keywords' && (
          <div className="space-y-6">
            {/* Add Keyword */}
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={newKeyword}
                onChange={(e) => setNewKeyword(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addKeyword()}
                placeholder="Add a keyword..."
                className="flex-1 px-4 py-3 rounded-xl border border-slate-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none"
              />
              <button
                onClick={addKeyword}
                className="px-6 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 font-medium"
              >
                Add
              </button>
            </div>

            {/* Keyword Analysis Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Keyword</th>
                    <th className="text-center py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Volume</th>
                    <th className="text-center py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Difficulty</th>
                    <th className="text-center py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Trend</th>
                    <th className="text-center py-3 px-4 text-xs font-semibold text-slate-500 uppercase">In Title</th>
                    <th className="text-center py-3 px-4 text-xs font-semibold text-slate-500 uppercase">In Content</th>
                    <th className="text-center py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Density</th>
                    <th className="text-center py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {keywordAnalysis.map((kw, i) => (
                    <tr key={i} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-3 px-4 font-medium text-slate-900">{kw.keyword}</td>
                      <td className="py-3 px-4 text-center text-sm text-slate-600">{kw.volume.toLocaleString()}</td>
                      <td className="py-3 px-4 text-center">
                        <span className={cn(
                          'text-xs font-medium px-2 py-1 rounded-full',
                          kw.difficulty < 30 ? 'bg-emerald-100 text-emerald-700' :
                          kw.difficulty < 60 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                        )}>
                          {kw.difficulty}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <TrendingUp className={cn(
                          'w-4 h-4 mx-auto',
                          kw.trend === 'up' ? 'text-emerald-600' :
                          kw.trend === 'down' ? 'text-red-600 rotate-180' : 'text-slate-400'
                        )} />
                      </td>
                      <td className="py-3 px-4 text-center">
                        {kw.inTitle ? <Check className="w-4 h-4 text-emerald-600 mx-auto" /> : <AlertCircle className="w-4 h-4 text-slate-300 mx-auto" />}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {kw.inContent ? <Check className="w-4 h-4 text-emerald-600 mx-auto" /> : <AlertCircle className="w-4 h-4 text-slate-300 mx-auto" />}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={cn(
                          'text-xs font-medium',
                          kw.density >= 1 && kw.density <= 3 ? 'text-emerald-600' : 'text-amber-600'
                        )}>
                          {kw.density}%
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => removeKeyword(kw.keyword)}
                          className="text-slate-400 hover:text-red-600"
                        >
                          ×
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Competitive Research via Brave Search */}
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <div className="flex items-center justify-between p-4 bg-slate-50">
                <div className="flex items-center space-x-2">
                  <Globe className="w-5 h-5 text-orange-500" />
                  <span className="font-medium text-sm">Competitive Research</span>
                  <span className="text-[10px] px-1.5 py-0.5 bg-orange-100 text-orange-700 rounded-full font-medium">Brave Search</span>
                </div>
                <button
                  onClick={runCompetitiveResearch}
                  disabled={isSearching || (!title.trim() && keywords.length === 0)}
                  className="px-3 py-1.5 bg-orange-600 text-white text-sm rounded-lg hover:bg-orange-700 disabled:opacity-50 flex items-center space-x-1"
                >
                  {isSearching ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Search className="w-3.5 h-3.5" />
                  )}
                  <span>{isSearching ? 'Searching...' : 'Research'}</span>
                </button>
              </div>
              {searchError && (
                <div className="px-4 py-2 bg-amber-50 text-amber-700 text-xs flex items-center space-x-1">
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>{searchError}</span>
                </div>
              )}
              {searchResults.length > 0 && (
                <div className="divide-y divide-slate-100">
                  {searchResults.map((r, i) => (
                    <div key={i} className="p-3 hover:bg-slate-50 transition-colors">
                      <a
                        href={r.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-medium text-blue-700 hover:underline line-clamp-1 flex items-center space-x-1"
                      >
                        <span>{r.title}</span>
                        <ExternalLink className="w-3 h-3 flex-shrink-0" />
                      </a>
                      <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{r.description}</p>
                    </div>
                  ))}
                </div>
              )}
              {searchResults.length === 0 && !searchError && (
                <div className="px-4 py-3 text-xs text-slate-500">
                  Click &quot;Research&quot; to find competitor content for your keywords.
                </div>
              )}
            </div>

            {keywords.length === 0 && (
              <div className="text-center py-8 text-slate-500">
                <Hash className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                <p>No keywords added yet</p>
                <p className="text-sm">Add keywords to track their usage and optimize your content</p>
              </div>
            )}
          </div>
        )}

        {/* Optimization Tab */}
        {activeTab === 'optimization' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              {/* Suggestions */}
              <div>
                <h4 className="font-bold text-slate-900 mb-4 flex items-center space-x-2">
                  <Lightbulb className="w-5 h-5 text-amber-500" />
                  <span>Optimization Suggestions</span>
                </h4>
                <div className="space-y-3">
                  {seoScore.title < 80 && (
                    <SuggestionCard
                      type="warning"
                      title="Improve Title"
                      suggestion="Add your primary keyword to the title and aim for 50-60 characters."
                      onApply={() => runOptimizeAction('generate-title')}
                      applyLabel="Generate SEO Title"
                    />
                  )}
                  {seoScore.meta < 60 && (
                    <SuggestionCard
                      type="error"
                      title="Add Meta Description"
                      suggestion="Write a compelling meta description with your target keyword."
                      onApply={generateMetaDescription}
                      applyLabel="Generate Meta"
                    />
                  )}
                  {contentAnalysis.wordCount < 300 && (
                    <SuggestionCard
                      type="warning"
                      title="Increase Content Length"
                      suggestion={`Currently ${contentAnalysis.wordCount} words. Longer content (1000+ words) typically ranks better.`}
                      onApply={onBodyChange ? expandContentWithMia : () => runOptimizeAction('improve-readability')}
                      applyLabel={isExpandingContent ? 'Expanding...' : 'Expand with Mia'}
                    />
                  )}
                  {contentAnalysis.avgSentenceLength > 25 && (
                    <SuggestionCard
                      type="tip"
                      title="Simplify Sentences"
                      suggestion="Break down long sentences for better readability. Aim for 15-20 words per sentence."
                      onApply={() => runOptimizeAction('improve-readability')}
                      applyLabel="Simplify Now"
                    />
                  )}
                  {keywordAnalysis.every(k => k.density < 1) && keywords.length > 0 && (
                    <SuggestionCard
                      type="warning"
                      title="Increase Keyword Usage"
                      suggestion="Your keywords appear too infrequently. Aim for 1-3% keyword density."
                      onApply={() => runOptimizeAction('suggest-keywords')}
                      applyLabel="Suggest Keywords"
                    />
                  )}
                  {seoScore.overall >= 80 && (
                    <SuggestionCard
                      type="success"
                      title="Great Job!"
                      suggestion="Your content is well-optimized for search engines."
                    />
                  )}
                </div>
              </div>

              {/* Quick Actions */}
              <div>
                <h4 className="font-bold text-slate-900 mb-4 flex items-center space-x-2">
                  <Zap className="w-5 h-5 text-purple-500" />
                  <span>Quick Actions</span>
                </h4>
                {optimizeError && (
                  <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center space-x-1">
                    <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>{optimizeError}</span>
                  </div>
                )}
                <div className="space-y-3">
                  <button
                    onClick={() => runOptimizeAction('generate-title')}
                    disabled={optimizeLoading !== null}
                    className="w-full p-4 bg-purple-50 hover:bg-purple-100 rounded-xl text-left transition-colors flex items-center space-x-3 disabled:opacity-50"
                  >
                    {optimizeLoading === 'generate-title' ? (
                      <Loader2 className="w-5 h-5 text-purple-600 animate-spin" />
                    ) : (
                      <Sparkles className="w-5 h-5 text-purple-600" />
                    )}
                    <div>
                      <p className="font-medium text-slate-900">Generate SEO Title</p>
                      <p className="text-xs text-slate-500">Create an optimized title with AI</p>
                    </div>
                  </button>
                  {/* Generate Title Results */}
                  {optimizeResults['generate-title'] && (
                    <div className="ml-2 p-3 bg-purple-50 border border-purple-200 rounded-lg space-y-2">
                      {(optimizeResults['generate-title'].titles ?? []).map((t, i) => (
                        <div key={i} className="flex items-center justify-between gap-2">
                          <p className="text-sm text-slate-800 flex-1">{t}</p>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            {onTitleChange && (
                              <button
                                onClick={() => {
                                  onTitleChange(t)
                                  setAppliedField(`title-${i}`)
                                  setTimeout(() => setAppliedField(null), 2000)
                                }}
                                className="text-xs px-2 py-0.5 rounded-full bg-purple-600 text-white hover:bg-purple-700 transition-colors flex items-center gap-1"
                              >
                                {appliedField === `title-${i}` ? <Check className="w-3 h-3" /> : <Zap className="w-3 h-3" />}
                                {appliedField === `title-${i}` ? 'Applied' : 'Apply'}
                              </button>
                            )}
                            <button
                              onClick={() => copyToClipboard(t, `title-${i}`)}
                              className="p-1 text-purple-500 hover:text-purple-700"
                              title="Copy"
                            >
                              {copiedField === `title-${i}` ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <button
                    onClick={() => runOptimizeAction('suggest-keywords')}
                    disabled={optimizeLoading !== null}
                    className="w-full p-4 bg-blue-50 hover:bg-blue-100 rounded-xl text-left transition-colors flex items-center space-x-3 disabled:opacity-50"
                  >
                    {optimizeLoading === 'suggest-keywords' ? (
                      <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                    ) : (
                      <Hash className="w-5 h-5 text-blue-600" />
                    )}
                    <div>
                      <p className="font-medium text-slate-900">Suggest Keywords</p>
                      <p className="text-xs text-slate-500">Find related keywords to target</p>
                    </div>
                  </button>
                  {/* Keyword Suggestions Results */}
                  {optimizeResults['suggest-keywords'] && (
                    <div className="ml-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex flex-wrap gap-1.5">
                        {(optimizeResults['suggest-keywords'].keywords ?? []).map((k, i) => (
                          <button
                            key={i}
                            onClick={() => {
                              if (!keywords.includes(k.keyword)) {
                                onKeywordsChange?.([...keywords, k.keyword])
                              }
                            }}
                            className={cn(
                              'text-xs px-2 py-1 rounded-full border transition-colors',
                              keywords.includes(k.keyword)
                                ? 'bg-blue-200 border-blue-300 text-blue-800 cursor-default'
                                : 'bg-white border-blue-200 text-blue-700 hover:bg-blue-100 cursor-pointer'
                            )}
                            title={keywords.includes(k.keyword) ? 'Already added' : 'Click to add'}
                          >
                            {keywords.includes(k.keyword) ? <Check className="w-3 h-3 inline mr-0.5" /> : '+ '}
                            {k.keyword}
                            {k.type && <span className="ml-1 opacity-60">({k.type})</span>}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <button
                    onClick={() => runOptimizeAction('improve-readability')}
                    disabled={optimizeLoading !== null}
                    className="w-full p-4 bg-emerald-50 hover:bg-emerald-100 rounded-xl text-left transition-colors flex items-center space-x-3 disabled:opacity-50"
                  >
                    {optimizeLoading === 'improve-readability' ? (
                      <Loader2 className="w-5 h-5 text-emerald-600 animate-spin" />
                    ) : (
                      <BookOpen className="w-5 h-5 text-emerald-600" />
                    )}
                    <div>
                      <p className="font-medium text-slate-900">Improve Readability</p>
                      <p className="text-xs text-slate-500">Simplify complex sentences</p>
                    </div>
                  </button>
                  {/* Readability Results */}
                  {optimizeResults['improve-readability'] && (
                    <div className="ml-2 p-3 bg-emerald-50 border border-emerald-200 rounded-lg space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-medium text-emerald-700">Improved Version</p>
                        <div className="flex items-center gap-2">
                          {onBodyChange && optimizeResults['improve-readability'].improved && (
                            <button
                              onClick={() => {
                                onBodyChange!(optimizeResults['improve-readability'].improved!)
                                setAppliedField('readability-apply')
                                setTimeout(() => setAppliedField(null), 2000)
                              }}
                              className="text-xs px-2.5 py-1 rounded-full bg-emerald-600 text-white hover:bg-emerald-700 transition-colors flex items-center gap-1"
                            >
                              {appliedField === 'readability-apply' ? <Check className="w-3 h-3" /> : <Zap className="w-3 h-3" />}
                              {appliedField === 'readability-apply' ? 'Applied!' : 'Apply Improved Version'}
                            </button>
                          )}
                          <button
                            onClick={() => copyToClipboard(
                              optimizeResults['improve-readability'].improved ?? '',
                              'readability'
                            )}
                            className="text-xs text-emerald-600 hover:text-emerald-800 flex items-center gap-1"
                          >
                            {copiedField === 'readability' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                            {copiedField === 'readability' ? 'Copied' : 'Copy'}
                          </button>
                        </div>
                      </div>
                      <p className="text-sm text-slate-700 whitespace-pre-wrap max-h-40 overflow-y-auto">
                        {optimizeResults['improve-readability'].improved}
                      </p>
                      {(optimizeResults['improve-readability'].changes ?? []).length > 0 && (
                        <div className="pt-2 border-t border-emerald-200">
                          <p className="text-xs font-medium text-emerald-700 mb-1">Changes made:</p>
                          <ul className="text-xs text-slate-600 space-y-0.5">
                            {(optimizeResults['improve-readability'].changes ?? []).map((c, i) => (
                              <li key={i} className="flex items-start gap-1">
                                <Check className="w-3 h-3 text-emerald-500 mt-0.5 flex-shrink-0" />
                                <span>{c}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}

                  <button
                    onClick={() => runOptimizeAction('suggest-links')}
                    disabled={optimizeLoading !== null}
                    className="w-full p-4 bg-amber-50 hover:bg-amber-100 rounded-xl text-left transition-colors flex items-center space-x-3 disabled:opacity-50"
                  >
                    {optimizeLoading === 'suggest-links' ? (
                      <Loader2 className="w-5 h-5 text-amber-600 animate-spin" />
                    ) : (
                      <LinkIcon className="w-5 h-5 text-amber-600" />
                    )}
                    <div>
                      <p className="font-medium text-slate-900">Suggest Internal Links</p>
                      <p className="text-xs text-slate-500">Find relevant internal link opportunities</p>
                    </div>
                  </button>
                  {/* Link Suggestions Results */}
                  {optimizeResults['suggest-links'] && (
                    <div className="ml-2 p-3 bg-amber-50 border border-amber-200 rounded-lg space-y-2">
                      {(optimizeResults['suggest-links'].links ?? []).map((link, i) => (
                        <div key={i} className="text-sm border-b border-amber-100 pb-2 last:border-0 last:pb-0">
                          <div className="flex items-center justify-between gap-1">
                            <div className="flex items-center gap-1 flex-1">
                              <LinkIcon className="w-3 h-3 text-amber-600 flex-shrink-0" />
                              <span className="font-medium text-slate-900">&ldquo;{link.anchorText}&rdquo;</span>
                              <span className="text-slate-400">&rarr;</span>
                              <span className="text-amber-700">{link.targetTopic}</span>
                            </div>
                            {onBodyChange && (
                              <button
                                onClick={() => {
                                  const linkMarkdown = `[${link.anchorText}](/content/${link.targetTopic.toLowerCase().replace(/\s+/g, '-')})`
                                  const updated = content.includes(link.anchorText)
                                    ? content.replace(link.anchorText, linkMarkdown)
                                    : content + `\n\n${linkMarkdown}`
                                  onBodyChange(updated)
                                  setAppliedField(`link-${i}`)
                                  setTimeout(() => setAppliedField(null), 2000)
                                }}
                                className="text-xs px-2 py-0.5 rounded-full bg-amber-600 text-white hover:bg-amber-700 transition-colors flex items-center gap-1 flex-shrink-0"
                              >
                                {appliedField === `link-${i}` ? <Check className="w-3 h-3" /> : <LinkIcon className="w-3 h-3" />}
                                {appliedField === `link-${i}` ? 'Inserted' : 'Insert'}
                              </button>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5 ml-4">{link.reason}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Preview Tab */}
        {activeTab === 'preview' && (
          <div className="space-y-6">
            <h4 className="font-bold text-slate-900 mb-4">Search Engine Preview</h4>

            {/* Google Preview */}
            <div className="p-6 bg-white border border-slate-200 rounded-xl">
              <p className="text-xs text-slate-400 mb-4">Google Search Preview</p>
              <div className="space-y-1">
                <p className="text-blue-800 text-xl hover:underline cursor-pointer">
                  {title || 'Your Title Here'}
                </p>
                <p className="text-sm text-emerald-700">
                  lyfye.com › content › {title?.toLowerCase().replace(/\s+/g, '-').slice(0, 30) || 'your-content'}
                </p>
                <p className="text-sm text-slate-600">
                  {metaDescription || content.slice(0, 160) || 'Your meta description will appear here...'}
                </p>
              </div>
            </div>

            {/* Social Preview */}
            <div className="grid grid-cols-2 gap-4">
              {/* LinkedIn */}
              <div className="p-4 bg-white border border-slate-200 rounded-xl">
                <p className="text-xs text-slate-400 mb-3">LinkedIn Preview</p>
                <div className="bg-slate-100 h-32 rounded-lg mb-3 flex items-center justify-center text-slate-400">
                  Featured Image
                </div>
                <p className="font-bold text-slate-900 text-sm line-clamp-2">{title || 'Your Title'}</p>
                <p className="text-xs text-slate-500 mt-1">lyfye.com</p>
              </div>

              {/* Twitter/X */}
              <div className="p-4 bg-white border border-slate-200 rounded-xl">
                <p className="text-xs text-slate-400 mb-3">X/Twitter Preview</p>
                <div className="bg-slate-100 h-32 rounded-lg mb-3 flex items-center justify-center text-slate-400">
                  Featured Image
                </div>
                <p className="font-bold text-slate-900 text-sm line-clamp-2">{title || 'Your Title'}</p>
                <p className="text-xs text-slate-500 mt-1 line-clamp-2">{metaDescription || content.slice(0, 100)}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function CheckItem({ checked, label }: { checked: boolean; label: string }) {
  return (
    <div className="flex items-center space-x-2">
      {checked ? (
        <Check className="w-4 h-4 text-emerald-600" />
      ) : (
        <AlertCircle className="w-4 h-4 text-amber-500" />
      )}
      <span className={cn('text-sm', checked ? 'text-slate-700' : 'text-slate-500')}>{label}</span>
    </div>
  )
}

function SuggestionCard({
  type,
  title,
  suggestion,
  onApply,
  applyLabel,
}: {
  type: 'success' | 'warning' | 'error' | 'tip'
  title: string
  suggestion: string
  onApply?: () => void
  applyLabel?: string
}) {
  const styles = {
    success: 'bg-emerald-50 border-emerald-200',
    warning: 'bg-amber-50 border-amber-200',
    error: 'bg-red-50 border-red-200',
    tip: 'bg-blue-50 border-blue-200',
  }

  const icons = {
    success: <Check className="w-4 h-4 text-emerald-600" />,
    warning: <AlertCircle className="w-4 h-4 text-amber-600" />,
    error: <AlertCircle className="w-4 h-4 text-red-600" />,
    tip: <Lightbulb className="w-4 h-4 text-blue-600" />,
  }

  return (
    <div className={cn('p-3 rounded-lg border', styles[type])}>
      <div className="flex items-start space-x-2">
        {icons[type]}
        <div className="flex-1">
          <p className="font-medium text-sm text-slate-900">{title}</p>
          <p className="text-xs text-slate-600 mt-1">{suggestion}</p>
          {onApply && type !== 'success' && (
            <button
              onClick={onApply}
              className="mt-2 text-xs font-medium px-3 py-1 rounded-full bg-purple-100 text-purple-700 hover:bg-purple-200 transition-colors flex items-center space-x-1"
            >
              <Zap className="w-3 h-3" />
              <span>{applyLabel || 'Apply Fix'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
