'use client'

import { Toaster as SonnerToaster } from 'sonner'

export function Toaster() {
  return (
    <SonnerToaster
      position="bottom-right"
      toastOptions={{
        style: {
          background: 'white',
          border: '1px solid #e2e8f0',
          boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
        },
        classNames: {
          toast: 'group toast',
          title: 'text-slate-900 font-medium',
          description: 'text-slate-600 text-sm',
          success: 'border-emerald-200 bg-emerald-50',
          error: 'border-red-200 bg-red-50',
          warning: 'border-amber-200 bg-amber-50',
          info: 'border-blue-200 bg-blue-50',
        },
      }}
      closeButton
      richColors
    />
  )
}

// Re-export toast for easy importing
export { toast } from 'sonner'
