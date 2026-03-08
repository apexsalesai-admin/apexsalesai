'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Mail, ArrowRight, Sparkles, Loader2, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function CreateEmailPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [subject, setSubject] = useState('')
  const [purpose, setPurpose] = useState('')
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
          title: subject,
          body: `Purpose: ${purpose}\n\nPlease generate an email about: ${subject}`,
          contentType: 'EMAIL',
          channels: [],
          aiGenerated: true,
          aiTopic: subject,
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
        setError('Failed to create email. Please try again.')
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
        <div className="w-12 h-12 rounded-xl bg-amber-500 flex items-center justify-center">
          <Mail className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Create Email</h1>
          <p className="text-sm text-slate-500">Outreach, newsletters, or sequences</p>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
      )}

      <div className="mb-8 p-6 bg-white rounded-xl border border-slate-200">
        <label className="block text-sm font-medium text-slate-700 mb-2">Subject line</label>
        <input
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="e.g., Quick question about your content strategy"
          className="w-full px-4 py-3 rounded-lg border border-slate-300 text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        />
        {subject && step === 1 && (
          <button onClick={() => setStep(2)} className="mt-4 flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700">
            Next <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>

      {step >= 2 && (
        <div className="mb-8 p-6 bg-white rounded-xl border border-slate-200">
          <label className="block text-sm font-medium text-slate-700 mb-2">What is the purpose of this email?</label>
          <textarea
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
            placeholder="e.g., Follow up with prospects who downloaded our whitepaper last week"
            rows={3}
            className="w-full px-4 py-3 rounded-lg border border-slate-300 text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
          />
          {purpose && step === 2 && (
            <button onClick={() => setStep(3)} className="mt-4 flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700">
              Next <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      {step >= 3 && (
        <div className="mb-8 p-6 bg-white rounded-xl border border-slate-200">
          <label className="block text-sm font-medium text-slate-700 mb-4">Tone</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {['professional', 'friendly', 'urgent', 'educational', 'bold', 'storytelling'].map((t) => (
              <button
                key={t}
                onClick={() => setTone(t)}
                className={`px-4 py-3 rounded-lg border text-sm font-medium transition-colors capitalize ${
                  tone === t ? 'border-purple-500 bg-purple-50 text-purple-700' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
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
            {generating ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating email...</> : <><Sparkles className="w-4 h-4" /> Create with Mia</>}
          </button>
        </div>
      )}
    </div>
  )
}
