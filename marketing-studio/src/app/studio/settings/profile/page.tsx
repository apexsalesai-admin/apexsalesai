'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { ArrowLeft, Plus, Loader2, Trash2 } from 'lucide-react'
import { ProfileSummaryCard } from '@/components/profile/profile-summary-card'
import { CreatorProfileOnboarding } from '@/components/profile/creator-profile-onboarding'
import type { CreatorProfile } from '@/lib/studio/creator-profile'

export default function ProfileSettingsPage() {
  const [profiles, setProfiles] = useState<CreatorProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)

  const fetchProfiles = useCallback(async () => {
    try {
      const res = await fetch('/api/studio/profile')
      const data = await res.json()
      setProfiles(data.profiles || [])
    } catch {
      // Silently fail
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchProfiles()
  }, [fetchProfiles])

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this profile?')) return
    setDeleting(id)
    try {
      await fetch(`/api/studio/profile/${id}`, { method: 'DELETE' })
      setProfiles((prev) => prev.filter((p) => p.id !== id))
    } catch {
      // Silently fail
    } finally {
      setDeleting(null)
    }
  }

  const handleSetDefault = async (id: string) => {
    try {
      await fetch(`/api/studio/profile/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isDefault: true }),
      })
      setProfiles((prev) =>
        prev.map((p) => ({ ...p, isDefault: p.id === id }))
      )
    } catch {
      // Silently fail
    }
  }

  if (showOnboarding) {
    return (
      <CreatorProfileOnboarding
        userId=""
        onComplete={(profile) => {
          setProfiles((prev) => [...prev, profile])
          setShowOnboarding(false)
        }}
        onSkip={() => setShowOnboarding(false)}
      />
    )
  }

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <Link
          href="/studio/settings"
          className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Creator Profiles</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Manage your personas — each profile shapes how Mia generates content for you.
          </p>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 text-purple-500 animate-spin" />
        </div>
      )}

      {/* No profiles */}
      {!loading && profiles.length === 0 && (
        <div className="text-center py-16">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-purple-50 flex items-center justify-center mb-4">
            <Plus className="w-8 h-8 text-purple-400" />
          </div>
          <h2 className="text-lg font-semibold text-slate-900 mb-1">No profiles yet</h2>
          <p className="text-sm text-slate-500 mb-6">Create your first creator profile to personalize Mia.</p>
          <button
            onClick={() => setShowOnboarding(true)}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white text-sm font-medium shadow-lg hover:shadow-xl transition-all"
          >
            Create Profile
          </button>
        </div>
      )}

      {/* Profile list */}
      {!loading && profiles.length > 0 && (
        <div className="space-y-4">
          {profiles.map((profile) => (
            <div key={profile.id} className="relative">
              <ProfileSummaryCard
                profile={profile}
                mode="settings"
                onEdit={() => {
                  // TODO: inline edit or route to edit page
                }}
                onDelete={() => handleDelete(profile.id)}
              />
              {!profile.isDefault && (
                <button
                  onClick={() => handleSetDefault(profile.id)}
                  className="absolute bottom-3 right-3 text-xs text-purple-600 hover:text-purple-800 font-medium"
                >
                  Set as Default
                </button>
              )}
              {deleting === profile.id && (
                <div className="absolute inset-0 bg-white/80 rounded-xl flex items-center justify-center">
                  <Loader2 className="w-5 h-5 text-red-500 animate-spin" />
                </div>
              )}
            </div>
          ))}

          {/* Add new */}
          <button
            onClick={() => setShowOnboarding(true)}
            className="w-full flex items-center justify-center gap-2 p-4 rounded-xl border-2 border-dashed border-slate-300 text-slate-500 hover:border-purple-300 hover:text-purple-600 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span className="text-sm font-medium">Add Profile</span>
          </button>
        </div>
      )}
    </div>
  )
}
