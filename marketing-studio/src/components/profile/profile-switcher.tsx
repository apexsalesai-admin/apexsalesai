'use client'

import { useState, useEffect, useRef } from 'react'
import { ChevronDown, Plus, User } from 'lucide-react'
import { cn } from '@/lib/utils'
import { VOICE_PRESETS, INDUSTRY_OPTIONS, type CreatorProfile } from '@/lib/studio/creator-profile'

interface ProfileSwitcherProps {
  activeProfile: CreatorProfile | null
  onSwitch: (profile: CreatorProfile) => void
  onCreateNew?: () => void
}

export function ProfileSwitcher({ activeProfile, onSwitch, onCreateNew }: ProfileSwitcherProps) {
  const [open, setOpen] = useState(false)
  const [profiles, setProfiles] = useState<CreatorProfile[]>([])
  const [loading, setLoading] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  // Fetch profiles on open
  useEffect(() => {
    if (!open) return
    setLoading(true)
    fetch('/api/studio/profile')
      .then((res) => res.json())
      .then((data) => setProfiles(data.profiles || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [open])

  const voice = activeProfile ? VOICE_PRESETS[activeProfile.voicePreset] : null
  const industry = activeProfile ? INDUSTRY_OPTIONS[activeProfile.industry] : null

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          'flex items-center gap-2 px-3 py-2 rounded-xl border text-sm transition-all w-full',
          activeProfile
            ? 'border-purple-200 bg-purple-50 hover:bg-purple-100'
            : 'border-slate-200 bg-white hover:bg-slate-50'
        )}
      >
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shrink-0">
          <User className="w-3.5 h-3.5 text-white" />
        </div>
        <div className="text-left min-w-0 flex-1">
          <div className="font-medium text-slate-900 text-xs truncate">
            {activeProfile?.name || 'No profile selected'}
          </div>
          {activeProfile && (
            <div className="text-[10px] text-slate-500 truncate">
              {voice?.name}{industry ? ` · ${industry.name}` : ''}
            </div>
          )}
        </div>
        <ChevronDown className={cn('w-4 h-4 text-slate-400 transition-transform', open && 'rotate-180')} />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-50 overflow-hidden">
          {loading ? (
            <div className="p-3 text-xs text-slate-400 text-center">Loading profiles...</div>
          ) : profiles.length === 0 ? (
            <div className="p-3 text-xs text-slate-400 text-center">No profiles yet</div>
          ) : (
            <div className="max-h-64 overflow-y-auto">
              {profiles.map((profile) => {
                const pVoice = VOICE_PRESETS[profile.voicePreset]
                const isActive = activeProfile?.id === profile.id
                return (
                  <button
                    key={profile.id}
                    onClick={() => {
                      onSwitch(profile)
                      setOpen(false)
                    }}
                    className={cn(
                      'w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-0',
                      isActive && 'bg-purple-50'
                    )}
                  >
                    <div className={cn(
                      'w-6 h-6 rounded-md flex items-center justify-center shrink-0',
                      isActive ? 'bg-purple-500' : 'bg-slate-200'
                    )}>
                      <User className={cn('w-3 h-3', isActive ? 'text-white' : 'text-slate-500')} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-medium text-slate-900 truncate">{profile.name}</div>
                      <div className="text-[10px] text-slate-500 truncate">
                        {pVoice?.name || profile.voicePreset}
                        {profile.isDefault ? ' · Default' : ''}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          )}

          {onCreateNew && (
            <button
              onClick={() => {
                onCreateNew()
                setOpen(false)
              }}
              className="w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-slate-50 transition-colors border-t border-slate-200"
            >
              <div className="w-6 h-6 rounded-md bg-slate-100 flex items-center justify-center">
                <Plus className="w-3 h-3 text-slate-500" />
              </div>
              <span className="text-xs font-medium text-slate-600">New Profile</span>
            </button>
          )}
        </div>
      )}
    </div>
  )
}
