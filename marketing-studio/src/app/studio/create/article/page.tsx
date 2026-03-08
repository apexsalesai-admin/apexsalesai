'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { BookOpen, ArrowRight, Sparkles, Loader2, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function CreateArticlePage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [topic, setTopic] = useState('')
  const [audience, setAudience] = useState('')
  const [tone, setTone] = useState('professional')
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
          body: `Audience: ${audience}\n\nPlease generate an article about: ${topic}`,
          contentType: 'ARTICLE',
          channels: ['LINKEDIN'],
          aiGenerated: true,
          aiTopic: topic,
          aiTone: tone,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        if (data.success && data.data?.id) {
          router.push(`/studio/content/${data.data.id}`)
        } else {
          router.push('/studio/content/new')
        }
      } else {
        setError('Failed to create article. Please try again.')
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
        <div className="w-12 h-12 rounded-xl bg-emerald-500 flex items-center justify-center">
          <BookOpen className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Create Article</h1>
          <p className="text-sm text-slate-500">Mia will help you write a compelling article</p>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="mb-8 p-6 bg-white rounded-xl border border-slate-200">
        <label className="block text-sm font-medium text-slate-700 mb-2">
          What is your article about?
        </label>
        <input
          type="text"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="e.g., How AI is transforming content creation"
          className="w-full px-4 py-3 rounded-lg border border-slate-300 text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        />
        {topic && step === 1 && (
          <button
            onClick={() => setStep(2)}
            className="mt-4 flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700"
          >
            Next <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>

      {step >= 2 && (
        <div className="mb-8 p-6 bg-white rounded-xl border border-slate-200">
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Who is your audience?
          </label>
          <input
            type="text"
            value={audience}
            onChange={(e) => setAudience(e.target.value)}
            placeholder="e.g., Startup founders, Marketing leaders"
            className="w-full px-4 py-3 rounded-lg border border-slate-300 text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
          {audience && step === 2 && (
            <button
              onClick={() => setStep(3)}
              className="mt-4 flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700"
            >
              Next <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      {step >= 3 && (
        <div className="mb-8 p-6 bg-white rounded-xl border border-slate-200">
          <label className="block text-sm font-medium text-slate-700 mb-4">
            What tone should Mia use?
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {['professional', 'friendly', 'bold', 'educational', 'witty', 'inspirational'].map((t) => (
              <button
                key={t}
                onClick={() => setTone(t)}
                className={`px-4 py-3 rounded-lg border text-sm font-medium transition-colors capitalize ${
                  tone === t
                    ? 'border-purple-500 bg-purple-50 text-purple-700'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          <button
            onClick={handleGenerate}
            disabled={generating}
            className="mt-6 flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50"
          >
            {generating ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Creating article...</>
            ) : (
              <><Sparkles className="w-4 h-4" /> Create with Mia</>
            )}
          </button>
        </div>
      )}
    </div>
  )
}
