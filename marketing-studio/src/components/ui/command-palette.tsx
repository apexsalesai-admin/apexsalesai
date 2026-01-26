'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search,
  LayoutDashboard,
  FileText,
  CheckCircle,
  Calendar,
  Video,
  Settings,
  Zap,
  Sparkles,
  Plus,
  ArrowRight,
  Command,
  BarChart3,
  MessageSquare,
  Key,
} from 'lucide-react'

interface CommandItem {
  id: string
  label: string
  description?: string
  icon: React.ComponentType<{ className?: string }>
  action: () => void
  category: 'navigation' | 'action' | 'ai'
  keywords?: string[]
}

interface CommandPaletteProps {
  onOpenMia?: () => void
}

export function CommandPalette({ onOpenMia }: CommandPaletteProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  const commands: CommandItem[] = [
    // Navigation
    {
      id: 'nav-dashboard',
      label: 'Go to Dashboard',
      icon: LayoutDashboard,
      action: () => router.push('/studio'),
      category: 'navigation',
      keywords: ['home', 'overview', 'main'],
    },
    {
      id: 'nav-content',
      label: 'Go to Content',
      icon: FileText,
      action: () => router.push('/studio/content'),
      category: 'navigation',
      keywords: ['posts', 'drafts', 'library'],
    },
    {
      id: 'nav-approvals',
      label: 'Go to Approvals',
      icon: CheckCircle,
      action: () => router.push('/studio/approvals'),
      category: 'navigation',
      keywords: ['review', 'pending', 'approve'],
    },
    {
      id: 'nav-calendar',
      label: 'Go to Calendar',
      icon: Calendar,
      action: () => router.push('/studio/content/calendar'),
      category: 'navigation',
      keywords: ['schedule', 'plan', 'dates'],
    },
    {
      id: 'nav-video',
      label: 'Go to Video Studio',
      icon: Video,
      action: () => router.push('/studio/video'),
      category: 'navigation',
      keywords: ['videos', 'clips', 'shorts'],
    },
    {
      id: 'nav-analytics',
      label: 'Go to Analytics',
      icon: BarChart3,
      action: () => router.push('/studio/analytics'),
      category: 'navigation',
      keywords: ['stats', 'metrics', 'performance'],
    },
    {
      id: 'nav-integrations',
      label: 'Go to Integrations',
      icon: Zap,
      action: () => router.push('/studio/integrations'),
      category: 'navigation',
      keywords: ['connect', 'channels', 'platforms'],
    },
    {
      id: 'nav-settings',
      label: 'Go to Settings',
      icon: Settings,
      action: () => router.push('/studio/settings'),
      category: 'navigation',
      keywords: ['preferences', 'config', 'account'],
    },
    {
      id: 'nav-ai-providers',
      label: 'Go to AI Providers',
      icon: Sparkles,
      action: () => router.push('/studio/settings/ai'),
      category: 'navigation',
      keywords: ['claude', 'openai', 'gpt', 'anthropic'],
    },
    {
      id: 'nav-brand-voice',
      label: 'Go to Brand Voice',
      icon: MessageSquare,
      action: () => router.push('/studio/settings/brand'),
      category: 'navigation',
      keywords: ['tone', 'style', 'voice', 'audience'],
    },
    {
      id: 'nav-auth-diagnostics',
      label: 'Go to Auth Diagnostics',
      icon: Key,
      action: () => router.push('/studio/settings/auth'),
      category: 'navigation',
      keywords: ['login', 'oauth', 'session', 'debug'],
    },

    // Actions
    {
      id: 'action-new-content',
      label: 'Create new content',
      description: 'Start creating with Mia',
      icon: Plus,
      action: () => router.push('/studio/content/new'),
      category: 'action',
      keywords: ['new', 'write', 'generate', 'post'],
    },
    {
      id: 'action-open-approvals',
      label: 'Open pending approvals',
      description: 'Review content waiting for approval',
      icon: CheckCircle,
      action: () => router.push('/studio/approvals'),
      category: 'action',
      keywords: ['review', 'pending'],
    },
    {
      id: 'action-connect-ai',
      label: 'Connect AI Provider',
      description: 'Add Anthropic or OpenAI API key',
      icon: Sparkles,
      action: () => router.push('/studio/settings/ai'),
      category: 'action',
      keywords: ['setup', 'configure', 'api', 'key'],
    },
    {
      id: 'action-set-brand-voice',
      label: 'Set Brand Voice',
      description: 'Define your tone and style',
      icon: MessageSquare,
      action: () => router.push('/studio/settings/brand'),
      category: 'action',
      keywords: ['tone', 'voice', 'style', 'preferences'],
    },

    // AI
    {
      id: 'ai-ask-mia',
      label: 'Ask Mia',
      description: 'Get AI-powered suggestions',
      icon: Sparkles,
      action: () => {
        onOpenMia?.()
        setOpen(false)
      },
      category: 'ai',
      keywords: ['help', 'suggest', 'ai', 'assistant'],
    },
  ]

  const filteredCommands = query
    ? commands.filter((cmd) => {
        const searchStr = `${cmd.label} ${cmd.description || ''} ${cmd.keywords?.join(' ') || ''}`.toLowerCase()
        return searchStr.includes(query.toLowerCase())
      })
    : commands

  const groupedCommands = {
    action: filteredCommands.filter((c) => c.category === 'action'),
    navigation: filteredCommands.filter((c) => c.category === 'navigation'),
    ai: filteredCommands.filter((c) => c.category === 'ai'),
  }

  const allFiltered = [...groupedCommands.action, ...groupedCommands.ai, ...groupedCommands.navigation]

  const executeCommand = useCallback(
    (command: CommandItem) => {
      command.action()
      setOpen(false)
      setQuery('')
      setSelectedIndex(0)
    },
    []
  )

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Open with Cmd+K or Ctrl+K
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen((prev) => !prev)
      }

      // Close with Escape
      if (e.key === 'Escape' && open) {
        setOpen(false)
        setQuery('')
        setSelectedIndex(0)
      }

      // Navigation within palette
      if (open) {
        if (e.key === 'ArrowDown') {
          e.preventDefault()
          setSelectedIndex((prev) => Math.min(prev + 1, allFiltered.length - 1))
        }
        if (e.key === 'ArrowUp') {
          e.preventDefault()
          setSelectedIndex((prev) => Math.max(prev - 1, 0))
        }
        if (e.key === 'Enter' && allFiltered[selectedIndex]) {
          e.preventDefault()
          executeCommand(allFiltered[selectedIndex])
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, selectedIndex, allFiltered, executeCommand])

  // Focus input when opened
  useEffect(() => {
    if (open) {
      inputRef.current?.focus()
    }
  }, [open])

  // Reset selection when query changes
  useEffect(() => {
    setSelectedIndex(0)
  }, [query])

  return (
    <>
      {/* Trigger hint */}
      <button
        onClick={() => setOpen(true)}
        className="hidden lg:flex items-center gap-2 px-3 py-1.5 text-sm text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
      >
        <Search className="w-4 h-4" />
        <span>Search...</span>
        <kbd className="ml-2 px-1.5 py-0.5 text-xs bg-white border border-slate-300 rounded font-mono">
          ⌘K
        </kbd>
      </button>

      {/* Modal */}
      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            />

            {/* Palette */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -20 }}
              transition={{ duration: 0.15 }}
              className="fixed top-[20%] left-1/2 -translate-x-1/2 w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-50"
            >
              {/* Search input */}
              <div className="flex items-center gap-3 px-4 py-4 border-b border-slate-200">
                <Search className="w-5 h-5 text-slate-400" />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search commands..."
                  className="flex-1 text-lg outline-none placeholder:text-slate-400"
                />
                <kbd className="px-2 py-1 text-xs bg-slate-100 border border-slate-200 rounded font-mono text-slate-500">
                  ESC
                </kbd>
              </div>

              {/* Results */}
              <div className="max-h-80 overflow-y-auto p-2">
                {allFiltered.length === 0 ? (
                  <div className="py-8 text-center text-slate-500">
                    No commands found for "{query}"
                  </div>
                ) : (
                  <>
                    {groupedCommands.action.length > 0 && (
                      <div className="mb-2">
                        <div className="px-3 py-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                          Actions
                        </div>
                        {groupedCommands.action.map((cmd, idx) => (
                          <CommandRow
                            key={cmd.id}
                            command={cmd}
                            selected={selectedIndex === idx}
                            onSelect={() => executeCommand(cmd)}
                          />
                        ))}
                      </div>
                    )}

                    {groupedCommands.ai.length > 0 && (
                      <div className="mb-2">
                        <div className="px-3 py-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                          AI
                        </div>
                        {groupedCommands.ai.map((cmd, idx) => (
                          <CommandRow
                            key={cmd.id}
                            command={cmd}
                            selected={selectedIndex === groupedCommands.action.length + idx}
                            onSelect={() => executeCommand(cmd)}
                          />
                        ))}
                      </div>
                    )}

                    {groupedCommands.navigation.length > 0 && (
                      <div className="mb-2">
                        <div className="px-3 py-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                          Navigation
                        </div>
                        {groupedCommands.navigation.map((cmd, idx) => (
                          <CommandRow
                            key={cmd.id}
                            command={cmd}
                            selected={
                              selectedIndex ===
                              groupedCommands.action.length + groupedCommands.ai.length + idx
                            }
                            onSelect={() => executeCommand(cmd)}
                          />
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 bg-slate-50 text-xs text-slate-500">
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded">↑</kbd>
                    <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded">↓</kbd>
                    to navigate
                  </span>
                  <span className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded">↵</kbd>
                    to select
                  </span>
                </div>
                <span className="flex items-center gap-1">
                  <Command className="w-3 h-3" />K to toggle
                </span>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}

function CommandRow({
  command,
  selected,
  onSelect,
}: {
  command: CommandItem
  selected: boolean
  onSelect: () => void
}) {
  const Icon = command.icon

  return (
    <button
      onClick={onSelect}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
        selected ? 'bg-purple-50 text-purple-700' : 'hover:bg-slate-100'
      }`}
    >
      <Icon className={`w-5 h-5 ${selected ? 'text-purple-600' : 'text-slate-400'}`} />
      <div className="flex-1 text-left">
        <span className={`font-medium ${selected ? 'text-purple-700' : 'text-slate-700'}`}>
          {command.label}
        </span>
        {command.description && (
          <span className="ml-2 text-sm text-slate-400">{command.description}</span>
        )}
      </div>
      {selected && <ArrowRight className="w-4 h-4 text-purple-500" />}
    </button>
  )
}
