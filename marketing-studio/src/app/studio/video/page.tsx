'use client'

import { useState } from 'react'
import { VideoStudio } from '@/components/content/video-studio'
import { Video, Sparkles, FileText, ArrowRight, Play, Wand2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'

export default function VideoStudioPage() {
  const [script, setScript] = useState('')
  const [title, setTitle] = useState('')
  const [showStudio, setShowStudio] = useState(false)

  const sampleScripts = [
    {
      title: '5 AI Tools Changing Marketing in 2025',
      script: `In the next 60 seconds, I'm going to show you 5 AI tools that are completely transforming how we do marketing.

Number one: AI-powered content creation. Tools like Claude and GPT-4 can now write entire campaigns in minutes.

Number two: Automated video generation. Create professional videos without a camera or editing skills.

Number three: Voice cloning. Your AI can now speak in any voice, in any language.

Number four: Predictive analytics. Know what your audience wants before they do.

Number five: Personalization at scale. Every customer gets a unique experience.

The future of marketing is here. Are you ready?`,
    },
    {
      title: 'How to 10x Your LinkedIn Engagement',
      script: `Stop scrolling. If you're on LinkedIn and not getting engagement, you're making one of these three mistakes.

Mistake one: You're posting at the wrong time. Data shows Tuesday through Thursday between 8 and 10 AM gets 3x more views.

Mistake two: Your hook is weak. The first line determines if people keep reading. Start with a bold statement or question.

Mistake three: No clear call-to-action. Tell people exactly what you want them to do.

Fix these three things, and watch your engagement explode. Drop a comment if this helped!`,
    },
    {
      title: 'Behind the Scenes: Our Product Launch',
      script: `Welcome to our office! Today we're launching something we've been working on for months.

Let me show you what's happening behind the scenes.

The team has been here since 5 AM setting everything up. There's an energy in the room that's hard to describe.

This product represents hundreds of hours of customer interviews, prototyping, and iteration.

We can't wait to share it with you. Stay tuned for the big reveal at noon!`,
    },
  ]

  if (!showStudio) {
    return (
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="inline-flex items-center space-x-2 px-4 py-2 rounded-full bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20 mb-4">
            <Video className="w-4 h-4 text-purple-600" />
            <span className="text-sm font-medium text-purple-600">Lyfye Video Studio</span>
            <span className="text-xs bg-purple-500 text-white px-2 py-0.5 rounded-full">Pro</span>
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-4">Create Professional Videos with AI</h1>
          <p className="text-slate-500 max-w-2xl mx-auto">
            Transform your scripts into stunning videos using the latest AI technology.
            Choose from AI avatars, text-to-video generation, voiceovers, and more.
          </p>
        </div>

        {/* Video Input */}
        <div className="p-8 bg-white rounded-2xl border border-slate-200 shadow-sm">
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Video Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter a title for your video..."
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none text-lg"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-semibold text-slate-700">Video Script</label>
                <span className="text-xs text-slate-500">{script.split(' ').filter(Boolean).length} words</span>
              </div>
              <textarea
                value={script}
                onChange={(e) => setScript(e.target.value)}
                placeholder="Write or paste your video script here..."
                rows={10}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none resize-none"
              />
            </div>

            <button
              onClick={() => setShowStudio(true)}
              disabled={!script.trim() || !title.trim()}
              className={cn(
                'w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center space-x-3 transition-all',
                script.trim() && title.trim()
                  ? 'bg-gradient-to-r from-purple-600 via-pink-600 to-rose-600 text-white hover:shadow-xl hover:shadow-purple-500/30 hover:-translate-y-1'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              )}
            >
              <Wand2 className="w-5 h-5" />
              <span>Open Video Studio</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Quick Start Templates */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-900">Quick Start Templates</h2>
            <Link href="/studio/content/new" className="text-sm text-purple-600 hover:text-purple-700 flex items-center space-x-1">
              <Sparkles className="w-4 h-4" />
              <span>Generate script with Mia</span>
            </Link>
          </div>
          <div className="grid grid-cols-3 gap-4">
            {sampleScripts.map((sample, i) => (
              <button
                key={i}
                onClick={() => {
                  setTitle(sample.title)
                  setScript(sample.script)
                }}
                className="p-6 bg-white rounded-xl border border-slate-200 hover:border-purple-300 hover:shadow-lg text-left transition-all group"
              >
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mb-4 group-hover:bg-purple-500 transition-colors">
                  <Play className={cn(
                    'w-5 h-5 text-purple-600 group-hover:text-white transition-colors'
                  )} />
                </div>
                <h3 className="font-bold text-slate-900 mb-2">{sample.title}</h3>
                <p className="text-sm text-slate-500 line-clamp-3">{sample.script}</p>
                <p className="text-xs text-purple-600 mt-3">{sample.script.split(' ').length} words</p>
              </button>
            ))}
          </div>
        </div>

        {/* Features */}
        <div className="grid grid-cols-4 gap-4">
          {[
            { icon: Video, label: 'AI Video Generation', desc: 'Runway, Pika, Sora' },
            { icon: FileText, label: 'AI Avatars', desc: 'HeyGen, Synthesia' },
            { icon: Sparkles, label: 'Voice Synthesis', desc: 'ElevenLabs, Play.ht' },
            { icon: Wand2, label: 'Auto Thumbnails', desc: 'DALL-E, Midjourney' },
          ].map((feature, i) => {
            const Icon = feature.icon
            return (
              <div key={i} className="p-4 bg-slate-50 rounded-xl text-center">
                <Icon className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                <p className="font-medium text-slate-900 text-sm">{feature.label}</p>
                <p className="text-xs text-slate-500">{feature.desc}</p>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div>
      <button
        onClick={() => setShowStudio(false)}
        className="mb-6 text-sm text-slate-600 hover:text-slate-900 flex items-center space-x-2"
      >
        <ArrowRight className="w-4 h-4 rotate-180" />
        <span>Back to script editor</span>
      </button>
      <VideoStudio script={script} title={title} />
    </div>
  )
}
