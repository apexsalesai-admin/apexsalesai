import { Sparkles } from 'lucide-react'
import Link from 'next/link'

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <Link href="/" className="flex items-center space-x-3">
            <div className="w-9 h-9 bg-gradient-to-br from-purple-600 via-pink-600 to-rose-500 rounded-xl flex items-center justify-center text-white font-bold shadow-lg">
              L
            </div>
            <div className="flex items-center">
              <span className="text-lg font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                Lyfye
              </span>
              <span className="text-slate-300 mx-2">|</span>
              <span className="text-slate-600 font-medium">Marketing Studio Setup</span>
            </div>
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  )
}
