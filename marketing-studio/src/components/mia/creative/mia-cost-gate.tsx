'use client'

import { useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle, X } from 'lucide-react'

interface MiaCostGateProps {
  action: 'test-render' | 'full-render'
  providerName: string
  estimatedCost: number
  durationSeconds: number
  onConfirm: () => void
  onCancel: () => void
  isVisible: boolean
}

export function MiaCostGate({
  action,
  providerName,
  estimatedCost,
  durationSeconds,
  onConfirm,
  onCancel,
  isVisible,
}: MiaCostGateProps) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!isVisible) return
      if (e.key === 'Escape') onCancel()
      if (e.key === 'Enter') onConfirm()
    },
    [isVisible, onCancel, onConfirm]
  )

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  const actionLabel = action === 'test-render' ? 'Test Render' : 'Full Video Render'

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={onCancel}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

          {/* Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="px-6 pt-6 pb-4 flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">Confirm {actionLabel}</h3>
                  <p className="text-xs text-slate-500">This action will incur a charge</p>
                </div>
              </div>
              <button onClick={onCancel} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Cost breakdown */}
            <div className="px-6 py-4 bg-slate-50 border-y border-slate-100">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Provider</span>
                  <span className="font-medium text-slate-900">{providerName}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Duration</span>
                  <span className="font-medium text-slate-900">{durationSeconds}s</span>
                </div>
                <div className="flex justify-between text-sm pt-2 border-t border-slate-200">
                  <span className="text-slate-700 font-medium">Estimated cost</span>
                  <span className="font-bold text-lg text-slate-900">${estimatedCost.toFixed(2)}</span>
                </div>
              </div>
              <p className="text-xs text-slate-400 mt-3">
                Actual cost may vary slightly based on provider billing.
              </p>
            </div>

            {/* Actions */}
            <div className="px-6 py-4 flex items-center justify-between gap-3">
              <button
                onClick={onCancel}
                className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={onConfirm}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white text-sm font-semibold hover:from-purple-700 hover:to-pink-700 transition-all shadow-lg shadow-purple-500/25"
              >
                Confirm — ${estimatedCost.toFixed(2)}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
