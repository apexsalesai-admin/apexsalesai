'use client'

import { Presentation, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function CreatePresentationPage() {
  return (
    <div className="max-w-2xl mx-auto">
      <Link href="/studio/create" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-6">
        <ArrowLeft className="w-4 h-4" /> Back to Create
      </Link>
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <div className="w-16 h-16 rounded-2xl bg-indigo-100 flex items-center justify-center mb-4">
          <Presentation className="w-8 h-8 text-indigo-400" />
        </div>
        <h2 className="text-xl font-semibold text-slate-900 mb-2">Presentations Coming Soon</h2>
        <p className="text-slate-500 max-w-md">
          Slides, pitch decks, and reports powered by Mia are launching soon. Stay tuned.
        </p>
      </div>
    </div>
  )
}
