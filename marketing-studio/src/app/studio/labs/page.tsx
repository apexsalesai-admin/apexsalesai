'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  Sparkles,
  Video,
  FileText,
  BarChart3,
  Wand2,
  Zap,
  Bot,
  Mic,
  Image as ImageIcon,
  Layers,
  Globe,
  ArrowRight,
  Lock,
  Rocket,
  FlaskConical,
  Star,
  TrendingUp,
  Play,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface LabFeature {
  id: string
  name: string
  description: string
  status: 'live' | 'beta' | 'alpha' | 'coming_soon'
  icon: typeof Sparkles
  href?: string
  color: string
  features: string[]
}

const LAB_FEATURES: LabFeature[] = [
  {
    id: 'ai-content',
    name: 'Mia AI Content Generator',
    description: 'Create high-converting content for any platform with our advanced AI. Multi-tone blending, content styles, and channel-optimized variations.',
    status: 'live',
    icon: Sparkles,
    href: '/studio/content/new',
    color: 'purple',
    features: ['Multi-tone selection', 'Channel variations', 'SEO optimization', 'AI-powered suggestions'],
  },
  {
    id: 'video-studio',
    name: 'Video Studio Pro',
    description: 'Transform scripts into professional videos using cutting-edge AI. AI avatars, voice synthesis, and automated video generation.',
    status: 'live',
    icon: Video,
    href: '/studio/video',
    color: 'red',
    features: ['AI video generation (Runway, Pika, Sora)', 'AI avatars (HeyGen, Synthesia)', 'Voice synthesis (ElevenLabs)', 'Auto thumbnails'],
  },
  {
    id: 'seo-toolkit',
    name: 'SEO & Marketing Toolkit',
    description: 'Comprehensive SEO analysis with real-time scoring, keyword optimization, and social preview generation.',
    status: 'live',
    icon: BarChart3,
    href: '/studio/content',
    color: 'emerald',
    features: ['Real-time SEO scoring', 'Keyword density analysis', 'Readability metrics', 'Social previews'],
  },
  {
    id: 'analytics',
    name: 'AI-Powered Analytics',
    description: 'Track performance across all channels with Mia insights. Get actionable recommendations to improve engagement.',
    status: 'live',
    icon: TrendingUp,
    href: '/studio/analytics',
    color: 'blue',
    features: ['Cross-channel metrics', 'AI insights', 'Performance predictions', 'Content recommendations'],
  },
  {
    id: 'voice-clone',
    name: 'Voice Cloning Lab',
    description: 'Create your own AI voice clone for consistent brand voice across all video content.',
    status: 'beta',
    icon: Mic,
    color: 'pink',
    features: ['Voice training', 'Multi-language support', 'Emotion control', 'Real-time synthesis'],
  },
  {
    id: 'image-gen',
    name: 'AI Image Studio',
    description: 'Generate stunning visuals, product shots, and marketing graphics with DALL-E 3 and Midjourney integration.',
    status: 'beta',
    icon: ImageIcon,
    color: 'amber',
    features: ['Text-to-image generation', 'Style transfer', 'Product photography', 'Brand consistency'],
  },
  {
    id: 'autopilot',
    name: 'Content Autopilot',
    description: 'Fully autonomous content creation and publishing. Set your goals and let Mia handle the rest.',
    status: 'alpha',
    icon: Bot,
    color: 'cyan',
    features: ['Autonomous posting', 'Trend detection', 'Optimal timing', 'A/B testing'],
  },
  {
    id: 'multi-lang',
    name: 'Global Reach',
    description: 'Instantly translate and localize content for 50+ languages while maintaining your brand voice.',
    status: 'coming_soon',
    icon: Globe,
    color: 'violet',
    features: ['50+ languages', 'Cultural adaptation', 'Local SEO', 'Voice localization'],
  },
]

const STATUS_CONFIG = {
  live: { label: 'Live', color: 'bg-emerald-100 text-emerald-700', icon: Zap },
  beta: { label: 'Beta', color: 'bg-blue-100 text-blue-700', icon: FlaskConical },
  alpha: { label: 'Alpha', color: 'bg-amber-100 text-amber-700', icon: Rocket },
  coming_soon: { label: 'Coming Soon', color: 'bg-slate-100 text-slate-600', icon: Lock },
}

