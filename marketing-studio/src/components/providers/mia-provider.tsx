'use client'

import { createContext, useContext, useState, ReactNode } from 'react'
import { MiaPanel } from '@/components/mia/mia-panel'

interface MiaContextType {
  isOpen: boolean
  open: () => void
  close: () => void
  toggle: () => void
  setContent: (content: ContentContext | null) => void
}

interface ContentContext {
  id: string
  text: string
  channel?: string
  topic?: string
}

const MiaContext = createContext<MiaContextType | null>(null)

export function useMia() {
  const context = useContext(MiaContext)
  if (!context) {
    throw new Error('useMia must be used within a MiaProvider')
  }
  return context
}

interface MiaProviderProps {
  children: ReactNode
}

export function MiaProvider({ children }: MiaProviderProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [content, setContent] = useState<ContentContext | null>(null)

  const open = () => setIsOpen(true)
  const close = () => setIsOpen(false)
  const toggle = () => setIsOpen((prev) => !prev)

  return (
    <MiaContext.Provider value={{ isOpen, open, close, toggle, setContent }}>
      {children}
      <MiaPanel isOpen={isOpen} onClose={close} currentContent={content || undefined} />
    </MiaContext.Provider>
  )
}
