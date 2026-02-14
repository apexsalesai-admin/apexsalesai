'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Sparkles, ArrowRight, Loader2 } from 'lucide-react'

interface MiaGreetingProps {
  greeting: string | null
  isLoading: boolean
  onSubmitTopic: (topic: string) => void
  onFetchGreeting: () => void
}

export function MiaGreeting({ greeting, isLoading, onSubmitTopic, onFetchGreeting }: MiaGreetingProps) {
  const [topic, setTopic] = useState('')

  useEffect(() => {
    if (!greeting) {
      onFetchGreeting()
    }
  }, [greeting, onFetchGreeting])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (topic.trim()) {
      onSubmitTopic(topic.trim())
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="flex items-center justify-center min-h-[400px]"
    >
      <div className="max-w-lg w-full">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 mb-4 shadow-lg shadow-purple-500/25">
            <Sparkles className="w-8 h-8 text-white" />
          </div>

          {isLoading && !greeting ? (
            <div className="flex items-center justify-center gap-2 mt-4">
              <Loader2 className="w-4 h-4 animate-spin text-purple-500" />
              <span className="text-slate-500 text-sm">Loading your profile...</span>
            </div>
          ) : (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-lg text-slate-700 mt-4 leading-relaxed"
            >
              {greeting}
            </motion.p>
          )}
        </div>

        <motion.form
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          onSubmit={handleSubmit}
          className="space-y-4"
        >
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              What do you want to create about?
            </label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g., How AI is changing sales outreach..."
              className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-purple-400 focus:ring-2 focus:ring-purple-100 outline-none transition-all text-slate-900 placeholder:text-slate-400"
              autoFocus
            />
          </div>

          <button
            type="submit"
            disabled={!topic.trim() || isLoading}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold hover:from-purple-700 hover:to-pink-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-purple-500/25"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Researching...
              </>
            ) : (
              <>
                Let Mia research this
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </motion.form>
      </div>
    </motion.div>
  )
}
