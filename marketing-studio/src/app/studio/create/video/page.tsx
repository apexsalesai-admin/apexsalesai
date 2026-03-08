'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Video, ArrowRight, Sparkles, Loader2, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function CreateVideoPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [topic, setTopic] = useState('')
  const [platform, setPlatform] = useState('youtube')
  const [duration, setDuration] = useState('short')
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleGenerate = async () => {
    setGenerating(true)
    setError(null)
    try {
      const res = await fetch('/api/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: topic,
          body: `Platform: ${platform}\nDuration: ${duration}\n\nVideo concept: ${topic}`,
          contentType: 'VIDEO',
          channels: [platform.toUpperCase()],
          aiGenerated: true,
          aiTopic: topic,
          aiTone: 'professional',
        }),
      })

      if (res.ok) {
        const data = await res.json()
        if (data.success && data.data?.id) {
          router.push(`/studio/content/${data.data.id}`)
        } else {
          router.push('/studio/video')
        }
      } else {
        setError('Failed to create video concept. Please try again.')
      }
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Link href="/studio/create" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-6">
        <ArrowLeft className="w-4 h-4" /> Back to Create
      </Link>

      <div className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 rounded-xl bg-red-500 flex items-center justify-center">
          <Video className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Create Video</h1>
          <p className="text-sm text-slate-500">Scripts, storyboards, and AI video generation</p>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
      )}

      <div className="mb-8 p-6 bg-white rounded-xl border border-slate-200">
        <label className="block text-sm font-medium text-slate-700 mb-2">What is your video about?</label>
        <input
          type="text"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="e.g., 5 AI tools every marketer needs in 2026"
          className="w-full px-4 py-3 rounded-lg border border-slate-300 text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        />
        {topic && step === 1 && (
          <button onClick={() => setStep(2)} className="mt-4 flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700">
            Next <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>

      {step >= 2 && (
        <div className="mb-8 p-6 bg-white rounded-xl border border-slate-200">
          <label className="block text-sm font-medium text-slate-700 mb-4">Platform</label>
          <div className="grid grid-cols-3 gap-3">
            {[
              { id: 'youtube', label: 'YouTube' },
              { id: 'linkedin', label: 'LinkedIn' },
              { id: 'instagram', label: 'Instagram' },
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => setPlatform(p.id)}
                className={`px-4 py-3 rounded-lg border text-sm font-medium transition-colors ${
                  platform === p.id ? 'border-purple-500 bg-purple-50 text-purple-700' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          {step === 2 && (
            <button onClick={() => setStep(3)} className="mt-4 flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700">
              Next <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      {step >= 3 && (
        <div className="mb-8 p-6 bg-white rounded-xl border border-slate-200">
          <label className="block text-sm font-medium text-slate-700 mb-4">Duration</label>
          <div className="grid grid-cols-3 gap-3">
            {[
              { id: 'short', label: 'Short (30-60s)' },
              { id: 'medium', label: 'Medium (2-5m)' },
              { id: 'long', label: 'Long (5-15m)' },
            ].map((d) => (
              <button
                key={d.id}
                onClick={() => setDuration(d.id)}
                className={`px-4 py-3 rounded-lg border text-sm font-medium transition-colors ${
                  duration === d.id ? 'border-purple-500 bg-purple-50 text-purple-700' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="mt-6 flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50"
          >
            {generating ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating video concept...</> : <><Sparkles className="w-4 h-4" /> Create with Mia</>}
          </button>
        </div>
      )}

      <div className="p-4 bg-purple-50 border border-purple-200 rounded-xl">
        <p className="text-sm text-purple-700">
          <strong>Tip:</strong> After creating your video concept, head to{' '}
          <Link href="/studio/video" className="underline font-medium">Video Studio</Link>{' '}
          to generate the actual video with AI.
        </p>
      </div>
    </div>
  )
}
