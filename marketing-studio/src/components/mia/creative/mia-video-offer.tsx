'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Video, Sparkles, SkipForward, Loader2 } from 'lucide-react'

interface ProviderOption {
  name: string
  displayName: string
  category: string
  costPerSecond: number
  supportedDurations: number[]
}

interface MiaVideoOfferProps {
  onSelectProvider: (provider: string | undefined) => void
}

export function MiaVideoOffer({ onSelectProvider }: MiaVideoOfferProps) {
  const [providers, setProviders] = useState<ProviderOption[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selected, setSelected] = useState<string | null>(null)

  useEffect(() => {
    async function fetchProviders() {
      try {
        const res = await fetch('/api/studio/render/estimate')
        const data = await res.json()
        if (data.success && data.providers) {
          // Filter to cinematic providers suitable for creative sessions
          const relevant = (data.providers as ProviderOption[]).filter(
            (p) => p.name !== 'template' && p.name !== 'heygen'
          )
          setProviders(relevant)
        }
      } catch {
        // Fallback static list
        setProviders([
          {
            name: 'runway',
            displayName: 'Runway Gen-4.5',
            category: 'cinematic',
            costPerSecond: 0.34,
            supportedDurations: [4, 6, 8, 10],
          },
          {
            name: 'sora',
            displayName: 'Sora 2',
            category: 'cinematic',
            costPerSecond: 0.10,
            supportedDurations: [4, 6, 8, 10, 12],
          },
        ])
      } finally {
        setIsLoading(false)
      }
    }
    fetchProviders()
  }, [])

  const handleSelect = (providerName: string) => {
    setSelected(providerName)
    setTimeout(() => onSelectProvider(providerName), 300)
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
        <p className="text-slate-500">Checking video providers...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-100 to-pink-100 mb-3">
          <Video className="w-7 h-7 text-purple-600" />
        </div>
        <h3 className="text-xl font-bold text-slate-900">Want to create the video now?</h3>
        <p className="text-slate-500 mt-1">Choose a provider to render your content as video</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl mx-auto">
        {providers.map((provider, i) => {
          const estimatedCost = (provider.costPerSecond * 10).toFixed(2)
          const isSelected = selected === provider.name
          return (
            <motion.button
              key={provider.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1, duration: 0.3 }}
              onClick={() => handleSelect(provider.name)}
              className={`group p-5 rounded-2xl border-2 transition-all text-left ${
                isSelected
                  ? 'border-purple-500 ring-2 ring-purple-200 bg-purple-50'
                  : 'border-slate-200 hover:border-purple-400 hover:ring-2 hover:ring-purple-100 bg-white'
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4 text-purple-500" />
                <h4 className="font-semibold text-slate-900 text-sm">{provider.displayName}</h4>
              </div>
              <span className="inline-block text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 capitalize mb-2">
                {provider.category}
              </span>
              <p className="text-xs text-slate-500">
                ~${estimatedCost} for 10s
              </p>
              <p className="text-xs text-slate-400 mt-1">
                {provider.supportedDurations[0]}-{provider.supportedDurations[provider.supportedDurations.length - 1]}s clips
              </p>
            </motion.button>
          )
        })}

        {/* Skip option */}
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: providers.length * 0.1, duration: 0.3 }}
          onClick={() => onSelectProvider(undefined)}
          className={`group p-5 rounded-2xl border-2 border-dashed transition-all text-left ${
            selected === null
              ? 'border-slate-300 bg-slate-50'
              : 'border-slate-200 hover:border-slate-300 bg-white'
          }`}
        >
          <div className="flex items-center gap-2 mb-2">
            <SkipForward className="w-4 h-4 text-slate-400" />
            <h4 className="font-semibold text-slate-600 text-sm">Skip</h4>
          </div>
          <p className="text-xs text-slate-400">Continue without video — you can render later</p>
        </motion.button>
      </div>
    </div>
  )
}