const COLOR_CLASSES: Record<string, { bg: string; text: string; border: string }> = {
  purple: { bg: 'bg-purple-100', text: 'text-purple-600', border: 'border-purple-500' },
  red: { bg: 'bg-red-100', text: 'text-red-600', border: 'border-red-500' },
  emerald: { bg: 'bg-emerald-100', text: 'text-emerald-600', border: 'border-emerald-500' },
  blue: { bg: 'bg-blue-100', text: 'text-blue-600', border: 'border-blue-500' },
  pink: { bg: 'bg-pink-100', text: 'text-pink-600', border: 'border-pink-500' },
  amber: { bg: 'bg-amber-100', text: 'text-amber-600', border: 'border-amber-500' },
  cyan: { bg: 'bg-cyan-100', text: 'text-cyan-600', border: 'border-cyan-500' },
  violet: { bg: 'bg-violet-100', text: 'text-violet-600', border: 'border-violet-500' },
}

export default function LabsPage() {
  const [hoveredFeature, setHoveredFeature] = useState<string | null>(null)

  return (
    <div className="space-y-12">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-purple-600 via-pink-600 to-rose-600 p-12 text-white">
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-20" />
        <div className="relative z-10">
          <div className="flex items-center space-x-3 mb-6">
            <div className="p-3 bg-white/20 rounded-xl backdrop-blur">
              <FlaskConical className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-4xl font-bold">Lyfye Labs</h1>
              <p className="text-purple-100">Experimental AI-powered marketing tools</p>
            </div>
          </div>
          <p className="text-xl text-purple-50 max-w-2xl mb-8">
            Explore cutting-edge AI tools that are transforming how marketers create,
            optimize, and distribute content. From beta features to production-ready solutions.
          </p>
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-sm">4 Live Features</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-blue-400" />
              <span className="text-sm">2 In Beta</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-amber-400" />
              <span className="text-sm">1 In Alpha</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-slate-300" />
              <span className="text-sm">1 Coming Soon</span>
            </div>
          </div>
        </div>
        {/* Decorative elements */}
        <div className="absolute top-10 right-10 w-32 h-32 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute bottom-10 right-40 w-24 h-24 bg-pink-400/20 rounded-full blur-2xl" />
      </div>

      {/* Featured Lab: Video Studio */}
      <div className="p-8 bg-white rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <Star className="w-6 h-6 text-amber-500" />
            <h2 className="text-xl font-bold text-slate-900">Featured Lab</h2>
          </div>
          <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-sm font-medium">
            Now Live
          </span>
        </div>
        <div className="grid grid-cols-2 gap-8">
          <div>
            <h3 className="text-2xl font-bold text-slate-900 mb-4">Video Studio Pro</h3>
            <p className="text-slate-600 mb-6">
              Create professional marketing videos without a camera, studio, or editing skills.
              Our AI-powered video studio integrates with the latest generation tools including
              Runway Gen-3, OpenAI Sora, HeyGen, and ElevenLabs.
            </p>
            <div className="space-y-3 mb-6">
              {[
                'Generate videos from text prompts',
                'Create AI avatar presentations',
                'Clone your voice for narration',
                'Auto-generate thumbnails with DALL-E',
              ].map((feature, i) => (
                <div key={i} className="flex items-center space-x-3">
                  <div className="w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center">
                    <Zap className="w-3 h-3 text-purple-600" />
                  </div>
                  <span className="text-slate-700">{feature}</span>
                </div>
              ))}
            </div>
            <Link
              href="/studio/video"
              className="inline-flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-medium hover:shadow-lg transition-shadow"
            >
              <Play className="w-5 h-5" />
              <span>Open Video Studio</span>
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
          <div className="bg-gradient-to-br from-slate-100 to-slate-50 rounded-xl p-6 flex items-center justify-center">
            <div className="text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Video className="w-10 h-10 text-white" />
              </div>
              <p className="text-slate-500 text-sm">Integrates with</p>
              <div className="flex flex-wrap justify-center gap-2 mt-3">
                {['Runway', 'Sora', 'HeyGen', 'ElevenLabs', 'Synthesia'].map(tool => (
                  <span key={tool} className="px-2 py-1 bg-white rounded text-xs font-medium text-slate-700 border border-slate-200">
                    {tool}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* All Lab Features Grid */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 mb-6">All Lab Features</h2>
        <div className="grid grid-cols-2 gap-6">
          {LAB_FEATURES.map(feature => {
            const Icon = feature.icon
            const statusConfig = STATUS_CONFIG[feature.status]
            const StatusIcon = statusConfig.icon
            const colors = COLOR_CLASSES[feature.color]
            const isAccessible = feature.status === 'live' || feature.status === 'beta'

            return (
              <div
                key={feature.id}
                className={cn(
                  'p-6 bg-white rounded-xl border-2 transition-all',
                  isAccessible ? 'hover:shadow-lg hover:border-purple-300 cursor-pointer' : 'opacity-75',
                  hoveredFeature === feature.id ? `border-2 ${colors.border}` : 'border-slate-200'
                )}
                onMouseEnter={() => setHoveredFeature(feature.id)}
                onMouseLeave={() => setHoveredFeature(null)}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className={cn('p-3 rounded-xl', colors.bg)}>
                    <Icon className={cn('w-6 h-6', colors.text)} />
                  </div>
                  <span className={cn('flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium', statusConfig.color)}>
                    <StatusIcon className="w-3 h-3" />
                    <span>{statusConfig.label}</span>
                  </span>
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">{feature.name}</h3>
                <p className="text-slate-600 text-sm mb-4">{feature.description}</p>
                <div className="space-y-2 mb-4">
                  {feature.features.slice(0, 3).map((f, i) => (
                    <div key={i} className="flex items-center space-x-2 text-xs text-slate-500">
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                      <span>{f}</span>
                    </div>
                  ))}
                </div>
                {feature.href && isAccessible ? (
                  <Link
                    href={feature.href}
                    className={cn('flex items-center space-x-2 text-sm font-medium', colors.text)}
                  >
                    <span>Try it now</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                ) : (
                  <span className="text-sm text-slate-400 flex items-center space-x-2">
                    <Lock className="w-4 h-4" />
                    <span>Access coming soon</span>
                  </span>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Lyfye Facts Section */}
      <div className="p-8 bg-gradient-to-br from-slate-50 to-purple-50 rounded-2xl border border-purple-100">
        <div className="flex items-center space-x-3 mb-6">
          <Sparkles className="w-6 h-6 text-purple-600" />
          <h2 className="text-xl font-bold text-slate-900">Lyfye Facts</h2>
        </div>
        <div className="grid grid-cols-4 gap-6">
          {[
            { label: 'Content Created', value: '10M+', description: 'pieces of AI-generated content' },
            { label: 'Time Saved', value: '500K+', description: 'hours of manual work' },
            { label: 'Engagement Boost', value: '3.2x', description: 'average increase in engagement' },
            { label: 'Active Users', value: '50K+', description: 'marketers using Lyfye daily' },
          ].map((stat, i) => (
            <div key={i} className="text-center">
              <p className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                {stat.value}
              </p>
              <p className="font-medium text-slate-900 mt-1">{stat.label}</p>
              <p className="text-xs text-slate-500 mt-1">{stat.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Request Access CTA */}
      <div className="p-8 bg-slate-900 rounded-2xl text-center">
        <h2 className="text-2xl font-bold text-white mb-4">Want Early Access to New Features?</h2>
        <p className="text-slate-400 mb-6 max-w-xl mx-auto">
          Join our beta program and be the first to try new AI-powered marketing tools
          before they are released to the public.
        </p>
        <button className="px-8 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-medium hover:shadow-xl hover:shadow-purple-500/30 transition-all">
          Join Beta Program
        </button>
      </div>
    </div>
  )
}
